exports.estadistica = function(db){
  return function(req, res){
    //console.log(typeof req.body.filter)
    var filter = typeof req.body.filter == "string"? JSON.parse(req.body.filter):req.body.filter;
		var type = req.body.type;
	
		console.log(JSON.stringify(filter));
		console.log(type);
		if(type=="encuesta"){
			getEstadisticaEncuesta(db, filter, function(data){
					res.json({ result: data });
			});
		} 
		else if(type=="automatico"){
			if(filter.crmEmailDate != undefined){
				var fechaDesde = new Date(filter.crmEmailDate);
				var fechaHasta = new Date(filter.crmEmailDate);			
				fechaDesde.setDate(fechaDesde.getDate()+1);
				fechaDesde.setSeconds(0);
				fechaDesde.setMinutes(0);
				fechaDesde.setHours(0);
				
				fechaHasta.setDate(fechaHasta.getDate()+2);
				fechaHasta.setSeconds(0);
				fechaHasta.setMinutes(0);
				fechaHasta.setHours(0);
				console.log(fechaDesde);
				console.log(fechaHasta);
				delete filter.crmEmailDate;
				filter["$and"] = [
					{
						crmEmailDate: {
							$gte: fechaDesde
						}
					},
					{
						crmEmailDate: {
							$lte: fechaHasta
						}
					}
				];
			}	
			getEstadisticaAutomatico(db, filter, function(data){
				res.json({ result: data });
			});
		}
  };
};

var getEstadisticaAutomatico = function(db, filter, callback){
	var resultadosEstadistica = {
		enviadoVsFalla: {
			enviado: { 
				label: "Correos Enviados",
				valor: 0
			},
			falla: { 
				label: "Correos con Error al enviar",
				valor: 0
			}
		},
		tipoCorreo:{
		
		},
		procesadoVsPendiente: {
			procesado: { 
				label: "Correos Enviados",
				valor: 0
			},
			pendiente: { 
				label: "Correos Pendientes",
				valor: 0
			}
		}
	};
	db.get('listas').findOne({}, function(err, data){
		var lista = data;
		db.get('EMAILAUTOMATICO').find(filter,function(err,data){
			for(var i = 0; i < data.length; i++){
				var correo = data[i];
				//Enviado vs Falla
				if(correo.estatus == '08'){
					resultadosEstadistica.enviadoVsFalla.falla.valor++;
				}
				else if(correo.estatus == '02') {
					resultadosEstadistica.enviadoVsFalla.enviado.valor++;
				}
				//Procesados vs Pendientes
				if(correo.estatus == '00' || correo.estatus == '01'){
					resultadosEstadistica.procesadoVsPendiente.pendiente.valor++;
				}
				else if(correo.estatus == '02') {
					resultadosEstadistica.procesadoVsPendiente.procesado.valor++;
				}
				if(resultadosEstadistica.tipoCorreo[correo.correo.tipo] == undefined){
					resultadosEstadistica.tipoCorreo[correo.correo.tipo] = { 
						valor: 1,
						label: lista.tipoCorreo[correo.correo.tipo]
					};
				}
				else {
					resultadosEstadistica.tipoCorreo[correo.correo.tipo]["valor"]++;
				}
			}
			callback(resultadosEstadistica);
		});
	});
};
var getEstadisticaEncuesta = function(db, filter, callback){
	db.get('CLIENTECAMPANA').find(filter,function(err,data){
		var resultadosEstadistica = {
			satisfaccionTipoContacto: {
				"email":{
					valor:"Por Correo Electrónico",
					satisfactorio: 0,
					insatisfactorio: 0
				},
				"phone":{
					valor:"Por Teléfono",
					satisfactorio: 0,
					insatisfactorio: 0
				},    
				"office":{
					valor:"Por Oficina",
					satisfactorio: 0,
					insatisfactorio: 0
				},
				"agent":{
					valor:"Por un Agente",
				 satisfactorio: 0,
					insatisfactorio: 0
				}        
			},
			porTipoContacto: {
				"email":{
					valor:"Por Correo Electrónico",
					conteo: 0
				},
				"phone":{
					valor:"Por Teléfono",
					conteo: 0
				},    
				"office":{
					valor:"Por Oficina",
					conteo: 0
				},
				"agent":{
					valor:"Por un Agente",
					conteo: 0
				}        
			},
			renovarRecomendar:{
				"05":{
					valor: "No renovara",
					conteo:0
				},
				"06":{
					valor: "No recomendara",
					conteo:0
				},
				"07":{
					valor: "No renovara, no recomendara",
					conteo:0
				}
			},
			opcionPorPregunta:{},
			porOpcion:{
				"101": { 
					valor: '',
					conteo: 0
				},
				"100": { 
					valor: '',
					conteo: 0 
				},
				"80": { 
					valor: '',
					conteo: 0 
				},
				"75": { 
					valor: '',
					conteo: 0  
				},
				"60": { 
					valor: '',
					conteo: 0  
				},
				"50": {
					valor: '',
					conteo: 0  
				},
				"40": { 
					valor: '',
					conteo: 0  
				},
				"25": { 
					valor: '',
					conteo: 0  
				},
				"20": { 
					valor: '',
					conteo: 0  
				}
			},
			satisfaccion:{
				satisfaccion: 0,
				insatisfaccion: 0
			}
		};
		var idx = 0;
		var valores = {
			//EN
			//satisfied
			"100":"Completamente Satisfecho",
			"80":"Muy Satisfecho",
			"60":"Satisfecho",
			"40":"Un poco Insatisfecho",
			"20":"Muy Insatisfecho",
			//will
			"101":"Definitivamente Si",
			"75":"Probablemente Si",
			"50":"Puede que no",
			"25":"Definitivamente no",
		};
		for(var i = 0; i < data.length; i++){
			var respuestas = data[i].respuestas;
			var respuestasArray = [];
			for(var j in respuestas){
				var respuestaSeccion = respuestas[j]; 
				for(var k in respuestaSeccion){
						respuestasArray.push(respuestaSeccion[k]);
				}
			}  
			if(data[i].puntajePromedio >= 75 && (data[i].estatus != '05' && data[i].estatus != '06' && data[i].estatus != '07' )){
				resultadosEstadistica.satisfaccion.satisfaccion++;
			}else if(data[i].puntajePromedio < 75 || data[i].estatus == '05' || data[i].estatus == '06' || data[i].estatus == '07' ){
				resultadosEstadistica.satisfaccion.insatisfaccion++;  
			}  
			if(data[i].tipoContacto != undefined){
				resultadosEstadistica.porTipoContacto[data[i].tipoContacto].conteo++;
				if(data[i].puntajePromedio != undefined){
					if(data[i].puntajePromedio < 75){
						resultadosEstadistica.satisfaccionTipoContacto[data[i].tipoContacto].insatisfactorio++;
					} else {
						resultadosEstadistica.satisfaccionTipoContacto[data[i].tipoContacto].satisfactorio++;
					}
					
				}
			}
			if(data[i].estatus == '05' || data[i].estatus == '06' || data[i].estatus == '07')
				resultadosEstadistica.renovarRecomendar[data[i].estatus].conteo++; 
			var respuestaSeccion = respuestasArray;

			for(var k = 0; k < respuestaSeccion.length; k++){
				if(respuestaSeccion[k]!=undefined){
					if(respuestaSeccion[k].puntaje != undefined && respuestaSeccion[k].campo=="satisfaccion"){
							resultadosEstadistica.porOpcion[respuestaSeccion[k].puntaje].valor = valores[respuestaSeccion[k].puntaje];
							resultadosEstadistica.porOpcion[respuestaSeccion[k].puntaje].conteo++;
					}
					if((respuestaSeccion[k].campo=="satisfaccion" || respuestaSeccion[k].campo=="renovacion" || respuestaSeccion[k].campo=="recomendacion") && respuestaSeccion[k].tipo == "RADIO"){
						if(resultadosEstadistica.opcionPorPregunta[k] == undefined){
							ids = k;
							var respuestas;
							if(respuestaSeccion[k].campo=="satisfaccion"){
								respuestas = {
									"100":{
										valor: valores["100"],
										conteo: 0
									},
									"80":{
										valor: valores["80"],
										conteo: 0
									},
									"60":{
										valor: valores["60"],
										conteo: 0
									},
									"40":{
										valor: valores["40"],
										conteo: 0
									},
									"20":{
										valor: valores["20"],
										conteo: 0
									}
								};
							} else{
								respuestas = {
									"101":{
										valor: valores["101"],
										conteo: 0
									},
									"75":{
										valor: valores["75"],
										conteo: 0
									},
									"50":{
										valor: valores["50"],
										conteo: 0
									},
									"25":{
										valor: valores["25"],
										conteo: 0
									}
								};                
							}
							resultadosEstadistica.opcionPorPregunta[k] = {
								id: ids.toString(),
								texto: respuestaSeccion[k].texto,
								respuestas: respuestas
							};
							resultadosEstadistica.opcionPorPregunta[k].respuestas[respuestaSeccion[k].puntaje] = { valor: valores[respuestaSeccion[k].puntaje], conteo: 1};
						} else if(resultadosEstadistica.opcionPorPregunta[k].respuestas[respuestaSeccion[k].puntaje] == undefined){
								resultadosEstadistica.opcionPorPregunta[k].respuestas[respuestaSeccion[k].puntaje] = { valor: valores[respuestaSeccion[k].puntaje], conteo: 1}; 
						}else {  
							//console.log(respuestaSeccion[k].puntaje);
							//console.log(resultadosEstadistica.opcionPorPregunta[k].respuestas[respuestaSeccion[k].puntaje]);
							resultadosEstadistica.opcionPorPregunta[k].respuestas[respuestaSeccion[k].puntaje].conteo++;
						}
					}            
				}
			}
		}
		callback(resultadosEstadistica);
	});
};