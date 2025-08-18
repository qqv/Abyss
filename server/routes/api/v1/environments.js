const express = require('express');
const router = express.Router();
const auth = require('../../../middleware/auth');
const Environment = require('../../../data/models/Environment');

// 获取当前用户的所有环境
router.get('/', auth, async (req, res) => {
  try {
    const environments = await Environment.find({ 
      $or: [
        { owner: req.user.id },
        { isPublic: true }
      ]
    }).sort({ name: 1 });
    
    res.json(environments);
  } catch (err) {
    console.error('获取环境列表出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个环境详情
router.get('/:id', auth, async (req, res) => {
  try {
    const environment = await Environment.findById(req.params.id);
    
    if (!environment) {
      return res.status(404).json({ message: '未找到环境' });
    }
    
    // 检查访问权限
    if (environment.owner.toString() !== req.user.id && !environment.isPublic) {
      return res.status(403).json({ message: '没有权限访问此环境' });
    }
    
    res.json(environment);
  } catch (err) {
    console.error('获取环境详情出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建新环境
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, variables, color, isPublic } = req.body;
    
    // 检查同名环境
    const existingEnvironment = await Environment.findOne({ 
      name, 
      owner: req.user.id 
    });
    
    if (existingEnvironment) {
      return res.status(400).json({ message: '您已有同名环境' });
    }
    
    const newEnvironment = new Environment({
      name,
      description,
      variables: variables || [],
      color,
      isPublic: isPublic || false,
      owner: req.user.id
    });
    
    await newEnvironment.save();
    res.status(201).json(newEnvironment);
  } catch (err) {
    console.error('创建环境出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新环境
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, variables, color, isPublic, isActive } = req.body;
    
    // 查找环境
    const environment = await Environment.findById(req.params.id);
    
    if (!environment) {
      return res.status(404).json({ message: '未找到环境' });
    }
    
    // 检查所有权
    if (environment.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限修改此环境' });
    }
    
    // 如果修改了名称，检查是否与其他环境冲突
    if (name && name !== environment.name) {
      const existingEnvironment = await Environment.findOne({ 
        name, 
        owner: req.user.id,
        _id: { $ne: req.params.id } 
      });
      
      if (existingEnvironment) {
        return res.status(400).json({ message: '您已有同名环境' });
      }
    }
    
    // 如果标记为激活，则将其他环境设为非激活
    if (isActive) {
      await Environment.updateMany(
        { owner: req.user.id, _id: { $ne: req.params.id } },
        { $set: { isActive: false } }
      );
    }
    
    // 更新环境
    const updatedEnvironment = await Environment.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name: name || environment.name,
          description: description !== undefined ? description : environment.description,
          variables: variables || environment.variables,
          color: color || environment.color,
          isPublic: isPublic !== undefined ? isPublic : environment.isPublic,
          isActive: isActive !== undefined ? isActive : environment.isActive
        }
      },
      { new: true }
    );
    
    res.json(updatedEnvironment);
  } catch (err) {
    console.error('更新环境出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除环境
router.delete('/:id', auth, async (req, res) => {
  try {
    const environment = await Environment.findById(req.params.id);
    
    if (!environment) {
      return res.status(404).json({ message: '未找到环境' });
    }
    
    // 检查所有权
    if (environment.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限删除此环境' });
    }
    
    await Environment.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: '环境已删除' });
  } catch (err) {
    console.error('删除环境出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取当前激活的环境
router.get('/active/current', auth, async (req, res) => {
  try {
    const activeEnvironment = await Environment.findOne({ 
      owner: req.user.id,
      isActive: true
    });
    
    if (!activeEnvironment) {
      return res.status(404).json({ message: '未找到激活的环境' });
    }
    
    res.json(activeEnvironment);
  } catch (err) {
    console.error('获取激活环境出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
