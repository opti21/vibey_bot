const router = require('express').Router();
// Front page
router.get('/', (req, res) => {
    res.render('index');
});

module.exports = router