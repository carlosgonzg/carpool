var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var config = require('../config');
exports.getIndicators = function(dbx) {
    return function(req,res){
        
        //Initialize connection directly
        //MongoClient.connect("mongodb://localhost:27017/analyticaCrm", function(err, db) { 
		var cfg = config.getDevEnv();
        var dbUrl = cfg.DB_URL;
        MongoClient.connect("mongodb://"+ dbUrl, function(err, db) {

        //If an error throw
        if(err) throw err;
        var filtro =  req.body.filtro;//{campanaId: /.*/};//
        
        for(var key in filtro)
        {
            if (!filtro[key])
                delete filtro[key];
            //filtro[key] = filtro[key] ? filtro[key] : /.*/;
        }
        
        if (req.body.user.rol == "Administrador")
            filtro["usuarioId"] = { $in: req.body.user.oficiales }
        else
            filtro["usuarioId"] = req.body.user.usuarioId;
        
        
        //var filter= { $match: {campanaId: "Prioridad 1: Pr�stamos Preaprobados"} }
        //Buscar Datos 
        db.collection("CLIENTECAMPANA").aggregate([
                            { $match: filtro },
                            {$group:{
                                 _id: "$estatusVenta" 
                                , prospectos: { $sum: 1 }
                            }}],{}, function(e,estatus) {
                    if(e) throw e;
                
                    var indicador = {};
                    estatus.forEach(function(item) { 
		                indicador[item._id] = item.prospectos;
	                }); 
                    
                    var tasas={};
                    
                            db.collection("CLIENTECAMPANA").aggregate([
                                { $match: filtro},
                                {$group:{
                                 _id: "$campanaId" 
                                 , prospectos:          { $sum: 1 }
                                 , tasaDeGestion:       { $sum: { $cond: [ "$estatusVenta" , 1, 0 ] } }
                                 , tasaDeContacto:      { $sum: { $cond: [ "$tasaDeContacto" , 1, 0 ] } }
                                 , tasaDeAceptacion:    { $sum: { $cond: [ "$tasaDeAceptacion" , 1, 0 ] } }
                                 , tasaDeOportunidad:   { $sum: { $cond: [ "$tasaDeOportunidad" , 1, 0 ] } }
                                 , tasaDeCierre:        { $sum: { $cond: [ { $eq: [ "$estatusVenta", "Cierre" ] } , 1, 0 ] } }
                                 , tasaDeDeclinacion:   { $sum: { $cond: [ { $eq: [ "$estatusVenta", "Declinacion" ] }, 1, 0 ] } }
                                 , tasaDeSeguimiento:   { $sum: { $cond: [ { $eq: [ "$estatusVenta", "Seguimiento" ] }, 1, 0 ] } }
                                }},
                                { $sort: { _id: 1 } }],{}, function(e,data) {

                                var tasas ={};
                                var tasasSum ={};

                                for(var i = 0; i<data.length;i++)
                                {
                                    var campana = data[i]._id;

                                    for (var tasa in data[i])
                                    {
                                        if (tasa != "_id"){
                                            var temp = [campana,data[i][tasa]];
                                            //temp[campana] = data[i][tasa];

                                            if (tasas[tasa] == undefined)
                                            {
                                                tasas[tasa] = [];
                                                tasasSum[tasa] = 0;
                                            }

                                            tasas[tasa].push(temp);
                                            tasasSum[tasa] += data[i][tasa];
                                        }
                                    }
                                }

                                //var columns = [];
                                //columns[0] = ["Tasa1 - Campana1", "Tasa1 - Campana2", "Tasa2 - Campana1", "Tasa2 - Campana2"];
                                //columns[1] = [12, 8, 15, 3];
                                
                                res.json({graph:[tasasSum,tasas],indicador:indicador});
                            });

            });
        });  
    };
}

exports.getTodayCalls = function (db) {
    return function(req, res) {
        var where = {};

        if (req.body.user.rol == "Administrador")
            where["usuarioId"] = { $in: req.body.user.oficiales }
        else
            where["usuarioId"] = req.body.user.usuarioId;
    
        where["fechaProximaLlamada"] = req.body.date;
        where["fechaUltimaLlamada"] = { $regex: '^((?!(' + req.body.date + ')).)*$', $options: 'i' };
        //console.log(req.body);
    
	    db.get("CLIENTECAMPANA").find(where,
            function (err,campanas){
                //console.log(err);
                //console.log(campanas.length);

                res.json(campanas);
	    });
    }
}

exports.filtros = function (db) {
    return function(req, res) {

    console.log("FILTROS");
	
    var where = {};
	console.log('-------------------------');
	console.log(req.body.user);
	console.log('-------------------------');
    if (req.body.user.rol == "Administrador")
        where["usuarioId"] = { $in: req.body.user.oficiales }
    else
        where["usuarioId"] = req.body.user.usuarioId;
    
    filtros = {};

    var values = ['campanaId'
                  ,'oficial.zona'
                  ,'oficial.sucursal'
                  ,'cliente.segmento'
                  ,'campana.lineaDeNegocio'];
    var index = 0;
    
    getFilter(values[0], function callback(data) {
            var value = 'USUARIO';
            db.get(value).find(where, { sort : { oficial : 1 } },function (err,obj){
                if (err) throw err;
                filtros[value] = obj;
                
                res.json(filtros);	                    
	        });
        });

		function getFilter(value,callback)
		{
			if (index == values.length)
				callback(filtros);

			db.get("CLIENTECAMPANA").distinct(value, where, function(err,data) {
				if (err) throw err;
				filtros[value] = data.sort();    
				
				index++;
				getFilter(values[index],callback);
			});
		};
	}
}