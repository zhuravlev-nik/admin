var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log('Index');
  res.render('index', { name: 'John' });
});

module.exports = router;
