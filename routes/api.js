const router = require('express').Router();
const Poll = require('../models/polls');

function loggedIn(req, res, next) {
	if (!req.user) {
		res.redirect('/login');
	} else {
		next();
	}
}

router.get('/polls', loggedIn, async (req, res) => {
	try {
		var polls = await Poll.find();
		res.send(polls);
	} catch (err) {
		console.error(err);
		errTxt(err);
	}
});

router.post('/polls/newpoll', loggedIn, async (req, res) => {
	try {
		var user = await User.findOne({ twitch_id: req.user.id });
		var poll = await Poll.find({ active: true });
		if (poll.length === 0) {
			var pollText = req.body[0].value;
			var choices = req.body.slice(1);
			var choiceArray = [];
			var votes = [];
			choices.forEach(choiceAppend);

			function choiceAppend(element, index, array) {
				var choice = {
					id: makeid(10),
					text: choices[index].value,
					votes: 0
				};
				choiceArray.push(choice);
			}

			console.log(choiceArray);

			var newPoll = new Poll({
				active: true,
				polltext: pollText,
				choices: choiceArray,
				votes: votes
			});
			await newPoll.save().then(doc => {
				res.send(doc);
				var num = 1;
				var choices = [];
				botclient.say(
					twitchchan[0],
					'A new poll has started! Vote with !c i.e.(!c 2)'
				);
				botclient.say(twitchchan[0], `The poll question is: ${pollText}`);

				doc.choices.forEach(choice => {
					botclient.say(twitchchan[0], `!c ${num} = ${choice.text}`);
					num++;
					let choiceArr = [`${choice.text}`, choice.votes];
					choices.push(choiceArr);
				});
				polls.emit('pollOpen', {
					poll: doc
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
		errTxt(err);
	}
});

// Song Poll
router.get('/polls/createSongpoll', loggedIn, async (req, res) => {
	try {
		var poll = await Poll.find({ active: true });
		var mix = await mixReqs.find({});
		if (poll.length === 0) {
			var pollText = 'Which song?';
			var choices = mix;
			var choiceArray = [];
			var votes = [];
			choices.forEach(choiceAppend);

			function choiceAppend(element, index, array) {
				var choice = {
					id: makeid(10),
					text: choices[index].track[0].name,
					votes: 0
				};
				choiceArray.push(choice);
			}

			console.log(choiceArray);

			var newPoll = new Poll({
				active: true,
				polltext: pollText,
				choices: choiceArray,
				votes: votes
			});
			await newPoll.save().then(doc => {
				res.send(doc);
				var num = 1;
				var choices = [];
				botclient.say(
					twitchchan[0],
					'A new poll has started! Vote with !c i.e.(!c 2)'
				);
				botclient.say(twitchchan[0], `The poll question is: ${pollText}`);

				doc.choices.forEach(choice => {
					botclient.say(twitchchan[0], `!c ${num} = ${choice.text}`);
					num++;
					let choiceArr = [`${choice.text}`, choice.votes];
					choices.push(choiceArr);
				});
				polls.emit('pollOpen', {
					poll: doc
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
		errTxt(err);
	}
});

router.get('/polls/close/:id', loggedIn, async (req, res) => {
	try {
		var user = await User.findOne({ twitch_id: req.user.id });
		var poll = await Poll.findOne({ _id: req.params.id });
		var choiceArr = [];
		poll.choices.forEach(choice => {
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
					errTxt(err);
					return;
				}
				try {
					res.sendStatus(200);

					botclient.say(twitchchan[0], 'The poll is now closed');
					botclient.say(
						twitchchan[0],
						`Poll: ${doc.polltext} Winner: ${doc.choices[i].text}`
					);

					polls.emit('pollClose', {
						pollID: doc._id,
						win: win,
						winText: poll.choices[i].text
					});
				} catch (err) {
					console.error(err);
					errTxt(err);
				}
			}
		);
	} catch (err) {
		res.status(500).send('Error closing Poll');
		console.error(err);
		errTxt(err);
	}
});

module.exports = router