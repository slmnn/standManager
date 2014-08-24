/**
 * ShiftController
 *
 * @description :: Server-side logic for managing shifts
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var async = require("async");
var moment = require('moment');
var nodemailer = require('nodemailer');
var icalendar = require('icalendar');

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
				var old_shift = JSON.parse( JSON.stringify( shift ) );;
				utils.createTrace(
					{
						stand_id:shift.stand_id,user_id:shift.assigned_to_id, user_name:shift.assigned_to_name, shift_id:shift.id, shift_start:shift.start, shift_end:shift.end,
					  message: ("Answer was " + req.query.answer)
					}, 
					function(err) {
						if(req.query.answer == 'yes') {
							shift.accepted = true;
							sails.io.sockets.emit('stand_' + shift.stand_id, {msg:"Shift accepted!"});
							sails.io.sockets.emit('user_' + shift.assigned_to_id, {msg:"Shift accepted!"});
							// TODO: send email confirmation
						} else if(req.query.answer == 'no') {
							shift.assigned_to_id = null;
							shift.assigned_to_name = '';
							shift.accepted = false;
							shift.assigned = false;
							shift.email_sent = false;
							sails.io.sockets.emit('stand_' + shift.stand_id, {msg:"Shift declined!"});
							sails.io.sockets.emit('user_' + req.query.user_id, {msg:"Shift declined!"});
						}
						shift.save(function(err) {
							if(err) return res.view({msg:'ERROR: Saving shift failed. ' + err});
							User.findOne(shift.created_by).exec(function(err, shift_creator) {
								return res.view({msg:'OK', answer_was_yes: shift.accepted, shift:shift, created_by:shift_creator, old_shift: old_shift});
							});
						})						
					})
			})
		}
	},
	sendShiftReminder : function(req, res) {
		if(req.method == 'POST'){
			var user = undefined;
			var stand = undefined;
			var shift = undefined;
			var findUser = function(cb){
				User.findOne(req.body.input_user_id).exec(function(err, u){
					user = u;
					cb();
				})
			};
			var findStand = function(cb) {
				Stand.findOne(req.body.input_stand_id).exec(function(err, s){
					stand = s;
					cb();
				})
			};
			var findShift = function(cb) {
				Shift.findOne(req.params.id).exec(function(err, s){
					shift = s;
					cb();
				})
			};
			async.series([findUser, findStand, findShift], function(err){
				var start = moment(shift.start);
				var end = moment(shift.end);
				var locales = req.acceptedLanguages;
				if(locales.length > 0 && locales[0].indexOf('fi') >= 0) {
					start = moment(shift.start).lang('fi');
					end = moment(shift.end).lang('fi');
				}
				var link = 'http://' + req.headers.host + '/shift/find/' + shift.id + '?user_id=' + shift.assigned_to_id
				utils.sendEmail({
					from: req.user[0].email,
					to: user.email,
					subject: "Muistutus vuoromääräyksestä " + start.format('dddd DD. MMMM YYYY') + ', ' + start.format('HH:mm') + ' - ' + end.format('HH:mm'),
					html: "<p>Tarkista vuoron tiedot alla olevasta linkistä.<br><a href='"+link+"''>"+link+"</a></p>"
				}, function(err) {
					if(err) return res.json({msg:err});
					return res.json({msg:"Reminding email sent to " + user.email});
				})				
			})
		}
	},
	find : function(req, res) {
		if(req.method == 'GET') {
			var shift = {};
			var stand = {};
			var attendees = [];
			if(req.query.user_id == null || req.params.id == null) {
				return res.send("ERROR: Invalid parameters");
			}
			var findShift = function(cb) {
				Shift.findOne(req.params.id + '')
				.where({assigned_to_id:req.query.user_id})
				.where({assigned: true})
				.exec(function(err, s) {
					if(err) return cb(err);
					if(s == null) return cb("No such shift")
					var start = s.start;
					var end = s.end;
					var locales = req.acceptedLanguages;
					if(locales.length > 0 && locales[0].indexOf('fi') >= 0) {
						start = moment(start).lang('fi');
						end = moment(end).lang('fi');
					}
					s.start_original = s.start;
					s.start = start;
					s.end_original = s.end;
					s.end = end;
					shift = s;
					return cb();
				})
			};
			var findStand = function(cb) {
				if(shift == null) return cb("ERROR: No shift");
				Stand.findOne(shift.stand_id).exec(function(err, s){
					if(err) return cb(err);
					stand = s;
					cb();
				})
			}
			var findAttendees = function(cb) {
				if(shift == null) return cb("ERROR: No shift");
				Shift.find({stand_id: shift.stand_id + ''})
				.where({ start : shift.start_original })
				.where({ end : shift.end_original })
				.exec(function(err, other_shifts) {
					console.log("OTHER_SHIFTS", other_shifts);
					var query = [];
					for(var i = 0; i < other_shifts.length; i++) {
						query.push(other_shifts[i].assigned_to_id);
					}
					User.find({id:query}).exec(function(err, other_users) {
						if(err) return cb(err);
						for(var i = 0; i < other_users.length; i++) {
							attendees.push({
								name : other_users[i].firstname + ' ' + other_users[i].lastname,
								email: other_users[i].email,
								tel  : other_users[i].tel
							})
						}
						return cb();
					});
				});
			};
			async.series([findShift, findStand, findAttendees], function(err) {
				return res.view({err:err, shift:shift, stand:stand, attendees:attendees})
			})
		}
	},
	unsentEmailCount : function(req, res) {
		if(req.method == 'GET') {
			Shift.find({stand_id:req.params.id+''})
			.where({email_sent:false})
			.where({accepted:false})
			.where({assigned:true})
			.exec(function(err, c){
				if(err) return res.json({msg:err});
				return res.json({unsentEmailCount:c.length});
			});
		}
	},
	upcomingShiftCount : function(req, res) {
		if(req.method == 'GET') {
			var now = new Date();
			if(req.params.id == null || req.query.stand_id == null) {
				return res.send("id or stand_id is null", 404)
			}
			Shift.find({assigned_to_id:req.params.id+''})
			.where({stand_id:req.query.stand_id})
		  .where({start : { ">=" : now}})
			.exec(function(err, shifts){
				if(err) return res.json({error:err, shift_count:NaN});
				return res.json({error:err, shift_count:shifts.length});
			})
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
				// console.log("SENDING, SHIFTS: ", shifts);
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
			var sent_count = 0;
			async.forEach(shifts, function(shift, cb) {

				// Finding other users on the same shift
				//console.log(shift.start, {stand_id:req.params.id + ''});
				Shift.find({stand_id:req.params.id + ''})
				.where({ start : shift.start })
				.where({ end : shift.end })
				.exec(function(err, other_shifts) {
					if(err) return cb(err);
					//console.log('ALL SHIFTS SAME TIME:', JSON.stringify(other_shifts));
					var query = [];
					for(var i = 0; i < other_shifts.length; i++) {
						query.push(other_shifts[i].assigned_to_id);
					}
					
					User.find({id:query}).exec(function(err, other_users) {
						if(err) return cb(err);

						console.log('USERS:', other_users);
						var original_user = {};
						for(var i = 0; i < other_users.length; i++) {
							if(other_users[i].id == shift.assigned_to_id)
								original_user = other_users[i];
						}
						console.log('ORIGINAL USER:', original_user);

						// Compose email
						var user_contact_info = "";
						var ical_description = "";
						var attendees = [];
						for(var i = 0; i < other_users.length; i++) {
							user_contact_info += other_users[i].firstname + ' ' + other_users[i].lastname + ' ';
							user_contact_info += '(tel.: ' + other_users[i].tel + ') <br>';
							ical_description += other_users[i].firstname + ' ' + other_users[i].lastname + ' (tel.: ' + other_users[i].tel + ') ';
							attendees.push({
								name: other_users[i].firstname + ' ' + other_users[i].lastname,
								email: other_users[i].email
							})
						}

						// Find the stand that we create the shift to
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

							var locales = req.acceptedLanguages;
							var start = moment(shift.start);
							var end = moment(shift.end);
							if(locales.length > 0 && locales[0].indexOf('fi') >= 0) {
								start = moment(shift.start).lang('fi');
								end = moment(shift.end).lang('fi');
							}

							html_message_with_link = html_message_with_link.replace('_shiftday',start.format('dddd DD. MMMM YYYY'));
							html_message_with_link = html_message_with_link.replace('_shiftstarttime',start.format('HH:mm'));
							html_message_with_link = html_message_with_link.replace('_shiftendtime',end.format('HH:mm'));
							var shiftlink = 'http://' + req.headers.host + '/shift/find/' + shift.id + '?user_id=' + shift.assigned_to_id
							html_message_with_link = html_message_with_link.replace('_shiftlink',shiftlink);
							html_message_with_link = html_message_with_link.replace('_shiftlink',shiftlink);

							// Create iCal
							var ical = new icalendar.VEvent(start.valueOf());
							ical.setSummary(shift.title);
							ical.setLocation(stand.location);
							ical.setDescription(ical_description);
							ical.setDate(start, end);
							var parameters = {
							'CN' : req.user[0].firstname + ' ' + req.user[0].lastname + ':mailto'
							}
							ical.addProperty('ORGANIZER', req.user[0].email, parameters);
							for(var i = 0; i < attendees.length; i++) {
								ical.addProperty('ATTENDEE', 'CN=' + attendees[i].name + ':mailto:' + attendees[i].email, '');
							}
							//console.log(ical.toString());

							// Create the email
							var mailOptions = {
						    from: shift.title, // sender address
						    to: original_user.email, // list of receivers
						    subject: sails.config.shift_assignment_email_subject.replace('_shiftday', start.format('dddd DD. MMMM YYYY') + ', ' + start.format('HH:mm') + ' - ' + end.format('HH:mm')), // Subject line
						    text: 'Sorry, this message is in HTML.', // plaintext body
						    html: html_message_with_link,  // html body
						    alternatives: [{
                      contentType: "text/calendar; charset=UTF-8; method=REQUEST",
											filename: 'invite.ics',
								      content: new Buffer(ical.toString()),
                      contentEncoding: "7bit"
                    }]
							};

							// send mail with defined transport object
							sent_count++;
							transporter.sendMail(mailOptions, function(error, info){
						    if(error){
						      cb('Sending shift assignment failed! ERROR: ' + error);	
						    }else{

						    	// Update the shift email_sent parameter
						    	shift.email_sent = true;
						    	shift.save(function(err, new_shift) {
						    		if(err) cb(err);
						    		sails.io.sockets.emit('stand_' + shift.stand_id, {
						    			msg:"Email sent to " + mailOptions.to,
						    			count_all:shifts.length,
						    			count_sent:sent_count
						    		});
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
			//console.log(req.body.input_start, req.body.input_end);
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
				// console.log(err, s);
				if(err) res.send(500, {error: err});
				sails.io.sockets.emit('stand_' + s.stand_id, {msg:"Shift created!"});
				return res.json({msg:'Shift created!'});	
			});	
		}
	},
	destroy: function(req, res) {
		Shift.findOne({'id' : req.params.id}).exec(function(err, s) {
			if(err || typeof s == 'undefined') res.send("ERROR: " + err, 500);
			var stand_id = s.stand_id;
			var user_id = s.assigned_to_id;
			if(s.created_by == req.user[0].id) {
				s.destroy(function(err) {
					if(err) res.send("ERROR: " + err, 500);
					sails.io.sockets.emit('stand_' + stand_id, {msg:"Shift destoyed!"});
					sails.io.sockets.emit('user_' + user_id, {msg:"Shift destoyed!"});
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
			// console.log(req.body.input_start, req.body.input_end, req.body.input_assigned_to_id);
			var new_data = {};
			if(req.body.input_assigned_to_id != '-1') {
				new_data = {
					assigned_to_id: req.body.input_assigned_to_id,
					assigned_to_name: req.body.input_assigned_to_name,
					accepted: req.body.input_accepted == 'true' ? true : false,
					assigned: true,
					email_sent: req.body.input_email_sent == 'true' ? true : false
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
				// console.log(err, s);
				if(err) res.send(500, {error: err});
				try {
					if(req.user[0].id != s[0].created_by) {
						if(s[0].accepted == true)
							sails.io.sockets.emit('stand_' + s[0].stand_id, {msg:"Shift accepted!"});
						if(s[0].accepted == false)
							sails.io.sockets.emit('stand_' + s[0].stand_id, {msg:"Shift declined!"});
					} else {
						sails.io.sockets.emit('stand_' + s[0].stand_id, {msg:"Shift updated!"});
						if(s[0].assigned_to_id != null) {
							sails.io.sockets.emit('user_' + s[0].assigned_to_id, {msg:"Shift updated!"});
						}
					}					
				} catch(err) {
					console.log(err);
				}
				utils.createTrace(
					{
						stand_id:s[0].stand_id,user_id:s[0].assigned_to_id, user_name:s[0].assigned_to_name, shift_id:s[0].id, shift_start:s[0].start, shift_end:s[0].end,
					  message: ("User or you marked the shift as " + (s[0].assigned ? (s[0].accepted ? 'accepted' : 'assigned') : 'unassigned') )
					}, 
					function(err) {
						return res.json({msg:message});	
					});
			});	
		}
	}
};

