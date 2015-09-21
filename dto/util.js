var q= require('q')
,Crud = require('./crud');

//Constructor
function Util(db, id) {
	this.db = db;
	this.id = id;
}

Util.prototype.getCollection = function (collection) {
	var deferred = q.defer();

	var crud = new Crud(this.db,collection);

  crud.search({})
  .then(deferred.resolve)
  .fail(deferred.reject);

  return deferred.promise;
}
//Export
module.exports = Util;
