var q= require('q')
,Crud = require('./crud');

//Constructor
function Review(db, id) {

	this.crud = new Crud(db,'REVIEW');

  this._id = id;

	this.schema = {
		id: "/User",
		type: "object",
    properties: {
      userId: { type: "number", required: true},
      points: { type: "number", required: true, minimum: -1, maximum: 1}
    }
  };

}

Review.prototype.insert =  function (to, points){
  var deferred = q.defer();

  var _crud = this.crud;

  if (_crud.validate(deferred, {userId: userId, points: points}, schema))
  {

    var query = {'from._id': this._id, 'to:_id': to};

    var fromUser = {};
    var toUser = {};

    _crud.upsert(query,
     {
       from: fromUser,
       to: toUser,
       points: points
     })
     .then(function (obj) {
       deferred.resolve(obj);
     },function (err) {
       deferred.reject({
           result: 'Not ok',
           errors: err
         });

     });
   }

  return deferred.promise;
}

//Export
module.exports = Review;
