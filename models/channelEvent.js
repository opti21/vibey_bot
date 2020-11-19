const mongoose = require('mongoose');

const channelEventSchema = new mongoose.Schema({
  channel: String,
  type: String,
  data: Object,
  created_at: {
    type: Date,
    default: Date.now()
  }
});

module.exports = mongoose.model('channelevents', channelEventSchema);
