/**
 * ReservationController
 *
 * @description :: Server-side logic for managing reservations
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	create: function(req, res) {
		if(req.method == 'POST') {
			Reservation.create(
				{
					user_id: req.user[0].id,
					allDay: req.body.input_all_day == "all_day_true" ? true : false,
					start: moment(req.body.input_start),
					end: moment(req.body.input_end),
					origin_questionnaire: false
				}
			).exec(function(err, s){
				console.log(err, s);
				if(err) res.send(500, {error: err});
				return res.json({msg:'Reservation created!'});
			});	
		} else {
			return res.send(403, "Only POST is allowed");
		}
	},
	destroy: function(req, res) {
		Reservation.findOne({'id' : req.params.id}).exec(function(err, r) {
			if(err || typeof r == 'undefined') res.send("ERROR: " + err, 500);
			if(r.user_id == req.user[0].id) {
				r.destroy(function(err) {
					if(err) return res.send("ERROR: " + err, 500);
					return res.json({msg:'Reservation destroyed!'});
				})
			} else {
				return res.send("ERROR: " + err, 403);
			}
		})
	}
};

