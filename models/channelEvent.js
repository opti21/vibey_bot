const mongoose = require('mongoose');

const channelEventSchema = new mongoose.Schema({
  jobID: String,
  channel: String,
  type: String,
  data: Object,
});

module.exports = mongoose.model('channelevents', channelEventSchema);
