/**
 * InvitationController
 *
 * @description :: Server-side logic for managing invitations
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var nodemailer = require('nodemailer');
var async = require("async");

module.exports = {
	accept: function(req, res) {
		if(req.method == 'POST') {
			console.log(JSON.stringify(req.body));
			Invitation.findOne(req.params.id)
			.where({accepted:false})
			.where({declined:false})
			.exec(function(err, i){
				if(err) return res.send("ERROR " + err, 500);
				if(i==null) return res.send("Invitation is no longer available!", 200);
				if(req.body.input_submit == "decline") {
					i.declined = true;
					i.save(function(err, new_i) {
						return res.send("Invitation was declined!", 200);
					})
				} else {
					var now = new Date();
					var expires = new Date(i.expires);
					if(expires.getTime() > now.getTime()) {
						i.accepted = true;
						i.save(function(err, i) {
							if(err) return res.send("ERROR " + err, 500);
							User.findOne(req.user[0].id).exec(function(err, u) {
								if(!u || err) return res.send("ERROR " + err, 500);
								if(u.stands.indexOf(i.stand_id) != -1) {
									return res.send("ERROR: You are already member of this stand!", 500);
								}
								u.stands.push(i.stand_id + "");
								User.update({id:u.id},{stands:u.stands}, function(err, new_u) {
									return res.json(new_u,200);
								})
							})
						})
					} else {
						return res.send("Invitation is expired!", 200);
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
				Stand.find({owner_id:req.user[0].id}).exec(function(err, s){
					owned_stands = s;
					cb();
				})
			}
			async.parallel([findUser, findStands], function(err) {
				if(err) return res.send(err, 500);
				return res.view({stands: owned_stands, user: user})
			})
		}
		else if(req.method == 'POST') {
			var now = new Date();
			var one_week = 7*24*60*60*1000;
			var one_week_later = new Date(now.getTime() + one_week);
			console.log("INVITATION",JSON.stringify(req.body));
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
			Invitation.create(new_invitation)
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
				var link = 'http://' + req.headers.host + '/invitation/find/' + i.id;
				var html_message_with_link = i.message.replace("_invitationlink", '<a href="'+link+'">http://' + link + '</a>');
				html_message_with_link = html_message_with_link.replace("_myfullname", req.body.input_name);
				var mailOptions = {
			    from: i.created_by_name, // sender address
			    to: i.email, // list of receivers
			    subject: 'Invitation to a stand', // Subject line
			    text: html_message_with_link, // plaintext body
			    html: html_message_with_link  // html body
				};
				// send mail with defined transport object
				transporter.sendMail(mailOptions, function(error, info){
					transporter.close();
			    if(error){
			      console.log(error);
			    }else{
			      console.log('Message sent: ' + info.response);
			      return res.send(200, {msg:'Invitation created!'});		
			    }
				});
			});	
		} else {
			return res.send("Only GET or POST", 404);
		}
	}
};

