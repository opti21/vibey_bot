require('dotenv').config();

const config = require('./config/config')
const version = require('project-version');
console.log('Version: ' + version);

const express = require('express');
const app = express();
const server = require('http').Server(app);
const logger = require('morgan');
const passport = require('passport');
const twitchStrategy = require('passport-twitch-new').Strategy;
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const spotifyUri = require('spotify-uri');
const Spotify = require('node-spotify-api');
const spotify = new Spotify({
  id: process.env.SPOTIFY_ID,
  secret: process.env.SPOTIFY_SECRET
});
const YouTube = require('simple-youtube-api');
const youtube = new YouTube(process.env.YT_API);
const moment = require('moment-timezone');
const io = require('socket.io')(server);
global.io = io;
const fetchJson = require('fetch-json');
const ComfyDiscord = require('comfydiscord');
const admins = config.admins;
const exec = require('child_process').exec;
const he = require('he');
const sgMail = require('@sendgrid/mail');

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
    const handleData = data => {
      console.log(data);
      const newTwitch = new TwitchCreds({
        accessToken: data.access_token,
        expireAt: moment()
          .utc()
          .add(data.expires_in, 'seconds')
      });
      newTwitch
        .save()
        .then(console.log('New Twitch Creds created'))
        .catch(console.error);
    };
    fetchJson
      .post(twitchUserURL)
      .then(handleData)
      .catch(console.error);
  } else {
    console.log('Twitch Creds already exist');
  }
}

// Error texts
function errTxt(err) {
  let msg = {
    to: `${process.env.ERR_PHONE}@mms.cricketwireless.net`,
    from: 'test@example.com',
    subject: '**VIBEY ERROR** Uh Oh',
    text: `${err}`
  };
  try {
    sgMail.send(msg);
  } catch (err) {
    console.error('EMAIL_ERROR: ', +err);
  }
}
//Test Message
// errTxt("REALLY BAD ERROR");

// Real time data
const rqs = io.of('/req-namescape');
const polls = io.of('/polls-namescape');

rqs.on('connection', function (socket) {
  console.log('Connected to requests');
  socket.emit('socketConnect', {});

  //Whenever someone disconnects this piece of code executed
  rqs.on('disconnect', function () {
    console.log('User disconnected from requests');
  });
});

app.set('trust proxy', 1);
app.set('views', './views');
app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  cookieSession({
    name: 'session',
    secret: `${process.env.SESSION_SECRET}`,
    saveUninitialized: false,
    resave: false
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Route Files
const indexRoute = require('./routes/index')
const authRoute = require('./routes/auth')
const reqsRoute = require('./routes/requests')
const mixRoute = require('./routes/mix')
const widgetRoute = require('./routes/widget')
const apiRoute = require('./routes/api')
const settingsRoute = require('./routes/settings')

app.use('/', indexRoute);
app.use('/auth', authRoute);
app.use('/requests', reqsRoute);
app.use('/mix', mixRoute);
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
          useCreateIndex: true
        }
      )
      .catch(function (err) {
        // TODO: Throw error page if DB doesn't connect
        console.error(
          'Unable to connect to the mongodb instance. Error: ',
          err
        );
        errTxt(err);
      });
    break;

  case 'dev':
    mongoose
      .connect(`mongodb://localhost:27017/vibeybot`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
      })
      .catch(function (err) {
        // TODO: Throw error page if DB doesn't connect
        console.error(
          'Unable to connect to the mongodb instance. Error: ',
          err
        );
        errTxt(err);
      });
    break;
}

const db = mongoose.connection;
db.on('error', error => {
  console.error(error);
  errTxt(error);
});
db.once('open', () => console.log('Connected to Mongoose ' + Date()));

//Models
const User = require('./models/users');
const mixReqs = require('./models/mixRequests');
const SongRequest = require('./models/songRequests');
const Poll = require('./models/polls');
const Good = require('./models/goods');

// Twitch auth
passport.use(
  new twitchStrategy(
    {
      clientID: process.env.TWITCH_CLIENTID,
      clientSecret: process.env.TWITCH_SECRET,
      callbackURL: `${process.env.APP_URL}/auth/twitch/callback`,
      scope: 'user:read:email'
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        User.findOne({ twitch_id: profile.id })
          .exec()
          .then(function (UserSearch) {
            if (UserSearch === null) {
              let user = new User({
                twitch_id: profile.id,
                username: profile.login,
                display_name: profile.display_name,
                email: profile.email,
                profile_pic_url: profile.profile_image_url,
                provider: 'twitch',
                twitch: profile,
                accessToken: accessToken,
                refreshToken: refreshToken,
                expireAt: moment().utc().add(8, 'hours')
              });
              console.log('New user created');
              user.save();
              return done(null, profile);
            } else {
              console.log('User already exists');
              console.log(UserSearch.twitch_id);
              return done(null, profile);
            }
          }).catch(err => {
            console.error(err)
            errTxt(err);
          });
      } catch (err) {
        console.error(err);
        errTxt(err);
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
const twitchclientid = process.env.TWITCH_CLIENTID;
const twitchuser = process.env.TWITCH_USER;
const twitchpass = process.env.TWITCH_PASS;
const twitchchan = config.twitchChan;

const tmiOptions = {
  options: {
    debug: true,
    clientId: twitchclientid
  },
  connection: {
    reconnect: true
  },
  identity: {
    username: twitchuser,
    password: twitchpass
  },
  channels: twitchchan
};

const botclient = new tmi.client(tmiOptions);

// Connect the twitch chat client to the server..
botclient.connect();

// Bot says hello on connect
botclient.on('connected', (address, port) => {
  // botclient.say(twitchchan[0], `Hey Chat! Send me those vibes`)
  console.log('connected to twitch chat client');
  if (process.env.NODE_ENV === 'development') {
    var cmd = `osascript -e 'display notification "${address} on port ${port}" with title "Connected to Twitch!" sound name "Submarine"'`;

    exec(cmd, function (error, stdout, stderr) {
      // command output is in stdout
      if (error) {
        console.error(error);
        errTxt(error);
      }
    });
  }
});

// Regex
var URLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
var spRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
var ytRegex = /(?:https?:\/\/)?(?:(?:(?:www\.?)?youtube\.com(?:\/(?:(?:watch\?.*?(v=[^&\s]+).*)|(?:v(\/.*))|(channel\/.+)|(?:user\/(.+))|(?:results\?(search_query=.+))))?)|(?:youtu\.be(\/.*)?))/;

// Song Requests
botclient.on('chat', async (channel, userstate, message, self) => {
  if (self) return;
  var message = message.trim().split(' ');
  if (message[0] === '!sr' || message[0] === '!songrequest') {
    if (URLRegex.test(message[1])) {
      // Spotify link
      if (spRegex.test(message[1])) {
        var spID = spotifyUri.parse(message[1]);
        var spURI = spotifyUri.formatURI(message[1]);
        spotify
          .request(`https://api.spotify.com/v1/tracks/${spID.id}`)
          .then(function (data) {
            var newSpotSR = new SongRequest({
              track: {
                name: data.name,
                artist: data.artists[0].name,
                link: message[1],
                uri: spURI
              },
              requestedBy: userstate.username,
              timeOfReq: moment.utc().format(),
              source: 'spotify'
            });
            newSpotSR
              .save()
              .then(doc => {
                if (chatRespond) {
                  botclient.say(
                    channel,
                    `@${doc.requestedBy} requested ${doc.track[0].name} by ${doc.track[0].artist}`
                  );
                }
                // Real time data push to front end
                rqs.emit('sr-event', {
                  id: `${doc.id}`,
                  reqBy: `${doc.requestedBy}`,
                  track: `${doc.track[0].name}`,
                  artist: `${doc.track[0].artist}`,
                  uri: `${doc.track[0].uri}`,
                  link: `${doc.track[0].link}`,
                  source: `${doc.source}`,
                  timeOfReq: `${doc.timeOfReq}`
                });
              })
              .catch(err => {
                console.error(err);
                errTxt(err);
              });
          })
          .catch(function (err) {
            console.error('Error occurred: ' + err);
            errTxt(err);
          });
      }
      // Youtube Link
      if (ytRegex.test(message[1])) {
        youtube.getVideo(message[1]).then(video => {
          var newYTSR = new SongRequest({
            track: { name: video.title, link: message[1] },
            requestedBy: userstate.username,
            timeOfReq: moment.utc().format(),
            source: 'youtube'
          });
          newYTSR
            .save()
            .then(doc => {
              if (chatRespond) {
                botclient.say(
                  channel,
                  `@${doc.requestedBy} requested ${doc.track[0].name} ${doc.track[0].link}`
                );
              }
              // Real time data push to front end
              rqs.emit('sr-event', {
                id: `${doc.id}`,
                reqBy: `${doc.requestedBy}`,
                track: `${doc.track[0].name}`,
                link: `${doc.track[0].link}`,
                source: `${doc.source}`,
                timeOfReq: `${doc.timeOfReq}`
              });
            })
            .catch(err => {
              console.error(err);
              errTxt(err);
            });
        });
      }
    }
    // Check for text content
    if (message[1] === undefined) {
      botclient.say(
        channel,
        `No input recieved. !requests to see how to submit requests`
      );
    } else {
      // Searches Spotify & Youtube when only text is provided
      if (!ytRegex.test(message[1])) {
        var request = message.slice(1).join(' ');
        var ytQuery = message.slice(1).join('+');
        var ytSearch = `https://www.youtube.com/results?search_query=${ytQuery}`;
        spotify.search(
          { type: 'track', query: `${request}`, limit: 1 },
          function (err, data) {
            if (data === null) {
              youtube
                .search(request, 1)
                .then(results => {
                  var newYTSR = new SongRequest({
                    track: {
                      name: results[0].title,
                      link: `https://youtu.be/${results[0].id}`
                    },
                    requestedBy: userstate.username,
                    timeOfReq: moment.utc().format(),
                    source: 'youtube'
                  });
                  newYTSR
                    .save()
                    .then(doc => {
                      if (chatRespond) {
                        botclient.say(
                          channel,
                          `@${doc.requestedBy} requested ${doc.track[0].name} https://youtu.be/${results[0].id}`
                        );
                      }

                      // Real time data push to front end
                      rqs.emit('sr-event', {
                        id: `${doc.id}`,
                        reqBy: `${doc.requestedBy}`,
                        track: `${doc.track[0].name}`,
                        link: `${doc.track[0].link}`,
                        source: `${doc.source}`,
                        timeOfReq: `${doc.timeOfReq}`
                      });
                    })
                    .catch(err => {
                      console.error(err);
                      errTxt(err);
                    });
                })
                .catch(console.error);
            } else {
              var newSpotSR = new SongRequest({
                track: {
                  name: data.tracks.items[0].name,
                  artist: data.tracks.items[0].artists[0].name,
                  link: data.tracks.items[0].external_urls.spotify,
                  uri: data.tracks.items[0].uri
                },
                requestedBy: userstate.username,
                timeOfReq: moment.utc().format(),
                source: 'spotify'
              });
              newSpotSR.save().then(doc => {
                if (chatRespond) {
                  botclient.say(
                    channel,
                    `@${doc.requestedBy} requested ${doc.track[0].name} by ${doc.track[0].artist} - ${doc.track[0].link}`
                  );
                }

                // Real time data push to front end
                rqs.emit('sr-event', {
                  id: `${doc.id}`,
                  reqBy: `${doc.requestedBy}`,
                  track: `${doc.track[0].name}`,
                  artist: `${doc.track[0].artist}`,
                  uri: `${doc.track[0].uri}`,
                  link: `${doc.track[0].link}`,
                  source: `${doc.source}`,
                  timeOfReq: `${doc.timeOfReq}`
                });
              });
            }
          }
        );
      }
    }
  }

  if (message[0] === '!tr') {
    let request = message.slice(1).join(' ');
    var newText = new SongRequest({
      track: {
        name: request
      },
      requestedBy: userstate.username,
      timeOfReq: moment.utc().format(),
      source: 'text'
    });
    newText
      .save()
      .then(doc => {
        botclient.say(
          channel,
          `@${doc.requestedBy} requested ${doc.track[0].name}`
        );
        // Real time data push to front end
        rqs.emit('sr-event', {
          id: `${doc.id}`,
          reqBy: `${doc.requestedBy}`,
          track: `${doc.track[0].name}`,
          source: `${doc.source}`,
          timeOfReq: `${doc.timeOfReq}`
        });
      })
      .catch(console.error);
  }
  // Choice selection for polls
  if (message[0] === '!c') {
    var poll = await Poll.findOne({ active: true });
    if (!poll) {
      botclient.say(channel, `Unfortunately there is no poll right now :(`);
      return;
    }
    if (message[1] === undefined) {
      botclient.say(channel, `No choice selected !vote to see how to vote`);
      return;
    }
    // if (poll.voters.includes(userstate.username)) {
    //   botclient.say(
    //     channel,
    //     `@${userstate.username} you've already voted`
    //   );
    //   return
    // } else {
    var choice = parseInt(message[1], 10);
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
        console.log(doc.choices[cIndex].votes);
        console.log(doc);
        polls.emit('pollUpdate', {
          doc: doc
        });
      }
    );
    // }
  }

  if (message[0] === '!deleteall') {
    if (admins.includes(userstate.username)) {
      await Poll.deleteMany({}).then((err, doc) => {
        if (err) {
          console.error(err);
          errTxt(err);
          return;
        }
        botclient.say(twitchchan[0], `Polls deleted!`);
      });
    }
  }

  if (message[0] === '!p') {
    if (admins.includes(userstate.username)) {
      var poll = await Poll.findOne({});
      console.log(poll);
    }
  }

  if (message[0] === '!goodnews' || message[0] === '!goodn') {
    let tUser = userstate['user-id'];
    let twitchCreds = await TwitchCreds.findOne({});
    let goodnews = message.slice(1).join(' ');
    console.log(tUser);
    console.log(twitchCreds);
    let url = `https://api.twitch.tv/helix/users?id=${tUser}`;
    let params = {};
    let options = {
      headers: {
        'Client-ID': `${process.env.TWITCH_CLIENTID}`,
        Authorization: `Bearer ${twitchCreds.accessToken}`
      }
    };
    async function handleData(data) {
      console.log(data.data[0].profile_image_url);
      let newGood = new Good({
        user: userstate.username,
        userPic: data.data[0].profile_image_url,
        news: goodnews
      });
      ComfyDiscord.Say(
        'good-news',
        `${userstate.username}'s good news: ${goodnews}`
      );
      newGood.save();
    }

    fetchJson.get(url, params, options).then(handleData);
  }

  if (message[0] === '!science' && admins.includes(userstate.username)) {
    let handleData = data => {
      let diff = capitalize(data.results[0].difficulty);
      let q = data.results[0].question;
      answer = data.results[0].correct_answer;
      botclient.say(
        twitchchan[0],
        he.decode(
          `@veryhandsomebilly SCIENCE QUESTION Difficulty: ${diff} Question: ${q}`
        )
      );
      // console.log('Difficulty: ' + diff + 'Question: ' + q)
    };
    fetchJson
      .get('https://opentdb.com/api.php?amount=1&category=17')
      .then(handleData);
  }

  if (message[0] === '!answer' && admins.includes(userstate.username)) {
    botclient.say(twitchchan[0], he.decode(`${answer}`));
    // console.log(answer)
  }

  // Time Command
  if (message[0] === '!time') {
    let day = moment.tz(moment(), 'Pacific/Auckland').format('dddd');
    let dNum = moment.tz(moment(), 'Pacific/Auckland').format('Do');
    let month = moment.tz(moment(), 'Pacific/Auckland').format('MMMM');
    let time = moment.tz(moment(), 'Pacific/Auckland').format('hh:mmA');
    botclient.say(
      twitchchan[0],
      `In New Zealand it is currently ${day} the ${dNum} of ${month} and the time is ${time}`
    );
  }

  if (message[0] === '!wolfram') {
    let query = he.encode(`${message.slice(1).join(' ')}`);
    let handleData = data => {
      console.log(data);
      botclient.say(twitchchan[0], he.decode(`${data.bodyText}`));
    };
    fetchJson
      .get(
        `http://api.wolframalpha.com/v1/result?appid=${process.env.WOLFRAM_APPID}&i=${query}&units=metric`
      )
      .then(handleData);
  }

  if (message[0] === '!wolframi') {
    let query = he.encode(`${message.slice(1).join(' ')}`);
    let handleData = data => {
      console.log(data);
      botclient.say(twitchchan[0], he.decode(`${data.bodyText}`));
    };
    fetchJson
      .get(
        `http://api.wolframalpha.com/v1/result?appid=${process.env.WOLFRAM_APPID}&i=${query}&units=imperial`
      )
      .then(handleData);
  }

  if (message[0] === '!horoscope') {
    let sign = message[1];
    let handleData = data => {
      console.log(data);
      if (data.sunsign === 'undefined') {
        botclient.say(
          twitchchan[0],
          'No sign received Example: !horoscope Libra'
        );
      } else {
        botclient.say(twitchchan[0], he.decode(`${data.horoscope}`));
      }
    };
    fetchJson
      .get(`http://horoscope-api.herokuapp.com/horoscope/today/${sign}`)
      .then(handleData);
  }

  if (message[0] === '!reply' && admins.includes(userstate.username)) {
    if (chatRespond === true) {
      botclient.say(twitchchan[0], he.decode(`RESPONSES TURNED OFF`));
      chatRespond = !chatRespond;
      console.log(chatRespond);
    } else {
      botclient.say(twitchchan[0], he.decode(`RESPONSES TURNED ON`));
      console.log(chatRespond);
      chatRespond = !chatRespond;
    }
  }

  if (message[0] === '!test' && admins.includes(userstate.username)) {
    botclient.say(twitchchan[0], he.decode(`THIS IS A TEST`));
  }
});
// Bot replies
var chatRespond = true;

const capitalize = s => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Answer for !science
var answer = '';

server.listen(3000);

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
