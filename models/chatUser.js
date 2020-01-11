const mongoose = require('mongoose')

const chatUserSchema = new mongoose.Schema({
    username: String,
    channel: String,
    saidHi: {
        type: Boolean,
        default: false
    },
    expireAt: { type: Date, default: undefined }
})

chatUserSchema.index({ "expireAt": 1 }, { expireAfterSeconds: 0 });


module.exports = mongoose.model('chatUser', chatUserSchema)