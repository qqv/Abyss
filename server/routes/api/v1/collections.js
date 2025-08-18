const express = require('express');
const router = express.Router();
const { auth } = require('../../../middlewares/auth');
const ApiCollection = require('../../../data/models/ApiCollection');
const Folder = require('../../../data/models/Folder');
const Request = require('../../../data/models/Request');

// 获取用户的所有集合
router.get('/', auth, async (req, res) => {
  try {
    const collections = await ApiCollection.find({
      $or: [
        { owner: req.userId },
        { isPublic: true }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: collections.length,
      data: collections
    });
  } catch (error) {
    console.error('获取集合错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 创建新集合
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic, variables } = req.body;

    // 检查是否已存在同名集合
    const existingCollection = await ApiCollection.findOne({
      name,
      owner: req.userId
    });

    if (existingCollection) {
      return res.status(400).json({
        success: false,
        message: '已存在同名集合'
      });
    }

    // 创建新集合
    const newCollection = new ApiCollection({
      name,
      description,
      owner: req.userId,
      isPublic: isPublic || false,
      variables: variables || []
    });

    await newCollection.save();

    res.status(201).json({
      success: true,
      message: '集合创建成功',
      data: newCollection
    });
  } catch (error) {
    console.error('创建集合错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 获取单个集合详情
router.get('/:id', auth, async (req, res) => {
  try {
    const collection = await ApiCollection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '未找到集合'
      });
    }

    // 检查权限
    if (collection.owner.toString() !== req.userId.toString() && !collection.isPublic) {
      return res.status(403).json({
        success: false,
        message: '无权访问此集合'
      });
    }

    // 获取集合中的文件夹和请求
    const folders = await Folder.find({ 
      collectionId: collection._id,
      parentId: null
    }).sort({ order: 1 });
    
    const requests = await Request.find({ 
      collectionId: collection._id,
      folderId: null
    }).sort({ order: 1 });

    res.json({
      success: true,
      data: {
        collection,
        folders,
        requests
      }
    });
  } catch (error) {
    console.error('获取集合详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 更新集合
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, isPublic, variables } = req.body;
    
    // 查找集合
    const collection = await ApiCollection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '未找到集合'
      });
    }
    
    // 检查权限
    if (collection.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权修改此集合'
      });
    }
    
    // 如果修改名称，检查是否有同名集合
    if (name && name !== collection.name) {
      const existingCollection = await ApiCollection.findOne({
        _id: { $ne: collection._id },
        name,
        owner: req.userId
      });
      
      if (existingCollection) {
        return res.status(400).json({
          success: false,
          message: '已存在同名集合'
        });
      }
    }
    
    // 更新集合
    collection.name = name || collection.name;
    collection.description = description !== undefined ? description : collection.description;
    collection.isPublic = isPublic !== undefined ? isPublic : collection.isPublic;
    collection.variables = variables || collection.variables;
    
    await collection.save();
    
    res.json({
      success: true,
      message: '集合更新成功',
      data: collection
    });
  } catch (error) {
    console.error('更新集合错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 删除集合
router.delete('/:id', auth, async (req, res) => {
  try {
    // 查找集合
    const collection = await ApiCollection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '未找到集合'
      });
    }
    
    // 检查权限
    if (collection.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权删除此集合'
      });
    }
    
    // 删除相关的文件夹和请求
    await Folder.deleteMany({ collectionId: collection._id });
    await Request.deleteMany({ collectionId: collection._id });
    
    // 删除集合
    await collection.remove();
    
    res.json({
      success: true,
      message: '集合及其内容已成功删除'
    });
  } catch (error) {
    console.error('删除集合错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

module.exports = router;
