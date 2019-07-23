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
	callbackURL: `http://${config.appIP}:3000/auth/twitch/callback`,
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
				if (!user) {
					res.redirect('/login');
				} else {
					// expose the user info to the template
					res.render('dashboard', {
						feUser: user
					})
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
const twitchchan = ['veryhandsomebilly'];

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
  console.log('socket connected ' + socket.id)
});

// Bot says hello on connect
// botclient.on('connected', (address, port) => {
//   botclient.say(twitchchan[0], `Hey Chat! Send me those vibes`)
// });


botclient.on('chat', (channel, userstate, message, self) => {
	var message = message.trim().split(" ");
	if (message[0] === '!sr' || message[0] === '!songrequest') {
		
	}

	if (message[0] === '!whoschill') {
		botclient.say(twitchchan[0], `We are all the chill`)
	}
})


server.listen(3000)
