/**
 * UserController
 *
 * @module      :: Controller
 * @description :: A set of functions called `actions`.
 *
 *                 Actions contain code telling Sails how to respond to a certain type of request.
 *                 (i.e. do stuff, then send some JSON, show an HTML page, or redirect to another URL)
 *
 *                 You can configure the blueprint URLs which trigger these actions (`config/controllers.js`)
 *                 and/or override them with custom routes (`config/routes.js`)
 *
 *                 NOTE: The code you write here supports both HTTP and Socket.io automatically.
 *
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

// Location: /api/controllers/AuthController.js
var passport = require("passport");

module.exports = {

  // https://developers.google.com/
  // https://developers.google.com/accounts/docs/OAuth2Login#scope-param
  gcalendar: function (req, res) {
    passport.authenticate('google', { failureRedirect: '/login', session: false, accessType: 'offline', scope:['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'] },
      function (err, profile) {
        var google_calendar_accessToken = profile.accessToken;
        var google_calendar_refreshToken = profile.refreshToken ? profile.refreshToken : req.user[0].google_calendar_refreshToken;
        var google_id = profile._json.email;
        User.findOne(req.user[0].id).exec(function(err, user) {
          if(err || user == null) res.send("Authentication failed!!");
          var now = new Date();
          var expires = new Date(now.getTime() + 3600*1000);
          User.update(
            {id: user.id}, 
            {
              google_calendar_accessToken:google_calendar_accessToken,
              google_calendar_refreshToken:google_calendar_refreshToken,
              google_calendar_token_expires:expires,
              google_id:google_id
            }, 
            function(err, new_user) {
              if(err || new_user == null) res.send("Authentication failed!");
              res.redirect('/user/find/' + req.user[0].id);
          })
        })
      })(req, res);
    },

  login: function(req,res){
    if(req.isAuthenticated()) {
      res.redirect('/user/find/' + req.user[0].id)
    } else {
      res.view("auth/login");
    }
  },

  process: function(req,res){
    passport.authenticate('local', function(err, user, info){
      if ((err) || (!user)) {
        res.redirect('/login');
        return;
      }
      req.logIn(user, function(err){
        if (err) res.redirect('/login');
        return res.redirect('/login');
      });
    })(req, res);
  },

  logout: function (req,res){
    req.logout();
    res.redirect('/login');
  },
  _config: {}
};
