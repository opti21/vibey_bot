const mongoose = require('mongoose')

const pollSchema = new mongoose.Schema({
	active: {
		type: Boolean,
		default: true
	},
	polltext: String,
	choices: Array,
	voters: {
		type: Array,
		default: []
	},
	winner: String,
	allow_multiple_votes: {
		type: Boolean,
		required: true
	}
})

module.exports = mongoose.model('polls', pollSchema)