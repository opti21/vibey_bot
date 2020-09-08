const router = require('express').Router();
const config = require('../config/config');
const twitchchan = config.twitchChan;
const pollsIO = io.of('/polls-namescape');
const moment = require('moment-timezone');
const rqs = io.of('/req-namescape');
const admins = config.admins;

const User = require('../models/users');
const SongRequest = require('../models/songRequests');
const Queue = require('../models/queues');
const mixReqs = require('../models/mixRequests');
const Poll = require('../models/polls');
const JoinedChannel = require('../models/joinedChannels');
const ChannelEvent = require('../models/channelEvent');

function loggedIn(req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

// TODO: Add check that user matches logged in user or admin

router.get('/queue/:channel', loggedIn, async (req, res) => {
  let isAdmin = admins.includes(req.user.login);
  let isMod;
  let isAllowed;
  if (isAdmin || isChannelOwner) {
    try {
      let queue = await Queue.findOne({ channel: req.params.channel });
      // console.log(queue.currQueue);
      res.status(200).send(queue);
    } catch (err) {
      console.error(err);
      res.status(500).send(err);
    }
  } else {
    res.status(403).send('You are not the channel owner');
  }
});

// Mixes
router.get('/mixes/:channel', loggedIn, async (req, res) => {
  let mixes = await mixReqs.find({ channel: req.params.channel });
  res.status(200).send(mixes);
});

router.put('/queues/:channel/status/:statusChange', loggedIn, (req, res) => {
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
    queue.currQueue.splice(newIndex, 0, song);

    Queue.findOneAndUpdate(
      { channel: req.params.channel },
      { currQueue: queue.currQueue },
      { new: true, useFindAndModify: false }
    )
      .then((queueDoc) => {
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

router.post('/connect', loggedIn, async (req, res) => {
  let channel = req.query.channel;
  let exists = await JoinedChannel.exists({ channel: channel });
  if (exists) {
    res.status(409).send('Channel is already joined');
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
            res.status(200).send('Channel joined successfully!');
          })
          .catch((err) => {
            console.error(err);
            res.status(500).send('Error Joining channel');
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
  let isAllowed;
  if (isAdmin || isChannelOwner) {
    try {
      let events = await ChannelEvent.find({channel: req.params.channel})
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

router.delete('/disconnect', loggedIn, (req, res) => {
  let channel = req.query.channel;
  JoinedChannel.findOneAndDelete({
    channel: channel,
  })
    .then((response) => {
      console.log('Channel Document deleted');
      botclient
        .part(`${channel}`)
        .then((data) => {
          console.log(data);
          res.status(200).send('Channel joined successfully!');
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send('Error Joining channel');
        });
    })
    .catch((e) => {
      console.error(e);
    });
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
