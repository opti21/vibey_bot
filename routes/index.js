const router = require('express').Router();
const version = require('project-version');
const User = require('../models/users');
const ChatUser = require('../models/chatUser');
const config = require('../config/config');
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
  if (req.isAuthenticated()) {
    let loggedIn = true;
    let loggedInUser = req.user.login;
    res.render('index', {
      isLoggedIn: loggedIn,
      loggedInUser: loggedInUser,
    });
  } else {
    let loggedIn = false;
    let loggedInUser = null;
    res.render('index', {
      isLoggedIn: loggedIn,
      loggedInUser: loggedInUser,
    });
  }
});

// Login
router.get('/login', (req, res) => {
  res.render('login');
});

// Logout
router.get('/logout', async function (req, res) {
  try {
    // await User.deleteOne({ twitch_id: req.user.id });
    req.session = null;
    req.user = null;
    req.logout();
    res.render('bye');
  } catch (err) {
    console.error(err);
  }
});

router.get('/tip/:channel', async (req, res) => {
  let user = await User.findOne({ username: req.params.channel });
  let channelExists;
  let ppConnected = false;

  if (!user) {
    channelExists = false;
  } else {
    channelExists = true;
    ppConnected = user.paypal_connected
  }

  let currencies = [
    'AUD',
    'BRL',
    'CAD',
    'CNY',
    'CZK',
    'DKK',
    'EUR',
    'HKD',
    'HUF',
    'INR',
    'ILS',
    'JPY',
    'MYR',
    'MXN',
    'TWD',
    'NZD',
    'NOK',
    'PHP',
    'PLN',
    'NZD',
    'PLN',
    'GBP',
    'RUB',
    'SGD',
    'SEK',
    'CHF',
    'TWD',
    'THB',
    'USD',
  ];

  res.render('tip-page', {
    channelExists: channelExists,
    channel: req.params.channel,
    ppConnected: ppConnected,
    currencies: currencies,
    userProfilePic: user.profile_pic_url
  });
});

router.get('/tip-success/:channel', async (req, res) => {
  res.render('tip-success', {
    channel: req.params.channel
  })
})

module.exports = router;
