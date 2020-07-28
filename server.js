require('dotenv').config();
require('sqreen');

const config = require('./config/config');
const version = require('project-version');
console.log('Version: ' + version);

const express = require('express');
const app = express();
const server = require('http').Server(app);
const passport = require('passport');
const twitchStrategy = require('passport-twitch.js').Strategy;
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const spotifyUri = require('spotify-uri');
const Spotify = require('node-spotify-api');
const spotify = new Spotify({
  id: process.env.SPOTIFY_ID,
  secret: process.env.SPOTIFY_SECRET,
});
const YouTube = require('simple-youtube-api');
const youtube = new YouTube(process.env.YT_API);
const moment = require('moment-timezone');
const io = require('socket.io')(server);
global.io = io;
const fetchJson = require('fetch-json');
const ComfyDiscord = require('comfydiscord');
const admins = config.admins;
const he = require('he');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const axios = require('axios');
const JoinedChannel = require('./models/joinedChannels');
const qs = require('querystring');
const ComfyJS = require('comfy.js');
const { v4: uuidv4 } = require('uuid');
const Sentry = require('@sentry/node');
const helmet = require('helmet');

Sentry.init({
  dsn:
    'https://a5bf8cfe7372430196e59f7dac579ff3@o421094.ingest.sentry.io/5340340',
  environment: process.env.NODE_ENV,
});

// ComfyJS.Init(config.comfyChan);

// SendGrid Emails
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Discord Init
ComfyDiscord.Init(process.env.DISCORDTOKEN);

// Tiwtch Creds for App
const TwitchCreds = require('./models/twitchCreds');

getTwitchCreds();
async function getTwitchCreds() {
  const twitchCreds = await TwitchCreds.findOne({});
  console.log(twitchCreds);
  if (twitchCreds === null) {
    const twitchUserURL = `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENTID}&client_secret=${process.env.TWITCH_SECRET}&scope=user_read&grant_type=client_credentials`;
    console.log(twitchUserURL);
    const twitchResource = {};
    const handleData = (data) => {
      console.log(data);
      const newTwitch = new TwitchCreds({
        accessToken: data.access_token,
        expireAt: moment().utc().add(data.expires_in, 'seconds'),
      });
      newTwitch
        .save()
        .then(console.log('New Twitch Creds created'))
        .catch(console.error);
    };
    fetchJson.post(twitchUserURL).then(handleData).catch(console.error);
  } else {
    console.log('Twitch Creds already exist');
  }
}

//Test Message
// errTxt("REALLY BAD ERROR");

// Real time data
const rqs = io.of('/req-namescape');
const polls = io.of('/polls-namescape');
const hellos = io.of('/hellos-namescape');

rqs.on('connection', function (socket) {
  // Create room and
  // Trigger front end notification
  socket.on('create', function (room) {
    console.log(` ${room} Connected to requests`);
    socket.join(room);
    rqs.to(`${room}`).emit('socketConnect', {});
  });
  //Whenever someone disconnects this piece of code executed
  rqs.on('disconnect', function () {
    console.log('User disconnected from requests');
  });
});

app.set('trust proxy', 1);
app.set('views', './views');
app.set('view engine', 'ejs');

app.use(helmet());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  cookieSession({
    name: 'session',
    secret: `${process.env.SESSION_SECRET}`,
    saveUninitialized: false,
    resave: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Route Files
const indexRoute = require('./routes/index');
const authRoute = require('./routes/auth');
const reqsRoute = require('./routes/requests');
const mixRoute = require('./routes/mix');
const widgetRoute = require('./routes/widget');
const apiRoute = require('./routes/api');
const settingsRoute = require('./routes/settings');
const authedUser = require('./routes/authedUser');

app.use('/', indexRoute);
app.use('/auth', authRoute);
app.use('/u', authedUser);

app.use('/widget', widgetRoute);
app.use('/api', apiRoute);
app.use('/settings', settingsRoute);

// Databae
const mongoose = require('mongoose');

switch (process.env.NODE_ENV) {
  case 'production':
    mongoose
      .connect(
        `mongodb+srv://vibey_bot:${process.env.DB_PASS}@cluster0-gtgmw.mongodb.net/vibeybot?retryWrites=true&w=majority`,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useCreateIndex: true,
        }
      )
      .catch(function (err) {
        // TODO: Throw error page if DB doesn't connect
        console.error(
          'Unable to connect to the mongodb instance. Error: ',
          err
        );
      });
    break;

  case 'staging':
    mongoose
      .connect(
        `mongodb+srv://vibey_bot:${process.env.DB_PASS}@cluster0-gtgmw.mongodb.net/vibeystaging?retryWrites=true&w=majority`,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useCreateIndex: true,
        }
      )
      .catch(function (err) {
        // TODO: Throw error page if DB doesn't connect
        console.error(
          'Unable to connect to the mongodb instance. Error: ',
          err
        );
      });
    break;

  case 'dev':
    mongoose
      .connect(
        `mongodb+srv://vibey_bot:${process.env.DB_PASS}@cluster0-gtgmw.mongodb.net/vibeydev?retryWrites=true&w=majority`,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useCreateIndex: true,
        }
      )
      .catch(function (err) {
        // TODO: Throw error page if DB doesn't connect
        console.error(
          'Unable to connect to the mongodb instance. Error: ',
          err
        );
      });
    break;
}

const db = mongoose.connection;
db.on('error', (error) => {
  console.error(error);
});
db.once('open', () => console.log('Connected to Mongoose ' + Date()));

//Models
const User = require('./models/users');
const SongRequest = require('./models/songRequests');
const Poll = require('./models/polls');
const Good = require('./models/goods');
const Queue = require('./models/queues');
const ChannelEvent = require('./models/channelEvent');
const SubMysteryGift = require('./models/subMysteryGifts');

// Twitch auth
passport.use(
  new twitchStrategy(
    {
      clientID: process.env.TWITCH_CLIENTID,
      clientSecret: process.env.TWITCH_SECRET,
      callbackURL: `${process.env.APP_URL}/auth/twitch/callback`,
      scope: 'user:read:email channel_subscriptions bits:read',
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        User.findOne({ twitch_id: profile.id })
          .exec()
          .then(function (UserSearch) {
            if (UserSearch === null) {
              var user = new User({
                twitch_id: profile.id,
                username: profile.login,
                display_name: profile.display_name,
                email: profile.email,
                profile_pic_url: profile.profile_image_url,
                provider: 'twitch',
                twitch: profile,
                accessToken: accessToken,
                refreshToken: refreshToken,
                expireAt: moment().utc().add(8, 'hours'),
              });
              console.log('New user created');
              let queue = new Queue({
                channel: profile.login,
              });
              queue.save();
              user.save();
              return done(null, profile);
            } else {
              console.log('User already exists');
              console.log(UserSearch.twitch_id);
              return done(null, profile);
            }
          })
          .catch((err) => {
            console.error(err);
          });
      } catch (err) {
        console.error(err);
      }
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

/* *** DON'T PLACE ANY PAGES ***
 ***  AFTER THE 404 PAGE   *** */
//404
app.get('*', (req, res) => {
  res.render('404');
});

// Twitch Client
const tmi = require('tmi.js');
const { type } = require('os');
const twitchclientid = process.env.TWITCH_CLIENTID;
const twitchuser = process.env.TWITCH_USER;
const twitchpass = process.env.TWITCH_PASS;

const tmiOptions = {
  options: {
    debug: true,
    clientId: twitchclientid,
  },
  connection: {
    secure: true,
    // Test server
    // server: 'irc.fdgt.dev',
  },
  identity: {
    username: twitchuser,
    password: twitchpass,
  },
};

const botclient = new tmi.client(tmiOptions);

// Connect the twitch chat client to the server..
botclient.connect();
global.botclient = botclient;

// re-join channels that were already connected
JoinedChannel.find({}).then((res) => {
  res.forEach((doc) => {
    console.log(doc.channel);
    botclient.join(doc.channel);
  });
});

// Bot says hello on connect
botclient.on('connected', (address, port) => {
  // botclient.say(channel, `Hey Chat! Send me those vibes`)
  console.log('connected to twitch chat client');
  console.log(address);
});

// Regex
const URLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
const spRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
const ytRegex = /(?:https?:\/\/)?(?:(?:(?:www\.?)?youtube\.com(?:\/(?:(?:watch\?.*?(v=[^&\s]+).*)|(?:v(\/.*))|(channel\/.+)|(?:user\/(.+))|(?:results\?(search_query=.+))))?)|(?:youtu\.be(\/.*)?))/;

function findURI(object, property, value) {
  return (
    object[property] === value ||
    Object.keys(object).some(function (k) {
      return (
        object[k] &&
        typeof object[k] === 'object' &&
        findURI(object[k], property, value)
      );
    })
  );
}

function refreshTokenThenAdd(user, uri) {
  let cb_url = process.env.SPOTIFY_CALLBACK_URL;
  console.log('REFRESH TOKEN');
  console.log(user.spotify.refresh_token);

  let body = {
    client_id: process.env.SPOTIFY_ID,
    client_secret: process.env.SPOTIFY_SECRET,
    refresh_token: user.spotify.refresh_token,
    grant_type: 'refresh_token',
    redirect_uri: cb_url,
  };

  let config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  axios
    .post('https://accounts.spotify.com/api/token/', qs.stringify(body), config)

    .then((code_res) => {
      console.log(code_res.data);
      try {
        User.findOneAndUpdate(
          { twitch_id: user.twitch_id },
          {
            spotify: {
              access_token: code_res.data.access_token,
              refresh_token: user.spotify.refresh_token,
              token_type: code_res.data.token_type,
              expires_in: moment()
                .utc()
                .add(code_res.data.expires_in, 'seconds'),
              scope: code_res.data.scope,
            },
          },
          { new: true }
        ).then((update_res) => {
          console.log(update_res);
          console.log('spotify token refreshed');
          checkPlaylist(uri, user.username, update_res.spotify.access_token);
        });
      } catch (e) {
        console.error(e);
      }
    })
    .catch((e) => {
      console.error(e);
    });
}

function checkPlaylist(uri, channel, user_token) {
  axios({
    method: 'get',
    url: `https://api.spotify.com/v1/playlists/${config.spotify_playlist}/tracks`,
    headers: {
      Authorization: 'Bearer ' + user_token,
    },
    params: {
      fields: 'items(track(uri))',
    },
  })
    .then((res) => {
      if (!findURI(res.data.items, 'uri', uri)) {
        addSongtoPlaylist(uri, channel, user_token);
      } else {
        botclient.say(config.comfyChan, 'Song is already on the playlist');
        return;
      }
    })
    .catch((e) => {
      console.error(e);
    });
}

function addSongtoPlaylist(uri, channel, user_token) {
  // Add song to playlist
  axios({
    method: 'post',
    url: `https://api.spotify.com/v1/playlists/${config.spotify_playlist}/tracks`,
    data: {
      uris: [uri],
    },

    headers: {
      Authorization: 'Bearer ' + user_token,
      Accept: 'application/json',
    },
  }).then((res) => {
    console.log(res.data);
    spotify
      .request(`https://api.spotify.com/v1/tracks/${uri.slice(14)}`)
      .then(function (data) {
        botclient.say(
          channel,
          `${data.name} by ${data.artists[0].name} added to playlist successfully`
        );
      });
  });
}

// ComfyJs Client to catch channel point redemptions
ComfyJS.onChat = async (user, command, message, flags, extra) => {
  // console.log(extra)
  if (extra.customRewardId === '609d1f92-0dde-4057-9902-30f5f78237e6') {
    // Check to see if URL matches for spotify
    let song = command;
    console.log('I see the redemption');

    if (spRegex.test(song)) {
      var spID = spotifyUri.parse(song);
      var spURI = spotifyUri.formatURI(song);
      let user = await User.findOne({ username: extra.channel });
      let user_token = user.spotify.access_token;
      let tokenExpire = user.spotify.expires_in;

      console.log(tokenExpire);
      console.log(moment(moment().utc()).isBefore(tokenExpire));

      // Check to see if token is valid
      if (moment(moment().utc()).isBefore(tokenExpire)) {
        checkPlaylist(spURI, user.username, user_token);
      } else {
        refreshTokenThenAdd(user, spURI);
      }
    } else {
      botclient.say(
        config.comfyChan,
        'Issue adding song @opti_21 @veryhandsomebilly'
      );
    }
  }
};

// function sendTest() {
//   botclient.say(
//     '#opti_21',
//     `submysterygift --count ${Math.floor(
//       Math.random() * 10
//     )} --username speedrazer`
//   );
// }

function sendraid() {
  botclient.say('#opti_21', `raid`);
}

function sendSubGift() {
  botclient.say('#opti_21', `subgift --tier 1 --username speedrazer`);
}

// setTimeout(sendTest, 10000);
// setInterval(sendSubGift, 11000);

// async function findEvent() {
//   let event = await ChannelEvent.findById('5f1f98e3d74364296c3a12e4');
//   console.log(event);
// }
// setTimeout(findEvent, 10000);

// individual Subgifts
botclient.on(
  'subgift',
  async (channel, username, streakMonths, recipient, methods, userstate) => {
    // Total gifted over time
    let senderCount = ~~userstate['msg-param-sender-count'];
    // let streak = ~~userstate['msg-param-cumulative-months'];
    // let showStreak = userstate['msg-param-should-share-streak'];
    let noHashChan = channel.slice(1);
    console.log(userstate);

    let activeSMG = await SubMysteryGift.findOne({
      channel: noHashChan,
      userGivingSubs: username,
      active: true,
    });
    // console.log(activeSMG);
    if (activeSMG) {
      if (activeSMG.subsLeft > 1) {
        let newSubArray = activeSMG.subs;
        let newSubCount = activeSMG.subsLeft - 1;
        // TODO: add more sub data
        let subData = {
          recipient: recipient,
        };
        newSubArray.push(subData);
        SubMysteryGift.findByIdAndUpdate(
          activeSMG._id,
          {
            subs: newSubArray,
            subsLeft: newSubCount,
          },
          {
            new: true,
            useFindAndModify: false,
          }
        )
          .then((doc) => {
            // console.log('SMG Updated');
            console.log(doc);
          })
          .catch((err) => {
            console.error(err);
          });
      } else {
        let newSubArray = activeSMG.subs;
        let newSubCount = activeSMG.subsLeft - 1;
        let subData = {
          recipient: recipient,
        };
        newSubArray.push(subData);
        SubMysteryGift.findByIdAndUpdate(
          activeSMG._id,
          {
            subs: newSubArray,
            subsLeft: newSubCount,
            active: false,
          },
          {
            new: true,
            useFindAndModify: false,
          }
        )
          .then((smgDoc) => {
            // console.log('SMG Completed');
            let newEvent = new ChannelEvent({
              channel: noHashChan,
              type: 'mysterysubgift',
              data: smgDoc,
            });
            newEvent.save((err, eventDoc) => {
              if (err) console.error(err);
              rqs.to(`${noHashChan}`).emit('noti', {
                id: eventDoc._id,
                type: 'mysterysubgift',
                userGivingSubs: smgDoc.userGivingSubs,
                subsGifted: smgDoc.subsGifted,
                senderTotal: smgDoc.senderTotal,
                subs: smgDoc.subs,
              });
            });
          })
          .catch((err) => {
            console.error(err);
          });
      }
    } else {
      // console.log('No active SMG');
      let newEvent = new ChannelEvent({
        channel: noHashChan,
        type: 'subgift',
        data: {
          username: username,
          recipient: recipient,
          // showStreak: showStreak,
          // streak: streak,
          totalGifted: senderCount,
        },
      });
      newEvent.save((err, doc) => {
        console.log('NEW SUB GIFT');
        console.log(doc._id);
        if (err) console.error(err);
        rqs.to(`${noHashChan}`).emit('noti', {
          id: doc._id,
          type: 'subgift',
          username: username,
          recipient: recipient,
          // showStreak: showStreak,
          // streak: streak,
          senderTotal: senderCount,
        });
      });
    }
  }
);

// Random sub gifts aka Sub bombs
botclient.on(
  'submysterygift',
  (channel, username, numbOfSubs, methods, userstate) => {
    // console.log(userstate);
    // console.log('NEW SMG')
    let noHashChan = channel.slice(1);
    let senderCount = ~~userstate['msg-param-sender-count'];

    let newSMG = new SubMysteryGift({
      channel: noHashChan,
      active: true,
      subsLeft: numbOfSubs,
      subsGifted: numbOfSubs,
      userGivingSubs: username,
      senderTotal: senderCount,
    });
    newSMG.save((err, doc) => {
      if (err) console.error(err);
    });
  }
);

botclient.on('raided', (channel, username, viewers) => {
  let noHashChan = channel.slice(1);

  let newEvent = new ChannelEvent({
    channel: noHashChan,
    type: 'raid',
    data: {
      username: username,
      viewers: viewers,
    },
  });
  newEvent.save((err, doc) => {
    if (err) console.error(err);
    rqs.to(`${noHashChan}`).emit('noti', {
      id: doc._id,
      type: 'raid',
      username: username,
      viewers: viewers,
    });
  });
});

ChannelEvent.deleteMany({}).then((doc) => {
  console.log('EVENTS DELETED');
});

// Song Requests
botclient.on('chat', async (channel, userstate, message, self) => {
  if (self) return;
  if (message[0] !== '!') return;
  let parsedM = message.trim().split(' ');
  let command = parsedM[0].slice(1).toLowerCase();
  let noHashChan = channel.slice(1);

  // TODO: Combine open and closing commands
  if (command === 'closesr') {
    if (userstate.badges.broadcaster === '1' || userstate.mod === true) {
      Queue.updateOne({ channel: channel.slice(1) }, { allowReqs: false })
        .then((doc) => {
          botclient.say(channel, 'Requests are now closed');
        })
        .catch((err) => console.error(err));
    } else {
      return;
    }
  }

  if (command === 'opensr') {
    if (userstate.badges.broadcaster === '1' || userstate.mod === true) {
      Queue.updateOne({ channel: channel.slice(1) }, { allowReqs: true })
        .then((doc) => {
          botclient.say(channel, 'Requests are now open');
        })
        .catch((err) => console.error(err));
    } else {
      return;
    }
  }

  if (command === 'replies') {
    if (userstate.badges.broadcaster === '1' || userstate.mod === true) {
      let allowed = ['off', 'on'];
      let setting = parsedM[1];
      if (!allowed.includes(setting)) {
        botclient.say(noHashChan, 'Unrecognized setting, please use off or on');
        return;
      }
      let settingBool;
      if (setting === 'off') {
        settingBool = false;
      }
      if (setting === 'on') {
        settingBool = true;
      }

      Queue.updateOne({ channel: noHashChan }, { replyInChat: settingBool })
        .then((doc) => {
          botclient.say(channel, `Replies are now ${setting}`);
        })
        .catch((err) => console.error(err));
    } else {
      return;
    }
  }

  if (command === 'sr' || command === 'songrequest') {
    let queue = await Queue.findOne({ channel: noHashChan });
    // console.log(queue.settings);
    if (queue.allowReqs) {
      if (URLRegex.test(parsedM[1])) {
        // Spotify link
        if (spRegex.test(parsedM[1])) {
          console.log('spotify link');
          var spID = spotifyUri.parse(parsedM[1]);
          var spURI = spotifyUri.formatURI(parsedM[1]);
          spotify
            .request(`https://api.spotify.com/v1/tracks/${spID.id}`)
            .then(function (data) {
              let newSr = {
                id: uuidv4(),
                track: {
                  name: data.name,
                  artist: data.artists[0].name,
                  link: parsedM[1],
                  uri: spURI,
                },
                requestedBy: userstate.username,
                timeOfReq: moment.utc().format(),
                source: 'spotify',
                channel: channel.slice(1),
              };

              queue.currQueue.push(newSr);
              let newQueue = queue.currQueue;
              // console.log(queue);
              Queue.findOneAndUpdate(
                { channel: noHashChan },
                { currQueue: newQueue },
                { new: true, useFindAndModify: false }
              )
                .then((queueDoc) => {
                  // Real time data push to front end
                  // console.log(doc);
                  // console.log(queueDoc);

                  rqs.to(`${noHashChan}`).emit('sr-event', {
                    id: `${newSr.id}`,
                    reqBy: `${newSr.requestedBy}`,
                    track: `${newSr.track.name}`,
                    artist: `${newSr.track.artist}`,
                    uri: `${newSr.track.uri}`,
                    link: `${newSr.track.link}`,
                    source: `${newSr.source}`,
                    timeOfReq: `${newSr.timeOfReq}`,
                  });

                  if (chatRespond) {
                    botclient.say(
                      channel,
                      `@${newSr.requestedBy} requested ${newSr.track.name} by ${newSr.track.artist} - ${newSr.track.link}`
                    );
                  }
                })
                .catch((e) => {
                  console.error(e);
                });
            })
            .catch(function (err) {
              console.error('Error occurred: ' + err);
            });
        }
        // Youtube Link
        if (ytRegex.test(parsedM[1])) {
          console.log('youtube link');
          youtube.getVideo(parsedM[1]).then((video) => {
            let newSr = {
              id: uuidv4(),
              track: { name: video.title, link: parsedM[1] },
              requestedBy: userstate.username,
              timeOfReq: moment.utc().format(),
              source: 'youtube',
              channel: channel.slice(1),
            };

            queue.currQueue.push(newSr);
            let newQueue = queue.currQueue;
            // console.log(queue);
            Queue.findOneAndUpdate(
              { channel: noHashChan },
              { currQueue: newQueue },
              { new: true, useFindAndModify: false }
            )
              .then((queueDoc) => {
                // Real time data push to front end
                // console.log(doc);
                // console.log(queueDoc);

                rqs.to(`${noHashChan}`).emit('sr-event', {
                  id: `${newSr.id}`,
                  reqBy: `${newSr.requestedBy}`,
                  track: `${newSr.track.name}`,
                  uri: `${newSr.track.uri}`,
                  link: `${newSr.track.link}`,
                  source: `${newSr.source}`,
                  timeOfReq: `${newSr.timeOfReq}`,
                });

                if (chatRespond) {
                  botclient.say(
                    channel,
                    `@${newSr.requestedBy} requested ${newSr.track.name} - ${newSr.track.link}`
                  );
                }
              })
              .catch((e) => {
                console.error(e);
              });
          });
        }
      }
      // Check for text content
      if (parsedM[1] === undefined) {
        botclient.say(
          channel,
          `No input received. !requests to see how to submit requests`
        );
      } else {
        // Searches Spotify & Youtube when only text is provided
        if (!ytRegex.test(parsedM[1])) {
          var request = parsedM.slice(1).join(' ');
          // var ytQuery = parsedM.slice(1).join('+');
          // var ytSearch = `https://www.youtube.com/results?search_query=${ytQuery}`;
          spotify.search(
            { type: 'track', query: `${request}`, limit: 1 },
            function (err, data) {
              if (err) {
                console.error(err);
              }
              if (data.tracks.items.length === 0) {
                // If Spotify can't find the song search for song on Youtube
                youtube
                  .search(request, 1)
                  .then((results) => {
                    let newSr = {
                      id: uuidv4(),
                      track: {
                        name: results[0].title,
                        link: `https://youtu.be/${results[0].id}`,
                      },
                      requestedBy: userstate.username,
                      timeOfReq: moment.utc().format(),
                      source: 'youtube',
                      channel: channel.slice(1),
                    };

                    queue.currQueue.push(newSr);
                    let newQueue = queue.currQueue;
                    // console.log(queue);
                    Queue.findOneAndUpdate(
                      { channel: noHashChan },
                      { currQueue: newQueue },
                      { new: true, useFindAndModify: false }
                    )
                      .then((queueDoc) => {
                        // Real time data push to front end
                        // console.log(doc);
                        // console.log(queueDoc);

                        rqs.to(`${noHashChan}`).emit('sr-event', {
                          id: `${newSr.id}`,
                          reqBy: `${newSr.requestedBy}`,
                          track: `${newSr.track.name}`,
                          uri: `${newSr.track.uri}`,
                          link: `${newSr.track.link}`,
                          source: `${newSr.source}`,
                          timeOfReq: `${newSr.timeOfReq}`,
                        });

                        if (chatRespond) {
                          botclient.say(
                            channel,
                            `@${newSr.requestedBy} requested ${newSr.track.name} - ${newSr.track.link}`
                          );
                        }
                      })
                      .catch((e) => {
                        console.error(e);
                      });
                  })
                  .catch(console.error);
              } else {
                // If song was found on Spotify add song to queue
                let newSr = {
                  id: uuidv4(),
                  track: {
                    name: data.tracks.items[0].name,
                    artist: data.tracks.items[0].artists[0].name,
                    link: data.tracks.items[0].external_urls.spotify,
                    uri: data.tracks.items[0].uri,
                  },
                  requestedBy: userstate.username,
                  timeOfReq: moment.utc().format(),
                  source: 'spotify',
                  channel: channel.slice(1),
                };

                queue.currQueue.push(newSr);
                let newQueue = queue.currQueue;
                // console.log(queue);
                Queue.findOneAndUpdate(
                  { channel: noHashChan },
                  { currQueue: newQueue },
                  { new: true, useFindAndModify: false }
                )
                  .then((queueDoc) => {
                    // Real time data push to front end
                    // console.log(doc);
                    // console.log(queueDoc);

                    rqs.to(`${noHashChan}`).emit('sr-event', {
                      id: `${newSr.id}`,
                      reqBy: `${newSr.requestedBy}`,
                      track: `${newSr.track.name}`,
                      artist: `${newSr.track.artist}`,
                      uri: `${newSr.track.uri}`,
                      link: `${newSr.track.link}`,
                      source: `${newSr.source}`,
                      timeOfReq: `${newSr.timeOfReq}`,
                    });

                    if (chatRespond) {
                      botclient.say(
                        channel,
                        `@${newSr.requestedBy} requested ${newSr.track.name} by ${newSr.track.artist} - ${newSr.track.link}`
                      );
                    }
                  })
                  .catch((e) => {
                    console.error(e);
                  });
              }
            }
          );
        }
      }
    } else {
      botclient.say(channel, 'Requests are closed');
    }
  }

  if (command === 'tr') {
    let queue = await Queue.findOne({ channel: channel.slice(1) });
    let chatRespond = queue.replyInChat;
    // console.log(queue.settings);
    if (queue.allowReqs) {
      var request = parsedM.slice(1).join(' ');

      let newSr = {
        id: uuidv4(),
        track: {
          name: request,
        },
        requestedBy: userstate.username,
        timeOfReq: moment.utc().format(),
        source: 'text',
        channel: channel.slice(1),
      };

      queue.currQueue.push(newSr);
      let newQueue = queue.currQueue;
      // console.log(queue);
      Queue.findOneAndUpdate(
        { channel: noHashChan },
        { currQueue: newQueue },
        { new: true, useFindAndModify: false }
      )
        .then((queueDoc) => {
          // Real time data push to front end
          // console.log(doc);
          // console.log(queueDoc);

          rqs.to(`${noHashChan}`).emit('sr-event', {
            id: `${newSr.id}`,
            reqBy: `${newSr.requestedBy}`,
            track: `${newSr.track.name}`,
            source: `${newSr.source}`,
            timeOfReq: `${newSr.timeOfReq}`,
          });

          if (chatRespond) {
            botclient.say(
              channel,
              `@${newSr.requestedBy} requested ${newSr.track.name}`
            );
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      botclient.say(channel, 'Requests are closed');
    }
  }

  // Choice selection for polls
  let numRegex = /^[0-9]+$/;
  // Check to see if message is only numbers
  if (numRegex.test(message) === true) {
    var poll = await Poll.findOne({ active: true });
    if (!poll) {
      // if no poll say nothing because bot will spam
      return;
    }
    // Check if the user has already voted
    if (poll.voters.includes(userstate.username)) {
      // Check if multiple votes are allowed
      if (poll.allow_multiple_votes === true) {
        var numIndex = message.search(/\d/);
        var int = message[numIndex];
        var choice = parseInt(int, 10);
        var cIndex = choice - 1;
        var cID = poll.choices[cIndex].id;
        var currV = poll.choices[cIndex].votes;
        var i = currV + 1;
        var tUser = userstate.username;

        await Poll.findOneAndUpdate(
          { _id: poll.id, 'choices.id': cID },
          { $addToSet: { voters: tUser }, $set: { 'choices.$.votes': i } },
          { useFindAndModify: false, new: true },
          (err, doc) => {
            // console.log(doc.choices[cIndex].votes);
            // console.log(doc);
            polls.emit('pollUpdate', {
              doc: doc,
            });
          }
        );
      } else {
        botclient.say(channel, `@${userstate.username} you've already voted`);
        return;
      }
    } else {
      var numIndex = message.search(/\d/);
      var int = message[numIndex];
      var choice = parseInt(int, 10);
      var cIndex = choice - 1;
      var cID = poll.choices[cIndex].id;
      var currV = poll.choices[cIndex].votes;
      var i = currV + 1;
      var tUser = userstate.username;
      await Poll.findOneAndUpdate(
        { _id: poll.id, 'choices.id': cID },
        { $addToSet: { voters: tUser }, $set: { 'choices.$.votes': i } },
        { useFindAndModify: false, new: true },
        (err, doc) => {
          // console.log(doc.choices[cIndex].votes);
          // console.log(doc);
          polls.emit('pollUpdate', {
            doc: doc,
          });
        }
      );
    }
  }

  if (command === 'deleteall') {
    if (admins.includes(userstate.username)) {
      await Poll.deleteMany({}).then((err, doc) => {
        if (err) {
          console.error(err);

          return;
        }
        botclient.say(channel, `Polls deleted!`);
      });
    }
  }

  if (command === 'p') {
    if (admins.includes(userstate.username)) {
      var poll = await Poll.findOne({});
      console.log(poll);
    }
  }

  if (command === 'goodnews' || command === 'goodn') {
    var tUser = userstate['user-id'];
    var twitchCreds = await TwitchCreds.findOne({});
    var goodnews = parsedM.slice(1).join(' ');
    console.log(tUser);
    console.log(twitchCreds);
    var url = `https://api.twitch.tv/helix/users?id=${tUser}`;
    var params = {};
    var options = {
      headers: {
        'Client-ID': `${process.env.TWITCH_CLIENTID}`,
        Authorization: `Bearer ${twitchCreds.accessToken}`,
      },
    };
    async function handleData(data) {
      console.log(data.data[0].profile_image_url);
      var newGood = new Good({
        user: userstate.username,
        userPic: data.data[0].profile_image_url,
        news: goodnews,
      });
      ComfyDiscord.Say(
        'good-news',
        `${userstate.username}'s good news: ${goodnews}`
      );
      newGood.save();
    }

    fetchJson.get(url, params, options).then(handleData);
  }

  // Time Command
  if (command === 'time' && channel.slice(1) === 'veryhandsomebilly') {
    var day = moment.tz(moment(), 'Pacific/Auckland').format('dddd');
    var dNum = moment.tz(moment(), 'Pacific/Auckland').format('Do');
    var month = moment.tz(moment(), 'Pacific/Auckland').format('MMMM');
    var time = moment.tz(moment(), 'Pacific/Auckland').format('hh:mmA');
    botclient.say(
      channel,
      `In New Zealand it is currently ${day} the ${dNum} of ${month} and the time is ${time}`
    );
  }

  if (command === 'test' && userstate.badges.broadcaster === '1') {
    botclient.say(channel, he.decode(`THIS IS A TEST`));
  }
});

// TODO: add follows using PubSub

// const TwitchPS = require('twitchps');
// // Initial topics are required
// let init_topics = [
//   {
//     topic: 'channel-subscribe-events-v1.opti_21',
//     token: '',
//   },
// ];
// // Optional reconnect, debug options (Defaults: reconnect: true, debug: false)
// var ps = new TwitchPS({
//   init_topics: init_topics,
//   reconnect: true,
//   debug: true,
// });
// ps.on('stream-up', (data) => {
//   console.log(data.time, data.channel_name);
//   // Use data here
// });
// ps.on('stream-down', (data) => {
//   console.log(data.time, data.channel_name);
//   // Use data here
// });
// ps.on('subscribe', (data) => {
//   console.log(data);
// });

// Answer for !science
var answer = '';

const port = process.env.PORT || 3000;
server.listen(port);

// Utils
const capitalize = (s) => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function makeid(length) {
  var result = '';
  var characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
