/**
* Shift.js
*/

module.exports = {
  migrate: 'safe',
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
    email_sent: {
      type: 'boolean'
    },
    assigned: {
      type: 'boolean'
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

