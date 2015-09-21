exports.getListas = function (db) {
    return function (req, res) {
        var sucursal, zona;
        db.get('SUCURSAL').find({},function(err, obj){
            if(obj)
            {
                sucursal = obj;
                db.get('ZONA').find({},function(err, obj){
                    if(obj){
                        zona = obj;
                        res.json({sucursal: sucursal, zona: zona})
                    }
                    else{
                        res.json(err);
                    }
                })
            }
            else
                res.json(err);
        }); 
    }
}

exports.getUsuario = function (db) {
    return function (req, res) {
        db.get('USUARIO').find({},function(err, obj){
            if(obj)
                res.json(obj);
            else
                throw err;
        }); 
    }
}

exports.getUsuarioByID = function (db) {
    return function (req, res) {
        db.get('USUARIO').find({usuarioId: req.body.usuarioId},function(err, obj){
            if(obj)
                res.json(obj);
            else
                throw err;
        }); 
    }
}   
/*
exports.usuarioCount = function (db) {
    return function (req, res) {
        
        db.get("USUARIO").count(req.body, function(err, obj){
            if(err)
                throw err;
            if(obj)
                res.json(obj);
        });
    }
}
*/

exports.usuarioCount = function (db) {
	return function(req, res) {
        console.log("*** PAGINATED SEARCH ***");
        var where = JSON.parse(req.body.filter) || {};
        
        var search = req.body.search;
        var fields = req.body.fields;    
        var tabla = req.body.tabla
        //Login Credentials
        if (getCredentialsFilter(req).usuarioId != undefined)
			where.usuarioId = getCredentialsFilter(req);
		else	
			if(req.body.user != undefined)
				if (req.body.user.rol == "Administrador")
					where.usuarioId = { $in:req.body.user.oficiales }
				else
					where.usuarioId = req.body.user.usuarioId;
        
		console.log('--------------------USUARIO ID');
		console.log( where.usuarioId );
        //Pagination Limits
        var pagination = {
                limit: req.body.limit,
                skip:req.body.skip,
                sort:req.body.sort
            }
        console.log("** PAGINATION **");
			console.log(JSON.stringify(pagination));	

       // Filtro por multiples campos
	   
	   if(fields.length > 0){
			where.$or = [];
			fields.forEach(function (field){
				   var obj = {};
				   obj[field] = { $regex: search, $options: 'i' }
				   where.$or.push(obj);
				   console.log(obj);
			});
		}
        console.log("** Body **");
        console.log(req.body);

        console.log("** Where **");
		console.log(JSON.stringify(where));
      
		
	 	/*console.log("** Where estatus **");
        console.log(where.estatusVenta); */
        //console.log(new RegExp('/.*'+req.body.search+'.*/'));

	    db.get(tabla).count(where/*,pagination*/,function (err, usuario){
                if (err) throw err;
				//console.log(campanas);
				res.json(usuario);
	    });
    }
}

function getCredentialsFilter(req) {
	if (!req.user) return {};

    where = {};

    if (req.user.rol == "Administrador")
        return { $in: req.user.oficiales }
    else
        return req.user.usuarioId;
       
}
