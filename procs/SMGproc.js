require('dotenv').config();
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

const SubMysteryGift = require('../models/subMysteryGifts');
const ChannelEvent = require('../models/channelEvent');
module.exports = async (job) => {
  const { username, channel, userstate, numbOfSubs } = job.data;
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
    if (err) {
      console.error(err);
      return Promise.reject(err);
    }
    console.log('NEW SMG CREATED');
    return Promise.resolve();
  });
};
