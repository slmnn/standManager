/**
 * QuestionnaireController
 *
 * @description :: Server-side logic for managing Questionnaires
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var nodemailer = require('nodemailer');
var moment = require('moment');
var async = require("async");

var createReservation = function(start, end, user) {
	var reservation = {
					user_id: user.id,
					all_day:false,
					start: moment(start),
					end: moment(end),
					origin_questionnaire: true
				};
	return reservation;
}

var dateCount = function(start, end) {
	if(start > end) return {};
	var result = [[],[],[],[],[],[],[]];
	for(; start < end; start.setTime(start.getTime() + 24*60*60*1000)) {
		result[start.getDay()].push(start.toLocaleDateString());
	}
	console.log(result);
	return result;
}

module.exports = {
	submit: function(req, res) {
		if(req.method == 'POST') {

			var questionnaire = {};
			var user = {};
			var new_reservations = [];
			var week_available = [];
			week_available.push(req.body.input_sunday    ? req.body.input_sunday    : []);
			week_available.push(req.body.input_monday    ? req.body.input_monday    : []);
			week_available.push(req.body.input_tuesday   ? req.body.input_tuesday   : []);
			week_available.push(req.body.input_wednesday ? req.body.input_wednesday : []);
			week_available.push(req.body.input_thursday  ? req.body.input_thursday  : []);
			week_available.push(req.body.input_friday    ? req.body.input_friday    : []);
			week_available.push(req.body.input_saturday  ? req.body.input_saturday  : []);
			console.log(week_available);
			var now = new Date();
			var week_later = new Date(now.getTime() + 1000*60*60*24*7);
			var expires = new Date(req.body.input_valid + 'T23:59:00');
			if(isNaN( expires.getTime() )) expires = week_later;
			var dates = dateCount(now, expires);
			var shift_start_times = ['8','10','12','14','16'];

			var findQuestionnaire = function(cb) {
				Questionnaire.findOne(req.params.id).exec(function(err, q) {
					if(err || q==null) return res.send("ERROR" + err, 500);
					questionnaire = q;
					return cb();
				});
			};
			var findUser = function(cb) {
				var query = {};
				query.email = questionnaire.email;
				if(questionnaire.user_id) query.id = questionnaire.user_id;
				User.findOne(query).exec(function(err, u) {
					if(err || u==null) return cb("ERROR: No such user! " + err);
					user = u;
					// TODO: check that active questionnaire is available for this user!!!
					if(u.active_questionnaries.indexOf(questionnaire.id + '') < 0) {
						console.log(u.active_questionnaries, questionnaire.id + '');
						cb("ERROR: This questionnaire is not available for this user!");
					}
					User.update(
					{id:u.id}, 
					{
						male : req.body.input_gender == 'male' ? true : false,
						tel  : req.body.input_tel ? req.body.input_tel : ''
					},
						function(err, new_u) {
							if(err || new_u==null) return cb("ERROR: user update failed! " + err);
							user = new_u[0];
							console.log(user);
							return cb(err);
						})
				});
			};
			var updateQuestionnaire = function(cb) {
				Questionnaire.update({id:questionnaire.id},{filled:true, expires:expires}, function(err, new_q){
					if(err) return cb(err);
					sails.io.sockets.emit('stand_' + questionnaire.stand_id, {msg:"Questionnaire updated!", expires:expires, email:questionnaire.email});
					return cb();
				})
			};
			async.series([findQuestionnaire, findUser, updateQuestionnaire], function(err){
				var reservation_table = [[],[],[],[],[],[],[]];
				if(err) return res.send("ERROR" + err, 500);
				for(var weekday = 0; weekday < week_available.length; weekday++) {
					for(var start_index = 0; start_index < shift_start_times.length; start_index++) {
						if(week_available[weekday].indexOf(shift_start_times[start_index]) < 0) {
							for(var i = 0; i < dates[weekday].length; i++) {
								var start = new Date(dates[weekday][i]);
								var end = new Date(dates[weekday][i]);
								start.setHours(parseInt(shift_start_times[start_index]));
								end.setHours(parseInt(shift_start_times[start_index])+2);
								new_reservations.push(createReservation(start, end, user));
							}
							reservation_table[weekday].push('reserved');
						} else {
							reservation_table[weekday].push('available');
						}
					}
				}
				// Destroy all old reservations
				Reservation.destroy()
				.where({user_id:user.id})
				.where({origin_questionnaire: true})
				.exec(function(err) {
					async.forEach(new_reservations, function(reservation, cb){
						console.log("creating", reservation);
						Reservation.create(reservation, function(err, new_r){
							if(err) return cb(err);
							console.log("reservation created", new_r);
							return cb();
						})
					}, function(err) {
						if(err) res.send("ERROR" + err);
						return res.view(
							{
								response:req.body, 
								expires:expires,
							  new_reservations: new_reservations, 
							  reservation_table: reservation_table
							}
						);
					});					
				});
			});
		}
	},
	find: function(req, res) {
		if(req.method == 'GET') {
			Questionnaire.findOne(req.params.id).exec(function(err, i) {
				if(err || i==null) return res.send("ERROR" + err, 500);
				Stand.findOne(i.stand_id).exec(function(err, s) {
					if(err || s==null) return res.send("ERROR" + err, 500);
					if(req.query.email == i.email) {
						var query = {};
						query.email = i.email;
						if(i.user_id) query.id = i.user_id;
						User.findOne(query).exec(function(err, u){
							if(err) return res.send("ERROR" + err, 500);
							if(u.active_questionnaries.indexOf(i.id + '') < 0) {
								return res.send("Mismatching user id!", 403);
							}
							return res.view({questionnaire:i, stand: s, user: u});	
						});	
					} else {
						return res.send("Mismatching email!", 403);
					}
				});
			})
		} else {
			return res.send("Only GET", 404);
		}
	},
	create: function(req, res) {
		if(req.method == 'GET') {
			var owned_stands = [];
			var user = {};
			var stand_users = [];
			var findUser = function(cb) {
				User.findOne(req.user[0].id)
				.exec(function(err, u){
					user = u;
					return cb();
				})				
			};
			var findStandUsers = function(cb) {
				User.find().exec(function(err, u) {
					for(var i = 0; i < u.length; i++) {
						if(u[i].stands.indexOf(req.params.id) >= 0) {
							stand_users.push(u[i]);
						} 
					}
					return cb();
				})
			};
			var findStands = function(cb) {
				Stand.findOne(req.params.id).where({owner_id:req.user[0].id}).exec(function(err, s){
					if(err || s == null) { console.log("no stand"); cb(err); }
					owned_stands = [s];
					return cb();
				})
			}
			async.parallel([findUser, findStands, findStandUsers], function(err) {
				if(err) return res.send(err, 500);
				return res.view({stands: owned_stands, user: user, stand_users: stand_users})
			})
		}
		else if(req.method == 'POST') {
			var now = new Date();
			var one_week = 7*24*60*60*1000;
			var one_week_later = new Date(now.getTime() + one_week);
			console.log("QUESTIONNAIRE: ",JSON.stringify(req.body));
			var new_questionnaire = {
				created_by: req.user[0].id + "",
				created_by_name: req.body.input_name,
				stand_id: req.body.input_stand_id,
				user_id: req.body.input_user_id ? req.body.input_user_id : '',
				message: req.body.input_message,
				title: req.body.input_title,
				email: req.body.input_email,
				filled: false,
				expires: one_week_later
			}
			Questionnaire.create(new_questionnaire)
			.exec(function(err, i){
				if(err || i == null) return res.send("ERROR: " + err, 500);
				// create reusable transporter object using SMTP transport
				var transporter = nodemailer.createTransport({
			    service: 'Gmail',
			    auth: {
			        user: sails.config.INVITATION_EMAIL_USER,
			        pass: sails.config.INVITATION_EMAIL_PASSWORD
			    }
				});
				// setup e-mail data with unicode symbols
				console.log(JSON.stringify(i));
				var link = 'http://' + req.headers.host + '/questionnaire/find/' + i.id + '?email=' + i.email + '&user_id=' + i.user_id;
				link = link.replace('+','%2B');
				var login_link = 'http://' + req.headers.host + '/login';
				var html_message_with_link = i.message.replace("_questionnairelink", '<a href="'+link+'">' + link + '</a>');
				html_message_with_link = html_message_with_link.replace("_myfullname", req.body.input_name);
				html_message_with_link = html_message_with_link.replace("_loginlink", '<a href="'+login_link+'">' + login_link + '</a>');
				var mailOptions = {
			    from: i.created_by_name, // sender address
			    to: i.email, // list of receivers
			    subject: i.title, // Subject line
			    text: 'Sorry, this message is in HTML.', // plaintext body
			    html: html_message_with_link  // html body
				};
				// send mail with defined transport object
				transporter.sendMail(mailOptions, function(error, info){
					transporter.close();
			    if(error){
			      return res.json({msg:'Sending questionnaire failed! ERROR: ' + error});	
			    }else{
			    	var query = {};
			    	if(i.user_id) query.id = i.user_id;
			    	query.email = i.email;
			    	User.findOne(query).exec(function(err, u){
			    		if(err || u == null) return res.json({msg:err});
			    		// TODO: Create new user account and send invitation link
			    		if(u == null) return res.json({msg:'New user account was created and questionnaire was sent.'})
				    	if(typeof u.active_questionnaries == 'undefined') u.active_questionnaries = [];
				    	u.active_questionnaries.push(i.id + '');
				    	User.update({id:i.user_id},{active_questionnaries:u.active_questionnaries}, function(err, new_u){
				    		return res.json({msg:'Questionnaire sent to ' + mailOptions.to + '!'});
				    	});
			    	});
			    }
				});
			});	
		} else {
			return res.send("Only GET or POST", 404);
		}
	}
};

