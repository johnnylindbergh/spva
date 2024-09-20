
/* 
  auth.js: Authentication routes / configurations and middleware for restricting pages / requests to various levels of authentication
*/

const GoogleStrategy  = require('passport-google-oauth20').Strategy;
const querystring     = require('querystring');
const db              = require('./database.js');
const mid             = require('./middleware.js');
const sys             = require('./settings.js');
const creds           = require('./credentials.js');

// set up routes and configure authentication settings
module.exports = (app, passport) => {
  // cache user info from our system into their session
  passport.serializeUser((user, done) => {
    const email = user._json.email;

    // attempt to locate existing user account by email
    db.lookUpUser(email, (err, profile) => {
      if (!err) {
        // cache profile in session
        user.local = profile;

        // pass through
        done(null, user);

      // if automatic account creation allowed & email pass restriction (or no restriction exists)
      } else if (sys.ALLOW_NEW_ACCOUNTS && (!sys.EMAIL_RESTRICTION || sys.EMAIL_RESTRICTION.test(email))) {
        // add new user account
        db.addUserFromGoogle(user, (err, profile) => {
          // cache profile
          user.local = profile;
          
          // pass through
          done(null, user);
        });
      } else {
        done("The system failed to find an account associated with the given email (" + email + ") and was unable to create a new account.", null);
      }
    });
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  // Google OAuth2 config with passport
  passport.use(new GoogleStrategy({
      clientID: creds.GOOGLE_CLIENT_ID,
      clientSecret: creds.GOOGLE_CLIENT_SECRET,
      callbackURL: sys.DOMAIN + "/auth/google/callback",
      passReqToCallback: true,

      // tells passport to use userinfo endpoint instead of Google+
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    (request, accessToken, refreshToken, profile, done) => {
      process.nextTick(() => {
        return done(null, profile);
      });
    }
  ));

  app.use(passport.initialize());
  app.use(passport.session());

  // authentication with Google endpoint
  app.get('/auth/google', mid.checkReturnTo, passport.authenticate('google', { 
    scope: [
      'profile',
      'email'
    ],
    prompt: 'select_account'  // tells Google to always make user select account
  }));

  // callback for google auth
  app.get('/auth/google/callback',
    passport.authenticate('google', {
      successReturnToOrRedirect: '/',
      failureRedirect: '/failure'
  }));

  // handler for failure to authenticate
  app.get('/failure', (req, res) => {
    res.err({
      fr: "Unable to authenticate.", 
      li: "/auth/google",
      ti: "Try another account"
    });
  });

  // logout handler
  app.get('/logout', mid.checkReturnTo, (req, res) => {
    req.logout();
    res.redirect(req.session.returnTo || '/');
  });

}
