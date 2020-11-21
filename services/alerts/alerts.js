require('dotenv').config({
  path: '../../.env'
});

const { Consumer } = require('redis-smq');

const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const pub = new Redis({password: process.env.REDIS_PASS});
const redisClient = new Redis({password: process.env.REDIS_PASS});

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
      });
    break;

  case 'staging':
    mongoose
      .connect(
        `mongodb+srv://vibey_bot:${process.env.DB_PASS}@cluster0-gtgmw.mongodb.net/vibeystaging?retryWrites=true&w=majority`,
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
      });
    break;

  case 'dev':
    mongoose
      .connect(
        `mongodb+srv://vibey_bot:${process.env.DB_PASS}@cluster0-gtgmw.mongodb.net/vibeydev?retryWrites=true&w=majority`,
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
      });
    break;
}

const db = mongoose.connection;
db.on('error', error => {
  console.error(error);
});
db.once('open', () => console.log('Connected to Mongoose ' + Date()));

redisClient.on('connect', reply => {
  console.log('Alert Processor redis client connected');
  console.log(reply);
});

redisClient.on('error', function (error) {
  console.error(error);
});

// Models
const ChannelEvent = require('./models/channelEvent');

//////// PROCCESS ////////

class AlertQueueConsumer extends Consumer {
  /**
   *
   * @param message
   * @param cb
   */
  async consume(message, cb) {
    // console.log('Got an alert message to consume:', message);

    switch (message.type) {
      case 'sub':
        {
          console.log('SUB ALERT');

          let subAlert = new ChannelEvent({
            channel: message.channel,
            type: 'sub',
            data: message.data
          });

          subAlert.save((err, doc) => {
            if (err) {
              console.error(err);
              cb(err);
            }

            pub.publish('wsalerts', JSON.stringify({
              type: 'sub',
              channel: message.channel,
              data: message.data
            }));
          });
          cb();
        }
        break;

      case 'subgift':
        {
          let subGiftAlert = new ChannelEvent({
            channel: message.channel,
            type: 'subgift',
            data: message.data
          });

          subGiftAlert.save((err, doc) => {
            if (err) {
              console.error(err);
              cb(err);
            }

            pub.publish('wsalerts', JSON.stringify({
              type: 'subgift',
              channel: message.channel,
              data: message.data
            }));
          });
          cb();
        }
        break;

      case 'SMG':
        {
          let parsedSMG = message.data.map(x => JSON.parse(x))
          let SMGInfo = parsedSMG[0];
          console.log(parsedSMG);

          let SMGAlert = new ChannelEvent({
            channel: SMGInfo.channel,
            type: 'SMG',
            data: parsedSMG
          });

          SMGAlert.save((err, doc) => {
            if (err) {
              console.error(err);
              cb(err);
            }

            pub.publish('wsalerts', JSON.stringify({
              type: 'SMG',
              channel: SMGInfo.channel,
              data: parsedSMG
            }));
          });
          cb();
        }
        break;

      case 'resub':
        {
          console.log('RESUB ALERT');
          let SMGAlert = new ChannelEvent({
            channel: message.channel,
            type: 'resub',
            data: message.data
          });

          SMGAlert.save((err, doc) => {
            if (err) {
              console.error(err);
              cb(err);
            }

            pub.publish('wsalerts', JSON.stringify({
              type: 'resub',
              channel: message.channel,
              data: message.data
            }));
          });
          cb();
        }
        break;

      case 'cheer':
        {
          console.log('CHEER ALERT');

          let cheerAlert = new ChannelEvent({
            channel: message.channel,
            type: 'cheer',
            data: message.data
          });

          cheerAlert.save((err, doc) => {
            if (err) {
              console.error(err);
              cb(err);
            }

            pub.publish('wsalerts', JSON.stringify({
              type: 'cheer',
              channel: message.channel,
              data: message.data
            }));
          });
          cb();
        }
        break;

      case 'raid':
        {
          console.log('RAID ALERT');

          let cheerAlert = new ChannelEvent({
            channel: message.channel,
            type: 'raid',
            data: message.data
          });

          cheerAlert.save((err, doc) => {
            if (err) {
              console.error(err);
              cb(err);
            }

            pub.publish('wsalerts', JSON.stringify({
              type: 'raid',
              channel: message.channel,
              data: message.data
            }));
          });
          cb();
        }
        break;

      case 'dono':
        {
          console.log('RAID ALERT');

          let donoAlert = new ChannelEvent({
            channel: message.channel,
            type: 'dono',
            data: message.data
          });

          donoAlert.save((err, doc) => {
            if (err) {
              console.error(err);
              cb(err);
            }

            pub.publish('wsalerts', JSON.stringify({
              type: 'dono',
              channel: message.channel,
              data: message.data
            }));
          });
          cb();
        }
        break;

      default: {
        console.log('SOME OTHER ALERT');
        console.log(message.type);
        cb();
      }
    }
  }
}

AlertQueueConsumer.queueName = 'alerts';

const redisOpts = {
  redis: {
    driver: 'ioredis',
    options: {password: process.env.REDIS_PASS}
  }
};
const consumer = new AlertQueueConsumer(redisOpts);
consumer.run();
