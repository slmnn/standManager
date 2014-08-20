/**
* Trace.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
  	stand_id: {
  		type:'string'
  	},
  	user_id: {
  		type:'string'
  	},
  	user_name: {
  		type:'string'
  	},
  	shift_id: {
  		type:'string'
  	},
  	shift_start: {
  		type:'datetime'
  	},
  	shift_end: {
  		type:'datetime'
  	},
  	message: {
  		type:'string'
  	}
  }
};

