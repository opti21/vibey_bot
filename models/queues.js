const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  channel: {
    type: String,
    required: true,
  },
  allowReqs: {
    type: Boolean,
    default: true,
  },
  replyInChat: {
    type: Boolean,
    default: true,
  },
  maxReqsPerUser: {
    type: Number,
    default: 0,
  },
  nowPlaying: {
    type: Object,
  },
  vipQueue: {
    type: Array,
    default: [],
  },
  currQueue: {
    type: Array,
    default: [],
  },
});

module.exports = mongoose.model('queues', queueSchema);
