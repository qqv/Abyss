const express = require('express');
const router = express.Router();
const auth = require('../../../middleware/auth');
const Folder = require('../../../data/models/Folder');
const ApiCollection = require('../../../data/models/ApiCollection');
const Request = require('../../../data/models/Request');

// 获取集合中的所有文件夹
router.get('/collection/:collectionId', auth, async (req, res) => {
  try {
    const { collectionId } = req.params;
    
    // 检查集合是否存在
    const collection = await ApiCollection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ message: '未找到集合' });
    }
    
    // 检查访问权限
    if (collection.owner.toString() !== req.user.id && !collection.isPublic) {
      return res.status(403).json({ message: '没有权限访问此集合' });
    }
    
    // 获取所有文件夹
    const folders = await Folder.find({ collectionId }).sort({ order: 1 });
    
    res.json(folders);
  } catch (err) {
    console.error('获取文件夹列表出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取指定父文件夹下的所有文件夹
router.get('/parent/:parentId', auth, async (req, res) => {
  try {
    const { parentId } = req.params;
    
    // 检查父文件夹是否存在
    const parentFolder = await Folder.findById(parentId);
    if (!parentFolder) {
      return res.status(404).json({ message: '未找到父文件夹' });
    }
    
    // 检查集合是否存在
    const collection = await ApiCollection.findById(parentFolder.collectionId);
    if (!collection) {
      return res.status(404).json({ message: '未找到集合' });
    }
    
    // 检查访问权限
    if (collection.owner.toString() !== req.user.id && !collection.isPublic) {
      return res.status(403).json({ message: '没有权限访问此集合' });
    }
    
    // 获取子文件夹
    const folders = await Folder.find({ 
      parentId,
      collectionId: parentFolder.collectionId 
    }).sort({ order: 1 });
    
    res.json(folders);
  } catch (err) {
    console.error('获取子文件夹列表出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个文件夹详情
router.get('/:id', auth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ message: '未找到文件夹' });
    }
    
    // 检查集合是否存在
    const collection = await ApiCollection.findById(folder.collectionId);
    if (!collection) {
      return res.status(404).json({ message: '未找到集合' });
    }
    
    // 检查访问权限
    if (collection.owner.toString() !== req.user.id && !collection.isPublic) {
      return res.status(403).json({ message: '没有权限访问此文件夹' });
    }
    
    res.json(folder);
  } catch (err) {
    console.error('获取文件夹详情出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建新文件夹
router.post('/', auth, async (req, res) => {
  try {
    const { name, collectionId, parentId, order } = req.body;
    
    if (!name || !collectionId) {
      return res.status(400).json({ message: '文件夹名称和集合ID不能为空' });
    }
    
    // 检查集合是否存在
    const collection = await ApiCollection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ message: '未找到集合' });
    }
    
    // 检查是否有权限修改集合
    if (collection.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限修改此集合' });
    }
    
    // 如果有父文件夹，检查父文件夹是否存在且属于同一集合
    if (parentId) {
      const parentFolder = await Folder.findById(parentId);
      if (!parentFolder) {
        return res.status(404).json({ message: '未找到父文件夹' });
      }
      
      if (parentFolder.collectionId.toString() !== collectionId) {
        return res.status(400).json({ message: '父文件夹必须属于同一集合' });
      }
    }
    
    // 创建新文件夹
    const newFolder = new Folder({
      name,
      collectionId,
      parentId: parentId || null,
      order: order !== undefined ? order : 0
    });
    
    await newFolder.save();
    res.status(201).json(newFolder);
  } catch (err) {
    console.error('创建文件夹出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新文件夹
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, parentId, order } = req.body;
    
    // 查找文件夹
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ message: '未找到文件夹' });
    }
    
    // 检查集合是否存在
    const collection = await ApiCollection.findById(folder.collectionId);
    if (!collection) {
      return res.status(404).json({ message: '未找到集合' });
    }
    
    // 检查是否有权限修改集合
    if (collection.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限修改此文件夹' });
    }
    
    // 如果更改了父文件夹，检查父文件夹是否存在且属于同一集合
    if (parentId !== undefined && parentId !== folder.parentId?.toString()) {
      if (parentId === req.params.id) {
        return res.status(400).json({ message: '文件夹不能作为自己的父文件夹' });
      }
      
      // 防止循环引用：检查新的父文件夹不是当前文件夹的子文件夹
      if (parentId) {
        let currentFolder = await Folder.findById(parentId);
        while (currentFolder && currentFolder.parentId) {
          if (currentFolder.parentId.toString() === req.params.id) {
            return res.status(400).json({ message: '不能将文件夹移动到其子文件夹中' });
          }
          currentFolder = await Folder.findById(currentFolder.parentId);
        }
        
        // 检查父文件夹是否属于同一集合
        if (currentFolder && currentFolder.collectionId.toString() !== folder.collectionId.toString()) {
          return res.status(400).json({ message: '父文件夹必须属于同一集合' });
        }
      }
    }
    
    // 更新文件夹
    const updatedFolder = await Folder.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name: name || folder.name,
          parentId: parentId !== undefined ? (parentId || null) : folder.parentId,
          order: order !== undefined ? order : folder.order
        }
      },
      { new: true }
    );
    
    res.json(updatedFolder);
  } catch (err) {
    console.error('更新文件夹出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除文件夹
router.delete('/:id', auth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ message: '未找到文件夹' });
    }
    
    // 检查集合是否存在
    const collection = await ApiCollection.findById(folder.collectionId);
    if (!collection) {
      return res.status(404).json({ message: '未找到集合' });
    }
    
    // 检查是否有权限修改集合
    if (collection.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限删除此文件夹' });
    }
    
    // 查找所有子文件夹
    const childFolders = await Folder.find({ parentId: req.params.id });
    
    // 递归删除子文件夹
    const deleteChildFolders = async (folderId) => {
      const children = await Folder.find({ parentId: folderId });
      for (const child of children) {
        await deleteChildFolders(child._id);
      }
      
      // 删除文件夹中的请求
      await Request.deleteMany({ folderId });
      
      // 删除文件夹
      await Folder.findByIdAndDelete(folderId);
    };
    
    // 删除所有子文件夹及其内容
    for (const childFolder of childFolders) {
      await deleteChildFolders(childFolder._id);
    }
    
    // 删除文件夹中的请求
    await Request.deleteMany({ folderId: req.params.id });
    
    // 删除文件夹
    await Folder.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: '文件夹已删除' });
  } catch (err) {
    console.error('删除文件夹出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
