const mongoose = require('mongoose')

const tipSchema = new mongoose.Schema({
  tip_receiver: Number,
  ppOrderID: {
    type: String,
    required: true
  },
  status: String,
  tipper_name: String,
  tipper_email: String,
  tipperID: String,
  order_result: Object,
  message: String
})

module.exports = mongoose.model('tips', tipSchema)
