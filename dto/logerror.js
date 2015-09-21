var handleError = function(er) {

	//Variables
	var app = require('express')()
  , config = require('./config').init(app)
  , db = require('monk')(config.DB_URL);
	
  //Debugging
	console.log('----ERROR----');
	console.error(er.message);
	console.error(er.stack);
	
	//Implementation

	//Variable to be inserted
	var error = {
		fecha: new Date(),
		mensaje: er.message,
		stack: er.stack
	};

	//Insertion in the data base
	db.get('LOGERROR').insert(error,function(err){

		//In case of an error, write to a file
		if(err) {
			//Poner error en archivo log-dia
			var fs = require('fs');
			var urlfs = __dirname + "/log/log-" + new Date().getFullYear() + "-" + (parseInt(new Date().getMonth())+1) + "-" + new Date().getDate() + ".txt";
			var txtError = "Fecha: " + error.fecha + ", Mensaje: " + error.mensaje + ", Stack: " + error.stack + "\n";
			fs.appendFile(urlfs, txtError, function(err) {
				if(err) {
					console.log(err);
				} else {
					console.log("The log was saved in " + urlfs);
				}
			});
		}

	});

};

module.exports = handleError;