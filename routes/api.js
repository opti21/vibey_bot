const router = require('express').Router();
const config = require('../config/config');
const twitchchan = config.twitchChan;
const pollsIO = io.of('/polls-namescape');
const moment = require('moment-timezone');
const rqs = io.of('/req-namescape');
const admins = config.admins;
const axios = require('axios');

const User = require('../models/users');
const SongRequest = require('../models/songRequests');
const Queue = require('../models/queues');
const mixReqs = require('../models/mixRequests');
const Poll = require('../models/polls');
const JoinedChannel = require('../models/joinedChannels');
const ChannelEvent = require('../models/channelEvent');
const SeTokens = require('../models/setokens');
const Tip = require('../models/tips');
const TwitchCreds = require('../models/twitchCreds');

const paypal = require('@paypal/checkout-server-sdk');
let ppClientID = process.env.PAYPAL_DEV_CLIENTID;
let ppSecret = process.env.PAYPAL_DEV_SECRET;
let ppEnv = new paypal.core.SandboxEnvironment(ppClientID, ppSecret);
let ppClient = new paypal.core.PayPalHttpClient(ppEnv);

const redis = require('../utils/redis');

const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.CRYPT_KEY);

const { Message, Producer } = require('redis-smq');

const redisOpts = {
  redis: {
    driver: 'ioredis',
    options: {
      password: process.env.REDIS_PASS,
    },
  },
};

const alertProducer = new Producer('alerts', redisOpts);

function loggedIn(req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

router.get('/queue/:channel', loggedIn, async (req, res) => {
  let isAdmin = admins.includes(req.user.login);
  let isMod;
  let isChannelOwner = false;
  if (req.user.login === req.params.channel) {
    isChannelOwner = true;
  }
  if (isAdmin || isChannelOwner) {
    try {
      let queue = await Queue.findOne({ channel: req.params.channel }).limit(
        30
      );
      // console.log(queue.currQueue);
      res.status(200).send(queue);
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  } else {
    console.error('Not channel Owner');
    res.status(403).send('You are not the channel owner');
  }
});

router.put('/queues/:channel/status/:statusChange', loggedIn, (req, res) => {
  let isAdmin = admins.includes(req.user.login);
  let isMod;
  let isChannelOwner = false;
  if (req.user.login === req.params.channel) {
    isChannelOwner = true;
  }
  if (isAdmin || isChannelOwner) {
    try {
      switch (req.params.statusChange) {
        case 'open':
          Queue.findOneAndUpdate(
            { channel: req.params.channel },
            { allowReqs: true },
            { new: true, useFindAndModify: false }
          )
            .then((doc) => {
              res.status(200).send('Queue Opened');
            })
            .catch((e) => {
              console.error(e);
              res.status(500).send('Error opening queue');
            });
          break;

        case 'close':
          Queue.findOneAndUpdate(
            { channel: req.params.channel },
            { allowReqs: false },
            { new: true, useFindAndModify: false }
          )
            .then((doc) => {
              res.status(200).send('Queue closed');
            })
            .catch((e) => {
              console.error(e);
              res.status(500).send('Error closing queue');
            });
          break;
      }
    } catch (e) {
      console.error(e);
    }
  }
});

router.put('/queues/:channel/:move/:id', loggedIn, async (req, res) => {
  let queue = await Queue.findOne({ channel: req.params.channel });
  let move = req.params.move;
  let songIndex = queue.currQueue.findIndex(
    (song) => song.id === req.params.id
  );
  if (songIndex === 0 && move === 'move-up') {
    res.status(200).send(queue.currQueue);
  } else {
    let song = queue.currQueue[songIndex];

    let newIndex;

    if (req.params.move === 'move-up') {
      newIndex = songIndex - 1;
    }

    if (req.params.move === 'move-down') {
      newIndex = songIndex + 1;
    }

    // temp remove song from array
    queue.currQueue.splice(songIndex, 1);

    // put song into new position
    console.log(newIndex);
    console.log(song);
    queue.currQueue.splice(newIndex, 0, song);

    Queue.findOneAndUpdate(
      { channel: req.params.channel },
      { currQueue: queue.currQueue },
      { new: true, useFindAndModify: false }
    )
      .then((queueDoc) => {
        // Send updated queue as response
        res.status(200).send(queue.currQueue);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error moving song');
      });
  }
});

// Delete Request from queue
router.delete(
  '/queues/:channel/delete-song/:id',
  loggedIn,
  async (req, res) => {
    let queue = await Queue.findOne({ channel: req.params.channel });
    let songIndex = queue.currQueue.findIndex(
      (song) => song.id === req.params.id
    );
    queue.currQueue.splice(songIndex, 1);
    Queue.findOneAndUpdate(
      { channel: req.params.channel },
      { currQueue: queue.currQueue },
      { new: true, useFindAndModify: false }
    )
      .then((queueDoc) => {
        res.status(200).send('Song request deleted');
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error deleting song request');
      });
  }
);

// Clear Request Queue
router.delete('/requests/:channel/clearqueue', loggedIn, (req, res) => {
  Queue.findOneAndUpdate(
    { channel: req.params.channel },
    { currQueue: [] },
    { new: true, useFindAndModify: false }
  )
    .then((doc) => {
      console.log('Queue cleared');
      res.status(200).send('Queue cleared');
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error Clearing queue');
    });
});

// Polls
router.get('/polls', loggedIn, async (req, res) => {
  try {
    let polls = await Poll.find();
    res.send(polls).status(200);
  } catch (err) {
    res.send('error').send(500);
    console.error(err);
  }
});

router.get('/connect/:channel', loggedIn, async (req, res) => {
  let channel = req.params.channel;
  let alreadyJoined = await JoinedChannel.exists({ channel: channel });
  let isAdmin = admins.includes(req.user.login);
  let isMod;
  let isChannelOwner = false;
  if (req.user.login === req.params.channel) {
    isChannelOwner = true;
  }
  if (isAdmin || isChannelOwner) {
    if (alreadyJoined) {
      res.status(409).send('Channel is already joined');
      res.redirect('/dashboard');
    } else {
      let joinedChannel = new JoinedChannel({
        channel: channel,
      });
      joinedChannel
        .save()
        .then((doc) => {
          botclient
            .join(`${channel}`)
            .then((data) => {
              console.log(data);
              res.redirect(
                `/u/${channel}/dashboard?success=${encodeURIComponent(
                  `Channel Connected successfully`
                )}`
              );
            })
            .catch((err) => {
              console.error(err);
              res.redirect(
                `/u/${channel}/dashboard?e=${encodeURIComponent(
                  `Error Joining Channel`
                )}`
              );
            });
        })
        .catch((e) => {
          console.error(e);
        });
    }
  } else {
    res.redirect(
      `/u/${req.user.login}/dashboard?e=${encodeURIComponent(
        `You don't have permissions for that channel`
      )}`
    );
  }
});

// Disconnect chat client
router.get('/disconnect/:channel', loggedIn, (req, res) => {
  let isAdmin = admins.includes(req.user.login);
  let isMod;
  let isChannelOwner = false;
  if (req.user.login === req.params.channel) {
    isChannelOwner = true;
  }
  if (isAdmin || isChannelOwner) {
    let channel = req.params.channel;
    JoinedChannel.findOneAndDelete({
      channel: channel,
    })
      .then((response) => {
        console.log('Channel Document deleted');
        botclient
          .part(`${channel}`)
          .then((data) => {
            console.log(data);
            res.redirect(
              `/u/${channel}/dashboard?success=${encodeURIComponent(
                `Channel disconnected successfully`
              )}`
            );
          })
          .catch((err) => {
            console.error(err);
            res.redirect(
              `/u/${channel}/dashboard?e=${encodeURIComponent(
                `Error Joining Channel`
              )}`
            );
          });
      })
      .catch((e) => {
        console.error(e);
      });
  }
});

// Notification Events
router.get('/events/:channel', loggedIn, async (req, res) => {
  let isAdmin = admins.includes(req.user.login);
  let isMod;
  let isChannelOwner = false;
  if (req.user.login === req.params.channel) {
    isChannelOwner = true;
  }
  if (isAdmin || isChannelOwner) {
    try {
      let events = await ChannelEvent.find({ channel: req.params.channel })
        .limit(30)
        .sort({
          created_at: -1,
        });
      //console.log(events);
      res.status(200).send(events);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error getting events');
    }
  } else {
    res.status(403).send('Nah ah ah, you naughty naughty');
  }
});

// Cheermotes
router.get('/cheermotes', loggedIn, async (req, res) => {
  let isAdmin = admins.includes(req.user.login);
  let isMod;
  let channel = await User.findOne({ username: req.query.channel });
  let isChannelOwner = false;
  const twitchCreds = await TwitchCreds.findOne({});

  if (req.user.login === req.params.channel) {
    isChannelOwner = true;
  }
  if (isAdmin || isChannelOwner) {
    await axios
      .get(
        `https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${channel.twitch_id}`,
        {
          headers: {
            Authorization: `Bearer ${twitchCreds.accessToken}`,
            'client-id': process.env.TWITCH_CLIENTID,
          },
        }
      )
      .then((resp) => {
        res.status(200).json(resp.data);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json(err);
      });
  } else {
    res.status(403).send('Nah ah ah, you naughty naughty');
  }
});

router.get('/stats', loggedIn, async (req, res) => {
  let isAdmin = admins.includes(req.user.login);
  if (isAdmin) {
    try {
      redis.get('sr-processed', (err, response) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error getting events');
        }
        console.log(response);
        res.status(200).json({
          srProcessed: response,
        });
      });
      //console.log(events);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error getting events');
    }
  } else {
    res.status(403).send('Nah ah ah, you naughty naughty');
  }
});

router.post('/polls/newpoll', loggedIn, async (req, res) => {
  try {
    let user = await User.findOne({ twitch_id: req.user.id });
    let poll = await Poll.find({ active: true });
    if (poll.length === 0) {
      let pollText = req.body['formData'][0].value;
      let choices = req.body['formData'].slice(1);
      let multipleVotes = req.body['multipleVotes'];
      let choiceArray = [];
      let votes = [];
      choices.forEach(choiceAppend);

      function choiceAppend(element, index, array) {
        let choice = {
          id: makeid(10),
          text: choices[index].value,
          votes: 0,
        };
        choiceArray.push(choice);
      }

      console.log(choiceArray);

      let newPoll = new Poll({
        active: true,
        polltext: pollText,
        choices: choiceArray,
        votes: votes,
        allow_multiple_votes: multipleVotes,
      });
      await newPoll.save().then((doc) => {
        res.send(doc);
        let num = 1;
        let choices = [];
        botclient.say(
          twitchchan[0],
          'A new poll has started! Vote with the # of the choice you would like to win!'
        );
        botclient.say(twitchchan[0], `The poll question is: ${pollText}`);

        doc.choices.forEach((choice) => {
          botclient.say(twitchchan[0], `${num} = ${choice.text}`);
          num++;
          let choiceArr = [`${choice.text}`, choice.votes];
          choices.push(choiceArr);
        });
        pollsIO.emit('pollOpen', {
          poll: doc,
        });

        choices = [];
        num = 1;
      });
    } else {
      console.log(poll);
      res.status(418).send('Poll is already running');
    }
  } catch (err) {
    res.status(500).send('Error creating poll document');
    console.error(err);
  }
});

router.post('/connect-paypal', loggedIn, async (req, res) => {
  let isAdmin = admins.includes(req.user.login);
  let isChannelOwner = false;
  if (req.user.login === req.params.channel) {
    isChannelOwner = true;
  }
  if (isAdmin || isChannelOwner) {
    console.log(req.body);
    User.findOneAndUpdate(
      { twitch_id: req.user.id },
      {
        paypal_connected: true,
        paypal_email: decodeURIComponent(req.body.email),
      },
      {
        useFindAndModify: false,
      },
      (err, doc) => {
        if (err) {
          console.error(err);
          res.redirect(
            `/u/${req.user.login}/dashboard?a=${encodeURIComponent(
              'Error Connecting PayPal'
            )}`
          );
        }
        res.redirect(`/u/${req.user.login}/dashboard`);
      }
    );
  } else {
    res.send('your not supposed to be here');
  }
});

router.get('/disconnect-paypal', loggedIn, async (req, res) => {
  let isAdmin = admins.includes(req.user.login);
  let isChannelOwner = false;
  if (req.user.login === req.params.channel) {
    isChannelOwner = true;
  }
  if (isAdmin || isChannelOwner) {
    await User.findOneAndUpdate(
      { twitch_id: req.user.id },
      { paypal_connected: false, paypal_email: '' },
      {
        useFindAndModify: false,
      },
      (err, doc) => {
        if (err) {
          console.error(err);
          res.redirect(
            `/u/${req.user.login}/dashboard?a=${encodeURIComponent(
              'Error disconnecting PayPal'
            )}`
          );
        }
        res.redirect(`/u/${req.user.login}/dashboard`);
      }
    );
  } else {
    res.send('your not supposed to be here');
  }
});

router.post('/create-tip/:channel', async (req, res) => {
  let ppRequest = new paypal.orders.OrdersCreateRequest();
  let user = await User.findOne({ username: req.params.channel });
  console.log(req.body);
  if (!user) {
    res.status(401).send("Channel doesn't exist");
  } else {
    ppRequest.requestBody({
      intent: 'CAPTURE',
      application_context: {
        brand_name: user.paypal_email,
        user_action: 'PAY_NOW',
        payment_method: {
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        shipping_preference: 'NO_SHIPPING',
        return_url: `${process.env.APP_URL}/api/paypal-callback`,
      },
      purchase_units: [
        {
          amount: {
            currency_code: req.body.currency,
            value: req.body.amount,
          },
          payee: {
            email_address: user.paypal_email,
          },
        },
      ],
    });

    console.log(ppRequest);

    try {
      let ppRes = await ppClient.execute(ppRequest);
      console.log(ppRes.result);
      let newTip = new Tip({
        tip_receiver: user.twitch_id,
        ppOrderID: ppRes.result.id,
        status: ppRes.result.status,
        tipper_name: req.body.name,
        amount: parseInt(req.body.amount),
        currency: req.body.currency,
        message: decodeURIComponent(req.body.message),
      });
      await newTip.save((doc) => {
        console.log('Init tip doc');
        console.log(doc);
        res.status(308).redirect(ppRes.result.links[1].href);
      });
    } catch (e) {
      console.error(e);
      res.status(500).send('Server Error');
    }
  }
});

router.get('/paypal-callback', async (req, res) => {
  console.log(req.query);
  let ppToken = decodeURIComponent(req.query.token);

  let ppRequest = new paypal.orders.OrdersCaptureRequest(ppToken);
  ppRequest.requestBody({});
  let response = await ppClient.execute(ppRequest);

  let newTipDoc = await Tip.findOneAndUpdate(
    { ppOrderID: ppToken },
    {
      status: response.result.status,
      tipper_email: response.result.payer.email_address,
      tipperID: response.result.payer.payer_id,
      order_result: response.result,
    }
  );
  let user = await User.findOne({ twitch_id: newTipDoc.tip_receiver });

  let newAlert = {
    channel: user.username,
    type: 'dono',
    data: {
      tipper: newTipDoc.tipper,
      amount: newTipDoc.amount,
      currency: newTipDoc.currency,
    },
  };

  const alertMessage = new Message();

  alertMessage.setBody(newAlert);

  alertProducer.produceMessage(alertMessage, (err) => {
    if (err) console.log(err);
    else console.log('Sub Successfully produced');
  });

  console.log(response.result);
  console.log('New tip doc');
  console.log(newTipDoc);
  // If call returns body in response, you can get the deserialized version from the result attribute of the response.
  // console.log(`Capture: ${JSON.stringify(response.result)}`);
  res.redirect('/tip-success/' + user.username);
});

// Song Poll
router.get('/createSongpoll', loggedIn, async (req, res) => {
  try {
    let poll = await Poll.find({ active: true });
    let mix = await mixReqs.find({});
    if (poll.length === 0) {
      let pollText = 'Which song?';
      let choices = mix;
      let choiceArray = [];
      let votes = [];
      let multipleVotes = req.query.multiplevotes;
      choices.forEach(choiceAppend);

      function choiceAppend(element, index, array) {
        let choice = {
          id: makeid(10),
          text: choices[index].track.name,
          votes: 0,
        };
        choiceArray.push(choice);
      }

      console.log(choiceArray);

      let newPoll = new Poll({
        active: true,
        polltext: pollText,
        choices: choiceArray,
        votes: votes,
        allow_multiple_votes: multipleVotes,
      });
      await newPoll.save().then((doc) => {
        res.send(doc);
        let num = 1;
        let choices = [];
        botclient.say(
          twitchchan[0],
          'A new poll has started! Vote with the # of the choice you want i.e.(2)'
        );
        botclient.say(twitchchan[0], `The poll question is: ${pollText}`);

        doc.choices.forEach((choice) => {
          botclient.say(twitchchan[0], `${num} = ${choice.text}`);
          num++;
          let choiceArr = [`${choice.text}`, choice.votes];
          choices.push(choiceArr);
        });
        pollsIO.emit('pollOpen', {
          poll: doc,
        });

        choices = [];
        num = 1;
      });
    } else {
      console.log(poll);
      res.status(418).send('Poll is already running');
    }
  } catch (err) {
    console.error(err);
  }
});

router.get('/polls/close/:id', loggedIn, async (req, res) => {
  try {
    let user = await User.findOne({ twitch_id: req.user.id });
    let poll = await Poll.findOne({ _id: req.params.id });
    let choiceArr = [];
    poll.choices.forEach((choice) => {
      choiceArr.push(choice.votes);
    });
    console.log(choiceArr);
    let i = choiceArr.indexOf(Math.max(...choiceArr));
    let win = poll._id + poll.choices[i].id;
    await Poll.findOneAndUpdate(
      { _id: req.params.id },
      { $set: { active: false }, winner: win },
      { useFindAndModify: false, new: true },
      (err, doc) => {
        console.log(doc.active);
        if (err) {
          return;
        }
        try {
          res.sendStatus(200);

          botclient.say(twitchchan[0], 'The poll is now closed');
          botclient.say(
            twitchchan[0],
            `Poll: ${doc.polltext} Winner: ${doc.choices[i].text}`
          );

          pollsIO.emit('pollClose', {
            pollID: doc._id,
            win: win,
            winText: poll.choices[i].text,
          });
        } catch (err) {
          console.error(err);
        }
      }
    );
  } catch (err) {
    res.status(500).send('Error closing Poll');
    console.error(err);
  }
});

module.exports = router;

function makeid(length) {
  let result = '';
  let characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
