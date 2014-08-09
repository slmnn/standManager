module.exports = {
	port: process.env.PORT || 1337,
	
  smtp_username : process.env.SMTP_USERNAME,
  smtp_password : process.env.SMTP_PASSWORD,
  sc_salt : process.env.SC_SALT,
  sc_password : process.env.SC_PASSWORD,

  INVITATION_EMAIL_USER: process.env.SMTP_USERNAME,
  INVITATION_EMAIL_PASSWORD: process.env.SMTP_PASSWORD
}