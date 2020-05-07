const router = require("express").Router();
const passport = require("passport");

router.get("/twitch", passport.authenticate("twitch.js"));
router.get(
  "/twitch/callback",
  passport.authenticate("twitch.js", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication.
    res.redirect("/requests");
  }
);

module.exports = router;
