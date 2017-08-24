var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/bug');

var schema = new mongoose.Schema({
  msg: String,
  traces: [{
    source: String,
    line: Number,
    column: Number,
    name: String
  }]
});

module.exports = mongoose.model('Report', schema);
