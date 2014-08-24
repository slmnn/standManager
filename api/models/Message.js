/**
* Message.js
*/

module.exports = {
  migrate: 'safe',
  attributes: {
  	from_id: {
  		type: 'string',
  		required: true
  	},
    from_name: {
      type: 'string',
      required: true
    },
    from_email: {
      type: 'string',
      required: true
    },
  	stand_id: {
  		type: 'string',
  		required: true
  	},
  	content: {
  		type: 'string',
  		required: true
  	},
    subject: {
      type: 'string',
      required: true
    },
  	seen: {
  		type: 'boolean',
  		required: true
  	}
  }
};

