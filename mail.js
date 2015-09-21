var nodemailer = require("nodemailer")
  , md5 = require('MD5')
  , fs = require('fs')
  , smtpTransport
  , urlConfirmMail
  , urlChangePassword
  , mailOptions = {}
	, tmpConfirmMail = "./email/templateConfirm.html"
	, tmpChgPassword = "./email/templateChangePassword.html";


exports.init = function(conf){
  urlChangePassword =  conf.CHANGE_PASSWORD_LINK
  urlConfirmMail = conf.CONFIRM_ACCOUNT_LINK;
  smtpTransport = nodemailer.createTransport("SMTP",{
      service: "Yahoo",
      auth: {
          user: conf.MAIL_USR,
          pass: conf.MAIL_PASS
      }
  });
  mailOptions.from = conf.MAIL_USR;
}

function sendMail(to, subject, body, isHtmlBody){
  mailOptions.to = to;
  mailOptions.subject = subject;
  if (isHtmlBody){
    mailOptions.html = body;
  }
  else{
    mailOptions.text = body;
  }

    console.log("Enviando mensaje",body);
    smtpTransport.sendMail(mailOptions, function(error, response){
      if(error){
          console.log(error);
          throw error;
      }else{
          console.log("Message sent: " + response.message);
      }
      // if you don't want to use this transport object anymore, uncomment following line
      //smtpTransport.close(); // shut down the connection pool, no more messages
  });
}
exports.sendMail = sendMail;
exports.sendChangePassword = function(to){
	var subject = 'Cambio de Contraseña'
	, token = md5(Date() + to)
	, urlEmail = urlChangePassword + '/' + token;

	bringTemplateData(tmpChgPassword,function(data){
    var html = data;
		sendMail(to,subject,html,true, token);
	});
	return token;
};
var bringTemplateData = function(url,callback){
  fs.readFile(url, function(err, data){
    if(err) throw err;
    callback(data.toString());
  });
};
exports.sendConfirmateMail = function(to, tipoUsuario){
  var subject = 'Confirmación de Correo'
    , token = md5(Date() + to)
    , urlEmail = urlConfirmMail + token;
    console.log(urlEmail);
	 bringTemplateData(tmpConfirmMail,function(data){

    var html = data;

     html = html.replace(/\<emailUrl\>/g,urlEmail);

    sendMail(to,subject,html,true);
	});
  return token;
}

function getChangePasswordLink(to, token){
    return '<a href="' + urlChangePassword + '/' + token + '"> Click to Change your password </a>';
}

function getLinkConfirmate(to, token){
  return '<a href="' + urlConfirmMail + '/' + token + '"> Click to Confirmate mail </a>';
}
