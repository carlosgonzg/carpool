var q= require('q')
,Crud = require('./crud')
,Review = require('./review')
,mail = require('../mail')
,util = require('../controllers/util')
,graph = require('fbgraph')
,secret = "asd243131"
, config = require('../config').getEnv();

//Constructor
function User(db, id) {

	this.crud = new Crud(db,'USER');
  this.review = new Review(db,id);

  this._id = id;

	this.schema = {
		id: "/User",
		type: "object",
		properties: {
			mail: { type: "string", required: true, format:"email"},
			gender: { type: "string", required: true},
			name: { type: "string", required: true},
			birthdate: { type: "date", required: true},
			organizationMail: { type: "string", required: true, format:"email"},
			positiveReviews: { type: "number", required: true, minimum: 0},
			negativeReviews: { type: "number", required: true, minimum: 0},
			experience: { type: "number", required: true, minimum: 0},
			level: { type: "number", required: true, minimum: 0},
      facebookId: { type: "string", required: true},
			badges: {
					type: "array",
					items: { type: "object" }
				}
		}
	};

}

User.prototype.insert = function (mail,newObject) {
	var deferred = q.defer();

	console.log('Inserting',newObject);

	//Initial Params
	newObject.positiveReviews = 0;
	newObject.negativeReviews = 0;
	newObject.experience = 0;
	newObject.level = 0;
	newObject.badges = [];
	newObject.active = false;


  var domains;
  for (var domain in util.organizationDomains)
  {
    domains += domain + "|"
  }

  /*
  if (!new Regex(domains).test(newObject.orgnizationMail))
  {
      deferred.reject(util.errors.nonValidOrganizationMail);
      return deferred.promise;
  };
  */

	//Send data to DB
  var _this = this;

  _this.crud.search({$or:[{organizationMail: newObject.organizationMail},
                          {mail: newObject.mail},
                          {facebookId: newObject.facebookId},
                          ]})
  .then(function(founded){
    console.log('Already Existing',founded);

    if(founded.data.length == 0) {
      return _this.crud.insert(newObject,_this.schema)
    }

    throw util.errors.duplicatedUser;

  })
  .then(function (obj) {
    console.log('Sending Confirmation Mail',obj.data);
    newObject = obj.data;

    return _this.sendConfirmationMail(mail,newObject.organizationMail)
  })
  .then(function (obj) {
    deferred.resolve(newObject);
  })
  .fail(deferred.reject);

  return deferred.promise;
}

User.prototype.resendConfirmationMail = function (mail,facebookId) {
  var deferred = q.defer();

  //Send data to DB
  var _this = this;

  _this.crud.search({facebookId: facebookId})
  .then(function(obj){
    console.log('Sending Confirmation Mail',obj.data);

    if (obj.data.length == 0) {console.log('error'); throw util.errors.nonExistingUser; }
    var newObject = obj.data[0];

    return _this.sendConfirmationMail(mail,newObject.organizationMail)
  })
  .then(deferred.resolve)
  .fail(deferred.reject);;

  return deferred.promise;
}

User.prototype.sendConfirmationMail = function (mail, organizationMail) {
  var deferred = q.defer();

  console.log('Sending Mail',organizationMail);

  var token = mail.sendConfirmateMail(organizationMail);

  this.crud.update({ orgnizationMail: organizationMail},
                    { confirmToken: token })
  .then(deferred.resolve)
  .fail(deferred.reject);

  return deferred.promise;
}



User.prototype.login = function (jwt, secret, accessToken) {
	var deferred = q.defer();
	var _this = this;
		if (accessToken == null || accessToken == undefined) deferred.reject(new Error("secret is required"));
	    // extending specific access token
    graph.extendAccessToken({
        "access_token": accessToken
      , "client_id": config.FB_API
      , "client_secret": config.FB_SECRET
    }, function (err, facebookRes) {
       console.log("Error",err);
       console.log(facebookRes);
				if (err == null && facebookRes != null && facebookRes.error == undefined)
				{
					 graph.get('/me?access_token=' + facebookRes['access_token'], function(err, res){
  					console.log('FB - Error',err)

            _this.crud.search({facebookId: res.id})
  					.then(function(user){
  						var _user = user.data[0];
  						if (_user == null) {
  							deferred.reject(util.errors.nonExistingUser);
  						} else if (!_user.active) {
  							deferred.reject(util.errors.inactiveUser);
  						} else {
  							var token = jwt.sign(_user, secret, { expiresInMinutes: 60*5 });
  							deferred.resolve({ token: token, user: _user });
  						}
  						},deferred.reject);
  					});
				}
				else
				{
						deferred.reject({id: 999, exception: err});
				}
    });


	return deferred.promise;
}

User.prototype.activate = function (token) {

  this.crud.update({ confirmToken: token },
                   { active: true, confirmToken: null});

}


User.prototype.setPreference = function (preference){
  var deferred = q.defer();

  var schema = {
    id: "/Preference",
    type: "object",
    properties: {
        smoker: { type: "number", required: true, minimum: 0, maximum: 2},
        music: { type: "number", required: true, minimum: 0, maximum: 2},
        talkative: { type: "number", required: true, minimum: 0, maximum: 2},
        pets: { type: "number", required: true, minimum: 0, maximum: 2}
    }
  }

  if (this.crud.validate(deferred, preference, schema))
  {
    this.crud.update({_id: parseInt(this._id)}, { preference:preference })
       .then(deferred.resolve)
       .fail(deferred.reject);
  }

  return deferred.promise;
}


User.prototype.addCar = function (car){
  var deferred = q.defer();

  var schema = {
    id: "/Car",
    type: "object",
    properties: {
      brand: { type: "string", required: true},
      model: { type: "string", required: true},
      year: { type: "number", required: true, minimum: 100},
      color: { type: "string", required: true},
      airConditioner: { type: "boolean", required: true}
    }
  };

  if (this.crud.validate(deferred, car, schema))
  {
    this.crud.updateOne(
     this._id,
     {
       $push: {
         cars: car
       }
     })
     .then(deferred.resolve)
     .fail(deferred.reject);
   }

  return deferred.promise;
}


User.prototype.updateCar = function (car,index){
	var deferred = q.defer();

	var schema = {
		id: "/Car",
		type: "object",
		properties: {
			brand: { type: "string", required: true},
			model: { type: "string", required: true},
			year: { type: "number", required: true, minimum: 1900},
			color: { type: "string", required: true},
			airConditioner: { type: "boolean", required: true}
		}
	};

	if (this.crud.validate(deferred, car, schema))
	{
		var obj = {};
		obj["cars."+index] =  car;

		this.crud
		.updateOne(this._id,{$set: obj})
		.then(deferred.resolve)
		.fail(deferred.reject);
	}

	return deferred.promise;
}

User.prototype.getMyRoutes = function(db, id){
	var deferred = q.defer();
	var routeCrud = new Crud(db,'ROUTE');
	routeCrud.search( { 'driver._id' : id } )
	.then(function(routes){
		deferred.resolve(routes);
	});
	return deferred.promise;
};




//Export
module.exports = User;
