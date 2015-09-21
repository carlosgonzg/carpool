var jLinq = require('jlinq'),
    md5 = require('MD5'),
    fs = require('fs');

var bringData = function(url,callback){
  fs.readFile(url, function(err, data){
    if(err) throw err;
    callback(data.toString());
  });
};
var getMails = function(email){
	var persons = "";
	for(var i = 0; i < email.length ; i++){
		persons += email[i]
		if(i != email.length -1)
			 persons += ", ";
	}
	return persons;
};
var getClienteByType = function(type){

};
var getAttachments = function(attachments, email){
	var att = [];
	for(var i = 0; i < attachments.length;i++){
		attachments[i].name = attachments[i].isLogo? email.paisId : attachments[i].name;
		var filename = attachments[i].isLogo? 'logo.png' : attachments[i].name + attachments[i].ext;
		var fullpath = attachments[i].path + filename;
		var cid = attachments[i].isLogo? 'logo@app': attachments[i].name +'@app';
		var attachment = {
			filename: filename,
			path: fullpath,
			cid: cid,
			contents: fs.readFileSync(fullpath)
		};
		att.push(attachment);
	}
	return att;
};
var recursivoSendMail = function(db, emails, index, mail, fn){
  if(index >= emails.length){
		console.log("Terminaron los correos");
		fn();
    return true;
  }
  var email = emails[index];
	if(email.correo.enviar == "N"){
		recursivoSendMail(db,emails, index+1, mail, fn); 
		return;
	}
	db.get('TEMPLATES').findOne({ name: email.template }, function(err,data){
		if(err) throw err;
		var template = data;
		bringData(data.route[email.idioma],function(emailBody){		
			updateSts(db,'01',email.link);
			var eBody = emailBody;    
			eBody = fillData(emailBody, template.variables, email, true);
			var att = getAttachments(data.attachments, email);
			if(template.firma != undefined){
				fillFirma(db,eBody,template.firma,email.idioma,function(data){
					console.log("Enviando Correo");
					mail.sendMail(getMails(email.correo.to), email.correo.titulo, data , true, function(data){
						console.log("Correo enviado");
						updateSts(db,'02',email.link);
						recursivoSendMail(db,emails, index+1, mail, fn);  
					},
					function(data){
						updateSts(db,'08',email.link);
						console.log("error mandando mail");
						recursivoSendMail(db,emails, index+1, mail, fn); 
					}, att,getMails(email.correo.cc),getMails(email.correo.cco));
				});
			}
			else{
				email.correo.to.unshift(email.principal.email);
				console.log("Enviando Correo");
				mail.sendMail(getMails(email.correo.to), email.correo.titulo, eBody , true, function(data){
					console.log("Correo enviado");
					updateSts(db,'02',email.link);
					recursivoSendMail(db,emails, index+1, mail, fn);  
				},
				function(data){
					updateSts(db,'08',email.link);
					console.log("error mandando mail");
					recursivoSendMail(db,emails, index+1, mail, fn); 
				}, att,getMails(email.correo.cc),getMails(email.correo.cco));
			}

		});
  });
};
var updateSts = function(db, newEstatus, link, fn){
	console.log('updating');
	db.get('EMAILAUTOMATICO').findOne({ link: link}, function(err, data){
		var lastEstatus = data.estatus != '11'? data.estatus: data.lastEstatus;
		var estatusNew = data.estatus != '11'? newEstatus: lastEstatus;
		db.get('EMAILAUTOMATICO').update({ link: link },{ $set: { lastEstatus: lastEstatus, estatus: estatusNew } },function(err, data){
			if(data != undefined && data != null){
				var tableId = data.tableId;    
				/*
				updateStatusDB(tableId,estatusNew, function(data){     
					console.log(data);
				*/
				if(fn!=undefined)
					fn();
				/*
				}); 
				*/
			}
		}); 		
	});
};
var updateStatusDB = function(id, estatus, callback){
  var oracle = require('oracle');
  var connectData = {
      hostname: "192.168.1.205",
      port: 1521,
      database: "ADFSIM", // System ID (SID)
      user: "DBAPER",
      password: "palic362"
  } 
  oracle.connect(connectData, function(err, connection) {
      if (err) { console.log("Error connecting to db:", err); return; }
      connection.execute("call DBAPER.ACTUALIZA_ESTADO_ENCUESTA(:1,:2)", [id, estatus], function(err, results) {
      //connection.execute("select * from compania",[], function(err, results) {
				if (err) { console.log("Error executing query:", err); return; }
				callback(results);
				connection.close(); // call only when query is finished executing
      });
  });
};
var sendMailRecursively = function(db,mail, fn){
  var today = new Date();
  db.get('EMAILAUTOMATICO').find({ $and: [ { estatus:'01' } ] }).success(function(data,err){
    if(data != undefined)
      recursivoSendMail(db, data, 0, mail, fn);  
    else
      console.log("No hay correos que mandar");
  });
};
var recursivoInsertLinkMail = function(db,req,res, emails, index, mail, fn){
  if(index>=emails.length){
    res.json({result:true});
    sendMailRecursively(db,mail, fn);
    return;
  }
	var email = emails[index];
  var linkUS = email.principal.codAfiliado + email.principal.nombreProspecto + email.principal.paisId + email.correo.tipo;
  var linkMD = md5(linkUS); 
  //Calculo de fecha
  var today = new Date();
	email.link = linkMD;	
	email.lastEstatus = '01';
	email.sentEmailDate.push(today);
	db.get('EMAILAUTOMATICO').update({link: linkMD},email,{ upsert: true },function(err, output){
		if(err) throw err;
		updateSts(db,'01',email.link, function(){
			recursivoInsertLinkMail(db,req,res,emails, index+1, mail, fn); 
		});
	});
};
var getValue = function(variable, parameter){
	var campo;
	console.log(parameter);
	if(parameter.indexOf(".") > -1){
		var arrayCampos = parameter.split(".");
		campo = variable;
		for(var j = 0; j < arrayCampos.length;j++){
		campo = campo[arrayCampos[j]];
		}
	} 
	else {
		campo = variable[parameter];
	}
	campo = campo == undefined ? "" : campo;
	return campo;
};
var getTableData = function(cliente, campo){
	var tr = "";
	var td;
	var columns = campo;
	var xColumns = campo.length;
	var yColumns = getValue(cliente,columns[0]);
	var flagTr = false;
	for(var j = 0; j < yColumns.length; j++){
		tr += "<tr";
		console.log(yColumns[j],yColumns[j] == "Total");
		if(yColumns[j] == "Total")
			tr += " style='background-color:#ba8d12;color: white'";
		tr += ">";
		for(var k = 0; k < xColumns; k++){
			td = "<td style='padding:5px 5px'>";
			var flagTd = false;
			var values = getValue(cliente,columns[k])[j];
			if(values != undefined){
				values = values.split(";");
				for(var l = 0; l < values.length;l++){
					td += values[l];
					if(values.length > 1)
						td+= "<br>";
				}
			} 
			else {
				var flagTd = true;
			}
			td += "</td>";
			if(!flagTd){
				tr += td;
			}
		}
		tr += "</tr>";
	}
	return tr;
};
var fillData = function(body, variables, data, isForMail){
	if(data != undefined){
		for(var i = 0; i < variables.length; i++){
			var campo,tr,td;
			var required = variables[i];
			if(required.isTable){
				campo = getTableData(data, required.campo);
			}
			else if(required.isOptional){
				campo = getValue(data, required.campo);
			}
			else{
				campo = getValue(data, required.campo);
			}
			console.log(campo);
			var id = required.id.replace(/\|/g,"\\|");
			console.log(id);
			var reg = new RegExp(id,"g");
			body = body.replace(reg,campo);
		}
	}
	return body;
};
var fillFirma = function(db,body, firma, idioma, callback){
	db.get('FIRMA').findOne({ name: firma}, function(err,data){
		var template = data;
		bringData(template.route[idioma], function(emailBody){
			var eBody = body.replace(/\|firma\|/g,emailBody);
			callback(eBody);
		});
	});
};
var saveData = function(url,data,callback){
	fs.writeFile(url, data, function (err) {
		if (err) {
			callback(false);
			throw err;
		}
		callback(true);
	});
};
exports.editTemplate = function(db){
	return function(req,res){
		var tipoTemplate = req.body.tipoTemplate;
		var idioma = req.body.idioma;
		var body = req.body.data;
		var tabla = req.body.isFirma?"FIRMA" : "TEMPLATES";
		db.get(tabla).findOne({ name: tipoTemplate}, function(err,data){
			var template = data;
			saveData(template.route[idioma],body,function(isOk){
				db.get(tabla).update({name:tipoTemplate},{$set:{lastModified:new Date()}});
					res.json(
						{
							result: isOk,
						}
					);
			});
		});
	};
};
exports.getTemplate = function(db){
	return function(req,res){
		var tipoTemplate = req.body.tipoTemplate;
		var idioma = req.body.idioma;
		var filledData = req.body.data;
		var body;
		var tabla = req.body.isFirma?"FIRMA" : "TEMPLATES";
		db.get(tabla).findOne({ name: tipoTemplate}, function(err,data){
			if(err) throw err;
			console.log("--------------");
			console.log(idioma);
			console.log(tipoTemplate);
			var template = data;
			bringData(template.route[idioma],function(emailBody){
				emailBody = emailBody.replace(/cid:/g,"../images/email/").replace(/@app/g,".jpg");
				if(filledData !=undefined){
					emailBody = fillData(emailBody, template.variables ,filledData);
					if(template.firma != undefined){
						fillFirma(db,emailBody,template.firma,idioma,function(data){
							res.json(
								{
									result: data,
									required: template.variables
								}
							);
						});
					}
					else{
						res.json(
							{
								result: emailBody,
								required: template.variables
							}
						);
					}
				}
				else {
					res.json(
						{
							result: emailBody,
							required: template.variables
						}
					);
				}
			});
		});
	};
};
//Funcion para actualizar el estatus
exports.updateStatus = function(db) {
  return function (req, res) {
    var nEstatus = req.body.estatus;
    var link = req.body.link;
		updateSts(db, nEstatus,link);
		res.json({ result: true});
  };
};
//Funcion que recibe los correos en formato json y los vuelve a reenviar
exports.sendEmailJson = function(db, mail) {
 return function (req, res) {   
    var clienteJson = req.body.cliente;
		if(clienteJson._id != undefined){
			delete clienteJson._id;
		}
		if(clienteJson.checked != undefined){
			delete clienteJson.checked;
		}
		var cliente = [ clienteJson ];
    recursivoInsertLinkMail(db,req,res,cliente, 0, mail, function(){
			res.json({result: true});
		});
    
  };
};
exports.sendEmail = function(db, mail) {
  return function (req, res) {   
    var parseString = require('xml2js').parseString;
    //console.log(req.body);
    console.log('-------USER----------');
    console.log(req.body.user);
    console.log('-------PASS----------');
    console.log(req.body.pass);
    console.log(req.body.result);
		res.json({result: true});
		if((req.body.user== 'admin' || req.body.user== 'admin\\') && (req.body.pass=='admin' || req.body.pass=='admin\\')){
      console.log('-------RESULT----------');
      if(req.body.result == "" || req.body.result == undefined){
        res.json({result: false});
        return;
      }
     // parseString(req.body.result, function (err, result) {
				var tData = {
					COD_TRANSACCION:[0],
					IDIOMA:["E"],
					TIPO_CONTRATO:["P"],
					COMPANIA:[1],
					RAMO:[1],
					SECUENCIAL:[2401],
					COD_TEMPLATE:[1],
					TO:["cgonzalez@simetricaconsulting.com"],
					CC:[""],
					RUTAS_ANEXO:[""],
					ESTATUS_CORREO:["S"],
					SALUDO_1:["Sr. Carlos Gonzalez"],
					SALUDO_2:["Estimado Carlos Gonzalez"],
					ASEGURADO_PRINCIPAL:["Carlos Gonzalez"],
					AGENTE:["Agente 007"],
					TITULO: ["Prueba Template 1"]
				};
        transform(db, tData, function(data){
					recursivoInsertLinkMail(db,req,res,[data], 0, mail, function(){
						res.json({result: true});
					});
				});
     //});
    } else {
      res.json({result: false});
    }
  };
};
var getPoliza = function(compania, ramo, secuencial){
	var poliza = compania.toString();
	poliza += "-";
	poliza += ramo.toString().length > 1? ramo : '0' + ramo.toString();
	poliza += "-";
	var lSecuencial = 7 - secuencial.toString().length;
	for(var i = 0 ; i < lSecuencial; i++){
		poliza += '0';
	}
	poliza += secuencial.toString();
	return poliza;
};
var transform = function(db, data, fn){
	db.get("listas").findOne({}, function(err,lista){
		//Template 1
		
		var tData = new template1(data, lista);
		if(fn != undefined)
			fn(tData);
	});
};

function templateCore(data, lista){
	this.transaccion = data.COD_TRANSACCION[0] || 0;
	this.idioma = data.IDIOMA[0] == "E" ? "ES" : "EN" || 0;
	this.tipoContrato = data.TIPO_CONTRATO[0];
	this.compania = data.COMPANIA[0];
	this.ramo = data.RAMO[0];
	this.secuencial = data.SECUENCIAL[0];
	this.poliza = getPoliza(data.COMPANIA[0],data.RAMO[0],data.SECUENCIAL[0]);
	this.paisId = data.COMPANIA[0];
	this.pais = lista.companias[data.COMPANIA[0]];
	this.correoPais = lista.contactoCompania[data.COMPANIA[0]].correo;
	this.telefonoPais = lista.contactoCompania[data.COMPANIA[0]].telefono;
	this.template = 'template_' + data.COD_TEMPLATE[0];
	this.descripcionContrato = lista.tipoContrato[data.TIPO_CONTRATO[0]];
	this.crmEmailDate = new Date();
	this.sentEmailDate = [];
	this.correo = {
		to:data.TO[0].split(";"),
		cc: data.CC[0].split(";"),
		cco: [],
		tipo: 'T' + data.COD_TEMPLATE[0],
		titulo: data.TITULO[0],
		anexos: data.RUTAS_ANEXO[0].split(";"),
		enviar: data.ESTATUS_CORREO[0],
		datos:{
			saludo1: data.SALUDO_1[0],
			saludo2: data.SALUDO_2[0]
		}
	};
	this.principal = {
		nombreProspecto: data.ASEGURADO_PRINCIPAL[0]
	}
}
function template1(data, lista){
	this.base = templateCore;
	this.base(data, lista);
	this.agente = {
		nombre: data.AGENTE[0]
	}
}
function template2(data, lista){
	this.base = templateCore;
	this.base(data, lista);
	this.agente = {
		nombre: data.AGENTE[0]
	}
	this.correo.datos["solicitantes"] = data.SOLICITANTE[0].split(';');
	this.correo.datos["requisitos"] = data.REQUISITOS[0].split(';');
}
function template3(data, lista){
	this.base = templateCore;
	this.base(data, lista);
	this.agente = {
		nombre: data.AGENTE[0]
	}
	this.correo.datos["monto"] = data.MONTO[0];
}
function template4(data, lista){
	this.base = templateCore;
	this.base(data, lista);
	this.agente = {
		nombre: data.AGENTE[0]
	}
	this.correo.datos["motivo"] = data.MOTIVO_ESTATUS_POLIZA[0];
	this.correo.datos["fechaCancelacion"] = data.FECHA_DE[0];
	this.correo.datos["tipoCancelacion"] = data.ESTATUS_POLIZA1[0];
	this.correo.datos["cancelada"] = data.ESTATUS_POLIZA2[0];
	this.correo.datos["descripcionCancelacion"] = this.correo.datos["tipoCancelacion"] == "Cancelada"? "Si en un futuro usted desea solicitar cobertura nuevamente con nosotros, deberá enviar una nueva solicitud de seguro para su evaluación.":"debido a que no recibimos el pago de la prima para la renovación de la misma";
}
function template5(data, lista){
	this.base = templateCore;
	this.base(data, lista);
	this.agente = {
		nombre: data.AGENTE[0]
	}
	this.correo.datos["producto"] = data.PRODUCTO_PLAN[0];
	this.correo.datos["tituloPeriodo"] = data.TITULO_PERIODO[0];
	this.correo.datos["periodos"] = data.PERIODO[0].split(';');
	this.correo.datos["montos"] = data.MONTO[0];
}
function template6(data, lista){
	this.base = templateCore;
	this.base(data, lista);
	this.agente = {
		nombre: data.AGENTE[0]
	}
	this.correo.datos["producto"] = data.PRODUCTO_PLAN[0];
	this.correo.datos["tituloPeriodo"] = data.TITULO_PERIODO[0];
	this.correo.datos["periodos"] = data.PERIODO[0].split(';');
	this.correo.datos["montos"] = data.MONTO[0];
	this.correo.datos["recordatorio"] = data.TIPO_RECORDATORIO[0];
	this.correo.datos["tipoRecordatorio"] = data.TIPO_RECORDATORIO[0] == "R" ? "Recordatorio" : "Recordatorio Final";
	this.correo.datos["descripcionGracia"] = this.correo.datos["tipoRecordatorio"] == "R"?"y en periodo de gracia" : "y su período de gracia finaliza el día de hoy";
}
function template7(data, lista){
	this.base = templateCore;
	this.base(data, lista);
	this.agente = {
		nombre: data.AGENTE[0]
	}
	this.correo.datos["reclamante"] = {
		tipo: data.RECLAMANTE[0] == "" ? "" : "Reclamante",
		nombre: data.RECLAMANTE[0] || ""
	};
	this.correo.datos["instalacion"] = {
		tipo: data.INSTALACION_MEDICA[0] == "" ? "" : "Instalación Médica",
		nombre: data.INSTALACION_MEDICA[0] || ""
	};
	this.correo.datos["proveedor"] = {
		tipo: data.PROVEEDOR[0] == "" ? "" : "Reclamante",
		nombre: data.PROVEEDOR[0] || ""
	};
	this.correo.datos["nota"] = data.NOTA[0];
}