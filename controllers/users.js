var md5 = require('MD5');

// Authenticate user
exports.authenticate = function(db, secret, jwt){
  return function(req, res) {
    findLogin(db, req,
        function(usr){
          if (usr){
             var token = jwt.sign(usr.user, secret, { expiresInMinutes: 60*5 });
			 req.user = usr.user;
             res.json({ token: token, user: usr.user })
          }
          else{
            res.send(401, 'Wrong user or password');
          }
        });
  };
};

// Registration page
exports.signup = function(db){
  return function(req, res){
    var usr, users, token;

    req.assert('nombre', 'required').notEmpty();
    req.assert('apellido', 'required').notEmpty();
    req.assert('email', 'required').notEmpty();
    req.assert('email', 'valid email required').isEmail();
    req.assert('password', '4 to 20 characters required').len(4,20);
    
    if (errors = req.validationErrors()) {
      res.json({err: 'ERR_INVALID_PARAMETERS', errors: errors}, 500);
      return;
    }

    checkUser(db, req.body.email, function(exist_usr){
      if (exist_usr){
        res.json({err: 'ERR_USR_EMAIL_EXISTENTE'}, 500);
        return;
      }

      usr = {
		  usuarioId: req.body.usuarioId
        , email: req.body.email
        , password: md5(req.body.password)
        , active: 0
        , profile: new profile(req)
        , reclamos: []
		, tipo: req.body.tipo
      };
      users = db.get('users');
      users.insert(usr, function (err, doc) {
          if (err){
            res.json({ err: err});
          }
          else{
            //token = mail.sendConfirmateMail(usr.email);
            //users.update({ email: usr.email, name: usr.name},
            //             { $set: { confirmToken: token }}
            //);
            res.json({ res: 'OP_OK'});
          }
      });
    });
  }
};
exports.update = function(db){
  return function(req, res){
    var usr, users, token;

    req.assert('nombre', 'required').notEmpty();
    req.assert('apellido', 'required').notEmpty();
/*    req.assert('direccion', 'required').notEmpty();
    req.assert('telefono', 'required').notEmpty();
    req.assert('matricula', 'required').notEmpty();
    req.assert('nacimiento', 'required').notEmpty();
    */

    if (errors = req.validationErrors()) {
      res.json({err: 'ERR_INVALID_PARAMETERS', errors: errors}, 500);
      return;
    }

    usr = new profile(req);
    users = db.get('users');
    users.update({ email: req.user.email },
    //users.update({ email: 'zzz@zz.com'},
                 { $set: { profile: usr }}
    );
    res.json({ res: 'OP_OK'});
  }
}

exports.profile= function(db){
  return function(req, res){
    db.get('users').findOne({ email: req.user.email }, function(err,obj) { 
      var result = obj.profile;
      if (result){
        result.email = req.user.email;
      }
      res.json(result);
    }).profile;
  }
}

exports.confirmEmail = function(db){
  return function(req, res){
     req.checkParams('token', 'required').notEmpty();
     req.checkParams('token', 'invalid').len(15,200);
     var errors = req.validationErrors();
     if (errors) {
        res.json({err: 'Invalid parameters', errors: errors}, 500);
        return;
     }
     var users = db.get('users');
     users.update({ confirmToken: req.param('token') },
        { $set: { active: 1, confirmToken: null}}
     );
     res.redirect("/public/app/#/confirm/email/"+ req.param('token'));
  };
}

exports.find = function(db, name, email){
  return function(req, res){
  db.get('users').findOne({ name: req.params.name, email: req.params.email })
    .on('success', function(usr){
      return res.json(usr);
    });
  }
}

exports.findLogin = findLogin;

function checkUser(db, email, callback){
  db.get('users').findOne({ email: email })
   .on('success', function(usr){
      if (usr){
        callback(usr);
      }
      else{
        callback(false);
      }
  });
}

function findLogin(db, req, callback){
  req.assert('email', 'required').notEmpty();
  req.assert('password', 'required').notEmpty();
  
  if (req.validationErrors()) {
    callback(false);
    return;
  }
  console.log(req.body.email.toLowerCase());
  db.get('USUARIO').findOne({ usuarioRed: req.body.email.toLowerCase(), password: md5(req.body.password)}/*, { id: 1, email: 1})
    .on('success'*/, function(err,usr){
        console.log(usr)
        console.log(err)
		if (usr){
          callback({user: usr});          
      } else{
        callback(false);
      }
  });
}

function profile(req){
  this.nombre = req.body.nombre;
  this.apellido = req.body.apellido;
  this.direccion = req.body.direccion;
  this.telefono = req.body.telefono;
  this.matricula = req.body.matricula;
  this.especialidad = req.body.especialidad;
  this.nacimiento = req.body.nacimiento;
  this.centroMedico = req.body.centroMedico || [];
  this.asociaciones = req.body.asociaciones || [];  this.doctorId = req.body.doctorId;
  this.asociaciones = req.body.asociaciones || [];
  this.centroMedico = [];
}