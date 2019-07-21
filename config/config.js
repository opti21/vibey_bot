require('dotenv').config();

const config = {
    appIP: process.env.APP_URL,
    databaseURL: process.env.DATABASE_URL,
    twitchClientID: process.env.TWITCH_CLIENTID,
    twitchUser: process.env.TWITCH_USER,
    twitchPass: process.env.TWITCH_PASS,
    twitchSecret: process.env.TWITCH_SECRET,
    twitchCB: process.env.TWITCH_CALLBACK_URL,
    sessionSecret: process.env.SESSION_SECRET
   };

module.exports = config;