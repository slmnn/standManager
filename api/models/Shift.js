/**
* Shift.js
*/

module.exports = {

  attributes: {
  	title: {
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
  	},
  	assigned_to_id: {
  		type: 'string'
  	},
    assigned_to_name: {
      type: 'string'
    },
    accepted: {
      type: 'boolean'
    },
    stand_id: {
      type: 'string'
    },
    created_by: {
      type: 'string'
    }
  }
};

