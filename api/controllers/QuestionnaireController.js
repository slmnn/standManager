/**
 * QuestionnaireController
 *
 * @description :: Server-side logic for managing Questionnaires
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	find: function(req, res) {
		if(req.method == 'GET') {
			Questionnaire.findOne(req.params.id).exec(function(err, i) {
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
						if(u.stands.indexOf(req.params.id) >= 0) {
							stand_users.push(u);
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
				message: req.body.input_message,
				title: req.body.input_title,
				email: req.body.input_email,
				sent_to_id: req.body.input_user_id,
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
				var link = 'http://' + req.headers.host + '/questionnaire/find/' + i.id;
				var login_link = 'http://' + req.headers.host + '/login';
				var html_message_with_link = i.message.replace("_questionnairelink", '<a href="'+link+'">' + link + '</a>');
				html_message_with_link = html_message_with_link.replace("_myfullname", req.body.input_name);
				html_message_with_link = html_message_with_link.replace("_loginlink", '<a href="'+login_link+'">' + login_link + '</a>');
				var mailOptions = {
			    from: i.created_by_name, // sender address
			    to: i.email, // list of receivers
			    subject: 'Invitation to a stand', // Subject line
			    text: 'Sorry, this message is in HTML.', // plaintext body
			    html: html_message_with_link  // html body
				};
				// send mail with defined transport object
				transporter.sendMail(mailOptions, function(error, info){
					transporter.close();
			    if(error){
			      return res.json({msg:'Sending invitation failed! ERROR: ' + error});	
			    }else{
			      return res.json({msg:'Invitation sent to ' + mailOptions.to + '!'});		
			    }
				});
			});	
		} else {
			return res.send("Only GET or POST", 404);
		}
	}
};

