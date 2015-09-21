//gNPTj-lJn7WW
//651911948239983
//a515f39829b001be570e9ca11466884e 
var config = {
  development: {
    APP_PORT: process.env.PORT || 8080,
    MAIL_USR: 'mailcarpool@yahoo.com',
    MAIL_PASS: 'Web#8294432085',
    MAIL_SERVICE: 'Yahoo',
    MAIL_NAME: 'Prueba Carpool',
    DB_URL: 'localhost:27017/CPOOL',
//    DB_URL: 'localhost:27017/cpool',
    DB_URL: 'mongodb://user:poolcar@ds039441.mongolab.com:39441/carpooldb',
    CONFIRM_ACCOUNT_LINK: 'http://localhost:8080/auth/activate/',
    FB_API: '660647260699785',
    FB_SECRET: 'e27a57cc323d77835934e6ec593fcfeb',
    FB_REDIRECT: 'http://localhost:8080/auth/facebook'
  },

  production: {
    APP_PORT: process.env.PORT || 8080,
    MAIL_USR: 'mailcarpool@yahoo.com',
    MAIL_PASS: 'Web#8294432085',
    MAIL_SERVICE: 'Yahoo',
    MAIL_NAME: 'Prueba Carpool',
    DB_URL: 'mongodb://user:poolcar@ds039441.mongolab.com:39441/carpooldb',
    CONFIRM_ACCOUNT_LINK: 'https://carpoolrd.herokuapp.com/auth/activate/',
    FB_API: '660647260699785',
    FB_SECRET: 'e27a57cc323d77835934e6ec593fcfeb',
    FB_REDIRECT: 'https://carpoolrd.herokuapp.com/auth/facebook'
  }
}
var mode = "";
function getEnv(){
	console.log(mode);
	return config[mode];
}
function init(app){
  mode = app.get('env');
	console.log(mode);
  return config[mode];
}
exports.getEnv = getEnv;
exports.init = init;

/*
   Root User:     admin
   Root Password: TeGnvZi4G6rD
   Database Name: cpool
*/
