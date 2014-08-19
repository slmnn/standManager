/**
 * InvitationController
 *
 * @description :: Server-side logic for managing invitations
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var nodemailer = require('nodemailer');
var async = require("async");
var needle = require("needle");
var randomstring = require("just.randomstring");

module.exports = {
	response: function(req, res) {
		if(req.method == 'GET') {
			Invitation.findOne(req.params.id)
			.where({accepted:false})
			.where({declined:false})
			.exec(function(err, i){
				if(err) return res.send("ERROR (invalid invitation)" + err, 500);
				if(i==null) return res.view({msg:"ERROR: Invitation is no longer available!"});
				if(req.query.answer == "decline") {
					i.declined = true;
					i.save(function(err, new_i) {
						User.findOne(req.query.user_id).exec(function(err, user) {
							if(user.stands.length == 0) {
								User.destroy({id:user.id})
								.exec(function(err) {
									console.log("User destroyed!", err);
									return res.view({msg:"You have declined the invitation, and your credentials are destroyed!"});
								});
								console.log("User destroyed!!");
							} else {
								// TODO: destroy invitation
								console.log("Invitation declined!");
								return res.view({msg:"You have declined the invitation!"});								
							}
						})
					})
				} else {
					var now = new Date();
					var expires = new Date(i.expires);
					if(expires.getTime() > now.getTime()) {
						i.accepted = true;
						i.save(function(err, i) {
							if(err) return res.send("ERROR " + err, 500);
							console.log("ACCEPTING: ", req.query);
							User.findOne(req.query.user_id).exec(function(err, u) {
								if(!u || err) return res.send("ERROR (invalid user) " + err, 500);
								if(u.stands.indexOf(i.stand_id) != -1) {
									// TODO: destroy invitation
									return res.view({msg:"ERROR: You are already member of this stand!"});
								}
								u.stands.push(i.stand_id + "");
								User.update({id:u.id},{stands:u.stands}, function(err, new_u) {
									// TODO: destroy invitation
									return res.view({msg:"You have accepted the invitation!"});
								})
							})
						})
					} else {
						return res.view({msg:"ERROR: Invitation is expired!"});
					}
				}
			})
		} else {
			return res.send("Only GET", 404);
		}
	},
	accept: function(req, res) {
		if(req.method == 'POST') {
			console.log(JSON.stringify(req.body));
			Invitation.findOne(req.params.id)
			.where({accepted:false})
			.where({declined:false})
			.exec(function(err, i){
				if(err) return res.send("ERROR " + err, 500);
				if(i==null) return res.json({msg:"ERROR: Invitation is no longer available!"}, 200);
				if(req.body.input_submit == "decline") {
					i.declined = true;
					i.save(function(err, new_i) {
						return res.json({msg:"You have declined the invitation!"}, 200);
					})
				} else {
					var now = new Date();
					var expires = new Date(i.expires);
					if(expires.getTime() > now.getTime()) {
						i.accepted = true;
						i.save(function(err, i) {
							if(err) return res.send("ERROR " + err, 500);
							User.findOne(req.params.user_id).exec(function(err, u) {
								if(!u || err) return res.send("ERROR " + err, 500);
								if(u.stands.indexOf(i.stand_id) != -1) {
									return res.json({msg:"ERROR: You are already member of this stand!"});
								}
								u.stands.push(i.stand_id + "");
								User.update({id:u.id},{stands:u.stands}, function(err, new_u) {
									return res.json({msg:"You have accepted the invitation!"});
								})
							})
						})
					} else {
						return res.json({msg:"ERROR: Invitation is expired!"}, 200);
					}
				}
			})
		} else {
			return res.send("Only POST", 404);
		}
	},
	find: function(req, res) {
		if(req.method == 'GET') {
			Invitation.findOne(req.params.id).exec(function(err, i) {
				if(err || i==null) return res.send("ERROR" + err, 500);
				Stand.findOne(i.stand_id).exec(function(err, s) {
					if(err || s==null) return res.send("ERROR" + err, 500);
					return res.view({invitation:i, stand: s, invitation_id:i.id});					
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
			var findUser = function(cb) {
				User.findOne(req.user[0].id)
				.exec(function(err, u){
					user = u;
					cb();
				})				
			}
			var findStands = function(cb) {
				Stand.findOne(req.params.id).where({owner_id:req.user[0].id}).exec(function(err, s){
					if(err || s == null) { console.log("no stand"); cb(err); }
					owned_stands = [s];
					cb();
				})
			}
			async.parallel([findUser, findStands], function(err) {
				if(err) return res.send(err, 500);
				return res.view({stands: owned_stands, user: user, message: sails.config.invitation_email})
			})
		}
		else if(req.method == 'POST') {
			var now = new Date();
			var one_week = 7*24*60*60*1000;
			var one_week_later = new Date(now.getTime() + one_week);
			var new_invitation = {
				created_by: req.user[0].id + "",
				created_by_name: req.body.input_name,
				stand_id: req.body.input_stand_id,
				message: req.body.input_message,
				email: req.body.input_email,
				accepted: false,
				declined: false,
				expires: one_week_later
			}
			var password = "";
			var new_user_was_created = false;
			var old_users = [];
			var user = {}
			User.find({email:req.body.input_email}).exec(function(err, users){
				if(err) return res.send("ERROR" + err);
				if(users.length > 0) {
					// The user is already in the system. We will not create a new one.
					old_users = users;
					user = old_users[0];
					console.log("OLD USERS: ", old_users);
					var createNewUser = function(cb){ cb(); };
				} else {
					var createNewUser = function(cb){
						password = randomstring(8);
						User.create(
						{
							username:req.body.input_email,
							password:password,
							firstname:req.body.input_firstname,
							lastname:req.body.input_lastname,
							email:req.body.input_email,
							shifts: [],
							available: [],
							messages: [],
							stands: []
						}
						).exec(function(err, new_user){
							console.log(err, new_user);
							if(err) return cb({msg:'Creating new user failed! ' + err});
							new_user_was_created = true;
							user = new_user;
							return cb();
						})
					};
				}
				var createAndSendInvitation = function(cb) {
					Invitation.create(new_invitation)
					.exec(function(err, i){
						if(err || i == null) cb({msg:'Sending invitation failed! ERROR: ' + err});	
						// create reusable transporter object using SMTP transport
						var transporter = nodemailer.createTransport({
					    service: 'Gmail',
					    auth: {
					        user: sails.config.INVITATION_EMAIL_USER,
					        pass: sails.config.INVITATION_EMAIL_PASSWORD
					    }
						});
						// setup e-mail data with unicode symbols
						Stand.findOne(i.stand_id).exec(function(err, stand) {
							if(err) cb({msg:'Stand findOne failed! ERROR: ' + err});

							var link = 'http://' + req.headers.host + '/invitation/find/' + i.id;
							var signup_link = 'http://' + req.headers.host + '/user/create';
							var login_link = 'http://' + req.headers.host + '/login';
							var html_message_with_link = i.message.replace("_invitationlink", '<a href="'+link+'">' + link + '</a>');

							html_message_with_link = html_message_with_link.replace("_myfullname", req.body.input_name);
							html_message_with_link = html_message_with_link.replace("_receivername", user.firstname);
							html_message_with_link = html_message_with_link.replace("_standname", stand.name);
							html_message_with_link = html_message_with_link.replace("_standdescription", stand.description);
							html_message_with_link = html_message_with_link.replace("_standlocation", stand.location);
							var maplink = "http://maps.google.com/maps?q="+stand.lat+","+stand.lng+"&ll="+stand.lat+","+stand.lng+"&z=14"
							html_message_with_link = html_message_with_link.replace("_maplink", maplink);
							html_message_with_link = html_message_with_link.replace("_loginlink", login_link);
							html_message_with_link = html_message_with_link.replace("_loginlink", login_link);
							var yeslink = 'http://' + req.headers.host + '/invitation/response/' + i.id + '?user_id=' + user.id + '&answer=accept';
							var nolink = 'http://' + req.headers.host + '/invitation/response/' + i.id + '?user_id=' + user.id + '&answer=decline';
							html_message_with_link = html_message_with_link.replace("_yesurl", yeslink);
							html_message_with_link = html_message_with_link.replace("_nourl", nolink);
							if(new_user_was_created) {
								html_message_with_link = html_message_with_link.replace("_username", req.body.input_email);
								html_message_with_link = html_message_with_link.replace("_password", password);
							} else {
								var usernames = [];
								for(var j = 0; j < old_users.length; j++) {
									usernames.push(old_users[j].username);
								}
								html_message_with_link = html_message_with_link.replace("_username", usernames.toString());
								html_message_with_link = html_message_with_link.replace("_password", "[omitted]");
							}

							var mailOptions = {
						    from: i.created_by_name, // sender address
						    to: i.email, // list of receivers
						    subject: sails.config.invitation_email_subject.replace("_standname", stand.name), // Subject line
						    text: 'Sorry, this message is in HTML.', // plaintext body
						    html: html_message_with_link  // html body
							};

							console.log(mailOptions);
							// send mail with defined transport object
							transporter.sendMail(mailOptions, function(error, info){
								transporter.close();
						    if(error){
						      cb({msg:'Sending invitation failed! ERROR: ' + error});	
						    }else{
						      cb({msg:'Invitation sent to ' + mailOptions.to + '!'});
						    }
							});							
						})
					});	
				};
				async.series([createNewUser, createAndSendInvitation], function(err){
					res.json(err);
				});
			})

		} else {
			return res.send("Only GET or POST", 404);
		}
	}
};

