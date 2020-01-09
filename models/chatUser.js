const mongoose = require('mongoose')

const chatUserSchema = new mongoose.Schema({
    channel: String,
    saidHi: Boolean
})

module.exports = mongoose.model('chatUser', chatUserSchema)