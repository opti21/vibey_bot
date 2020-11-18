const mongoose = require('mongoose');

const submissionsSchema = new mongoose.Schema({
  submitter: String,
  description: String,
  link: String,
});

module.exports = mongoose.model('submissions', submissionsSchema);
