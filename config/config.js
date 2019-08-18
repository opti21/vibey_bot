require('dotenv').config();

const config = {
    appURL: process.env.APP_URL,
    databaseURI: process.env.DATABASE_URI,
    twitchClientID: process.env.TWITCH_CLIENTID,
    twitchUser: process.env.TWITCH_USER,
    twitchPass: process.env.TWITCH_PASS,
    twitchSecret: process.env.TWITCH_SECRET,
    twitchCB: process.env.TWITCH_CALLBACK_URL,
    twitchChan: ['opti_21'],
    sessionSecret: process.env.SESSION_SECRET,
    spID: process.env.SPOTIFY_ID,
    spSecret: process.env.SPOTIFY_SECRET,
    ytAPI: process.env.YT_API,
    discord: process.env.DISCORD
   };

module.exports = config;