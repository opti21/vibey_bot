const router = require("express").Router();
const SongRequest = require("../models/songRequests");
const mixReqs = require("../models/mixRequests");
const moment = require("moment-timezone");
const rqs = io.of("/req-namescape");

function loggedIn(req, res, next) {
  if (!req.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

router.get("/add/:id", loggedIn, async (req, res) => {
  await SongRequest.findById(req.params.id, (err, request) => {
    if (err) {
      return;
    } else {
      request.fulfilled = true;
      request.dateFulfilled = moment().utc();
      request.save().then(console.log("Request updated"));
      var mixAdd = new mixReqs({
        track: {
          name: request.track[0].name,
          artist: request.track[0].artist,
          link: request.track[0].link,
          uri: request.track[0].uri,
        },
        requestedBy: request.requestedBy,
        timeOfReq: request.timeOfReq,
        source: request.source,
      });
      mixAdd.save().then((doc) => {
        try {
          res.status(200).send("Added to Mix");
          rqs.emit("mix-event", {
            id: `${doc.id}`,
            reqBy: `${doc.requestedBy}`,
            track: `${doc.track[0].name}`,
            artist: `${doc.track[0].artist}`,
            uri: `${doc.track[0].uri}`,
            link: `${doc.track[0].link}`,
            source: `${doc.source}`,
          });
        } catch (err) {
          console.error(err);
          res.status(500).send("Error Adding song to mix");
        }
      });
    }
  });
});

router.get("/remove/:id", loggedIn, async (req, res) => {
  try {
    await mixReqs.deleteOne({ _id: req.params.id }).exec();
    rqs.emit("mix-remove", {
      id: `${req.params.id}`,
    });
    res.status(200).send("Song Removed from mix");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error removing song from mix");
  }
});

router.get("/deleteall", loggedIn, async (req, res) => {
  try {
    await mixReqs.deleteMany({}).exec();
    rqs.emit("clear-mix", {});
    res.status(200).send("Mix cleared");
  } catch (err) {
    res.status(500).send("Error clearing mix!");
    console.error(err);
  }
});

module.exports = router;
