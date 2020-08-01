const router = require('express').Router();
const mixReqs = require('../models/mixRequests');

// Stream Widget
router.get('/v1', async (req, res) => {
  var mixRequests = await mixReqs.find();
  res.render('widget/widget', {
    mixReqs: mixRequests,
  });
});

router.get('/v2', async (req, res) => {
  var mixRequests = await mixReqs.find();
  res.render('widget/widgetV2', {
    mixReqs: mixRequests,
  });
});

router.get('/poll', async (req, res) => {
  try {
    res.render('widget/poll-widget');
  } catch (err) {
    console.error(err);
  }
});

router.get('/otamatones', async (req, res) => {
  try {
    res.render('widget/otamatones');
  } catch (err) {
    console.error(err);
  }
});

module.exports = router;
