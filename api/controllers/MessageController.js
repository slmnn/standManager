/**
 * MessageController
 *
 * @description :: Server-side logic for managing Messages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	create: function(req, res) {
		if(req.method == 'POST') {
			User.findOne(req.body.input_from_id+'').exec(function(err, user) {
				if(err) return res.json({error:err});
				Message.create({
						from_id   : req.body.input_from_id+'',
						from_name : user.firstname + ' ' + user.lastname,
						from_email: user.email,
						stand_id  : req.body.input_to_id+'',
						content   : req.body.input_content,
						subject   : req.body.input_subject,
						read      : false
					},
					function(err, m) {
						if(err) return res.json({error:err});
						res.json(m);
				});		
			})
		}
	}
};

