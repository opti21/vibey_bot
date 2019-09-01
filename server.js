const config = require("./config/config");

const express = require("express");
const app = express();
const server = require("http").Server(app);
const logger = require("morgan");
const passport = require("passport");
const twitchStrategy = require("passport-twitch-new").Strategy;
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const spotifyUri = require("spotify-uri");
const Spotify = require("node-spotify-api");
const YouTube = require("simple-youtube-api");
const youtube = new YouTube(config.ytAPI);
const moment = require("moment");
const Pusher = require("pusher");

// Real time data
var channels_client = new Pusher(config.pusher);

//Spotify Credentials
const spotify = new Spotify({
  id: config.spID,
  secret: config.spSecret
});

app.set("trust proxy", 1);
app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(logger("dev"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: 'session',
    secret: `${config.sessionSecret}`,
    saveUninitialized: false,
    resave: false
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Databae
const mongoose = require("mongoose");
mongoose
  .connect(config.databaseURI, { useNewUrlParser: true })
  .catch(function (reason) {
    // TODO: Throw error page if DB doesn't connect
    console.log("Unable to connect to the mongodb instance. Error: ", reason);
  });

const db = mongoose.connection;
db.on("error", error => console.error(error));
db.once("open", () => console.log("Connected to Mongoose " + Date()));

// Twitch auth
const User = require("./models/users");
passport.use(
  new twitchStrategy(
    {
      clientID: config.twitchClientID,
      clientSecret: config.twitchSecret,
      callbackURL: `${config.appURL}/auth/twitch/callback`,
      scope: "user:read:email"
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
                provider: "twitch",
                twitch: profile
              });
              console.log("New user created");
              user.save();
              return done(null, profile);
            } else {
              console.log("User already exists");
              console.log(UserSearch.twitch_id);
              return done(null, profile);
            }
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

app.get("/auth/twitch", passport.authenticate("twitch"));
app.get(
  "/auth/twitch/callback",
  passport.authenticate("twitch", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    // res.redirect("/dashboard");
    res.redirect("/dashboard");
  }
);

// Front page
app.get("/", (req, res, next) => {
  res.render("index");
  next();
});

// Login
app.get('/login', (req, res) => {
  res.render('login')
})

// Logout
app.get("/logout", function (req, res) {
  req.session = null;
  req.user = null;
  req.logout();
  res.render("bye");
  console.log(req.session)
});

// Check to see if user is authenticated with passport 
function loggedIn(req, res, next) {
  if (!req.user) {
    res.redirect('/login')
  } else {
    next();
  }
}

app.get("/test", function (req, res) {
  console.log('REQ.SESSION:');
  console.log(req.session)
  res.render('test')
});

// Dashboard
const mixReqs = require("./models/mixRequests");
app.get("/dashboard", loggedIn, async (req, res) => {
  console.log(req.session.passport.user)
  try {
    var user = await User.findOne({ twitch_id: req.user.id });
    console.log(user.username);
    var admins = config.admins;
    var feSongRequests = await SongRequest.find();
    var mixRequests = await mixReqs.find();
    if (admins.includes(user.username)) {
      res.render("dashboard", {
        feUser: user.username,
        requests: feSongRequests,
        mixReqs: mixRequests
      });
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.error(err);
  }
});

// Stream Widget
app.get("/widget", async (req, res) => {
  var mixRequests = await mixReqs.find();
  res.render("widget", {
    mixReqs: mixRequests
  });
});

app.get("/dashboard/delete/:id", loggedIn, async (req, res) => {
  try {
    await SongRequest.deleteOne({ _id: req.params.id }).exec();
    res.status(200).send("Request deleted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting song request");
  }
});

app.get("/dashboard/mix/deleteall", loggedIn, async (req, res) => {
  try {
    await mixReqs.deleteMany({}).exec();
    channels_client.trigger("sr-channel", "clear-mix", {});
    res.status(200).send("Mix cleared");
  } catch (err) {
    res.status(500).send("Error clearing mix!");
    console.error(err);
  }
});

app.get("/dashboard/deleteall", loggedIn, (req, res) => {
  try {
    SongRequest.deleteMany({}).exec();
    res.status(200).send("Queue cleared");
  } catch (err) {
    res.status(500).send("Error clearing queue!");
    console.error(err);
  }
});

app.get("/mix/add/:id", loggedIn, async (req, res) => {
  await SongRequest.findById(req.params.id, (err, request) => {
    request.fulfilled = true;
    request.dateFulfilled = moment().utc();
    request.save().then(console.log("Request updated"));
    var mixAdd = new mixReqs({
      track: {
        name: request.track[0].name,
        artist: request.track[0].artist,
        link: request.track[0].link,
        uri: request.track[0].uri
      },
      requestedBy: request.requestedBy,
      timeOfReq: request.timeOfReq,
      source: request.source
    });
    mixAdd.save().then(doc => {
      try {
        res.status(200).send("Added to Mix");
        channels_client.trigger("sr-channel", "mix-event", {
          id: `${doc.id}`,
          reqBy: `${doc.requestedBy}`,
          track: `${doc.track[0].name}`,
          artist: `${doc.track[0].artist}`,
          uri: `${doc.track[0].uri}`,
          link: `${doc.track[0].link}`,
          source: `${doc.source}`
        });
      } catch (err) {
        console.error(err);
        res.status(500).send("Error Adding song to mix");
      }
    });
  });
});

app.get("/mix/remove/:id", loggedIn, async (req, res) => {
  try {
    await mixReqs.deleteOne({ _id: req.params.id }).exec();
    channels_client.trigger("sr-channel", "mix-remove", {
      id: `${req.params.id}`
    });
    res.status(200).send("Song Removed from mix");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error removing song from mix");
  }
});

//404
app.get('*', (req, res) => {
  res.render('404')
})

// Twitch Client
const tmi = require("tmi.js");
const twitchclientid = config.twitchClientID;
const twitchuser = config.twitchUser;
const twitchpass = config.twitchPass;
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
// botclient.on('connected', (address, port) => {
//   botclient.say(twitchchan[0], `Hey Chat! Send me those vibes`)
// });

// Regex
var URLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
var spRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
var ytRegex = /(?:https?:\/\/)?(?:(?:(?:www\.?)?youtube\.com(?:\/(?:(?:watch\?.*?(v=[^&\s]+).*)|(?:v(\/.*))|(channel\/.+)|(?:user\/(.+))|(?:results\?(search_query=.+))))?)|(?:youtu\.be(\/.*)?))/;

// Song Requests
const SongRequest = require("./models/songRequests");
botclient.on("chat", (channel, userstate, message, self) => {
  if (self) return;
  var message = message.trim().split(" ");
  if (message[0] === "!sr" || message[0] === "!songrequest") {
    if (URLRegex.test(message[1])) {
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
              source: "spotify"
            });
            newSpotSR
              .save()
              .then(doc => {
                botclient.say(
                  channel,
                  `@${doc.requestedBy} requested ${doc.track[0].name} by ${doc.track[0].artist}`
                );
                // Real time data push to front end
                channels_client.trigger("sr-channel", "sr-event", {
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
              });
          })
          .catch(function (err) {
            console.error("Error occurred: " + err);
          });
      }

      if (ytRegex.test(message[1])) {
        youtube.getVideo(message[1]).then(video => {
          var newYTSR = new SongRequest({
            track: { name: video.title, link: message[1] },
            requestedBy: userstate.username,
            timeOfReq: moment.utc().format(),
            source: "youtube"
          });
          newYTSR
            .save()
            .then(doc => {
              botclient.say(
                channel,
                `@${doc.requestedBy} requested ${doc.track[0].name} ${doc.track[0].link}`
              );
              // Real time data push to front end
              channels_client.trigger("sr-channel", "sr-event", {
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
      // Searches YouTube when only text is provided
      if (!ytRegex.test(message[1])) {
        var query = message.slice(1).join(" ");
        youtube
          .search(query, 1)
          .then(results => {
            var newYTSR = new SongRequest({
              track: {
                name: results[0].title,
                link: `https://youtu.be/${results[0].id}`
              },
              requestedBy: userstate.username,
              timeOfReq: moment.utc().format(),
              source: "youtube"
            });
            newYTSR
              .save()
              .then(doc => {
                botclient.say(
                  channel,
                  `@${doc.requestedBy} requested ${doc.track[0].name} https://youtu.be/${results[0].id}`
                );
                // Real time data push to front end
                channels_client.trigger("sr-channel", "sr-event", {
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
              });
          })
          .catch(console.error);
      }
    }
  }

  // if (message[0] === '!whosthechillest') {
  // 	botclient.say(twitchchan[0])
  // }
});

server.listen(3000);
