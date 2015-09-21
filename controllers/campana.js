var md5 = require("MD5"),
    jLinq = require("jlinq");

exports.getCampana = function (db) {
    return function (req, res) {
        db.get('CAMPANA').find({},function(err, obj){
            if(obj)
                res.json(obj);
            else
                res.json(err);
        }); 
    }
}

exports.getCampanaByID = function (db) {
    return function (req, res) {
        console.log('------ada---');
        console.log({clienteId:req.body.clienteId, usuarioId: req.body.usuarioId});
        db.get('CLIENTECAMPANA').find({clienteId:req.body.clienteId, usuarioId: req.body.usuarioId},function(err, obj){
            if(obj)
                res.json(obj);
            else
                res.json(err);
        }); 
    }
}

exports.process = function (db) {
    return function(req, res) {
	    db.get('EXCEL').find({}, function (err,obj){
		        load(db,obj, req.body.file,function(flag){                            
                res.json({result: flag});            
            });
	    })
    }
}

function load (db,data, file,callback)
{        

    var preguntas = {
            1: {   
                id: 1,
                tipo: "SI/NO",
                campo: "tasaDeContacto",
                texto: "Contactado?",
                respuestas : [
                        {   valor: "Contactado",    next: [2,7],    tipo: true  },
                        {   valor: "No Contactado", next: [3],      tipo: false }
                    ]
            },
            2: {   
                id: 2,
                tipo: "SI/NO",
                campo: "tasaDeAceptacion",
                texto: "Estuvo el cliente interesado en la oferta?",
                respuestas : [
                        { valor: "Si", next: [4], tipo: true },
                        { valor: "No", next: [5], tipo: false }
                    ]
            },
            4: {   
                id: 4,
                tipo: "OPTIONS",
                campo: "estatusVenta",
                texto: "Cual fue el estatus de la venta?",
                respuestas : [
                        { valor: "Solicitud Creada",    next: [0], tipo: "Cierre"      },
                        { valor: "Producto Aperturado", next: [0], tipo: "Cierre"      },
                        { valor: "Tasa ajustada",       next: [0], tipo: "Cierre"      },
                        { valor: "Promesa de Uso",      next: [0], tipo: "Seguimiento" },
                        { valor: "Promesa de Pago",     next: [0], tipo: "Seguimiento" },
                        { valor: "Promesa de Compra",   next: [6], tipo: "Seguimiento" },
                        { valor: "Declinada",           next: [0], tipo: "Declinacion" },
                        { valor: "Oferta recahazada",   next: [0], tipo: "Declinacion" },                        
                    ]
            },
            6: {   
                id: 6,
                tipo: "DATE",
                campo: "fechaProximaLlamada",
                texto: "Fecha de la proxima llamada",
                respuestas : [
                        { valor: "VALOR",   next: [0] }
                    ]
            },
            5: {   
                id: 5,
                tipo: "OPTIONS",
                campo: "estatusVenta",
                texto: "Motivo de no Interes",
                respuestas : [
                        { valor: "Producto en el banco ",   next: [0], tipo: "No Interes" },
                        { valor: "Tasa no atractiva ",      next: [0], tipo: "No Interes" },
                        { valor: "Desea un monto mayor al aprobado ",               next: [0], tipo: "No Interes" },
                        { valor: "le interesa un plazo menor para el prestamo ",    next: [0], tipo: "No Interes" },
                        { valor: "Esta desempleado ",                               next: [0], tipo: "No Interes" },
                        { valor: "No tiene la necesidad ahora ",                    next: [0], tipo: "No Interes" },
                        { valor: "No quiere mas deudas ",                           next: [0], tipo: "No Interes" },
                        { valor: "Numero equivocado ",                              next: [0], tipo: "No Interes" },
                        { valor: "Cliente vive fuera del pais ",                    next: [0], tipo: "No Interes" },
                        { valor: "Quiere otro producto ",                           next: [0], tipo: "No Interes" },
                        { valor: "Trabaja en una entidad financiera ",              next: [0], tipo: "No Interes" }
                    ]
            },
            7: {   
                id: 7,
                tipo: "SI/NO",
                campo: "tasaDeOportunidad",
                texto: "Interes en otro producto",
                respuestas : [
                        { valor: "Si", next: [8], tipo: true },
                        { valor: "No", next: [0], tipo: false }
                    ]
            },
            8: {   
                id: 8,
                tipo: "OPTIONS",
                campo: "oportunidad",
                texto: "Productos Adicionales",
                final: true,
                respuestas : [
                        { valor: "Tarjeta de Credito",      next: [0] },
                        { valor: "Certificado",             next: [0] },
                        { valor: "CuentaMatika",            next: [0] },
                        { valor: "Prestamo Personal",       next: [0] },
                        { valor: "Prestamo Hipotecario",    next: [0] }
                    ]
            },
            3: {   
                id: 3,
                tipo: "OPTIONS",
                campo: "estatusVenta",
                texto: "Porqué no se contactó?",
                respuestas : [
                        { valor: "No se encuentra",         next: [6], tipo: "Seguimiento" },
                        { valor: "Fuera del país",          next: [6], tipo: "Seguimiento"  },
                        { valor: "Numero Incorrecto",       next: [0], tipo: "No Contactado"  },
                        { valor: "No contestó",             next: [0], tipo: "No Contactado"  },
                        { valor: "Cambio de Número",        next: [0], tipo: "No Contactado"  },
                        { valor: "No aplica a la campaña",  next: [0], tipo: "No Contactado"  },
                        { valor: "Fallecido",               next: [0], tipo: "No Contactado"  }
                    ]
            }
        };

    if (data == undefined) return;

    console.log(new Date());
    
    var dbSegmentada = jLinq.from(data)
        .select(function(r) { 
        return {
                zona:     {"id":r.zona,
                            "descripcion":r.zona},
                segmento: {"id":r.segmento,
                            "descripcion":r.segmento},
                lineaDeNegocio: {"id":r.lineaDeNegocio,
                                 "descripcion":r.lineaDeNegocio},
                sucursal : {"id":r.sucursal,
                            "descripcion":r.sucursal,
                            "zonaId":r.zona},
                oficial : {"usuarioId":parseInt(r.oficialId),
                            "usuarioRed":r.usuarioRed,
                            "password": md5(r.usuarioRed),
                            "oficial":r.oficial,
                            "zona":r.zona, 
                            "sucursal":r.sucursal,
                            "oficialAnterior":r.oficialAnterior},
                cliente : {
                            "clienteId" : parseInt(r.clienteId),
                            "tipoIdentificacion":r.tipoIdentificacion,
                            "codigoIdentificacion":r.codigoIdentificacion,
                            "nombreProspecto":r.nombreProspecto,
                            "segmento":r.segmento,
                            "telefono1":r.telefono1,
                            "telefono2":r.telefono2,
                            "telefono3":r.telefono3,
                            "telefono4":r.telefono4,
                            "telefono5":r.telefono5,
                            "email":r.email},
                clienteCampana : {
                            "usuarioId": parseInt(r.oficialId),
                            "clienteId" : parseInt(r.clienteId),
                            "campanaId":r.campanaId,
                            "prioridad": r.prioridad,
                            cliente: {
                                "clienteId" :parseInt(r.clienteId),
                                "tipoIdentificacion":r.tipoIdentificacion,
                                "codigoIdentificacion":r.codigoIdentificacion,
                                "nombreProspecto":r.nombreProspecto,
                                "segmento":r.segmento,
                                "telefono1":r.telefono1,
                                "telefono2":r.telefono2,
                                "telefono3":r.telefono3,
                                "telefono4":r.telefono4,
                                "telefono5":r.telefono5,
                                "email":r.email,
                            },

                            campana: {
                                "campanaId":r.campanaId,
                                "campana":r.campana,
                                "tipoDeEstrategia":r.tipoDeEstrategia,
                                "lineaDeNegocio":r.lineaDeNegocio,
                                "codigoOferta":r.codigoOferta,
                                "descripcionOferta":r.descripcionOferta,
                                "monto":r.monto,
                                "script":r.script,
                                "preguntas":preguntas
                                },
                            oficial : {"usuarioId":parseInt(r.oficialId),
                                "usuarioRed":r.usuarioRed,
                                "oficial":r.oficial,
                                "zona":r.zona, 
                                "sucursal":r.sucursal,
                                "oficialAnterior":r.oficialAnterior}
                            },
            clienteCampanaOferta:{
                usuarioId: parseInt(r.oficialId),
                clienteId: r.clienteId,
                campanaId: r.campanaId,
                prioridad: r.prioridad,
                oferta: { 
                        codigoOferta: r.codigoOferta,
                        descripcionOferta:r.descripcionOferta,
                        tipoOferta: r.tipoOferta,
                        valorOferta: r.valorOferta,
                        condicionOferta: r.condicionOferta
                        }
            },
                campana: {
                            "campanaId":r.campanaId,
                            "campana":r.campana,
                            "tipoDeEstrategia":r.tipoDeEstrategia,
                            "lineaDeNegocio":r.lineaDeNegocio,
                            "codigoOferta":r.codigoOferta,
                            "descripcionOferta":r.descripcionOferta,
                            "monto":r.monto,
                            "script":r.script,
                            "preguntas":preguntas
                            },
                }; 
        });
         
    //Oficiales
    var oficiales = jLinq.from(dbSegmentada)
        .select(function(r) { 
        return { str: JSON.stringify(r.oficial),}; 
        });
        
    var oficialesDistinct = distinct(oficiales)

    oficialesDistinct.forEach(function(item) { 
		upsert(db,"USUARIO", {usuarioId : item.usuarioId} ,item);
	});
	
    console.log(new Date());
    console.log("oficialesDistinct: "+oficialesDistinct.length);
      
    // Clientes

    var clientes = jLinq.from(dbSegmentada)
        .select(function(r) { 
        return { str: JSON.stringify(r.cliente),}; 
        });
        
    var clientesDistinct = distinct(clientes)
    
    clientesDistinct.forEach(function(item) { 
		upsert(db,"CLIENTE", {clienteId : item.clienteId} ,item);
	});

    console.log(new Date());
    console.log("clientesDistinct: "+ clientesDistinct.length);


    // Campana

    var campanas = jLinq.from(dbSegmentada)
        .select(function(r) { 
        return { str: JSON.stringify(r.campana),}; 
        });
        
    var campanasDistinct = distinct(campanas)

    campanasDistinct.forEach(function(item) { 
		upsert(db,"CAMPANA", {campanaId : item.campanaId} ,item);
	});

    console.log(new Date());
    console.log(campanasDistinct.length);

    
    // Cliente Campana

    var clienteCampanas = jLinq.from(dbSegmentada)
        .select(function(r) { 
        return { str: JSON.stringify(r.clienteCampana),}; 
        });
        
    var clienteCampanasDistinct = distinct(clienteCampanas)

    //ANTES DE INSERTAR AGREGAR OFERTAS
    
    clienteCampanasDistinct.forEach(function(item) { 
		upsert(db,"CLIENTECAMPANA", {campanaId : item.campanaId, clienteId:item.clienteId} ,item);
	});


    console.log(new Date());
    console.log("clienteCampanasDistinct: "+ clienteCampanasDistinct.length);

    //cliente campaña oferta
    var clienteCampanaOferta = jLinq.from(dbSegmentada)
        .select(function(r) { 
        return { str: JSON.stringify(r.clienteCampanaOferta),}; 
        });
        
    var clienteCampanaOfertaDistinct = distinct(clienteCampanaOferta)
    
    clienteCampanaOfertaDistinct.forEach(function(item) {
        db.get('CLIENTECAMPANA').update({campanaId : item.campanaId, clienteId:item.clienteId, usuarioId: item.usuarioId}, {$push: { oferta: item.oferta}})
        db.get('USUARIO').update({usuarioId: item.usuarioId}, {$set: {activo: true}});
	});

    //LISTAS
    // Zona

    var zonas = jLinq.from(dbSegmentada)
        .select(function(r) { 
        return { str: JSON.stringify(r.zona),}; 
        });
        
    var zonasDistinct = distinct(zonas);

    zonasDistinct.forEach(function(item) { 
		upsert(db,"ZONA", {id : item.id} ,item);
	});

    // segmento

    var segmentos = jLinq.from(dbSegmentada)
        .select(function(r) { 
        return { str: JSON.stringify(r.segmento),}; 
        });
        
    var segmentosDistinct = distinct(segmentos);

    segmentosDistinct.forEach(function(item) { 
		upsert(db,"SEGMENTO", {id : item.id} ,item);
	});

    // segmento

    var lineaDeNegocios = jLinq.from(dbSegmentada)
        .select(function(r) { 
        return { str: JSON.stringify(r.lineaDeNegocio),}; 
        });
        
    var lineaDeNegociosDistinct = distinct(lineaDeNegocios);

    lineaDeNegociosDistinct.forEach(function(item) { 
		upsert(db,"LINEADENEGOCIO", {id : item.id} ,item);
	});

    // segmento

    var sucursales = jLinq.from(dbSegmentada)
        .select(function(r) { 
        return { str: JSON.stringify(r.sucursal),}; 
        });
        
    var sucursalesDistinct = distinct(sucursales);

    sucursalesDistinct.forEach(function(item) { 
		upsert(db,"SUCURSAL", {id : item.id} ,item);
	});
removeRowFromTable(db, "EXCEL", {file: file})
    callback(true);
};    

function upsert (db,tabla,query,obj) {
	db.get(tabla).update(
		query,
		obj, 
		{upsert:true},
		  function(err, object) {
			  if (err){
				  throw err.message;  // returns error if no matching object found                    
				  //res.json(err.message);
			  }else{
				  //console.dir(object);
				  //res.json(object);
			  }
		  });
}

function distinct(object)
{
    var distinctStr = jLinq.from(object)           
        .distinct("str");
        
    var distinctObject = jLinq.from(distinctStr)           
        .select(function(r) { 
        return JSON.parse(r)
        });

    return distinctObject;
}

function removeRowFromTable (db, tabla, query){
    db.get(tabla).remove(query);
}
