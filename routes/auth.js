require("dotenv").config();
const router = require("express").Router();
const passport = require("passport");
const spotify_id = process.env.SPOTIFY_ID;
const spotify_secret = process.env.SPOTIFY_SECRET;
const cb_url = process.env.SPOTIFY_CALLBACK_URL;
const encoded_url = encodeURIComponent(cb_url);
const Spotify = require("node-spotify-api");
const spotify = new Spotify({
  id: process.env.SPOTIFY_ID,
  secret: process.env.SPOTIFY_SECRET,
});
const axios = require("axios");
const b64 = require("js-base64").Base64;
const qs = require("querystring");
const User = require("../models/users");
const moment = require("moment-timezone");

router.get("/twitch", passport.authenticate("twitch.js"));
router.get(
  "/twitch/callback",
  passport.authenticate("twitch.js", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication.
    res.redirect("/auth/spotify");
  }
);

router.get("/spotify", (req, res) => {
  res.redirect(
    `https://accounts.spotify.com/authorize?client_id=${spotify_id}&response_type=code&redirect_uri=${encoded_url}&scope=playlist-read-private%20playlist-modify-public%20playlist-modify-private`
  );
});

router.get("/spotify/callback", (req, res) => {
  let body = {
    client_id: spotify_id,
    client_secret: spotify_secret,
    code: req.query.code,
    grant_type: "authorization_code",
    redirect_uri: cb_url,
  };

  let config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  axios
    .post("https://accounts.spotify.com/api/token/", qs.stringify(body), config)

    .then((code_res) => {
      console.log(code_res.data);
      try {
        let spData = {
          access_token: code_res.data.access_token,
          token_type: code_res.data.token_type,
          expires_in: moment().utc().add(code_res.data.expires_in, "seconds"),
          refresh_token: code_res.data.refresh_token,
          scope: code_res.data.scope,
        };
        User.findOneAndUpdate(
          { twitch_id: req.user.id },
          { spotify: spData },
          { new: true }
        ).then((update_res) => {
          console.log(update_res);
          res.redirect(`/u/${req.user.login}/dashboard`);
        });
      } catch (e) {
        console.error(e);
      }
    })
    .catch((e) => {
      console.error(e);
    });
});

// router.get("/test", (req, res) => {
//   res.render("test");
//   console.log(encoded_url);
// });

module.exports = router;
