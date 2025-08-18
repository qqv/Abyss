const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const parameterSetSchema = new Schema({
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
  variables: {
    type: Map,
    of: [String]
  }
}, {
  timestamps: true
});

// 创建索引以加快查询
parameterSetSchema.index({ owner: 1 });

const ParameterSet = mongoose.model('ParameterSet', parameterSetSchema);

module.exports = ParameterSet;
