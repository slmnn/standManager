
module.exports = function(req, res, next) {
  res.locals.current_user = req.user;
  res.locals.page_title = "Stand Manager " + req.path;
  next();
};