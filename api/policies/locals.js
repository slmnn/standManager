
module.exports = function(req, res, next) {
	if(req.isAuthenticated()) {
  	res.locals.current_user = req.user;
  	res.locals.page_title = "Stand Manager " + req.path;
  	return next();
  }
  return res.forbidden('You are not permitted to perform this action.');
};