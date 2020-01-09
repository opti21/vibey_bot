const router = require('express').Router();
const passport = require('passport');

router.get('/twitch', passport.authenticate('twitch'));
router.get('/twitch/callback',
    passport.authenticate('twitch', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication.
        res.redirect('/requests');
    }
);

module.exports = router