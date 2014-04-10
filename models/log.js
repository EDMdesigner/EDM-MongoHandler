var mongoose = require('mongoose');


var Schema = mongoose.Schema;
var logSchema = new Schema({
	user: {type: Schema.ObjectId, ref: "User", required: true},
	message: {type: String, required: true},
	dateTime: {type: Date, default: Date.now}
});

module.exports = mongoose.model('EDM-Log', logSchema);
