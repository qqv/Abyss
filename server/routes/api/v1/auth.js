const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../../../data/models/User');

// 注册新用户
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: '用户名或邮箱已被使用' 
      });
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: '用户注册成功',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message 
    });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '无效的凭据' 
      });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: '无效的凭据' 
      });
    }

    // 创建JWT令牌
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message 
    });
  }
});

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    // 从请求头获取令牌
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '未授权' 
      });
    }

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 查找用户
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: '无效令牌' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: '服务器错误', 
      error: error.message 
    });
  }
});

module.exports = router;
