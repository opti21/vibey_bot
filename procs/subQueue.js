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

module.exports = (job) => {
  let noHashChan = job.data.channel.slice(1);
  if (job.data.type === 'subgift') {
    let senderCount = ~~job.data.userstate['msg-param-sender-count'];
    // let streak = ~~userstate['msg-param-cumulative-months'];
    // let showStreak = userstate['msg-param-should-share-streak'];

    console.log(userstate);

    SubMysteryGift.findOne({
      channel: noHashChan,
      userGivingSubs: job.data.username,
      active: true,
    }).then((activeSMG) => {
      if (activeSMG) {
        if (activeSMG.subsLeft > 1) {
          let newSubArray = activeSMG.subs;
          let newSubCount = activeSMG.subsLeft - 1;
          // TODO: add more sub data
          let subData = {
            recipient: job.data.recipient,
          };
          newSubArray.push(subData);
          SubMysteryGift.findByIdAndUpdate(
            activeSMG._id,
            {
              subs: newSubArray,
              subsLeft: newSubCount,
            },
            {
              new: true,
              useFindAndModify: false,
            }
          )
            .then((doc) => {
              // console.log('SMG Updated');
              console.log(doc);
              return Promise.resolve();
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        } else {
          let newSubArray = activeSMG.subs;
          let newSubCount = activeSMG.subsLeft - 1;
          let subData = {
            recipient: job.data.recipient,
          };
          newSubArray.push(subData);
          SubMysteryGift.findByIdAndUpdate(
            activeSMG._id,
            {
              subs: newSubArray,
              subsLeft: newSubCount,
              active: false,
            },
            {
              new: true,
              useFindAndModify: false,
            }
          )
            .then((smgDoc) => {
              console.log('SMG Completed');
              let newEvent = new ChannelEvent({
                channel: noHashChan,
                type: 'mysterysubgift',
                data: smgDoc,
              });
              newEvent.save((err, eventDoc) => {
                if (err) {
                  done(err);
                }
                //   alertQueue.add({
                //     id: eventDoc._id,
                //     type: 'mysterysubgift',
                //     channel: noHashChan,
                //     userGivingSubs: smgDoc.userGivingSubs,
                //     subsGifted: smgDoc.subsGifted,
                //     senderTotal: smgDoc.senderTotal,
                //     subs: smgDoc.subs,
                //   });

                return Promise.resolve();
              });
            })
            .catch((err) => {
              // TODO:
              return Promise.reject(err);
            });
        }
      } else {
        // console.log('No active SMG');
        let newEvent = new ChannelEvent({
          jobId: job.id,
          channel: noHashChan,
          eventID: job.data.eventID,
          type: 'subgift',
          data: {
            username: job.data.username,
            recipient: job.data.recipient,
            // showStreak: showStreak,
            // streak: streak,
            totalGifted: senderCount,
          },
        });
        newEvent.save((err, doc) => {
          console.log('NEW SUB GIFT');
          console.log(doc._id);
          if (err) {
            done(err);
            return Promise.reject(err);
          }

          return Promise.resolve(doc);
        });
      }
    });
  }

  if (job.data.type === 'submysterygift') {
    console.log('sub queue SMG');
    let senderCount = ~~job.data.userstate['msg-param-sender-count'];

    let newSMG = new SubMysteryGift({
      channel: noHashChan,
      active: true,
      subsLeft: job.data.numbOfSubs,
      subsGifted: job.data.numbOfSubs,
      userGivingSubs: job.data.username,
      senderTotal: senderCount,
      userstate: job.data.userstate,
    });
    newSMG.save((err, doc) => {
      if (err) {
        console.error(err);
        return Promise.resolve(err);
      }
      return Promise.resolve(null, doc);
    });
  }
};
