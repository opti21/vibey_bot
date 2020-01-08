const router = require('express').Router();
const config = require('../config/config')
const version = require('project-version');
const User = require('../models/users');
const admins = config.admins

router.get('/', async (req, res) => {
    let user = await User.findOne({ twitch_id: req.user.id });

    res.render('settings', {
        version: version
    })
})

module.exports = router;