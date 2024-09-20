
/*
  server.js: Main file used to set up server
*/

"use strict";
const express           = require('express');
const app               = express();
const mustacheExpress   = require('mustache-express');
const bodyParser        = require('body-parser');
const cookieParser      = require('cookie-parser');
const session           = require('cookie-session');
const passport          = require('passport');
const creds             = require('./credentials.js');
const sys               = require('./settings.js');

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.engine('html', mustacheExpress());
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/views'));

// configure session
app.use(session({ 
  secret: creds.SESSION_SECRET,
  name: 'session',
  resave: true,
  saveUninitialized: true
}));

// custom middleware
app.use((req, res, next) => {

  // add new render function which always includes certain default values
  res.rend = (filename, obj) => {
    res.render(filename, Object.assign({
      defaults: {
        devMode: sys.DEV_MODE,
        isAuth: req.isAuthenticated() && req.user && req.user.local,
        sysName: sys.SYSTEM_NAME
      }
    }, obj));
  }

  /*  
      Adds error rendering function to response object

      Calls to res.err are as follows:
      res.err({
        r: err
        fr: "You are unable to access this resource.", 
        li: "/auth/google?returnTo=" + querystring.escape(req.url),
        ti: "Authenticate as a different user"
      }); 
  */
  res.err = (params) => {
    res.rend('error.html', { 
      raw: params.r,
      friendly: params.fr,
      link: params.li,
      linkTitle: params.ti
    });
  }

  next();
});

// import local modules for routes / all other functionality
const auth = require('./auth.js')(app, passport);
const routes = require('./routes.js')(app);
// unhandled routes redirect to home
app.get('*', (req, res) => { res.redirect('/'); });

if (!sys.inDevMode) {
        var lex = require('greenlock-express')
        lex.init({
          packageRoot: __dirname,
          configDir: "./greenlock.d",
 
          // contact for security and critical bug notices
          maintainerEmail: "lindberghjohnny@gmail.com",
 
          // whether or not to run at cloudscale
          cluster: false
        }).serve(app);

       
}


// start server listening
//var server = app.listen(sys.PORT, () => {
 // console.log(sys.SYSTEM_NAME + ' server listening on port %d', server.address().port);
//});
