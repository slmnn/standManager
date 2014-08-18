/**
 * ShiftController
 *
 * @description :: Server-side logic for managing shifts
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var async = require("async");
var moment = require('moment');
var nodemailer = require('nodemailer');

module.exports = {
	response : function(req, res)  {
		if(req.method == 'GET'){
			if(req.query.user_id == null || req.params.id == null) {
				res.view({msg:'ERROR: user or shift is undefined'});
			}
			Shift.findOne(req.params.id)
			.where({assigned_to_id:req.query.user_id})
			.where({accepted:false})
			.exec(function(err, shift) {
				if(err || shift == null) return res.view({msg:'ERROR: shift is undefined. ' + err});
				if(req.query.answer == 'yes') {
					shift.accepted = true;
				} else if(req.query.answer == 'no') {
					shift.assigned_to_id = null;
					shift.assigned_to_name = '';
					shift.accepted = false;
					shift.assigned = false;
					shift.email_sent = false;
				}
				shift.save(function(err) {
					if(err) return res.view({msg:'ERROR: Saving shift failed. ' + err});
					return res.view({msg:'OK', answer_was_yes: shift.accepted});
				})
			})
		}
	},
	unsentEmailCount : function(req, res) {
		if(req.method == 'GET') {
			Shift.find({stand_id:req.params.id})
			.where({email_sent:false})
			.where({accepted:false})
			.where({assigned:true})
			.exec(function(err, c){
				if(err) return res.json({msg:err});
				return res.json({unsentEmailCount:c.length});
			});
		}
	},
	sendEmails : function(req, res) {
		var shifts = [];
		var user = {};
		var findShifts = function(cb) {
			Shift.find({stand_id:req.params.id})
			.where({email_sent:false})
			.where({accepted:false})
			.where({assigned: true})
			.exec(function(err, s){
				if(err) return cb(err);
				shifts = s;
				console.log("SENDING, SHIFTS: ", shifts);
				cb();
			});
		};
		var sendMailForEachShift = function(cb) {
			var transporter = nodemailer.createTransport({
		    service: 'Gmail',
		    auth: {
		        user: sails.config.INVITATION_EMAIL_USER,
		        pass: sails.config.INVITATION_EMAIL_PASSWORD
		    }
			});
			async.forEach(shifts, function(shift, cb) {
				// Finding other users on the same shift
				console.log(shift.start);
				Shift.find({stand_id:req.params.id + ''})
				.where({ start : shift.start })
				.where({ end : shift.end })
				.exec(function(err, other_shifts) {
					if(err) return cb(err);
					console.log('ALL SHIFTS SAME TIME:', JSON.stringify(other_shifts));
					var query = [];
					for(var i = 0; i < other_shifts.length; i++) {
						query.push(other_shifts[i].assigned_to_id);
					}
					
					User.find({id:query}).exec(function(err, other_users) {
						if(err) return cb(err);
						console.log('OTHER_USERS:', other_users);
						var original_user = {};
						for(var i = 0; i < other_users.length; i++) {
							if(other_users[i].id == shift.assigned_to_id)
								original_user = other_users[i];
						}
						console.log('ORIGINAL USER:', original_user);
						// Compose email
						var user_contact_info = "";
						for(var i = 0; i < other_users.length; i++) {
							user_contact_info += other_users[i].firstname + ' ' + other_users[i].lastname + ' ';
							user_contact_info += '(tel.: ' + other_users[i].tel + ') <br>';
						}
						Stand.findOne({id:shift.stand_id}).exec(function(err, stand){
							if(err) return cb(err);
							var link = 'http://' + req.headers.host + '/shift/response/' + shift.id + '?user_id=' + original_user.id;
							var yeslink = link + '&answer=yes';
							var nolink = link + '&answer=no';
							var html_message_with_link = sails.config.shift_assignment_email;
							html_message_with_link = html_message_with_link.replace('_receivername',original_user.firstname);
							html_message_with_link = html_message_with_link.replace('_standname',stand.name);
							html_message_with_link = html_message_with_link.replace('_standdescription',stand.description);
							html_message_with_link = html_message_with_link.replace('_standlocation',stand.location);
							html_message_with_link = html_message_with_link.replace('_otherusersonduty',user_contact_info);
							html_message_with_link = html_message_with_link.replace('_yesurl',yeslink);
							html_message_with_link = html_message_with_link.replace('_nourl',nolink);
							var maplink = "http://maps.google.com/maps?q="+stand.lat+","+stand.lng+"&ll="+stand.lat+","+stand.lng+"&z=14"
							html_message_with_link = html_message_with_link.replace('_maplink',maplink);
							var start = new Date(shift.start);
							var end = new Date(shift.end);
							html_message_with_link = html_message_with_link.replace('_shiftday',start.toLocaleDateString());
							html_message_with_link = html_message_with_link.replace('_shiftstarttime',start.toLocaleTimeString());
							html_message_with_link = html_message_with_link.replace('_shiftendtime',end.toLocaleTimeString());
							var mailOptions = {
						    from: shift.title, // sender address
						    to: original_user.email, // list of receivers
						    subject: 'Stand assignment', // Subject line
						    text: 'Sorry, this message is in HTML.', // plaintext body
						    html: html_message_with_link  // html body
							};
							console.log("Sending:",JSON.stringify(mailOptions));
							// send mail with defined transport object
							transporter.sendMail(mailOptions, function(error, info){
						    if(error){
						      cb('Sending shift assignment failed! ERROR: ' + error);	
						    }else{
						    	shift.email_sent = true;
						    	shift.save(function(err, new_shift) {
						    		if(err) cb(err);
						    		cb('Shift assignment sent to ' + mailOptions.to + '!');
						    	})
						    }
							});							
						});
					})
				})
			}, function(err) {
				transporter.close();
				cb(err);
			});
		};
		async.series([findShifts, sendMailForEachShift], function(err){
			if(err) return res.json({msg:err});
			return res.json({msg:"Emails sent!"});
		});
	},
	create: function(req, res) {
		if(req.method == 'GET') {
			return res.view();
		}
		if(req.method == 'POST') {
			console.log(req.body.input_start, req.body.input_end);
			Shift.create(
				{
					created_by: req.user[0].id,
					assigned_to_id: req.body.input_assigned_to_id,
					assigned_to_name: req.body.input_assigned_to_name,
					stand_id: req.body.input_stand_id,
					title: req.body.input_title,
					allDay: req.body.input_all_day == "all_day_true" ? true : false,
					start: moment(req.body.input_start),
					end: moment(req.body.input_end),
					email_sent: false,
					accepted: false,
					assigned: false
				}
			).exec(function(err, s){
				console.log(err, s);
				if(err) res.send(500, {error: err});
				return res.json({msg:'Shift created!'});	
			});	
		}
	},
	destroy: function(req, res) {
		Shift.findOne({'id' : req.params.id}).exec(function(err, s) {
			if(err || typeof s == 'undefined') res.send("ERROR: " + err, 500);
			if(s.created_by == req.user[0].id) {
				s.destroy(function(err) {
					if(err) res.send("ERROR: " + err, 500);
					return res.json({msg:'Shift destroyed!'});
				})
			} else {
				return res.send("ERROR, You are not allowed to destroy this shift.", 403);
			}
		})
	},
	update: function(req, res) {
		if(req.method == 'GET') {
			return res.view();
		}
		if(req.method == 'POST') {
			console.log(req.body.input_start, req.body.input_end, req.body.input_assigned_to_id);
			var new_data = {};
			if(req.body.input_assigned_to_id != '-1') {
				new_data = {
					assigned_to_id: req.body.input_assigned_to_id,
					assigned_to_name: req.body.input_assigned_to_name,
					accepted: req.body.input_accepted ? true : false,
					assigned: true,
					email_sent: false
				};
				message = "Shift assigned to " + req.body.input_assigned_to_name;
			} else {
				new_data = {
					assigned_to_id: null,
					assigned_to_name: '',
					email_sent: false,
					accepted: false,
					assigned: false
				}
				message = "Shift unassigned.";
			}
			Shift.update(
				{'id' : req.params.id},
				new_data
			).exec(function(err, s){
				console.log(err, s);
				if(err) res.send(500, {error: err});
				return res.json({msg:message});	
			});	
		}
	}
};

