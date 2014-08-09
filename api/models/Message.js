/**
* Message.js
*/

module.exports = {
  migrate: 'safe',
  attributes: {
  	from: {
  		type: 'string',
  		required: true
  	},
  	to: {
  		type: 'string',
  		required: true
  	},
  	content: {
  		type: 'string',
  		required: true
  	},
  	read: {
  		type: 'boolean',
  		required: true
  	}
  }
};

