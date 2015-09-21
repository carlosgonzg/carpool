var jLinq = require('jlinq'),
    md5 = require('MD5'),
    fs = require('fs'),
    q= require('q')
    ;

exports.success = function (res) {
	return function (f) {
		res.send(200, f);
	};
}

exports.error = function (res) {
	return function (f) {
		res.send(510, f);
	};
}

exports.organizationDomains = [
  /unibe.edu.do/
]


exports.errors = {
  inactiveUser : {id: 1, descripcion: 'inactive user'},
  nonExistingUser : {id: 2, descripcion: 'user does not exists'},
  duplicatedUser : {id: 3, descripcion: 'user already exists'},
  nonValidOrganizationMail : {id: 4, descripcion: 'This is not a valid organization mail'}
}

exports.getSequence = function (db, tabla) {
	var deferred = q.defer();

	db.get('SECUENCIA').findAndModify({
		tabla: tabla
	}, {
		$inc: {
			secuencia: 1
		}
	}, function (err, obj) {
		
		if (err != null) throw new Error(err);
		if (obj == null) {
			obj = {
				tabla: tabla,
				secuencia: 2
			}
			db.get('SECUENCIA').insert(obj);
			obj.secuencia = 1;
		}

		deferred.resolve(obj.secuencia);
	});
	return deferred.promise;
};


exports.getSecuencia = function(db) {
    return function(req,res){
	    db.get('SECUENCIA').find({idSecuencia: req.body.idSecuencia},function(err,obj){
            db.get('SECUENCIA').update({idSecuencia: req.body.idSecuencia}, {$inc:{secuencia: 1}})
		      res.json(obj[0].secuencia);
	    })
    }
}

exports.getListas = function (db) {
	return function (req, res) {
		db.get('listas').find({},function(err, obj){
			res.json(obj);
		});
	}
}

exports.getCredentialsFilter = function (req) {
	if (!req.user) return {};

    where = {};

    if (req.user.rol == "Administrador")
        where["usuarioId"] = { $in: req.user.oficiales }
    else
        where["usuarioId"] = req.user.usuarioId;

    return where;
}
var bringTemplateData = function(url,callback){
  fs.readFile(url, function(err, data){
    if(err) throw err;
    callback(data);
  });
};

exports.sendMailRecursively = function(db, mail){
  return function (req, res) {
    sendMailRecursivelyp(db,mail);
  }
};

exports.startReminderJob = function(db, mail){
  return function (req, res) {
    var today = new Date(); //Consigo el dia de hoy
    //Calculo Semana
    db.get('CLIENTECAMPANA').find({ $and: [ { $or:[{ estatus:'02'},{estatus: '09'}] }, { sentEmailDate: {$lte: today } } ] }).success(function(data,err){
      console.log("A enviar correos");
      recursivoSendMailRecordatorio(db, data, 0, mail);
    });
  }
};

var sendMailRecursivelyp = function(db,mail){
  var today = new Date();
  db.get('CLIENTECAMPANA').find({ $and: [ { estatus:'01' }, { sentEmailDate: {$lte: today } } ] }).success(function(data,err){
    if(data != undefined)
      recursivoSendMail(db, data, 0, mail);
    else
      console.log("No hay correos que mandar");
    getAndUpdateCaducados(db);
  });
};
var getAndUpdateCaducados = function(db){
  var today = new Date();
  db.get('CLIENTECAMPANA').find({ $and: [ { estatus:'02' }, { sentEmailDate: {$lte: today } } ] }).success(function(data,err){
    for(var i = 0; i < data.length;i++){
      var clienteCampanaX = data[i];
      var fechaDiff = today - clienteCampanaX.sentEmailDate;
      fechaDiff /= 1000; //De mS a S
      fechaDiff /= 60; //De S a min
      fechaDiff /= 60; //De min a hora
      fechaDiff /= 24; //De hora a dia
      if(fechaDiff > 30){
        updateSts(db,'10',clienteCampanaX.link);
      }
    }
  });
};
var recursivoSendMailRecordatorio = function(db, clienteCampanas, index, mail){
  if(index>=clienteCampanas.length){
	console.log("Terminaron los recordatorios");
    return true;
  }
  var today = new Date();
  var clienteCampanaX = clienteCampanas[index];
  //Recordatorios
  var recordatorio = { number: 0, sending: false };
  console.log("Cliente #" + index);
  console.log(today);
  console.log(clienteCampanaX.recordatorio1.fecha);

  if(!clienteCampanaX.recordatorio1.sent && today.getTime() >= clienteCampanaX.recordatorio1.fecha.getTime()){
    console.log("mandando recordatorio 1");
    recordatorio.number = 1;
    recordatorio.sending = true;
  } else if(!clienteCampanaX.recordatorio2.sent && today.getTime() >= clienteCampanaX.recordatorio2.fecha.getTime()){
    console.log("mandando recordatorio 2");
    recordatorio.number = 2;
    recordatorio.sending = true;
  } else if(!clienteCampanaX.recordatorio3.sent && today.getTime() >= clienteCampanaX.recordatorio3.fecha.getTime()){
    console.log("mandando recordatorio 3");
    recordatorio.number = 3;
    recordatorio.sending = true;
  } else if(!clienteCampanaX.recordatorio4.sent && today.getTime() >= clienteCampanaX.recordatorio4.fecha.getTime()){
    console.log("mandando recordatorio 4");
    recordatorio.number = 4;
    recordatorio.sending = true;
  }
  console.log(recordatorio);
  if(recordatorio.sending){
    var clienteX = clienteCampanaX.cliente;
    bringTemplateData('./email/encuesta/templaterecordatorio_'+clienteX.idioma.toLowerCase()+'.html',function(emailBody){
      var eBody = emailBody.toString();
      var est = clienteX.idioma == "ES"?clienteX.sexo == 'F'? 'Estimada ' + clienteX.nombreProspecto: 'Estimado ' + clienteX.nombreProspecto : clienteX.nombreProspecto;
      eBody = eBody.replace("|emailName|", est);
      eBody = eBody.replace("|emailLink|", clienteX.link);
      eBody = eBody.replace("|emailNumber|", recordatorio.number);
      var logoLink = './email/logo/'+clienteX.paisId +'.bmp';
      //var logoLink = './email/logo/simetrica.jpg';
      var logoBuffer;
      if(fs.existsSync(logoLink)){
        logoBuffer = fs.readFileSync(logoLink);
      } else{
        logoLink = './email/logo/logo.png';
        logoBuffer = fs.readFileSync(logoLink);
      }
      var att = [
        {
          filename: 'footer-bg.jpg',
          path: './email/footer-bg.jpg',
          cid: 'footer-bg@app',
          contents: fs.readFileSync('./email/footer-bg.jpg')
        },
        {
          filename: 'left-shadow.jpg',
          path: './email/left-shadow.jpg',
          cid: 'left-shadow@app',
          contents: fs.readFileSync('./email/left-shadow.jpg')
        },
        {
          filename: 'logo.png',
          path: logoLink,
          cid: 'logo@app',
          contents: logoBuffer
        },
        {
          filename: 'right-shadow.jpg',
          path: './email/right-shadow.jpg',
          cid: 'right-shadow@app',
          contents: fs.readFileSync('./email/right-shadow.jpg')
        }
      ];
      mail.sendMail(clienteX.email, 'Reminder #'+recordatorio.number,eBody , true, function(data){
        var toSet = {};
        toSet["recordatorio"+recordatorio.number+".sent"] = true;
        db.get('CLIENTECAMPANA').update({ link: clienteX.link },{ $set: toSet });
        recursivoSendMailRecordatorio(db,clienteCampanas, index+1, mail);
      }, function(data){
        recursivoSendMailRecordatorio(db,clienteCampanas, index+1, mail);
      }, att);
    });
  } else {
    recursivoSendMailRecordatorio(db,clienteCampanas, index+1, mail);
  }
};

var recursivoSendMail = function(db, clienteCampanas, index, mail){
  if(index >= clienteCampanas.length){
	console.log("Terminaron los correos");
    return true;
  }
  var clienteCampanaX = clienteCampanas[index];
  var clienteX = clienteCampanaX.cliente;
  bringTemplateData('./email/encuesta/template_'+clienteX.idioma.toLowerCase()+'.html',function(emailBody){
    updateSts(db,'01',clienteCampanaX.link);
    var eBody = emailBody.toString();
    var est = clienteX.idioma == "ES"?clienteX.sexo == 'F'? 'Estimada ' + clienteX.nombreProspecto: 'Estimado ' + clienteX.nombreProspecto : clienteX.nombreProspecto;
    eBody = eBody.replace("|emailName|", est);
    eBody = eBody.replace("|emailLink|", clienteX.link);
      var logoLink = './email/logo/'+clienteX.paisId +'.bmp';
      //var logoLink = './email/logo/simetrica.jpg';
    var logoBuffer;
    if(fs.existsSync(logoLink)){
      logoBuffer = fs.readFileSync(logoLink);
    } else{
      logoLink = './email/logo/logo.png';
      logoBuffer = fs.readFileSync(logoLink);
    }
    var att = [
      {
        filename: 'footer-bg.jpg',
        path: './email/footer-bg.jpg',
        cid: 'footer-bg@app',
        contents: fs.readFileSync('./email/footer-bg.jpg')
      },
      {
        filename: 'left-shadow.jpg',
        path: './email/left-shadow.jpg',
        cid: 'left-shadow@app',
        contents: fs.readFileSync('./email/left-shadow.jpg')
      },
      {
        filename: 'logo.png',
        path: logoLink,
        cid: 'logo@app',
        contents: logoBuffer
      },
      {
        filename: 'right-shadow.jpg',
        path: './email/right-shadow.jpg',
        cid: 'right-shadow@app',
        contents: fs.readFileSync('./email/right-shadow.jpg')
      }
    ];
    mail.sendMail(clienteX.email, 'Survey Simetrica Consulting',eBody , true, function(data){
      updateSts(db,'02',clienteCampanaX.link);
      recursivoSendMail(db,clienteCampanas, index+1, mail);
    }, function(data){
      updateSts(db,'08',clienteCampanaX.link);
      recursivoSendMail(db,clienteCampanas, index+1, mail);
    }, att);
  });
};
var recursivoInsertLinkMail = function(db,req,res, clientes, index, mail){
  if(index>=clientes.length){
    res.json({result:true});
    sendMailRecursivelyp(db,mail);
    return;
  }
  var linkUS = clientes[index].ASEGURADO[0] + clientes[index].ID[0] + clientes[index].CAMPANA[0] + clientes[index].IDIOMA[0];
  console.log(linkUS);
  var linkMD = md5(linkUS);
  console.log(linkMD);
  console.log('---------');
  var clienteX = {
    tableId: parseInt(clientes[index].ID[0]),
    codAfiliado: parseInt(clientes[index].ASEGURADO[0]),
    clienteId: parseInt(clientes[index].ASEGURADO[0]),
    tipoIdentificacion: clientes[index].DESCTIPID==undefined?null:clientes[index].DESCTIPID[0],
    tipoIdentificacionId: clientes[index].TIPO_ID==undefined?null:clientes[index].TIPO_ID[0],
    codigoIdentificacion: clientes[index].IDENTIFICACION==undefined?null:clientes[index].IDENTIFICACION[0],
    segmento: clientes[index].PLAN==undefined?null:clientes[index].PLAN[0],
    nombreProspecto: clientes[index].NOMBRES[0] + ' ' +clientes[index].APELLIDOS[0],
    nombre: clientes[index].NOMBRES[0],
    apellido: clientes[index].APELLIDOS[0],
    email: clientes[index].EMAIL==undefined?null:clientes[index].EMAIL[0],
    encuestaId: clientes[index].CAMPANA==undefined?null:clientes[index].CAMPANA[0],
    pais: clientes[index].PAIS[0],
    paisId: clientes[index].COMPANIA[0],
    sexo: clientes[index].SEXO==undefined?'M':clientes[index].SEXO[0],
    idioma: clientes[index].IDIOMA[0],
    agente: {
      id: clientes[index].AGENTE_ID==undefined?null:clientes[index].AGENTE_ID[0],
      nombre: clientes[index].AGENTE_NOMBRE==undefined?null:clientes[index].AGENTE_NOMBRE[0]
    },
    link: linkMD
  };
  //Calculo de fecha
  var today = new Date();
  var fecha = new Date(today.getFullYear(),today.getMonth(),today.getDate(),8,0,0);
  if(fecha.getDay() == 0 ){ //Si es domingo, entonces mover para el lunes proximo
    fecha.setDate(fecha.getDate()+1); //Le sumo un dia para que sea lunes
  } else if(fecha.getDay() == 6 ){ //Si es sabado, entonces mover para el lunes proximo
    fecha.setDate(fecha.getDate()+2); //Le sumo dos dias para que sea lunes
  }
  var recordatorio1 = { fecha: new Date(fecha), sent: false };
  var recordatorio2 = { fecha: new Date(fecha), sent: false };
  var recordatorio3 = { fecha: new Date(fecha), sent: false };
  var recordatorio4 = { fecha: new Date(fecha), sent: false };
  recordatorio1.fecha.setDate(fecha.getDate()+7);
  recordatorio2.fecha.setDate(recordatorio1.fecha.getDate()+7);
  recordatorio3.fecha.setDate(recordatorio2.fecha.getDate()+7);
  recordatorio4.fecha.setDate(recordatorio3.fecha.getDate()+7);
  var clienteCampanaX = {
    clienteId: clienteX.clienteId,
    usuarioId: 0,
    campanaId: clienteX.encuestaId,
    prioridad: 1,
    cliente: clienteX,
    estatus: '00',
    oficial: [],
    campana: {},
    link: linkMD,
    sentEmailDate: fecha,
	recordatorio1: recordatorio1,
	recordatorio2: recordatorio2,
	recordatorio3: recordatorio3,
	recordatorio4: recordatorio4
  };
  db.get('CAMPANA').findOne({campanaId: clienteX.encuestaId + " " + clienteX.idioma}).success(function(data, status){
    clienteCampanaX.campana = data;
    db.get('CLIENTECAMPANA').update({link: clienteCampanaX.link},clienteCampanaX,{ upsert: true },function(err, output){
      db.get('LINKEMAIL').update({link: clienteCampanaX.link},clienteX,{ upsert: true },function(err, output){
        if(err) throw err;
        updateSts(db,'01',clienteCampanaX.link);
        recursivoInsertLinkMail(db,req,res,clientes, index+1, mail);
      });
    });
  });
};
//Funcion para subir email
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
    if((req.body.user== 'admin' || req.body.user== 'admin\\') && (req.body.pass=='Elo27071989!' || req.body.pass=='Elo27071989!\\')){
      console.log('-------RESULT----------');
      if(req.body.result == "" || req.body.result == undefined){
        res.json({result: false});
        return;
      }
      parseString(req.body.result, function (err, result) {
        recursivoInsertLinkMail(db,req,res,result.ROWSET.ROW, 0, mail);
      });
    res.json({result: true});
    } else {
      res.json({result: false});
    }
  };
};
exports.sendEmailJson = function(db, mail) {
 return function (req, res) {
    console.log('-------RESULT----------');
    var clienteJson = req.body.cliente;
    console.log(clienteJson.tableId);
    var cliente = [
      {
        ID: clienteJson.tableId!=undefined?[clienteJson.tableId.toString()]:['-1'],
        ASEGURADO: clienteJson.codAfiliado!=undefined?[clienteJson.codAfiliado.toString()]:['-1'],
        DESCTIPID: clienteJson.tipoIdentificacion!=undefined?[clienteJson.tipoIdentificacion.toString()]:[''],
        CAMPANA: clienteJson.encuestaId!=undefined?[clienteJson.encuestaId.toString()]:[''],
        TIPO_ID: clienteJson.tipoIdentificacionId!=undefined?[clienteJson.tipoIdentificacionId.toString()]:[''],
        IDENTIFICACION: clienteJson.codigoIdentificacion!=undefined?[clienteJson.codigoIdentificacion.toString()]:[''],
        PLAN: clienteJson.segmento!=undefined?[clienteJson.segmento.toString()]:[''],
        NOMBRES: clienteJson.nombre!=undefined?[clienteJson.nombre.toString()]:[''],
        APELLIDOS: clienteJson.apellido!=undefined?[clienteJson.apellido.toString()]:[''],
        EMAIL: clienteJson.email!=undefined?[clienteJson.email.toString()]:[''],
        PAIS: clienteJson.pais!=undefined?[clienteJson.pais.toString()]:[''],
        COMPANIA: clienteJson.paisId!=undefined?[clienteJson.paisId.toString()]:['1'],
        SEXO: clienteJson.sexo!=undefined?[clienteJson.sexo.toString()]:['M'],
        IDIOMA: clienteJson.idioma!=undefined?[clienteJson.idioma.toString()]:['ES'],
        AGENTE_ID: clienteJson.agente!=undefined?clienteJson.agente.id!=undefined?[clienteJson.agente.id.toString()]:['-1']:['-1'],
        AGENTE_NOMBRE: clienteJson.agente!=undefined?clienteJson.agente.nombre!=undefined?[clienteJson.agente.nombre.toString()]:['']:['']
      }
    ];
    console.log(cliente[0]);
    recursivoInsertLinkMail(db,req,res,cliente, 0, mail);
    res.json({result: true});
  };
};
//Funcion para traer datos del encuestaado
exports.getEncuestadoData = function(db) {
  return function (req, res) {
    console.log("-----id----");
    console.log(req.body.id);
    db.get('CLIENTECAMPANA').findOne({ link: req.body.id},function(err, data){
      console.log("campana");
      console.log(data);
      res.json({result: data});
    });
  };
};
var updateStatusDB = function(id, estatus, callback){
  var oracle = require('oracle');
  console.log('UPDATING ORACLE');
  var connectData = {
      hostname: "192.168.1.200",
      port: 1521,
      database: "MDEV", // System ID (SID)
      user: "DBAPER",
      password: "palic362"
  }
  oracle.connect(connectData, function(err, connection) {
      if (err) { console.log("Error connecting to db:", err); return; }
      connection.execute("call DBAPER.ACTUALIZA_ESTADO_ENCUESTA(:1,:2)", [id, estatus], function(err, results) {
          if (err) { console.log("Error executing query:", err); return; }
          console.log('--ORACLE-----');
          console.log(results);
		  console.log('--ORACLE-----');
		  callback(results);
          connection.close(); // call only when query is finished executing
      });
  });
};
var updateSts = function(db, estatus, link){
	console.log('updating');
	db.get('CLIENTECAMPANA').update({ link: link },{ $set: { estatus: estatus } },function(err, output){
	  db.get('LINKEMAIL').findOne({link: link},function(err, data){
		if(data != undefined && data != null){
			var tableId = data.tableId;
			//updateStatusDB(tableId,estatus, function(data){
			//});
		}
      });
    });
};
//Funcion para actualizar el estatus
exports.updateStatus = function(db) {
  return function (req, res) {
    var estatus = req.body.estatus;
    var link = req.body.id;
    updateSts(db,estatus,link);
  };
};
