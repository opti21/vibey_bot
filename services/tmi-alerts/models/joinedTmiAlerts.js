const mongoose = require("mongoose");

const joinedChannelSchema = new mongoose.Schema({
  channel: String,
});

module.exports = mongoose.model("joinedChannels", joinedChannelSchema);
