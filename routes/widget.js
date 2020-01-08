const router = require('express').Router();
const mixReqs = require('../models/mixRequests');

// Stream Widget
router.get('/v1', async (req, res) => {
    var mixRequests = await mixReqs.find();
    res.render('widget/widget', {
        mixReqs: mixRequests
    });
});

router.get('/v2', async (req, res) => {
    var mixRequests = await mixReqs.find();
    res.render('widget/widgetV2', {
        mixReqs: mixRequests
    });
});

module.exports = router