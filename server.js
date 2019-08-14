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
var Pusher = require('pusher');

var channels_client = new Pusher({
  appId: '826343',
  key: '94254303a6a5048bf191',
  secret: '66b39f01edb0769876cf',
  cluster: 'us2',
  useTLS: true
});


//Discord
// const discord = new Discord.Client();

// discord.once('ready', () => {
// 	console.log('Ready!');
// });

// discord.login(config.discord);

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
mongoose.connect(config.databaseURI, {useNewUrlParser: true}).catch(function (reason) {
	// TODO: kill process if DB doesn't connect
	console.log('Unable to connect to the mongodb instance. Error: ', reason);
});

const db = mongoose.connection
db.on('error', error => console.error(error))
db.once('open', () => console.log('Connected to Mongoose ' + Date()))

// Twitch auth
const User = require('./models/users')
passport.use(new twitchStrategy({
	clientID: config.twitchClientID,
	clientSecret: config.twitchSecret,
	callbackURL: `${config.appURL}/auth/twitch/callback`,
	scope: "user:read:email"
},
function(accessToken, refreshToken, profile, done) {
	try {
		var UserSearch = User.findOne({ twitch_id: profile.id }).exec();
		if (!UserSearch) {
			let user = new User ({
				twitch_id: profile.id,
				username: profile.login,
				display_name: profile.display_name,
				email: profile.email,
				profile_pic_url: profile.profile_image_url,
				provider: 'twitch',
				twitch: profile
			})
			console.log('New user created')
			user.save();
			return done(null, profile)
		} else {
			console.log('User already exists')
			return done(null, profile)
		}
	} catch (err) {
		console.error(err)
	}
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

// Front page
app.get('/', (req, res, next) => {
		res.render('index')
		next();
})
	
// Logout
app.get('/logout', function (req, res){
	req.logout();
	console.log(req.session.passport.user)
  res.redirect('/');
});

//Dashboard
app.get('/dashboard', async (req, res) => {
	try {
		if (req.session && req.session.passport.user) {
			await User.findOne({ twitch_id: req.session.passport.user.id }, async (err, user) => {
				//TODO: move admin array to .env
				console.log(user.username)
				var admins = ['opti_21', 'veryhandsomebilly']
				var feSongRequests = await SongRequest.find();
				if (user.username ===  admins[0] || admins[1]) {
					// expose the user info to the template
					res.render('dashboard', {
						feUser: user.username,
						requests: feSongRequests
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

// TODO: Delete song request
app.get('/dashboard/delete/:id', async(req, res) => {
	if (req.session && req.session.passport.user) {
			await SongRequest.deleteOne({ _id: req.params.id}).exec().then(
				res.status(200).send('Request deleted')
			), function (err) {
				console.error(err)
				res.status(500).send('Error deleting song request')
			};
	} else {
		res.redirect('/index')
	}
});

// Twitch Client
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
						var newSpotSR = new SongRequest ({track:{name: data.name, artist: data.artists[0].name, link: message[1], uri: spURI}, requestedBy: userstate.username, timeOfReq: moment.utc(), source: 'spotify'});
						newSpotSR.save()
							.then((doc) => {
								botclient.say(channel, `@${doc.requestedBy} requested ${doc.track[0].name} by ${doc.track[0].artist}`);
								// Real time data push to front end
								channels_client.trigger('sr-channel', 'sr-event', {
									"reqBy": `${doc.requestedBy}`,
									"track": `${doc.track[0].name}`,
									"artist": `${doc.track[0].artist}`,
									"uri": `${doc.track[0].uri}`,
									"link": `${doc.track[0].link}`,
									"source": `${doc.source}`
								});
							})
							.catch(err => {console.error(err)});
					})
					.catch(function(err) {
						console.error('Error occurred: ' + err); 
					});
				
			}

			if (ytRegex.test(message[1])) {
				youtube.getVideo(message[1])
					.then(video => {
						var newYTSR = new SongRequest ({track:{name: video.title, link: message[1]}, requestedBy: userstate.username, timeOfReq: moment.utc(), source: 'youtube'});
						newYTSR.save()
							.then((doc) => {botclient.say(channel, `@${doc.requestedBy} requested ${doc.track[0].name}`);
								// Real time data push to front end
								channels_client.trigger('sr-channel', 'sr-event', {
									"reqBy": `${doc.requestedBy}`,
									"track": `${doc.track[0].name}`,
									"link": `${doc.track[0].link}`,
									"source": `${doc.source}`
								});
							})
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

	// if (message[0] === '!whosthechillest') {
	// 	botclient.say(twitchchan[0])
	// }
})


server.listen(3000)
