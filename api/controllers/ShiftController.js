/**
 * ShiftController
 *
 * @description :: Server-side logic for managing shifts
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var async = require("async");
var moment = require('moment');

module.exports = {
	create: function(req, res) {
		if(req.method == 'GET') {
			return res.view();
		}
		if(req.method == 'POST') {
			console.log(req.body.input_start, req.body.input_end);
			Shift.create(
				{
					created_by: req.user[0].id,
					assigned_to_id: req.body.input_assigned_to_id,
					assigned_to_name: req.body.input_assigned_to_name,
					stand_id: req.body.input_stand_id,
					title: req.body.input_title,
					allDay: req.body.input_all_day == "all_day_true" ? true : false,
					start: moment(req.body.input_start),
					end: moment(req.body.input_end)
				}
			).exec(function(err, s){
				console.log(err, s);
				if(err) res.send(500, {error: err});
				res.send(200, {msg:'Shift ' + s.title + ' created!'});		
			});	
		}
	},
	destroy: function(req, res) {
		Shift.findOne({'id' : req.params.id}).exec(function(err, s) {
			if(err || typeof s == 'undefined') res.send("ERROR: " + err, 500);
			if(s.created_by == req.user[0].id) {
				s.destroy(function(err) {
					if(err) res.send("ERROR: " + err, 500);
					res.send(s.title + " destroyed.", 200);
				})
			} else {
				res.send("ERROR, You are not allowed to destroy this shift.", 403);
			}
		})
	},
	update: function(req, res) {
		if(req.method == 'GET') {
			return res.view();
		}
		if(req.method == 'POST') {
			console.log(req.body.input_start, req.body.input_end, req.body.input_assigned_to_id);
			var new_data = {};
			if(req.body.input_assigned_to_id != '-1') {
				new_data = {
					assigned_to_id: req.body.input_assigned_to_id,
					assigned_to_name: req.body.input_assigned_to_name,
					accepted: req.body.input_accepted ? true : false
				};
				message = "Shift assigned to " + req.body.input_assigned_to_name;
			} else {
				new_data = {
					assigned_to_id: null,
					assigned_to_name: '',
					accepted: false
				}
				message = "Shift unassigned.";
			}
			Shift.update(
				{'id' : req.params.id},
				new_data
			).exec(function(err, s){
				console.log(err, s);
				if(err) res.send(500, {error: err});
				res.send(200, {msg:message});		
			});	
		}
	}
};

