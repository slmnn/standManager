/**
 * StandController
 *
 * @description :: Server-side logic for managing stands
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var moment = require('moment');

module.exports = {
	create: function(req, res) {
		if(req.method == 'GET') {
			return res.view();
		}
		if(req.method == 'POST') {
			Stand.create(
				{
					owner_id: req.user[0].id,
					name: req.body.input_name,
					location: req.body.input_location,
					description: req.body.input_description,
					lat: req.body.input_lat,
					lng: req.body.input_lng,
					shifts: []
				}
			).exec(function(err, s){
				User.findOne(req.user[0].id).exec(function(err, u) {
					u.stands.push(s.id + "");
					User.update({id:u.id},{stands:u.stands}, function(err, new_u) {
						return res.json(new_u,200);
					})
				})
			});	
		}
	},
	find: function(req, res) {
		if(req.method == 'GET') {
			var stand; 
			var users = [];
			var findStand = function(cb) {
				Stand.findOne(req.params.id).exec(function(err, s){
					if(err) cb(err);
					stand = s;
					cb(err, s);
				});				
			};
			var findUsers = function(cb) {
				User.find().exec(function(err, u_all){
					if(err) cb(err);
					for(var i = 0; i < u_all.length; i++) {
						for(var j = 0; j < u_all[i].stands.length; j++) {
							if(u_all[i].stands[j] == req.params.id) {
								users.push(u_all[i]);
							}
						}
					}
					users = users.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]);
					cb(err, users);
				});
			};
			var renderView = function(err) {
				if(err) res.send(err, 500);
				return res.view({
					stand: stand,
					users: users
				});				
			}
			async.parallel([findUsers, findStand], renderView);
		}
	},
	findUsersForShift: function(req, res) {
		if(req.method == 'GET') {
			var reserved_users = []; 
			var reserved_user_ids = [];
			var available_users = [];
			var prefering_users = [];
			var all_users = [];
			var all_users_ids = [];
			var start = new Date(moment(req.query.start));
			var end = new Date(moment(req.query.end));
			var findStand = function(cb) {
				Stand.findOne(req.params.id).exec(function(err, s){
					if(err) cb(err);
					stand = s;
					cb(err, s);
				});				
			};
			var findUsers = function(cb) {
				User.find().exec(function(err, u_all){
					if(err) cb(err);
					for(var i = 0; i < u_all.length; i++) {
						for(var j = 0; j < u_all[i].stands.length; j++) {
							if(u_all[i].stands[j] == req.params.id) {
								all_users.push(u_all[i]);
								all_users_ids.push(u_all[i].id + "");
							}
						}
					}
					// Remove duplicates... 
					all_users = all_users.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]);
					all_users_ids = all_users_ids.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]);
					cb(err, all_users);
				});
			};
			var findReservedUsers = function(cb) {
				// (StartDate1 <= EndDate2) and (StartDate2 <= EndDate1) -> Times overlap
				async.forEach(all_users, function(user, cb) {
					Reservation.find({user_id:user.id})
					.where({ start: { '<=': end }})
					.where({ end: { '>=': start }})
					.exec(function(err, r){
						for(var i=0; i < r.length; i++) {
							reserved_user_ids.push(r[i].user_id);
						}
						cb();
					})
				}, function(err) {
					console.log("reserved: " + JSON.stringify(reserved_user_ids));
					User.find({id:reserved_user_ids}).exec(function(err, u){
						reserved_users = u;
						cb();
					})
				})
			};
			var findAvailableUsers = function(cb) {
				var available_users_ids = all_users_ids.filter(function(n) {
					return reserved_user_ids.indexOf(n) == -1;
				});
				console.log("available: " + JSON.stringify(available_users_ids));
				User.find({id: available_users_ids}).exec(function(err, u) {
					available_users = u;
					cb();
				})
			};
			var renderView = function(err) {
				if(err) res.send(err, 500);
				return res.json({
					stand: stand,
					all_users: all_users,
					available_users: available_users,
					reserved_users: reserved_users,
					prefering_users: prefering_users
				});				
			}
			async.series([findStand, findUsers, findReservedUsers, findAvailableUsers], renderView);
		} else {
			res.send("Only GET allowed!", 404);
		}
	},
	findShifts: function(req, res) {
		var start = new Date(moment(req.query.start));
		var end = new Date(moment(req.query.end));
		Shift.find({stand_id:req.params.id})
		.where({ start: { '>=': start }})
		.where({ end: { '<=': end }})
		.exec(function(err, s) {
			if(err) res.send(500, {error: err});
			var out = [];
			for (var i = 0; i < s.length; i++) {
				out.push({
					title: s[i].assigned_to_id == null ? 'Unassigned shift' : 'Assigned shift',
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
	createShift: function(req, res) {
		var stand_id = req.params.id;
		var owner_id = req.user[0].id;
		// TODO: loop through the shifts array and create new shifts
	},
	kickUser: function(req, res) {
		if(req.method == "GET") {
			var all_users = [];
			var all_users_ids = [];
			var stand = {};
			var findUsers = function(cb) {
				User.find().exec(function(err, u_all){
					if(err) cb(err);
					for(var i = 0; i < u_all.length; i++) {
						for(var j = 0; j < u_all[i].stands.length; j++) {
							if(u_all[i].stands[j] == req.params.id) {
								all_users.push(u_all[i]);
								all_users_ids.push(u_all[i].id + "");
							}
						}
					}
					// Remove duplicates... 
					all_users = all_users.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]);
					all_users_ids = all_users_ids.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]);
					cb();
				});
			};
			var findStand = function(cb) {
				Stand.findOne(req.params.id)
				.where({owner_id:req.user[0].id})
				.exec(function(err, s) {
					if(err || stand == null) {
						cb("ERROR (no stand found): " + err);
					} else {
						stand = s;
						cb();
					}
				})
			};
			async.parallel([findUsers, findStand], function(err) {
				if(err) return res.send("ERROR " + err, 500);
				return res.view({users:all_users, stand: stand});
			})
		} else if(req.method == "POST") {
			var user_id = req.body.input_user_id;
			var stand_id = req.body.input_stand_id;
			var user_email = req.body.input_email;
			var message = req.body.input_message;
			Stand.findOne(req.body.input_stand_id)
			.where({owner_id:req.user[0].id})
			.exec(function(err, s) {
				if(err) return res.send("Error: " + err, 500);
				if(!s || s == null) return res.send("No such stand", 404);
				User.findOne(user_id)
				.exec(function(err, u) {
					if(err || !u || u == null) return res.send("ERROR: " + err, 500);
					var index = u.stands.indexOf(stand_id);
					if(index > -1) {
						u.stands.splice(index,1);
						User.update({id:u.id},{stands:u.stands}, function(err, new_u) {
							return res.json(new_u,200);
						})
					} else {
						return res.send("This user is not member of this stand!!", 404);
					}
				})
			})
		}
	},
	index: function(req, res) {
		if(req.method == 'GET') {
			var owned_stands = [];
			var participate_stands = [];
			var findOwnedStands = function(cb) {
				Stand.find({owner_id:req.user[0].id}).exec(function(err, s){	
					owned_stands = s;
					cb();
				});				
			};
			var findParticipateStands = function(cb) {
				User.findOne(req.user[0].id).exec(function(err, u){
					Stand.find({id:u.stands}).exec(function(err, s){
						participate_stands = s;
						cb();
					})
				})
			};
			var renderView = function(err) {
				return res.view({owned_stands:owned_stands, participate_stands:participate_stands});
			}
			async.parallel([findOwnedStands, findParticipateStands], renderView);
		}
	}
};

