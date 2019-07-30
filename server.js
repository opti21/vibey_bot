const config = require('./config/config');

const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const logger = require('morgan')
const passport = require('passport')
const twitchStrategy = require('passport-twitch-new').Strategy
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const cookieSession = require('cookie-session')
const spotifyUri = require('spotify-uri');
const Spotify = require('node-spotify-api');
const YouTube = require('simple-youtube-api');
const youtube = new YouTube(config.ytAPI);
const moment = require('moment');
const Discord = require('discord.js');


//Discord
const discord = new Discord.Client();

// discord.once('ready', () => {
// 	console.log('Ready!');
// });

discord.login(config.discord);

//Spotify Credentials
const spotify = new Spotify({
  id: config.spID,
  secret: config.spSecret
});

app.set('trust proxy', 1)
app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(logger('dev'));

app.use(bodyParser.urlencoded({ extended: true}));
app.use(cookieSession({ secret: `${config.sessionSecret}`, saveUninitialized: false, resave: false}));
app.use(passport.initialize());

// Databae
const mongoose = require('mongoose')
mongoose.connect(config.databaseURL, {useNewUrlParser: true})
const db = mongoose.connection
db.on('error', error => console.error(error))
db.once('open', () => console.log('Connected to Mongoose ' + Date()))

const User = require('./models/users')
passport.use(new twitchStrategy({
	clientID: config.twitchClientID,
	clientSecret: config.twitchSecret,
	callbackURL: `http://${config.appURL}/auth/twitch/callback`,
	scope: "user:read:email"
},
function(accessToken, refreshToken, profile, done) {
	let user = new User ({
		twitch_id: profile.id,
		username: profile.login,
		display_name: profile.display_name,
		email: profile.email,
		profile_pic_url: profile.profile_image_url,
		provider: 'twitch',
		twitch: profile
	})
	user.save();
	return done(null, profile)
}
));

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	done(null, obj);
});


app.get("/auth/twitch", passport.authenticate("twitch"));
app.get("/auth/twitch/callback", passport.authenticate("twitch", { failureRedirect: "/fail" }), function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/dashboard");
});


app.get('/', (req, res, next) => {
		res.render('index')
		next();
})

app.get('/admin', (req, res) => {
    res.render('admin')
})

app.get('/login', function (req, res) {
        res.render('login')
	});
	
app.get('/logout', function (req, res){
	req.logout();
	console.log(req.session.passport.user)
  res.redirect('/');
});

app.get('/dashboard', (req, res) => {
	try {
		if (req.session && req.session.passport.user) {
			User.findOne({ twitch_id: req.session.passport.user.id }, (err, user) => {
				//TODO: move admins to .env
				var admins = ['opti_21', 'veryhandsomebilly']
				if (user.username ===  admins[0] || admins[1]) {
					// expose the user info to the template
					res.render('dashboard', {
						feUser: user.username,
						requests: reuqests
					})
				} else {
					res.redirect('/login');
				}
			})
		} else {
			res.redirect('/login')
		}
	} catch (err) {
		console.error(err)
	}
});

function passValue(value) {
  return 'JSON.parse(Base64.decode("' + new Buffer(JSON.stringify(value)).toString('base64') + '"))'
}


// Twitch Bot
const tmi = require("tmi.js");
const twitchclientid = process.env.TWITCH_CLIENTID;
const twitchuser = process.env.TWITCH_USER;
const twitchpass = process.env.TWITCH_PASS;
const twitchchan = ['opti_21'];

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
    channels: twitchchan,
};

const botclient = new tmi.client(tmiOptions);

// Connect the client to the server..
botclient.connect();


io.on('disconnect', (socket) => {
    console.log('user disconnected')
})

io.on('connection', (socket) => {
	io.removeAllListeners();
  console.log('socket connected' + socket.id)
});

// Bot says hello on connect
// botclient.on('connected', (address, port) => {
//   botclient.say(twitchchan[0], `Hey Chat! Send me those vibes`)
// });

// Regex
var URLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
var spRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
var ytRegex = /(?:https?:\/\/)?(?:(?:(?:www\.?)?youtube\.com(?:\/(?:(?:watch\?.*?(v=[^&\s]+).*)|(?:v(\/.*))|(channel\/.+)|(?:user\/(.+))|(?:results\?(search_query=.+))))?)|(?:youtu\.be(\/.*)?))/;

// Song Requests
const SongRequest = require('./models/songRequests')
botclient.on('chat', (channel, userstate, message, self) => {
	var message = message.trim().split(" ");
	if (message[0] === '!sr' || message[0] === '!songrequest') {
		if (URLRegex.test(message[1])) {
			if (spRegex.test(message[1])) {
				var spID = spotifyUri.parse(message[1])
				var spURI = spotifyUri.formatURI(message[1])
				spotify
					.request(`https://api.spotify.com/v1/tracks/${spID.id}`)
					.then(function(data) {
						var newSpotSR = new SongRequest ({track:{name: data.name, artist: data.artists[0].name, link: message[1], uri: spURI}, requestedBy: userstate.username, timeOfReq: moment.utc()});
						newSpotSR.save()
							.then((doc) => {botclient.say(channel, `@${doc.requestedBy} requested ${doc.track[0].name} by ${doc.track[0].artist}`);})
							.catch(err => {console.error(err)});
					})
					.catch(function(err) {
						console.error('Error occurred: ' + err); 
					});
				
			}

			if (ytRegex.test(message[1])) {
				youtube.getVideo(message[1])
					.then(video => {
						var newYTSR = new SongRequest ({track:{name: video.title, link: message[1]}, requestedBy: userstate.username, timeOfReq: moment.utc()});
						newYTSR.save()
							.then((doc) => {botclient.say(channel, `@${doc.requestedBy} requested ${doc.track[0].name}`);})
							.catch(err => {console.error(err)});
					})
					.catch(err => {
						botclient.say(twitchchan[0], `The correct format is !sr URL`)
					});
			}
		} else {
			// TODO: Build request for regular text search
			botclient.say(twitchchan[0], `The correct format is !sr URL`)
		}
	}

	if (message[0] === '!whosthechillest') {
		botclient.say(twitchchan[0])
	}
})


server.listen(3000)
