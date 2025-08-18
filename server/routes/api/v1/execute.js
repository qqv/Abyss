const express = require('express');
const router = express.Router();
const { auth } = require('../../../middlewares/auth');
const requestExecutor = require('../../../services/requestExecutor');
const Request = require('../../../data/models/Request');
const ApiCollection = require('../../../data/models/ApiCollection');
const Proxy = require('../../../data/models/Proxy');
const ProxyPool = require('../../../data/models/ProxyPool');

// 执行保存的请求
router.post('/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { environment, proxyId, proxyPoolId } = req.body;
    
    // 查找请求
    const request = await Request.findById(requestId);
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
        message: '无权执行此请求'
      });
    }
    
    // 如果提供了代理ID，检查代理是否存在
    if (proxyId) {
      const proxy = await Proxy.findById(proxyId);
      if (!proxy) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的代理'
        });
      }
    }
    
    // 如果提供了代理池ID，检查代理池是否存在
    if (proxyPoolId) {
      const proxyPool = await ProxyPool.findById(proxyPoolId);
      if (!proxyPool) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的代理池'
        });
      }
    }
    
    // 执行请求
    const result = await requestExecutor.executeRequest(request, {
      environment: environment || {},
      proxyId,
      proxyPoolId
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('执行请求错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 执行未保存的请求（临时请求）
router.post('/', auth, async (req, res) => {
  try {
    const { request, environment, proxyId, proxyPoolId } = req.body;
    
    // 验证请求数据
    if (!request || !request.url) {
      return res.status(400).json({
        success: false,
        message: '无效的请求数据'
      });
    }
    
    // 如果提供了代理ID，检查代理是否存在
    if (proxyId) {
      const proxy = await Proxy.findById(proxyId);
      if (!proxy) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的代理'
        });
      }
    }
    
    // 如果提供了代理池ID，检查代理池是否存在
    if (proxyPoolId) {
      const proxyPool = await ProxyPool.findById(proxyPoolId);
      if (!proxyPool) {
        return res.status(404).json({
          success: false,
          message: '未找到指定的代理池'
        });
      }
    }
    
    // 构建临时请求对象
    const tempRequest = {
      name: request.name || 'Temporary Request',
      url: request.url,
      method: request.method || 'GET',
      headers: request.headers || [],
      params: request.params || [],
      body: request.body || { mode: 'none' },
      preRequestScript: request.preRequestScript || '',
      tests: request.tests || []
    };
    
    // 执行请求
    const result = await requestExecutor.executeRequest(tempRequest, {
      environment: environment || {},
      proxyId,
      proxyPoolId
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('执行临时请求错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

module.exports = router;
