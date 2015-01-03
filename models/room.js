var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// room schema
//
var roomSchema = new Schema({
  name: String,
  capacity:  { type: Number, min: 2, max: 20, default: 5 },
  permanent: { type: Boolean, default: false },
  language: String,
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  logs: [{
    time: Date,
    message: String,
  }],
});

roomSchema.path('name').required(true);

roomSchema.methods.f = function () {
};

roomSchema.statics.f = function () {
};

mongoose.model('Room', roomSchema);
