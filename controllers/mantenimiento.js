var jLinq = require('jlinq'),
    util = require('util'),
    md5 = require('MD5');


exports.buscarPorId = function(db) {
    return function(req, res) {
	    db.get(req.body.tabla).findOne(req.body.query, function (err,obj){
		    res.json(obj);
	    })
    }
}

exports.new = function (db) {
	return function(req, res) {
        db.get(req.body.tabla).insert(req.body.obj, function (err, obj){
		    if(err) throw err;
        res.json({result: "Ok", file: req.body.obj[0].file});
    });
    }
}

exports.delete = function (db) {
	return function(req, res) {
        db.get(req.body.tabla).remove(req.body.obj, function(err, obj){
        if(obj){
            res.json({result: "Ok"});
        }
        if(err){
            res.json({ err: err});
        }
        });
    }
}
//
exports.update = function (db) {
	return function(req, res) {
        db.get(req.body.tabla).update(req.body.query, { $set: req.body.obj}, function (err, obj){
		    if(err) throw err;
            res.json({result: "Ok"});
	    })
    }
}

exports.upsert = function (db) {
	return function (req, res) {
        if(req.body.tabla == "USUARIO")
            req.body.obj.password = md5(req.body.obj.usuarioRed)
      db.get(req.body.tabla).update( req.body.query, req.body.obj, {upsert:true}, function (err, obj){
        if (err){ throw err;
        } else {
          res.json(obj);
        }
      });
    }
}

exports.search = function (db) {
	return function(req, res) {
	    db.get(req.body.tabla).find(req.body.obj, function (err,obj){
          //console.log(req.body.obj);
		    res.json(obj);
	    }) 
    }
}
exports.count = function (db) {
	return function(req, res) {
      var filter = typeof req.body.obj == "string"?JSON.parse(req.body.obj):req.body.obj;
      //console.log(filter);
	    db.get(req.body.tabla).count(filter, function (err,result){
		    res.json(result);
	    }) 
    }
}
exports.paginatedSearch = function (db) {
	return function(req, res) {
        //console.log("*** PAGINATED SEARCH ***");
        var where = JSON.parse(req.body.filter) || {};
        //console.log(where);
        var search = req.body.search == "" ? "." : req.body.search;
        var fields = req.body.fields;    
    /*     //Login Credentials
        if (getCredentialsFilter(req).usuarioId != undefined)
			where.usuarioId = getCredentialsFilter(req);
		else	
			if(req.body.user != undefined)
				if (req.body.user.rol == "Administrador")
					where.usuarioId = { $in:req.body.user.oficiales }
				else
					where.usuarioId = req.body.user.usuarioId;	   
		//console.log('--------------------USUARIO ID');
		//console.log( where.usuarioId ); */
        //Pagination Limits
        var pagination = {
                limit: req.body.limit,
                skip:req.body.skip,
                sort:req.body.sort
            }
        //console.log("** PAGINATION **");
			//console.log(JSON.stringify(pagination));	

       // Filtro por multiples campos
	   
	   if(fields.length > 0){
      var flagProperty = false;
      if(!where.hasOwnProperty('$or')){
        where.$or = [];
        flagProperty = true;        
      } else {
        where.$and = [ { $or : [] }, { $or: where.$or }] ;
        delete where.$or;
      }  
			fields.forEach(function (field){
				   var obj = {};
				   obj[field] = { $regex: search, $options: 'i' }
           if(flagProperty)
            where.$or.push(obj);
           else
            where.$and[0].$or.push(obj);
			});      
		}
        //console.log("** Body **");
        //console.log(req.body);

		console.log("** Where **");
		console.log(JSON.stringify(where));
      
		
	/* 	//console.log("** Where estatus **");
        //console.log(where.estatusVenta); */
        ////console.log(new RegExp('/.*'+req.body.search+'.*/'));

	    db.get(req.body.tabla).find(where,pagination,
            function (err,campanas){
                if (err) throw err;
				////console.log(campanas);
				res.json(campanas);
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
