const config = require("./config/config");
const version = require('project-version');
console.log('Version: ' + version)

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
const fetchJson = require('fetch-json');
const ComfyDiscord = require("comfydiscord");
ComfyDiscord.Init(config.discord);

const TwitchCreds = require("./models/twitchCreds");

getTwitchCreds();
async function getTwitchCreds() {
  const twitchCreds = await TwitchCreds.findOne({})
  console.log(twitchCreds)
  if (twitchCreds === null) {
    const twitchUserURL = `https://id.twitch.tv/oauth2/token?client_id=${config.twitchClientID}&client_secret=${config.twitchSecret}&scope=user_read&grant_type=client_credentials`
    console.log(twitchUserURL)
    const twitchResource = {}
    const handleData = (data) => {
      console.log(data)
      const newTwitch = new TwitchCreds({
        accessToken: data.access_token,
        expireAt: moment().utc().add(data.expires_in, 'seconds')
      })
      newTwitch.save().then(console.log('New Twitch Creds created')).catch(console.error);

    }
    fetchJson.post(twitchUserURL).then(handleData).catch(console.error);
  } else {
    console.log('Twitch Creds already exist')
  }
}




const admins = config.admins;
const exec = require('child_process').exec;


// Real time data
var pusher_client = new Pusher(config.pusher);

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
app.use(bodyParser.json());
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
  .connect(config.databaseURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .catch(function (reason) {
    // TODO: Throw error page if DB doesn't connect
    console.log("Unable to connect to the mongodb instance. Error: ", reason);
  });

const db = mongoose.connection;
db.on("error", error => console.error(error));
db.once("open", () => console.log("Connected to Mongoose " + Date()));

//Models
const User = require("./models/users");
const mixReqs = require("./models/mixRequests");
const SongRequest = require("./models/songRequests");
const Poll = require("./models/polls");
const Good = require("./models/goods");

// Twitch auth
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
                twitch: profile,
                accessToken: accessToken,
                refreshToken: refreshToken,
                expireAt: moment().utc().add(8, 'hours')
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
    // res.redirect("/requests");
    res.redirect("/requests");
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
app.get("/logout", async function (req, res) {
  try {
    await User.deleteOne({ twitch_id: req.user.id })
    req.session = null;
    req.user = null;
    req.logout();
    res.render("bye");
  } catch (err) {
    console.error(err)
  }
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
  console.log(req.user)
  res.send(req.user)
});

// Dashboard
app.get("/requests", loggedIn, async (req, res) => {
  try {
    var user = await User.findOne({ twitch_id: req.user.id });
    if (user === null) {
      res.redirect('/login')
    }
    console.log(user.username);
    var feSongRequests = await SongRequest.find();
    var mixRequests = await mixReqs.find();
    if (admins.includes(user.username)) {
      res.render("requests", {
        feUser: user.username,
        profilePic: req.user["profile_image_url"],
        requests: feSongRequests,
        mixReqs: mixRequests,
        version: version
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
  res.render("widget/widget", {
    mixReqs: mixRequests
  });
});

app.get("/widget/v2", async (req, res) => {
  var mixRequests = await mixReqs.find();
  res.render("widget/widgetV2", {
    mixReqs: mixRequests
  });
});


app.get("/requests/delete/:id", loggedIn, async (req, res) => {
  try {
    await SongRequest.deleteOne({ _id: req.params.id }).exec();
    res.status(200).send("Request deleted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting song request");
  }
});

app.get("/requests/mix/deleteall", loggedIn, async (req, res) => {
  try {
    await mixReqs.deleteMany({}).exec();
    pusher_client.trigger("sr-channel", "clear-mix", {});
    res.status(200).send("Mix cleared");
  } catch (err) {
    res.status(500).send("Error clearing mix!");
    console.error(err);
  }
});

app.get("/requests/deleteall", loggedIn, (req, res) => {
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
        pusher_client.trigger("sr-channel", "mix-event", {
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
    pusher_client.trigger("sr-channel", "mix-remove", {
      id: `${req.params.id}`
    });
    res.status(200).send("Song Removed from mix");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error removing song from mix");
  }
});

app.get("/poll", loggedIn, async (req, res) => {
  try {
    var user = await User.findOne({ twitch_id: req.user.id });
    // console.log(user.username);
    if (user) {
      if (admins.includes(user.username)) {
        res.render("poll", {
          version: version,
        });
      } else {
        res.redirect("/login");
      }
    } else {
      res.redirect("/login");
    }

  } catch (err) {
    console.error(err);
  }
});

app.get("/api/polls", loggedIn, async (req, res) => {
  try {
    var polls = await Poll.find()
    res.send(polls)
  } catch (err) {
    console.error(err)
  }
})


app.post("/newpoll", loggedIn, async (req, res) => {
  try {
    var user = await User.findOne({ twitch_id: req.user.id });
    var poll = await Poll.find({ "active": true })
    if (poll.length === 0) {
      var pollText = req.body[0].value
      var choices = req.body.slice(1)
      var choiceArray = []
      var votes = []
      choices.forEach(choiceAppend);

      function choiceAppend(element, index, array) {
        var choice = {
          id: makeid(10),
          text: choices[index].value,
          votes: 0
        }
        choiceArray.push(choice);
      }

      console.log(choiceArray)

      var newPoll = new Poll({
        active: true,
        polltext: pollText,
        choices: choiceArray,
        votes: votes
      })
      await newPoll.save().then(doc => {
        res.send(doc)
        var num = 1
        var choices = []
        botclient.say(twitchchan[0], 'A new poll has started! Vote with !c i.e.(!c 2)')
        botclient.say(twitchchan[0], `The poll question is: ${pollText}`)

        doc.choices.forEach(choice => {
          botclient.say(twitchchan[0], `!c ${num} = ${choice.text}`)
          num++;
          let choiceArr = [`${choice.text}`, choice.votes]
          choices.push(choiceArr)
        })

        pusher_client.trigger("pollCh", "pollOpen", {
          poll: doc
        });
        choices = []
        num = 1;
      })
    } else {
      console.log(poll)
      res.status(418).send('Poll is already running')
    }

  } catch (err) {
    console.error(err)
  }
})

app.get("/poll/close/:id", loggedIn, async (req, res) => {
  try {
    var user = await User.findOne({ twitch_id: req.user.id });
    var poll = await Poll.findOne({ "_id": req.params.id });
    var choiceArr = []
    poll.choices.forEach(choice => {
      choiceArr.push(choice.votes)
    })
    console.log(choiceArr)
    let i = choiceArr.indexOf(Math.max(...choiceArr));
    let win = poll._id + poll.choices[i].id
    await Poll.findOneAndUpdate({ "_id": req.params.id },
      { $set: { "active": false }, "winner": win }, { useFindAndModify: false, new: true }, (err, doc) => {
        console.log(doc.active)
        try {
          res.sendStatus(200)

          botclient.say(twitchchan[0], 'The poll is now closed')
          botclient.say(twitchchan[0], `Poll: ${doc.polltext} Winner: ${doc.choices[i].text}`)


          pusher_client.trigger("pollCh", "pollClose", {
            pollID: doc._id,
            win: win,
            winText: poll.choices[i].text
          });

        } catch (err) {
          console.error(err)
        }

      });

  } catch (err) {
    res.status(500).send("Error closing Poll");
    console.error(err);
  }
});

app.get("/widget/poll", async (req, res) => {
  try {
    res.render("widget/poll-widget")
  } catch (err) {
    console.error(err)
  }
})

app.get("/good", loggedIn, async (req, res) => {
  try {
    var goods = await Good.find({});

    res.render("good", {
      version: version
    })
  } catch (err) {
    console.error(err)
  }
})

app.get("/api/goods", loggedIn, async (req, res) => {
  try {
    var goods = await Good.find({});
    res.send(goods)
  } catch (err) {
    console.error(err)
  }

})

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
botclient.on('connected', (address, port) => {
  // botclient.say(twitchchan[0], `Hey Chat! Send me those vibes`)
  var cmd = `osascript -e 'display notification "${address} on port ${port}" with title "Connected to Twitch!" sound name "Submarine"'`;

  exec(cmd, function (error, stdout, stderr) {
    // command output is in stdout
    if (error) {
      console.error(error)
    }
  });
});

// Regex
var URLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
var spRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
var ytRegex = /(?:https?:\/\/)?(?:(?:(?:www\.?)?youtube\.com(?:\/(?:(?:watch\?.*?(v=[^&\s]+).*)|(?:v(\/.*))|(channel\/.+)|(?:user\/(.+))|(?:results\?(search_query=.+))))?)|(?:youtu\.be(\/.*)?))/;

// Song Requests
botclient.on("chat", async (channel, userstate, message, self) => {
  if (self) return;
  var message = message.trim().split(" ");
  if (message[0] === "!sr" || message[0] === "!songrequest") {
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
                pusher_client.trigger("sr-channel", "sr-event", {
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
      // Youtube Link
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
              pusher_client.trigger("sr-channel", "sr-event", {
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
      // Searches Spotify & Youtube when only text is provided
      if (!ytRegex.test(message[1])) {
        var request = message.slice(1).join(" ");
        var ytQuery = message.slice(1).join("+")
        var ytSearch = `https://www.youtube.com/results?search_query=${ytQuery}`
        spotify.search({ type: 'track', query: `${request}`, limit: 1 }, function (err, data) {
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
                    pusher_client.trigger("sr-channel", "sr-event", {
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

            // var newText = new SongRequest({
            //   track: {
            //     name: request,
            //     link: ytSearch
            //   },
            //   requestedBy: userstate.username,
            //   timeOfReq: moment.utc().format(),
            //   source: 'text'
            // })
            // newText.save().then(doc => {
            //   botclient.say(
            //     channel,
            //     `@${doc.requestedBy} requested ${doc.track[0].name}`
            //   )
            //   // Real time data push to front end
            //   pusher_client.trigger("sr-channel", "sr-event", {
            //     id: `${doc.id}`,
            //     reqBy: `${doc.requestedBy}`,
            //     track: `${doc.track[0].name}`,
            //     link: `${doc.track[0].link}`,
            //     source: `${doc.source}`,
            //     timeOfReq: `${doc.timeOfReq}`
            //   });
            // })
            //   .catch(console.error);
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
              source: "spotify"
            });
            newSpotSR
              .save()
              .then(doc => {
                botclient.say(
                  channel,
                  `@${doc.requestedBy} requested ${doc.track[0].name} by ${doc.track[0].artist} - ${doc.track[0].link}`
                );
                // Real time data push to front end
                pusher_client.trigger("sr-channel", "sr-event", {
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

        });
      }
    }
  }
  // Choice selection for polls
  if (message[0] === '!c') {
    var poll = await Poll.findOne({ "active": true });
    if (!poll) {
      botclient.say(
        channel,
        `Unfortunately there is no poll right now :(`
      );
      return
    }
    if (message[1] === undefined) {
      botclient.say(
        channel,
        `No choice selected !vote to see how to vote`
      );
      return
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

    await Poll.findOneAndUpdate({ "_id": poll.id, "choices.id": cID },
      { $addToSet: { voters: tUser }, $set: { "choices.$.votes": i } }, { useFindAndModify: false, new: true }, (err, doc) => {
        console.log(doc.choices[cIndex].votes)
        console.log(doc)

        pusher_client.trigger("pollCh", "pollUpdate", {
          doc: doc
        });
      })
    // }

  }

  if (message[0] === '!deleteall') {
    if (admins.includes(userstate.username)) {
      await Poll.deleteMany({}).then((err, doc) => {
        if (err) {
          console.error(err);
          return
        }
        botclient.say(twitchchan[0], `Polls deleted!`);
      })
    }
  }

  if (message[0] === '!p') {
    var poll = await Poll.findOne({});
    console.log(poll)
  }

  if (message[0] === '!goodn') {
    let tUser = userstate["user-id"]
    let twitchCreds = await TwitchCreds.findOne({})
    let goodnews = message.slice(1).join(" ")
    console.log(tUser)
    console.log(twitchCreds)
    let url = `https://api.twitch.tv/helix/users?id=${tUser}`
    let params = {}
    let options = {
      headers: {
        'Client-ID': `${config.twitchClientID}`,
        'Authorization': `Bearer ${twitchCreds.accessToken}`
      }
    }
    async function handleData(data) {
      console.log(data.data[0].profile_image_url);
      let newGood = new Good({
        user: userstate.username,
        userPic: data.data[0].profile_image_url,
        news: goodnews
      })
      ComfyDiscord.Say("good-news", `${userstate.username}'s good news: ${goodnews}`);
      newGood.save();
    }

    fetchJson.get(url, params, options).then(handleData);
  }
});

server.listen(3000);

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  };
  return result;
}   