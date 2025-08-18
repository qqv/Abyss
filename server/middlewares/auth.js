const jwt = require('jsonwebtoken');
const User = require('../data/models/User');

/**
 * 认证中间件
 * 验证用户是否已登录并附加用户信息到请求对象
 */
const auth = async (req, res, next) => {
  try {
    // 从请求头获取Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: '未授权，无效的令牌格式' 
      });
    }

    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '未授权，未提供令牌' 
      });
    }

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 查找用户
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '未授权，用户不存在' 
      });
    }

    // 将用户附加到请求对象
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    console.error('认证错误:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: '未授权，无效的令牌' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: '未授权，令牌已过期' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message 
    });
  }
};

/**
 * 管理员验证中间件
 * 确保用户具有管理员权限
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: '禁止访问，需要管理员权限'
    });
  }
};

module.exports = { auth, admin };
