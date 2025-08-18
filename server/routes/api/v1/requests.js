const express = require('express');
const router = express.Router();
const { auth } = require('../../../middlewares/auth');
const Request = require('../../../data/models/Request');
const ApiCollection = require('../../../data/models/ApiCollection');
const Folder = require('../../../data/models/Folder');

// 获取集合中的所有请求
router.get('/collection/:collectionId', auth, async (req, res) => {
  try {
    const { collectionId } = req.params;
    
    // 检查集合是否存在并验证权限
    const collection = await ApiCollection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '未找到集合'
      });
    }
    
    if (collection.owner.toString() !== req.userId.toString() && !collection.isPublic) {
      return res.status(403).json({
        success: false,
        message: '无权访问此集合'
      });
    }
    
    // 获取所有请求
    const requests = await Request.find({ collectionId })
      .sort({ order: 1 });
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('获取请求错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 获取文件夹中的所有请求
router.get('/folder/:folderId', auth, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    // 检查文件夹是否存在
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: '未找到文件夹'
      });
    }
    
    // 验证权限
    const collection = await ApiCollection.findById(folder.collectionId);
    if (collection.owner.toString() !== req.userId.toString() && !collection.isPublic) {
      return res.status(403).json({
        success: false,
        message: '无权访问此文件夹'
      });
    }
    
    // 获取文件夹中的请求
    const requests = await Request.find({ folderId })
      .sort({ order: 1 });
    
    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('获取文件夹请求错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 创建新请求
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      url,
      method,
      collectionId,
      folderId,
      headers,
      params,
      body,
      preRequestScript,
      tests,
      order
    } = req.body;
    
    // 验证必要字段
    if (!name || !url || !collectionId) {
      return res.status(400).json({
        success: false,
        message: '请提供名称、URL和集合ID'
      });
    }
    
    // 检查集合是否存在并验证权限
    const collection = await ApiCollection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({
        success: false,
        message: '未找到集合'
      });
    }
    
    if (collection.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权在此集合中创建请求'
      });
    }
    
    // 如果提供了文件夹ID，检查文件夹是否存在
    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder) {
        return res.status(404).json({
          success: false,
          message: '未找到文件夹'
        });
      }
      
      // 确保文件夹属于指定的集合
      if (folder.collectionId.toString() !== collectionId) {
        return res.status(400).json({
          success: false,
          message: '文件夹不属于指定的集合'
        });
      }
    }
    
    // 创建新请求
    const newRequest = new Request({
      name,
      url,
      method: method || 'GET',
      collectionId,
      folderId: folderId || null,
      headers: headers || [],
      params: params || [],
      body: body || { mode: 'none' },
      preRequestScript: preRequestScript || '',
      tests: tests || [],
      order: order || 0
    });
    
    await newRequest.save();
    
    res.status(201).json({
      success: true,
      message: '请求创建成功',
      data: newRequest
    });
  } catch (error) {
    console.error('创建请求错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 获取单个请求详情
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '未找到请求'
      });
    }
    
    // 验证权限
    const collection = await ApiCollection.findById(request.collectionId);
    if (collection.owner.toString() !== req.userId.toString() && !collection.isPublic) {
      return res.status(403).json({
        success: false,
        message: '无权访问此请求'
      });
    }
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('获取请求详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 更新请求
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name,
      url,
      method,
      folderId,
      headers,
      params,
      body,
      preRequestScript,
      tests,
      order
    } = req.body;
    
    // 查找请求
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '未找到请求'
      });
    }
    
    // 验证权限
    const collection = await ApiCollection.findById(request.collectionId);
    if (collection.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权修改此请求'
      });
    }
    
    // 如果修改了文件夹，检查新文件夹是否存在并属于相同集合
    if (folderId !== undefined && folderId !== request.folderId) {
      if (folderId) {
        const folder = await Folder.findById(folderId);
        if (!folder) {
          return res.status(404).json({
            success: false,
            message: '未找到文件夹'
          });
        }
        
        if (folder.collectionId.toString() !== request.collectionId.toString()) {
          return res.status(400).json({
            success: false,
            message: '文件夹不属于请求所在的集合'
          });
        }
      }
    }
    
    // 更新请求
    if (name) request.name = name;
    if (url) request.url = url;
    if (method) request.method = method;
    if (folderId !== undefined) request.folderId = folderId || null;
    if (headers) request.headers = headers;
    if (params) request.params = params;
    if (body) request.body = body;
    if (preRequestScript !== undefined) request.preRequestScript = preRequestScript;
    if (tests) request.tests = tests;
    if (order !== undefined) request.order = order;
    
    await request.save();
    
    res.json({
      success: true,
      message: '请求更新成功',
      data: request
    });
  } catch (error) {
    console.error('更新请求错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 删除请求
router.delete('/:id', auth, async (req, res) => {
  try {
    // 查找请求
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '未找到请求'
      });
    }
    
    // 验证权限
    const collection = await ApiCollection.findById(request.collectionId);
    if (collection.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '无权删除此请求'
      });
    }
    
    await request.remove();
    
    res.json({
      success: true,
      message: '请求已成功删除'
    });
  } catch (error) {
    console.error('删除请求错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

module.exports = router;
