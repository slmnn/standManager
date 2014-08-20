
var nodemailer = require('nodemailer');

module.exports = {
  createTrace: function(object, cb) {
    Trace.create(object, function(err, t){
    	if(err) return cb(err);
    	cb();
    });
  },
  sendEmail : function(mail, cb) {
		var transporter = nodemailer.createTransport({
	    service: 'Gmail',
	    auth: {
	        user: sails.config.INVITATION_EMAIL_USER,
	        pass: sails.config.INVITATION_EMAIL_PASSWORD
	    }
		});
		// Create the email
		var mailOptions = {
	    from: mail.from, // sender address
	    to: mail.to, // list of receivers
	    subject: mail.subject,
	    text: 'Sorry, this message is in HTML.', // plaintext body
	    html: mail.html
		};

		// send mail with defined transport object
		transporter.sendMail(mailOptions, function(error, info){
	    if(error){
	      cb('Sending shift assignment failed! ERROR: ' + error);	
	    }else{
	    	cb('Shift assignment sent to ' + mailOptions.to + '!');
	    }
		});	
  }
};