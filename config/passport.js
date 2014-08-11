// Location: /config/passport.js
var passport    = require('passport'),
  LocalStrategy = require('passport-local').Strategy;

var gcal = require('google-calendar');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

if(process.env.USE_BCRYPT == 'true') {
  var bcrypt = require('bcrypt');
} else {
  var simplecrypt = require('simplecrypt');
}

passport.serializeUser(function(user, done) {
  done(null, user[0].id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findByUsername(username).exec(function(err, user) {
      if (err) { console.log(err); return done(null, err); }
      if (!user || user.length < 1) { 
        return done(null, false, { message: 'Incorrect User'}); 
      }
      if(process.env.USE_BCRYPT == 'true') {
        bcrypt.compare(password, user[0].password, function(err, res) {
          if (!res) return done(null, false, { message: 'Invalid Password'});
          return done(null, user);
        });
      } else {
        try {
          var sc = simplecrypt({salt:sails.config.sc_salt, password:sails.config.sc_password});
        } catch(err) {
          console.log(err);
          return done(null, false, { message: err});
        }
        if(sc.encrypt(password) == user[0].password) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Invalid Password'});
        }
      }
    });
  })
);


module.exports = {
 express: {
    customMiddleware: function(app){
      passport.use(new GoogleStrategy({
          clientID: sails.config.google_consumer_key,
          clientSecret: sails.config.google_consumer_secret,
          callbackURL: "http://localhost:1337/auth/gcalendar",
          scope: ['openid', 'email', 'https://www.googleapis.com/auth/calendar']
        },
        function(accessToken, refreshToken, profile, done) {
          console.log("MIDDLEWARE: ", accessToken, refreshToken, profile);
          profile.accessToken = accessToken;
          return done(null, profile);
        }
      ));
      app.use(passport.initialize());
      app.use(passport.session());
    }
  }
};