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

var pageOptions = {
  activePage : '',
  breadcrumbs : [{name : 'User management', link : null}],
  appliedFilters : []
};

module.exports = {
	home : function (req, res) {
		var my_stands = []; // TODO
		var my_shifts = []; // TODO
		if(req.user[0].id == null) {
			return res.send("Forbidden!", 403);
		}
		return res.redirect("/user/find/" + req.user[0].id)
	},
	find : function (req, res) {
		if(req.user[0].id != req.params.id && req.user[0].username != 'admin') {
			return res.send("Forbidden!", 403);
		}
		if(req.method == 'GET') {
			User.findOne(req.params.id).exec(function(err, u) {
				if(err) return res.send("Error: " + err, 500);
				Stand.find({id:u.stands}).exec(function(err, s) {
					if(err) return res.send("Error: " + err, 500);
					return res.view({user:u, stands:s});
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
			Reservation.find({user_id:req.user[0].id})
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
			res.send(403, "Only POST");
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
