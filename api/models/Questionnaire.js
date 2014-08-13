/**
* Questionnaire.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  migrate: 'safe',
  attributes: {
  	created_by: {
  		type:'string'
  	},
  	created_by_name: {
  		type:'string'
  	},
  	title: {
  		type: 'string'
  	},
  	message: {
  		type: 'string'
  	},
  	email: {
  		type:'email'
  	},
    user_id: {
      type:'string'
    },
  	stand_id:  {
  		type:'string'
  	},
  	filled : {
  		type: 'boolean'
  	},
  	expires: {
  		type: 'datetime'
  	}
  }
};

