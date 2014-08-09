/**
* Invitation.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  migrate: 'safe',
  attributes: {
  	stand_id: {
      type: 'string',
      required: true,
  	},
    created_by: {
      type: 'string',
      required: true,
    },    
    created_by_name: {
      type: 'string',
      required: true,
    },
    message: {
      type: 'string',
    },
    email: {
      type: 'string',
    },
    accepted: {
    	type: 'boolean'
    },
    declined: {
    	type: 'boolean'
    },
    expires: {
      type: 'datetime',
    },
  }
};

