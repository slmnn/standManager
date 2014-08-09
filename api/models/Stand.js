/**
* Stand.js
*/

module.exports = {
  migrate: 'safe',
  attributes: {

  	owner_id: {
  		type: 'string',
  		required: true
  	},

  	name: {
  		type: 'string',
  		required: true
  	},

  	location: {
  		type: 'string'
  	},

  	description: {
  		type: 'string'
  	},

  	lat: {
  		type: 'float'
  	},

  	lng: {
  		type: 'float'
  	},

  	shifts: {
  		type: 'array'
  	}

  }
};

