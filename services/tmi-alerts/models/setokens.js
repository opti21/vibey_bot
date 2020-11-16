const mongoose = require('mongoose')

const seTokenSchema = new mongoose.Schema({
	channel: String,
  seID: String,
	token: String,
})

module.exports = mongoose.model('setokens', seTokenSchema)
