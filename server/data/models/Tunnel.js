const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tunnelSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proxies: [{
    type: Schema.Types.ObjectId,
    ref: 'Proxy'
  }],
  active: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 为所有者创建索引以加快查询
tunnelSchema.index({ owner: 1 });

const Tunnel = mongoose.model('Tunnel', tunnelSchema);

module.exports = Tunnel;
