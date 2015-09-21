var q= require('q')
,Crud = require('./crud')
,util = require('../controllers/util')
;


//Constructor
function Route(db) {

	this.crud = new Crud(db,'ROUTE');

  var direction  = {
    type: "object",
    required: true,
    properties: {
      place: { type: "string", required: true},
      latitude: { type: "number", required: true},
      longitude: { type: "number", required: true},
    }
  };

	this.schema = {
		id: "/Route",
		type: "object",
		properties: {
			routeType: { type: "string", required: true, pattern: "^((Diaria)|(Puntual))$"},
			from: direction,
			to: direction,
			description: { type: "string", required: true},
			price: { type: "number", required: true, minimum: 0},
			hour: { type: "string", required: true,  pattern: "^(00|0[0-9]|1[012]):[0-5][0-9] ?((a|p)m|(A|P)M)$"},
      days: {
          type: "array",
          items: { type: "object",
            properties: {
              code: { type: "number", required: true},
              description: { type: "string", required: true},
            }
          }
        },
      date: { type: "date", required: true},
      driver: { type: "object", required: true},
      suscribers: {
            type: "array",
            items: { type: "object" }
          },
      status: { type: "string", required: true}
		}
	};

}

Route.prototype.insert = function (newObject, driver) {
	var deferred = q.defer();

  newObject.status = "Publicada";
	newObject.driver = {_id :driver._id,
                      name: driver.name} ;
	
	//Send data to DB
	this.crud.insert(newObject,this.schema)
	.then(function (obj) {

		deferred.resolve(obj);

	},function (err) {

		deferred.reject({
				result: 'Not ok',
				errors: err
			});

	});

	return deferred.promise;
}


//Parameters
  //limit: number of records
  //skip: number of records to be skipped
  //sort: object with the fields in which the query is going to be sorted
  //filter: filter that is gonna be used, must be passed as a String
  //search: a string that is going to be look in a set of fields
  //fields: array of strings with the fields names that the 'search' attribute is going to be looked in
//
Route.prototype.search = function (limit,
                                   skip,
                                   sort,
                                   from,
                                   to,
                                   filters) {
  var deferred = q.defer();

  var query = filters ||  {};

  if (from != null)
  {
    query['from.place'] = {
      $regex: from,
      $options: 'i'
    };
  }

  if (to != null)
  {
    query['to.place'] =  {
      $regex: to,
      $options: 'i'
    };
  }


  //Send data to DB
  this.crud.paginatedSearch2(limit || 0, skip || 0, sort || {}, query)
	.then(deferred.resolve)
	.fail(deferred.reject);

  return deferred.promise;
}


Route.prototype.suscribe = function (id,user) {
	var deferred = q.defer();
	//Send data to DB

	this.crud.updateRaw({_id:id}, {$push:{suscribers:user}})
  .then(function (data){
    return that.crud.buscarPorId(id);
  })
	.then(deferred.resolve)
	.fail(deferred.reject);

	return deferred.promise;
}

Route.prototype.unsuscribe = function (id,userId) {
	var that = this;
  var deferred = q.defer();
	console.log('userid', userId);
	//Send data to DB
	this.crud.updateRaw({_id:id}, {$pull:{suscribers:{_id:userId}}},{ multi: true })
  .then(function (data){
    return that.crud.buscarPorId(id);
  })
	.then(deferred.resolve)
	.fail(deferred.reject);

	return deferred.promise;
}



//Export
module.exports = Route;
