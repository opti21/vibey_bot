require('dotenv').config({
  path: '../../.env',
});

const wsc = require('socket.io-client');
const { Message, Producer } = require('redis-smq');
const Redis = require('ioredis');
const redis = new Redis({ password: process.env.REDIS_PASS });
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.CRYPT_KEY);

redis.on('connect', (reply) => {
  console.log('SE redis client connected');
  console.log(reply);
});

redis.subscribe('se-connect', (err) => {
  if (err) console.error(err);
  console.log('Subscribed to se-connect redis');
});

const mongoose = require('mongoose');
const SeTokens = require('./models/setokens');

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

console.log('Starting streamElements.js');

const streamElements = wsc('https://realtime.streamelements.com', {
  transports: ['websocket'],
});

streamElements.on('connect', async () => {
  console.log('Connected to the StreamElements WebSocket');
  let connectedChans = await SeTokens.find({});
  connectedChans.forEach((chan) => {
    console.log(`Connecting to ${chan.channel}`);
    streamElements.emit('authenticate', {
      method: 'jwt',
      token: cryptr.decrypt(chan.token),
    });
  });
});

streamElements.on('disconnect', () => {
  console.log('Disconnected from the StreamElements WebSocket');
});

streamElements.on('authenticated', async (data) => {
  const { channelId } = data;
  //console.log(data)
  let chanInfo = await SeTokens.findOne({ seID: channelId });
  console.log(
    `StreamElements successfully connected to ${chanInfo.channel} ${channelId} `
  );
});

streamElements.on('event', (event) => {
  console.log(event);
});

streamElements.on('event:test', (event) => {
  console.log(event);
});

redis.on('message', (channel, rawM) => {
  let message = JSON.parse(rawM)
  switch (channel) {
    case 'se-connect':
      {
        switch (message.type) {
          case 'connect': {
            streamElements.emit('authenticate', {
              method: 'jwt',
              token: cryptr.decrypt(message.token),
            });
          }
          break;

          case 'disconnect': {
            streamElements.emit('unauthticate', {
              method: 'jwt',
              token: cryptr.decrypt(message.token),
            });
          }
        }
      }
      break;
  }
});
