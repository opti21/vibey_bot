const mongoose = require('mongoose');

const smgSchema = new mongoose.Schema({
  channel: String,
  userGivingSubs: String,
  active: Boolean,
  subsLeft: Number,
  subsGifted: Number,
  subs: {
    type: Array,
    default: [],
  },
  senderTotal: Number,
});

module.exports = mongoose.model('subMysteryGifts', smgSchema);
