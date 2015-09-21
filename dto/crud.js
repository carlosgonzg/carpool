var q= require('q')
,util = require('../controllers/util')
,Validator = require('jsonschema').Validator;

//Constructor
function Crud(db, table, userId) {
  this.table = table;
  this.db = db;
  this.userId =  userId;

  this.validator = new Validator();
}

//Public Functions
Crud.prototype.buscarPorId = function (query) {
	var deferred = q.defer();

	if (!isNaN(query))
	{
		query = {_id : parseInt(query)};
	}

	console.log('Finding', query);
	this.db.get(this.table).findOne(query, handleMongoResponse(deferred));

	return deferred.promise;
}


Crud.prototype.validate = function(deferred, object, schema)
{
	if (schema == null) throw new Error('Schema is not defined');

	var validated = this.validator.validate(object, schema);

	if (validated.errors.length == 0)
		return true;
	else
  		if (deferred != undefined)
        deferred.reject(validated.errors);

  return false;

}

function converDate(object)
{
  for(var key in object)
  {
    if (/date/.test(key.toLowerCase()))
      {
        object[key] = new Date(object[key]);
      }
  }
  return object;
}

Crud.prototype.insert = function (newObject,schema) {
	var deferred = q.defer();

  newObject.createdDate = new Date();
  newObject = converDate(newObject);

	if (this.validate(deferred, newObject, schema))
  {

  		console.log('Inseting into',this.table,this);
  	var table = this.table;
  	var db = this.db;

  	util.getSequence(this.db,table).then(function (sequence){
  		newObject._id = sequence;
  		db.get(table).insert(newObject,function (err, data) {

  			if (err) throw err;
  			var data = {
  					result: "Ok",
  					data: data
  				};

  				console.log(data);
  				deferred.resolve(data);
  		});
  	//handleMongoResponse(deferred)


  });
  }

	return deferred.promise;
}

Crud.prototype.delete = function (query) {
	var deferred = q.defer();

	if (JSON.stringify(query) == '{}') throw new Error('query is not defined');

	if (!isNaN(query))
	{
		query = {_id : parseInt(query)};
	}

	this.db.get(this.table).remove(query, {justOne:1}, handleMongoResponse(deferred));

	return deferred.promise;
}

Crud.prototype.update = function (query,obj) {

	var deferred = q.defer();

	this.db.get(this.table).update(query, { $set: obj }, handleMongoResponse(deferred));

	return deferred.promise;
}

Crud.prototype.updateOne = function (id, obj) {
  var deferred = q.defer();

  if (isNaN(id))
  {
    deferred.reject('_id is not defined');
    return deferred;
  }

  console.log('_id is not defined '+id);

  return this.updateRaw({_id : parseInt(id)},obj);

}

Crud.prototype.updateRaw = function (query,obj) {

  var deferred = q.defer();
	console.log('SUPER QUERY', obj);
  this.db.get(this.table).update(query, obj, handleMongoResponse(deferred));

  return deferred.promise;
}

Crud.prototype.upsert = function (query,obj) {

	var deferred = q.defer();

	if (!isNaN(query))
	{
		query = {_id : parseInt(query)};
	}

	this.db.get(this.table).update(query, obj, {
		upsert: true
	}, handleMongoResponse(deferred));

	return deferred.promise;
}

Crud.prototype.search = function (query) {
	var deferred = q.defer();

	query = typeof query === 'string' ? JSON.parse(query) : query

	this.db.get(this.table).find(query, handleMongoResponse(deferred));

	return deferred.promise;
}

Crud.prototype.count = function (query) {
	var deferred = q.defer();

	query = typeof query === 'string' ? JSON.parse(query) : query

	this.db.get(this.table).count(query, handleMongoResponse(deferred));

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

Crud.prototype.paginatedSearch2 = function (limit, skip, sort, filter, search, fields) {
    var query = {limit: limit, skip: skip, sort: sort, filter: filter, search: search, fields: fields};
    return this.paginatedSearch(query);
}

//Parameters
	//limit: number of records
	//skip: number of records to be skipped
	//sort: object with the fields in which the query is going to be sorted
	//filter: filter that is gonna be used, must be passed as a String
	//search: a string that is going to be look in a set of fields
	//fields: array of strings with the fields names that the 'search' attribute is going to be looked in
//

Crud.prototype.paginatedSearch = function (query) {
		var deferred = q.defer();

		console.log("*** PAGINATED SEARCH ***");

		var where = {};
		if (query.filter != undefined)
    {
		    if (typeof query.filter == 'string')
          var where =  JSON.parse(query.filter);
        else
          var where =  query.filter;
    }
		var search = query.search;
		var fields = query.fields;
		var dateRange = query.dateRange;

		//Pagination Limits
		console.log("** PAGINATION **");

		var pagination = {
			limit: query.limit,
			skip: query.skip,
			sort: query.sort
		}

		console.log(JSON.stringify(pagination));

		//Login Credentials
		if (this.userId != null)
		{
			where['user.userId']  = this.userId;
		}

		// Filtro por multiples campos
		if (Array.isArray(fields) && fields.length > 0 && search) {
			where.$or = [];
			fields.forEach(function (field) {
				var obj = {};
				// MEJORAR LA BUSQUEDA
				obj[field] = {
					$regex: search,
					$options: 'i'
				}

				where.$or.push(obj);
				console.log(obj);
			});
		}

		// Filtro por multiples campos para fecha
		if (dateRange != undefined && dateRange != "") {
			where.$and = [];
			var fieldsRange = dateRange.fields;
			var fechaInicio = dateRange.start.toString().split('-');
			var fechaFin = dateRange.end.toString().split('-');
			var objectStart = {
				dia: fechaInicio[2].substring(0, 2),
				mes: fechaInicio[1],
				ano: fechaInicio[0]
			};
			var objectEnd = {
				dia: fechaFin[2].substring(0, 2),
				mes: fechaFin[1],
				ano: fechaFin[0]
			};
			fieldsRange.forEach(function (field) {
				var obj = {};
				obj[field] = {
					$gte: new Date(objectStart.ano, objectStart.mes - 1, objectStart.dia, 0, 0, 0),
					$lte: new Date(objectEnd.ano, objectEnd.mes - 1, objectEnd.dia, 23, 59, 59)
				};
				where.$and.push(obj);
			})
		}

		console.log("** Body **");
		console.log(query);

		console.log("** Where **");
		console.log(JSON.stringify(where));

		this.db.get(this.table).find(where, pagination,handleMongoResponse(deferred));

		return deferred.promise;
}

//Private Functions
function handleMongoResponse(deferred){

	return function (err, data) {

		if (err) throw err;

		console.log('insert done2',err,data);

		deferred.resolve({
				result: "Ok",
				data: data
			});
	};
}

//Export
module.exports = Crud;
