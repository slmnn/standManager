module.exports = {
  smtp_username : process.env.SMTP_USERNAME,
  smtp_password : process.env.SMTP_PASSWORD,
  sc_salt : process.env.SC_SALT,
  sc_password : process.env.SC_PASSWORD,

  INVITATION_EMAIL_USER: process.env.SMTP_USERNAME,
  INVITATION_EMAIL_PASSWORD: process.env.SMTP_PASSWORD,

  adapters : { // sails v.0.9.0
    'default': 'mongo',
    disk: {
      module: 'sails-disk'
    },
    mongo: {
      module   : 'sails-mongo',
      host     : 'ds031347.mongolab.com',
      port     : 31347,
      user     : process.env.MONGO_DB_USER,
      password : process.env.MONGO_DB_PASS,
      database : process.env.MONGO_DB_NAME
    }
  }
}