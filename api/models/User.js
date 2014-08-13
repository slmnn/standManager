/**
 * User
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 * @docs    :: http://sailsjs.org/#!documentation/models
 */

if(process.env.USE_BCRYPT == 'true') {
  var bcrypt = require('bcrypt');
} else {
  var simplecrypt = require('simplecrypt');
}

module.exports = {
  migrate: 'safe',
  attributes: {
    
    username: {
      type: 'string',
      required: true,
      unique: true
    },

    password: {
      type: 'string',
      required: true
    },

    firstname: {
      type: 'string'
    },

    lastname: {
      type: 'string'
    },

    tel: {
      type: 'string'
    },

    male: {
      type: 'boolean'
    },

    google_calendar_accessToken: {
      type: 'string'
    },

    google_calendar_refreshToken: {
      type: 'string'
    },

    google_calendar_token_expires: {
      type: 'datetime'
    },

    google_id: {
      type: 'string'
    },

    google_calendars_imported: {
      type: 'array'
    },

    email: {
      type: 'email',
      required: true
    },

    shifts: {
      type: 'array'
    },

    available: {
      type: 'array'
    },

    active_questionnaries: {
      type: 'array'
    },

    messages: {
      type: 'array'
    },

    stands: {
      type: 'array'
    },

    //Override toJSON method to remove password from API
    toJSON: function() {
      var obj = this.toObject();
      // Remove the password object value
      delete obj.password;
      delete obj.google_calendar_accessToken;
      // return the new object without password
      return obj;
    }
  },
  beforeUpdate: function(user, cb) {
    if(process.env.USE_BCRYPT == 'true') {
      bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(user.password, salt, function(err, hash) {
          if (err) {
            console.log(err);
            cb(err);
          }else{
            user.password = hash;
            cb(null, user);
          }
        });
      });
    } else {
      if(user.password) {
        console.log("Password change detected!!!", user);
        var sc = simplecrypt({salt:sails.config.sc_salt, password:sails.config.sc_password});
        user.password = sc.encrypt(user.password);
        console.log("Password change detected!!!", user);
        cb(null, user);
      }
    }
    cb(null, user);
  },
  beforeCreate: function(user, cb) {
    if(process.env.USE_BCRYPT == 'true') {
      bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(user.password, salt, function(err, hash) {
          if (err) {
            console.log(err);
            cb(err);
          }else{
            user.password = hash;
            cb(null, user);
          }
        });
      });
    } else {
      var sc = simplecrypt({salt:sails.config.sc_salt, password:sails.config.sc_password});
      user.password = sc.encrypt(user.password);
      cb(null, user);
    }
  }

};
