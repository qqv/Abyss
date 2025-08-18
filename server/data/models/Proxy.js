const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const proxySchema = new Schema({
  host: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    required: true,
    min: 1,
    max: 65535
  },
  protocol: {
    type: String,
    enum: ['http', 'https', 'socks4', 'socks5'],
    default: 'http'
  },
  username: {
    type: String
  },
  password: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastChecked: {
    type: Date
  },
  isValid: {
    type: Boolean
  },
  failureCount: {
    type: Number,
    default: 0
  },
  responseTime: {
    type: Number
  }
}, {
  timestamps: true
});

const Proxy = mongoose.model('Proxy', proxySchema);

module.exports = Proxy;
