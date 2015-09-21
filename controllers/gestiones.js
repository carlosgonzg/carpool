'use strict';

/*exports.updateClienteCamp = function (db) {
	return function (req, res) {
        db.get(req.body.tabla).update(req.body.query, { $set: req.body.obj}, function (err, obj) {
		    if (err) { throw err; }
            res.json({result: "Ok"});
	    });
    };
};*/

exports.updateClienteCamp = function (db) {
    var clientes = [];
	return function (req, res) {
	    db.get(req.body.tabla).find(req.body.obj.usuarioId, function (err, obj) {
            clientes = obj;
            
            for (var i=0; i < clientes.length; i++) {
                if(clientes[i].estatusVenta == undefined) {
                    
                    db.get(req.body.tabla).update({_id: clientes[i]._id}, { $set: {usuarioId: req.body.obj.usuarioIdTransf}}, function (err, obj) {
                        if (err) { throw err; }
                        res.json({result: "Ok"});
                    });
                }
            }
            db.get("USUARIO").update(
                {usuarioId:req.body.obj.usuarioId.usuarioId!=undefined?req.body.obj.usuarioId.usuarioId:req.body.obj.usuarioId.usuarioOriginal},
                {$set:{activo: req.body.obj.activo}},
                function (err, obj){
                if (err) { throw err; }
                res.json({result: "Ok"});
                }
            );
            
	    });
    };
};
var getUsuario = function(db,aux,fn){
    db.get("USUARIO").find( {}, function (err, obj) {
        fn(aux);
        
        /*for (var x=0; x<obj.length; x++) {
            if (obj[x].manager.usuarioId == listaUsuarios[i].usuarioId) {
                var newSub = {id: obj[x].usuarioId, nombre: obj[x].oficial, sub: []};
                listaUsuarios[i].sub.push(newSub);
            }
        }*/
    })   
};
//Funcion que retorna los usuarios segmentados por su jerarquia
exports.buscarUsJerarquia = function (db) {
	return function (req, res) {
        var listaUsuarios = [];
        var usuarios = [];
	    db.get("USUARIO").find({}, function (err, obj) {
            //Funcion que crea la jerarquia de usuarios
            var crearNodos = function (nodo, lista) {
                for (var x=0; x<lista.length; x++) {
                    if(lista[x].manager.usuarioId != null) {
                        if (lista[x].manager.usuarioId == nodo.id) {
                            nodo.sub.push({id:lista[x].usuarioId, nombre: lista[x].oficial, sub: []});
                        }
                    }
                }
                for (var t=0; t < nodo.sub.length; t++) {
                    crearNodos(nodo.sub[t], obj);
                }
            }
            //Aqui se crean los primeros nodos (Aquellos usuarios que no tienen Manager
            for (var i=0; i < obj.length; i++) {
                if (listaUsuarios[i] == undefined && obj[i].manager.usuarioId == null) {
                    listaUsuarios.push({id: obj[i].usuarioId, nombre: obj[i].oficial, sub: []});  
                }
            }
            
            for (var o = 0; o < listaUsuarios.length; o++) {
                crearNodos(listaUsuarios[o], obj);
            }
            res.json(listaUsuarios);
	    });
    };
};
//Funcion actualiza el manager de un usuario
exports.actualizarManager = function (db) {
	return function (req, res) {
        
	    db.get("USUARIO").update(req.body.id, {$set:{ rol: req.body.tipo, manager: req.body.obj}},function (err, obj) {
            res.json(err);
	    });
        if (req.body.tipo == "Oficial") {
            //Buscar el manager
            db.get("USUARIO").findOne({usuarioId: req.body.obj.usuarioId}, function (err, obj) {
                //Saber si tiene el arreglo de oficiales
                
                if (obj.oficiales != undefined) {
                    //Tiene el arreglo de oficiales
                    if (obj.oficiales.indexOf(req.body.id.usuarioId) != -1) {
                        setRol();
                        //Do nothing
                    } else {
                        //Insertar el oficial en el arreglo de oficiales
                        db.get("USUARIO").update(req.body.obj, {$push:{ oficiales: req.body.id.usuarioId}},function (err, obj) {
                            res.json(err);
                            eliminarUsuarioDelArray();
                            setRol();
                        });
                    }
                } else {
                    //No tiene el arreglo de oficiales
                    //Insertar el oficial en el arreglo de oficiales
                    db.get("USUARIO").update(req.body.obj, {$push:{ oficiales: req.body.id.usuarioId}},function (err, obj) {
                        res.json(err);
                        eliminarUsuarioDelArray();
                        setRol();
                    });
                }
                
            });
            var eliminarUsuarioDelArray = function () {
                db.get("USUARIO").find({}, function (err, obj) {
                    for (var x = 0; x < obj.length; x++) {
                        if (obj[x].usuarioId != req.body.obj.usuarioId) {
                            if (obj[x].oficiales) {
                                if (obj[x].oficiales.indexOf(req.body.id.usuarioId) != -1) {
                                    var index = obj[x].oficiales.indexOf(req.body.id.usuarioId);
                                    db.get("USUARIO").update(
                                        {usuarioId: obj[x].usuarioId},
                                        {$pull: {oficiales: req.body.id.usuarioId}}
                                    );
                                }
                            }
                        }
                    }
                });
            };
            var setRol = function () {
                db.get("USUARIO").find({}, function (err, obj) {
                    for (var x = 0; x < obj.length; x++) {
                        if (obj[x].oficiales) {
                            if (obj[x].oficiales.length > 0) {
                                db.get("USUARIO").update(
                                    {usuarioId: obj[x].usuarioId},
                                    {$set: {rol: "Administrador"}}
                                );
                            } else {
                                db.get("USUARIO").update(
                                    {usuarioId: obj[x].usuarioId},
                                    {$set: {rol: "Oficial"}}
                                );
                            }
                        }
                    }
                });
            };
            
        }
    };
};
