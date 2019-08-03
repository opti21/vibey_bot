require('dotenv').config();

const config = {
    appURL: process.env.APP_URL,
    databaseURL: process.env.DATABASE_URL,
    twitchClientID: process.env.TWITCH_CLIENTID,
    twitchUser: process.env.TWITCH_USER,
    twitchPass: process.env.TWITCH_PASS,
    twitchSecret: process.env.TWITCH_SECRET,
    twitchCB: process.env.TWITCH_CALLBACK_URL,
    sessionSecret: process.env.SESSION_SECRET,
    spID: process.env.SPOTIFY_ID,
    spSecret: process.env.SPOTIFY_SECRET,
    ytAPI: process.env.YT_API,
    discord: process.env.DISCORD
   };

module.exports = config;