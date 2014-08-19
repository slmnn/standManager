module.exports = {
	port: process.env.PORT || 1337,
	
  smtp_username : process.env.SMTP_USERNAME,
  smtp_password : process.env.SMTP_PASSWORD,
  sc_salt : process.env.SC_SALT,
  sc_password : process.env.SC_PASSWORD,

  INVITATION_EMAIL_USER: process.env.SMTP_USERNAME,
  INVITATION_EMAIL_PASSWORD: process.env.SMTP_PASSWORD,

  google_consumer_key: process.env.GOOGLE_KEY,
  google_consumer_secret: process.env.GOOGLE_SECRET,
  google_redirect_uri: process.env.GOOGLE_REDIRECT,

  shift_assignment_email_subject: 'Vuorotarjous: _shiftday',
  shift_assignment_email: ' \
  Hei _receivername,<br><br>\
  Tarjoamme sinulle vuoroa, jonka tiedot näkyvät alla: <br>\
  <hr>\
  <p><b>_shiftday _shiftstarttime - _shiftendtime</b></p>\
  <p><b>_standname</b><br>\
  _standdescription<br>\
  _standlocation (<a href="_maplink">kartta</a>)</p>\
  <hr>\
  <p>Tälle vuorolle on kutsuttu: <br>\
  _otherusersonduty\
  </p>\
  <p>Otatko vuoron vastaan?<p>\
  <table border="0" cellpadding="0" cellspacing="0" class="emailButton" style="border-radius:3px;">\
    <tr>\
      <td align="center" valign="middle" class="emailButtonContent" style=" background-color:#33CC33; padding-top:15px; padding-right:30px; padding-bottom:15px; padding-left:30px;">\
          <a href="_yesurl" target="_blank" style="color:#FFFFFF; font-family:Helvetica, Arial, sans-serif; font-size:16px; font-weight:bold; text-decoration:none;">Kyllä</a>\
      </td>\
      <td align="center" valign="middle" class="emailButtonContent" style=" background-color:#FF3300; padding-top:15px; padding-right:30px; padding-bottom:15px; padding-left:30px;">\
          <a href="_nourl" target="_blank" style="color:#FFFFFF; font-family:Helvetica, Arial, sans-serif; font-size:16px; font-weight:bold; text-decoration:none;">Ei kiitos</a>\
      </td>\
    </tr>\
  </table>\
  <p>Jos hyväksyt vuorotarjouksen, voit tarkistaa vuoron tiedot alla olevasta linkistä<br>\
  <a href="_shiftlink">_shiftlink</a></p>',
  invitation_email_subject: 'Kutsu esittelypisteen käyttäjäksi (_standname)',
  invitation_email: ' \
  Hei _receivername,<br><br>\
  Haluamme kutsua sinut esittelypisteelle, jonka tiedot näkyvät alla: <br>\
  <hr>\
  <p><b>_standname</b><br>\
  _standdescription<br>\
  _standlocation (<a href="_maplink">kartta</a>)</p>\
  <hr>\
  <p>Hyväksytkö kutsun?<p>\
  <table border="0" cellpadding="0" cellspacing="0" class="emailButton" style="border-radius:3px;">\
    <tr>\
      <td align="center" valign="middle" class="emailButtonContent" style=" background-color:#33CC33; padding-top:15px; padding-right:30px; padding-bottom:15px; padding-left:30px;">\
          <a href="_yesurl" target="_blank" style="color:#FFFFFF; font-family:Helvetica, Arial, sans-serif; font-size:16px; font-weight:bold; text-decoration:none;">Kyllä</a>\
      </td>\
      <td align="center" valign="middle" class="emailButtonContent" style=" background-color:#FF3300; padding-top:15px; padding-right:30px; padding-bottom:15px; padding-left:30px;">\
          <a href="_nourl" target="_blank" style="color:#FFFFFF; font-family:Helvetica, Arial, sans-serif; font-size:16px; font-weight:bold; text-decoration:none;">Ei kiitos</a>\
      </td>\
    </tr>\
  </table>\
  <p>Jos hyväksyt kutsun, voit tarkastella vuorokalenteriasi kirjautumalla osoittessa:<br>\
  <a href="_loginlink">_loginlink</a></p>\
  <p>Henkilökohtainen käyttäjätunnuksesi ja salasanasi ovat: <br>\
  Käyttäjätunnus: _username<br>\
  Salasana: _password</p>\
  <p>Terveisin,<br>\
  _myfullname</p>'
}