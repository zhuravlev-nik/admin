'use strict';

const mongoose = require('mongoose');
let db;

let connectOpts = {};
function connect() {
  mongoose.connect('mongodb://localhost/viewst', connectOpts);
  db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function() {
    console.log('DB connected');
  });
  db.on('disconnect', connect);
}

module.exports = function(req, res, next) {
  if (!db) connect();
  next();
}
