const router = require("express").Router();
const mixReqs = require("../models/mixRequests");
const Poll = require("../models/polls");
const User = require("../models/users");
const config = require("../config/config");
const twitchchan = config.twitchChan;
const pollsIO = io.of("/polls-namescape");

function loggedIn(req, res, next) {
  if (!req.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

router.get("/polls", loggedIn, async (req, res) => {
  try {
    let polls = await Poll.find();
    res.send(polls).status(200);
  } catch (err) {
    res.send("error").send(500);
    console.error(err);
  }
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
          text: choices[index].track[0].name,
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
