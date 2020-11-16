require('dotenv').config({
  path: '../../.env',
});

const wsc = require('socket.io-client');
const { Message, Producer } = require('redis-smq');
const Redis = require("ioredis")
const redis = new Redis({ password: process.env.REDIS_PASS })

// Databae
const mongoose = require('mongoose');

const JoinedChannel = require('./models/joinedTmiAlerts');

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

console.log('Starting tmi-alerts');

const tmi = require('tmi.js');
const twitchclientid = process.env.TWITCH_CLIENTID;
const twitchuser = process.env.TWITCH_USER;
const twitchpass = process.env.TWITCH_PASS;

console.log(process.argv);
let connectConfig;

if (process.argv.includes('-testserv')) {
  connectConfig = {
    secure: true,
    // Test server
    server: 'irc.fdgt.dev',
  };
} else {
  connectConfig = {
    secure: true,
  };
}

tmiOptions = {
  options: {
    debug: false,
    clientId: twitchclientid,
  },
  connection: connectConfig,
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

// Test functions
function subDelay() {
  setTimeout(sendSubs, 15000);
}

function sendSubs() {
  botclient.say('#opti_21', `subgift --tier 1 --username speedrazer`);
  // botclient.say('#opti_21', `subgift --tier 1 --username charlierose`);
  // botclient.say('#opti_21', `subgift --tier 1 --username marothon`);
  // botclient.say('#opti_21', `subgift --tier 1 --username speedrazer`);
  // botclient.say('#opti_21', `subgift --tier 1 --username speedrazer`);
}

function sendSMG() {
  botclient.say(
    '#opti_21',
    `submysterygift --count ${Math.floor(
      Math.random() * (10 - 5) + 5
    )} --username speedrazer`
  );
}

function sendBits() {
  botclient.say(
    '#opti_21',
    `bits --bitscount ${Math.floor(Math.random() * (1000 - 5) + 5)}`
  );
}

function sendraid() {
  botclient.say('#opti_21', `raid`);
}

if (process.argv.includes('-sendsmg')) {
  setInterval(sendSMG, 10000);
}

if (process.argv.includes('-sendbits')) {
  setInterval(sendBits, 5000);
}

if (process.argv.includes('-sendsubs')) {
  setInterval(sendSubs, 10000);
  // subDelay();
}

if (process.argv.includes('-sendraid')) {
  setInterval(sendraid, 11000);
}

// Bot connected to IRC server
botclient.on('connected', (address, port) => {
  console.log('connected to twitch chat client');
  console.log(address);
});

// Redis producers
const redisOpts = {
  redis: {
    driver: 'ioredis',
    options: {
      password: process.env.REDIS_PASS,
    },
  },
};

const subProducer = new Producer('sub_queue', redisOpts);

const alertProducer = new Producer('alerts', redisOpts);

// Channel Events
botclient.on(
  'subscription',
  (channel, username, method, message, userstate) => {
    let noHashChan = channel.slice(1);

    let newAlert = {
      channel: noHashChan,
      type: 'sub',
      data: {
        username: username,
        method: method,
        message: message,
        userstate: userstate,
      },
    };

    const alertMessage = new Message();

    alertMessage.setBody(newAlert);

    alertProducer.produceMessage(alertMessage, (err) => {
      if (err) console.log(err);
      else console.log('Sub Successfully produced');
    });
  }
);

botclient.on(
  'subgift',
  async (channel, username, streakMonths, recipient, methods, userstate) => {
    let noHashChan = channel.slice(1);
    let senderCount = ~~userstate['msg-param-sender-count'];
    const jobData = {
      type: 'subgift',
      data: {
        channel: noHashChan,
        userGivingSubs: username,
        userstate: userstate,
        recipient: recipient,
        streakMonths: streakMonths,
        senderCount: senderCount,
      },
    };

    const subMessage = new Message();

    subMessage.setBody(jobData);

    subProducer.produceMessage(subMessage, (err) => {
      if (err) console.log(err);
      else console.log('SUB gift Successfully produced');
    });
  }
);

// Random sub gifts aka Sub bombs
botclient.on(
  'submysterygift',
  (channel, username, numbOfSubs, methods, userstate) => {
    let noHashChan = channel.slice(1);
    console.log(numbOfSubs);

    // console.log(userstate);
    // console.log('NEW SMG')
    // Do not change this job structure
    let SMGjob = {
      type: 'submysterygift',
      channel: noHashChan,
      userstate: userstate,
      numbOfSubs: numbOfSubs,
      userGivingSubs: username,
      userstate: userstate,
    };
    const subMessage = new Message();

    subMessage.setBody(SMGjob);

    subProducer.produceMessage(subMessage, (err) => {
      if (err) console.log(err);
      console.log('----------SMG PRODUCED----------');
    });
  }
);

botclient.on('raided', (channel, username, viewers) => {
  let noHashChan = channel.slice(1);

  let newAlert = {
    channel: noHashChan,
    type: 'raid',
    data: {
      username: username,
      viewers: viewers,
    },
  };

  const alertMessage = new Message();

  alertMessage.setBody(newAlert);

  alertProducer.produceMessage(alertMessage, (err) => {
    if (err) console.log(err);
    else console.log('Raid Successfully produced');
  });
});

botclient.on('giftpaidupgrade', (channel, username, sender, userstate) => {
  let noHashChan = channel.slice(1);

  let newAlert = {
    channel: noHashChan,
    type: 'giftpaidupgrade',
    data: {
      username: username,
      sender: sender,
      userstate: userstate,
    },
  };

  const alertMessage = new Message();

  alertMessage.setBody(newAlert);

  alertProducer.produceMessage(alertMessage, (err) => {
    if (err) console.log(err);
    else console.log('Giftpaidupgrade Successfully produced');
  });
});

botclient.on(
  'resub',
  (channel, username, months, message, userstate, methods) => {
    let noHashChan = channel.slice(1);

    let newAlert = {
      channel: noHashChan,
      type: 'resub',
      data: {
        username: username,
        months: months,
        message: message,
        userstate: userstate,
      },
    };

    const alertMessage = new Message();

    alertMessage.setBody(newAlert);

    alertProducer.produceMessage(alertMessage, (err) => {
      if (err) console.log(err);
      else console.log('Resub Successfully produced');
    });
  }
);

botclient.on('cheer', (channel, userstate, message) => {
  let noHashChan = channel.slice(1);

  let newAlert = {
    channel: noHashChan,
    type: 'cheer',
    data: {
      username: userstate.login,
      message: message,
      userstate: userstate,
    },
  };

  const alertMessage = new Message();

  alertMessage.setBody(newAlert);

  alertProducer.produceMessage(alertMessage, (err) => {
    if (err) console.log(err);
    else console.log('Cheer Successfully produced');
  });
});
