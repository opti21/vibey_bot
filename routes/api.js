const router = require("express").Router();
const User = require("../models/users");
const SongRequest = require("../models/songRequests");
const mixReqs = require("../models/mixRequests");
const Poll = require("../models/polls");
const JoinedChannel = require("../models/joinedChannels");
const config = require("../config/config");
const twitchchan = config.twitchChan;
const pollsIO = io.of("/polls-namescape");
const moment = require("moment-timezone");
const rqs = io.of("/req-namescape");

function loggedIn(req, res, next) {
  if (!req.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

router.get("/requests/:channel", loggedIn, async (req, res) => {
  let requests = await SongRequest.find({ channel: req.params.channel });
  res.status(200).send(requests);
});

// Mixes
router.get("/mixes/:channel", loggedIn, async (req, res) => {
  let mixes = await mixReqs.find({ channel: req.params.channel });
  res.status(200).send(mixes);
});

// Add request to mix
router.post("/mixes/:channel/add/:id", loggedIn, async (req, res) => {
  await SongRequest.findById(req.params.id, (err, request) => {
    if (err) {
      return;
    } else {
      request.fulfilled = true;
      request.dateFulfilled = moment().utc();
      request.save().then(console.log("Request updated"));
      var mixAdd = new mixReqs({
        track: {
          name: request.track.name,
          artist: request.track.artist,
          link: request.track.link,
          uri: request.track.uri,
        },
        requestedBy: request.requestedBy,
        timeOfReq: request.timeOfReq,
        source: request.source,
        channel: request.channel,
      });
      mixAdd.save().then((doc) => {
        try {
          res.status(200).send("Added to Mix");
          rqs.to(`${req.params.channel}`).emit("mix-add", {
            id: `${doc.id}`,
            reqBy: `${doc.requestedBy}`,
            track: `${doc.track.name}`,
            artist: `${doc.track.artist}`,
            uri: `${doc.track.uri}`,
            link: `${doc.track.link}`,
            source: `${doc.source}`,
            channel: `${doc.channel}`,
          });
        } catch (err) {
          console.error(err);
          res.status(500).send("Error Adding song to mix");
        }
      });
    }
  });
});

// Delete Request
router.delete("/requests/:channel/delete/:id", loggedIn, (req, res) => {
  SongRequest.findByIdAndDelete(req.params.id, (err, mixRes) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error deleting request");
    } else {
      console.log("Request deleted");
      res.status(200).send("Request Delted successfully");
    }
  });
});

// Delete Mix request
router.delete("/mixes/:channel/delete/:id", loggedIn, (req, res) => {
  mixReqs.findByIdAndDelete(req.params.id, (err, mixRes) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error deleting request");
    } else {
      console.log("Request delted");
      res.status(200).send("Request Delted successfully");
    }
  });
});

// Clear Request Queue
router.delete("/requests/:channel/clearqueue", (req, res) => {
  SongRequest.deleteMany({ channel: req.params.channel }, (err, response) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Clearing queue");
    } else {
      console.log("Queue cleared");
      res.status(200).send("Queue cleared");
    }
  });
});

// Clear Mix Queue
router.delete("/mixes/:channel/clear", (req, res) => {
  SongRequest.deleteMany({ channel: req.params.channel }, (err, response) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error Clearing queue");
    } else {
      console.log("Queue cleared");
      res.status(200).send("Queue cleared");
    }
  });
});

// Polls
router.get("/polls", loggedIn, async (req, res) => {
  try {
    let polls = await Poll.find();
    res.send(polls).status(200);
  } catch (err) {
    res.send("error").send(500);
    console.error(err);
  }
});

router.post("/connect", loggedIn, async (req, res) => {
  let channel = req.query.channel;
  let exists = await JoinedChannel.exists({ channel: channel });
  if (exists) {
    res.status(409).send("Channel is already joined");
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
            res.status(200).send("Channel joined successfully!");
          })
          .catch((err) => {
            console.error(err);
            res.status(500).send("Error Joining channel");
          });
      })
      .catch((e) => {
        console.error(e);
      });
  }
});

router.delete("/disconnect", loggedIn, (req, res) => {
  let channel = req.query.channel;
  JoinedChannel.findOneAndDelete({
    channel: channel,
  })
    .then((response) => {
      console.log("Channel Document deleted");
      botclient
        .part(`${channel}`)
        .then((data) => {
          console.log(data);
          res.status(200).send("Channel joined successfully!");
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error Joining channel");
        });
    })
    .catch((e) => {
      console.error(e);
    });
});

router.post("/polls/newpoll", loggedIn, async (req, res) => {
  try {
    let user = await User.findOne({ twitch_id: req.user.id });
    let poll = await Poll.find({ active: true });
    if (poll.length === 0) {
      let pollText = req.body["formData"][0].value;
      let choices = req.body["formData"].slice(1);
      let multipleVotes = req.body["multipleVotes"];
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
          "A new poll has started! Vote with the # of the choice you would like to win!"
        );
        botclient.say(twitchchan[0], `The poll question is: ${pollText}`);

        doc.choices.forEach((choice) => {
          botclient.say(twitchchan[0], `${num} = ${choice.text}`);
          num++;
          let choiceArr = [`${choice.text}`, choice.votes];
          choices.push(choiceArr);
        });
        pollsIO.emit("pollOpen", {
          poll: doc,
        });

        choices = [];
        num = 1;
      });
    } else {
      console.log(poll);
      res.status(418).send("Poll is already running");
    }
  } catch (err) {
    res.status(500).send("Error creating poll document");
    console.error(err);
  }
});

// Song Poll
router.get("/createSongpoll", loggedIn, async (req, res) => {
  try {
    let poll = await Poll.find({ active: true });
    let mix = await mixReqs.find({});
    if (poll.length === 0) {
      let pollText = "Which song?";
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
          "A new poll has started! Vote with the # of the choice you want i.e.(2)"
        );
        botclient.say(twitchchan[0], `The poll question is: ${pollText}`);

        doc.choices.forEach((choice) => {
          botclient.say(twitchchan[0], `${num} = ${choice.text}`);
          num++;
          let choiceArr = [`${choice.text}`, choice.votes];
          choices.push(choiceArr);
        });
        pollsIO.emit("pollOpen", {
          poll: doc,
        });

        choices = [];
        num = 1;
      });
    } else {
      console.log(poll);
      res.status(418).send("Poll is already running");
    }
  } catch (err) {
    console.error(err);
  }
});

router.get("/polls/close/:id", loggedIn, async (req, res) => {
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

          botclient.say(twitchchan[0], "The poll is now closed");
          botclient.say(
            twitchchan[0],
            `Poll: ${doc.polltext} Winner: ${doc.choices[i].text}`
          );

          pollsIO.emit("pollClose", {
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
    res.status(500).send("Error closing Poll");
    console.error(err);
  }
});

module.exports = router;

function makeid(length) {
  let result = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
