const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const folderSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  collectionId: {
    type: Schema.Types.ObjectId,
    ref: 'ApiCollection',
    required: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 为集合ID和父文件夹创建索引以加快查询
folderSchema.index({ collectionId: 1, parentId: 1 });

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;
