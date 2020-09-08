const mongoose = require('mongoose');

const choiceSchema = new mongoose.Schema({
  jobID: String,
  channel: String,
  type: String,
  data: Object,
});

module.exports = mongoose.model('choices', choiceSchema);
