const express = require('express');
const router = express.Router();
const auth = require('../../../middleware/auth');
const GlobalVariable = require('../../../data/models/GlobalVariable');

// 获取当前用户的所有全局变量
router.get('/', auth, async (req, res) => {
  try {
    const globalVariables = await GlobalVariable.find({ 
      owner: req.user.id 
    }).sort({ key: 1 });
    
    res.json(globalVariables);
  } catch (err) {
    console.error('获取全局变量列表出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建新全局变量
router.post('/', auth, async (req, res) => {
  try {
    const { key, value, description, type, enabled } = req.body;
    
    if (!key) {
      return res.status(400).json({ message: '变量名不能为空' });
    }
    
    // 检查变量名是否已存在
    const existingVariable = await GlobalVariable.findOne({ 
      key, 
      owner: req.user.id 
    });
    
    if (existingVariable) {
      return res.status(400).json({ message: '变量名已存在' });
    }
    
    const newVariable = new GlobalVariable({
      key,
      value: value || '',
      description: description || '',
      type: type || 'text',
      enabled: enabled !== undefined ? enabled : true,
      owner: req.user.id
    });
    
    await newVariable.save();
    res.status(201).json(newVariable);
  } catch (err) {
    console.error('创建全局变量出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新全局变量
router.put('/:id', auth, async (req, res) => {
  try {
    const { key, value, description, type, enabled } = req.body;
    
    // 查找变量
    const variable = await GlobalVariable.findById(req.params.id);
    
    if (!variable) {
      return res.status(404).json({ message: '未找到变量' });
    }
    
    // 检查所有权
    if (variable.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限修改此变量' });
    }
    
    // 如果修改了变量名，检查是否与其他变量冲突
    if (key && key !== variable.key) {
      const existingVariable = await GlobalVariable.findOne({ 
        key, 
        owner: req.user.id,
        _id: { $ne: req.params.id } 
      });
      
      if (existingVariable) {
        return res.status(400).json({ message: '变量名已存在' });
      }
    }
    
    // 更新变量
    const updatedVariable = await GlobalVariable.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          key: key || variable.key,
          value: value !== undefined ? value : variable.value,
          description: description !== undefined ? description : variable.description,
          type: type || variable.type,
          enabled: enabled !== undefined ? enabled : variable.enabled
        }
      },
      { new: true }
    );
    
    res.json(updatedVariable);
  } catch (err) {
    console.error('更新全局变量出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除全局变量
router.delete('/:id', auth, async (req, res) => {
  try {
    const variable = await GlobalVariable.findById(req.params.id);
    
    if (!variable) {
      return res.status(404).json({ message: '未找到变量' });
    }
    
    // 检查所有权
    if (variable.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限删除此变量' });
    }
    
    await GlobalVariable.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: '变量已删除' });
  } catch (err) {
    console.error('删除全局变量出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 批量创建或更新全局变量
router.post('/bulk', auth, async (req, res) => {
  try {
    const { variables } = req.body;
    
    if (!variables || !Array.isArray(variables)) {
      return res.status(400).json({ message: '无效的变量数据' });
    }
    
    const results = [];
    
    for (const variable of variables) {
      if (!variable.key) {
        results.push({ success: false, error: '变量名不能为空', data: variable });
        continue;
      }
      
      // 查找现有变量
      const existingVariable = await GlobalVariable.findOne({ 
        key: variable.key,
        owner: req.user.id
      });
      
      if (existingVariable) {
        // 更新现有变量
        const updated = await GlobalVariable.findByIdAndUpdate(
          existingVariable._id,
          {
            $set: {
              value: variable.value !== undefined ? variable.value : existingVariable.value,
              description: variable.description !== undefined ? variable.description : existingVariable.description,
              type: variable.type || existingVariable.type,
              enabled: variable.enabled !== undefined ? variable.enabled : existingVariable.enabled
            }
          },
          { new: true }
        );
        
        results.push({ success: true, operation: 'update', data: updated });
      } else {
        // 创建新变量
        const newVariable = new GlobalVariable({
          key: variable.key,
          value: variable.value || '',
          description: variable.description || '',
          type: variable.type || 'text',
          enabled: variable.enabled !== undefined ? variable.enabled : true,
          owner: req.user.id
        });
        
        await newVariable.save();
        results.push({ success: true, operation: 'create', data: newVariable });
      }
    }
    
    res.status(200).json(results);
  } catch (err) {
    console.error('批量处理全局变量出错:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
