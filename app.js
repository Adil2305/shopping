var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var db=require('./config/connection')
var adminpanelRouter = require('./routes/adminpanel');  
var usersRouter = require('./routes/users');
var hbs=require('express-handlebars');
var app = express();
//var session=require('express-session')
const session = require('express-session');

var fileUpload=require('express-fileupload')
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

db.connect((err)=>{
  if (err)
    console.log('connection error'+err);
    else
    console.log('connection sucess');
    
})
app.engine('hbs',hbs.engine({extname:'hbs',defaultLayout:'layoutall',layoutsDir:__dirname+'/views/layout/',partialsDir:__dirname+'/views/partials/'}))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());  

app.use(session({secret:"key",cookie:{maxAge:1200000}}))
app.use('/', usersRouter);   
app.use('/admin', adminpanelRouter);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));  
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app; 
