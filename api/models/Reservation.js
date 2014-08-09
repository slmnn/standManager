/**
* Reservation.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  migrate: 'safe',
  attributes: {
  	user_id: {
  		type: 'string',
  		required: true
  	},
  	allDay: {
  		type: 'boolean'
  	},
  	start: {
  		type: 'datetime',
  		required: true
  	},
  	end: {
  		type: 'datetime',
  		required: true
  	}
  }
};

