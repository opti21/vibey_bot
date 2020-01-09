const router = require('express').Router();
const version = require('project-version');
const User = require('../models/users');
const config = require('../config/config')
const admins = config.admins;

function loggedIn(req, res, next) {
	if (!req.user) {
		res.redirect('/login');
	} else {
		next();
	}
}

// Front page
router.get('/', (req, res) => {
	res.render('index');
});

// Login
router.get('/login', (req, res) => {
	res.render('login');
});

// Logout
router.get('/logout', async function (req, res) {
	try {
		await User.deleteOne({ twitch_id: req.user.id });
		req.session = null;
		req.user = null;
		req.logout();
		res.render('bye');
	} catch (err) {
		console.error(err);
		errTxt(err);
	}
});

router.get('/poll', loggedIn, async (req, res) => {
	try {
		var user = await User.findOne({ twitch_id: req.user.id });
		// console.log(user.username);
		if (user === null) {
			res.redirect('/login');
		}
		if (admins.includes(user.username)) {
			res.render('poll', {
				version: version,
				feUser: user.username,
				profilePic: req.user['profile_image_url']
			});
		} else {
			res.redirect('/login');
		}
	} catch (err) {
		console.error(err);
		errTxt(err);
	}
});

router.get('/hi', loggedIn, async (req, res) => {
	try {
		if (admins.includes(user.username)) {
			res.render('hi')
		} else {
			res.redirect('/login');
		}
	} catch {

	}
})

// Test
router.get('/test', function (req, res) {
	console.log('REQ.SESSION:');
	console.log(req.user);
	res.send(req.user);
});

module.exports = router