/**
 * UserController
 *
 * @module      :: Controller
 * @description	:: A set of functions called `actions`.
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

var gcal = require('google-calendar');
var needle = require('needle');

module.exports = {
	home : function (req, res) {
		var my_stands = []; // TODO
		var my_shifts = []; // TODO
		if(req.user[0]==null || req.user[0].id == null) {
			return res.send("Forbidden!", 403);
		}
		return res.redirect("/user/find/" + req.user[0].id)
	},
	resign : function(req, res) {
		if(req.method == 'POST') {
			User.findOne({id:req.user[0].id}).exec(function(err, user) {
				if(err || user==null) return res.json({msg:"ERROR: " + err});
				var index = user.stands.indexOf(req.params.id ? req.params.id : 'id_not_provided');
				if(index != -1) {
					user.stands.splice(index, 1);
				} else {
					return res.json({msg:"ERROR: You are not member of this stand"});
				}
				console.log("New stands: ", user.stands.toString());
				User.update({id:req.user[0].id},{stands:user.stands}, function(err, new_user) {
					if(err || new_user==null) return res.json({msg:"ERROR: " + err});
					return res.json({msg:"You have resigned from the stand!"});
				})
			});
		}
	},
	find : function (req, res) {
		if(req.user[0].id != req.params.id && req.user[0].username != 'admin') {
			return res.send("Forbidden!", 403);
		}
		if(req.method == 'GET') {
			var google_is_authorized = (typeof req.user[0].google_calendar_accessToken != 'undefined') ? (req.user[0].google_calendar_accessToken.length != 0 ? true : false) : false;
			User.findOne(req.params.id).exec(function(err, u) {
				if(err) return res.send("Error: " + err, 500);
				Stand.find({id:u.stands}).exec(function(err, s) {
					if(err) return res.send("Error: " + err, 500);
					return res.view({user:u, stands:s, gcal_available: google_is_authorized});
				})
			});
		} else {
			return res.send("Only GET allowed!", 404);
		}
	},
	findShifts: function(req, res) {
		var start = new Date(moment(req.query.start));
		var end = new Date(moment(req.query.end));
		Shift.find({assigned_to_id:req.params.id})
		.where({ start: { '>=': start }})
		.where({ end: { '<=': end }})
		.exec(function(err, s) {
			if(err) res.send(500, {error: err});
			var out = [];
			for (var i = 0; i < s.length; i++) {
				out.push({
					title: s[i].title,
					id : s[i].id,
					assigned : s[i].assigned_to_id == null ? false : true,
					assigned_to_name : s[i].assigned_to_name,
					accepted : s[i].accepted,
					start: moment(s[i].start).format("YYYY-MM-DD HH:mm"),
					end: moment(s[i].end).format("YYYY-MM-DD HH:mm"),
					allDay: s[i].allDay
				});
			}
			res.json(out, 200);
		});
	},
	reservations: function(req, res) {
		if(req.method == 'GET') {
			var start = new Date(moment(req.query.start));
			var end = new Date(moment(req.query.end));
			Reservation.find({user_id:req.user[0].id})
			.where({ start: { '>=': start }})
			.where({ end: { '<=': end }})
			.exec(function(err, r) {
				var out = [];
				for (var i = 0; i < r.length; i++) {
					out.push({
						id : r[i].id,
						title: r[i].title,
						start: moment(r[i].start).format("YYYY-MM-DD HH:mm"),
						end: moment(r[i].end).format("YYYY-MM-DD HH:mm"),
						allDay: r[i].allDay
					});
				}
				res.json(out, 200);
			});
		} else {
			res.send(404, "Only GET");
		}
	},
	calendarsetup:  function(req, res) {
		if(req.method == 'GET') {
			if(req.user[0].google_calendar_accessToken == null 
				|| req.user[0].google_calendar_accessToken.length == 0 
				|| req.user[0].google_calendar_refreshToken == null
				|| req.user[0].google_calendar_refreshToken.length == 0
				|| req.user[0].google_calendar_token_expires == null) {
				return res.view({error:"Google calendar is not authorized!", items:[]});
			}
			var now = new Date();
			var google_token_expired = new Date(req.user[0].google_calendar_token_expires);
			var getRefreshToken = function(cb) {
				return cb();
			};
			var accessToken = req.user[0].google_calendar_accessToken;
			if(now > google_token_expired){
				var getRefreshToken = function(cb) {
					var post_data = {
						client_id:sails.config.google_consumer_key,
						client_secret:sails.config.google_consumer_secret,
						refresh_token:req.user[0].google_calendar_refreshToken,
						grant_type:'refresh_token'
					};
					needle.post('https://accounts.google.com/o/oauth2/token', post_data, 
					  function(err, resp, body){
					  	if(body.error != null) {
					  		console.log(body.error)
					  	} else {
					    	console.log("NEW_ACCESS_TOKEN: ",body);
						  	User.update({id:req.user[0].id},
						  		{
						  			google_calendar_accessToken  : body.access_token,
						  		  google_calendar_token_expires: new Date(now.getTime() + (body.expires_in*1000))
						  		},
						  		function(err, new_user) {
						  			accessToken = new_user.google_calendar_accessToken;
										return cb();
						  		});
					  	}
					});

				};
			}
			var google_calendar = {};
			async.series([getRefreshToken, function(cb) {
				google_calendar = new gcal.GoogleCalendar(accessToken);
				return cb();
			}], function(err) {
			  google_calendar.calendarList.list(function(err, data) {
			    if(err) return res.view({error:err, items : []});
			    return res.view({items:data.items, error:''});
			  });
			});
		}
	},
	google_calendar_list: function(req, res) {
		if(req.method == 'POST') {
			console.log(req.body);
			console.log(req.params.all());
			User.findOne({id:req.user[0].id}).exec(function(err, user){
				if(err || user == null) res.json({msg:"ERROR " + err});
				User.update(
					{id:req.user[0].id},
					{google_calendar_imported:req.body.input_calendars.split(',')},
					function(err, new_user) {
						if(err) res.json({msg:"ERROR " + err});
						return res.redirect('/user/find/' + req.user[0].id);
					}
				)
			})
		} else {
			return res.send(404, "Only POST");
		}
	},
	google_calendar_imported: function(req, res) {
		if(req.method == 'GET') {
			var start = new Date(moment(req.query.start));
			var end = new Date(moment(req.query.end));
			if(req.user[0].google_calendar_accessToken == null 
				|| req.user[0].google_calendar_accessToken.length == 0 
				|| req.user[0].google_calendar_refreshToken == null
				|| req.user[0].google_calendar_refreshToken.length == 0
				|| req.user[0].google_calendar_token_expires == null) {
				return res.json([]);
			}
			var now = new Date();
			var google_token_expired = new Date(req.user[0].google_calendar_token_expires);
			var getRefreshToken = function(cb) {
				return cb();
			};
			var accessToken = req.user[0].google_calendar_accessToken;
			if(now > google_token_expired){
				var getRefreshToken = function(cb) {
					var post_data = {
						client_id:sails.config.google_consumer_key,
						client_secret:sails.config.google_consumer_secret,
						refresh_token:req.user[0].google_calendar_refreshToken,
						grant_type:'refresh_token'
					};
					needle.post('https://accounts.google.com/o/oauth2/token', post_data, 
					  function(err, resp, body){
					    console.log("NEW_ACCESS_TOKEN: ",body);
					  	User.update({id:req.user[0].id},
					  		{
					  			google_calendar_accessToken  : body.access_token,
					  		  google_calendar_token_expires: new Date(now.getTime() + (body.expires_in*1000))
					  		},
					  		function(err, new_user) {
					  			accessToken = new_user.google_calendar_accessToken;
									return cb();
					  		});
					});

				};
			}
			var google_calendar = {};
			async.series([getRefreshToken, function(cb) {
				google_calendar = new gcal.GoogleCalendar(accessToken);
				return cb();
			}], function(err) {
				var all_events = [];
				if(req.user[0].google_calendar_imported == null) return res.json([]);
				var calendars = req.user[0].google_calendar_imported;
				async.forEach(calendars, function(calendar, cb) {
					console.log("Fetching: ", calendar);
					google_calendar.events.list(calendar, {'timeMin': start.toISOString(), 'timeMax': end.toISOString()}, function(err, eventList){
						if(err) {
							console.log("ERROR: ", JSON.stringify(err));
							return cb(err)
						};
						console.log("GOOGLE EVENTS: " + eventList.items.length);
						for(var i = 0; i < eventList.items.length; i++) {
							if(eventList.items[i].start.date != null) {
								all_events.push({
									title     : eventList.items[i].summary,
									id        : i,
									start     : eventList.items[i].start.date + 'T00:00:00',
									end       : eventList.items[i].end.date + 'T00:00:00',
									allDay    : false,
									google_id : eventList.items[i].google_id
								});
							} else {
								all_events.push({
									title     : eventList.items[i].summary,
									id        : i,
									start     : eventList.items[i].start.dateTime,
									end       : eventList.items[i].end.dateTime,
									allDay    : false,
									google_id : eventList.items[i].google_id
								});
							}
						}
						return cb();
					});
				}, function(err) {
					if(err) return res.json([],200);
					return res.json(all_events);
				});				
			});
		} else {
			return res.send(404, "Only GET");
		}
	},
	create : function (req, res) {
		if(req.method == 'GET') {
			return res.view();
		}
		if(req.method == 'POST') {
			if(req.body.input_password1 !== req.body.input_password2) {
				return res.send(500, "Mismatching passwords");
			}
			if(req.body.input_username.length <= 2) {
				return res.send(500, "Too short username");
			}
			if(req.body.input_username == "admin") {
				return res.send(500, "Username can not be 'admin'");
			}
			User.find({username : req.body.input_username}).exec(function(err, u) {
				if(err) return res.send(err, 500);
				if(u && u.length > 0) {
					return res.send(500, "Username is already taken!");			
				}
				console.log(JSON.stringify(req.body));
				User.create(
					{
						username:req.body.input_username,
						password:req.body.input_password1,
						firstname:req.body.input_firstname,
						lastname:req.body.input_lastname,
						email:req.body.input_email,
						shifts: [],
						available: [],
						messages: [],
						stands: []
					}
				).exec(function(err, u){
					if(err || u == null) res.send(500, err);
					return res.redirect("/login");		
				});				
			});

		}
	},


  /**
   * Overrides for the settings in `config/controllers.js`
   * (specific to UserController)
   */
  _config: {}

  
};
