const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../../middleware/auth');
const ScanJob = require('../../../data/models/ScanJob');
const ScanResult = require('../../../data/models/ScanResult');
const ApiCollection = require('../../../data/models/ApiCollection');
const Request = require('../../../data/models/Request');
const ApiTestEngine = require('../../../services/apiTestEngine');

/**
 * @route   POST api/v1/tests
 * @desc    创建新的API测试任务
 * @access  Private
 */
router.post('/', [
  auth,
  [
    check('name', '测试任务名称是必需的').not().isEmpty(),
    check('collectionId', '必须提供API集合ID').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      name,
      collectionId,
      requests,
      parameterSetId,
      proxyPoolId,
      tunnelId,
      concurrency
    } = req.body;

    // 验证集合是否存在且用户有权访问
    const collection = await ApiCollection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ msg: 'API集合不存在' });
    }

    // 验证用户是否有权限访问此集合
    if (collection.owner.toString() !== req.user.id && !collection.isPublic) {
      return res.status(403).json({ msg: '无权访问此API集合' });
    }

    // 验证请求是否存在且属于该集合
    if (requests && requests.length > 0) {
      const requestCount = await Request.countDocuments({
        _id: { $in: requests },
        collectionId
      });

      if (requestCount !== requests.length) {
        return res.status(400).json({ msg: '一个或多个请求不存在或不属于该集合' });
      }
    }

    // 创建新的测试任务
    const testJob = new ScanJob({
      name,
      owner: req.user.id,
      collectionId,
      requests: requests || [],
      parameterSetId,
      proxyPoolId,
      tunnelId,
      concurrency: concurrency || 5,
      status: 'pending',
      progress: 0
    });

    await testJob.save();

    res.json(testJob);
  } catch (err) {
    console.error('创建测试任务错误:', err.message);
    res.status(500).send('服务器错误');
  }
});

/**
 * @route   GET api/v1/tests
 * @desc    获取当前用户的所有测试任务
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const testJobs = await ScanJob.find({ owner: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json(testJobs);
  } catch (err) {
    console.error('获取测试任务错误:', err.message);
    res.status(500).send('服务器错误');
  }
});

/**
 * @route   GET api/v1/tests/:id
 * @desc    获取单个测试任务详情
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const testJob = await ScanJob.findById(req.params.id);
    
    if (!testJob) {
      return res.status(404).json({ msg: '测试任务不存在' });
    }
    
    // 验证用户是否有权限查看
    if (testJob.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: '无权查看此测试任务' });
    }
    
    res.json(testJob);
  } catch (err) {
    console.error('获取测试任务详情错误:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '测试任务不存在' });
    }
    
    res.status(500).send('服务器错误');
  }
});

/**
 * @route   DELETE api/v1/tests/:id
 * @desc    删除测试任务
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const testJob = await ScanJob.findById(req.params.id);
    
    if (!testJob) {
      return res.status(404).json({ msg: '测试任务不存在' });
    }
    
    // 验证用户是否有权限删除
    if (testJob.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: '无权删除此测试任务' });
    }
    
    // 删除测试任务
    await testJob.remove();
    
    // 删除相关的测试结果
    await ScanResult.deleteMany({ jobId: req.params.id });
    
    res.json({ msg: '测试任务已删除' });
  } catch (err) {
    console.error('删除测试任务错误:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '测试任务不存在' });
    }
    
    res.status(500).send('服务器错误');
  }
});

/**
 * @route   PUT api/v1/tests/:id/start
 * @desc    启动测试任务
 * @access  Private
 */
router.put('/:id/start', auth, async (req, res) => {
  try {
    const testJob = await ScanJob.findById(req.params.id);
    
    if (!testJob) {
      return res.status(404).json({ msg: '测试任务不存在' });
    }
    
    // 验证用户是否有权限启动
    if (testJob.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: '无权启动此测试任务' });
    }
    
    // 检查任务状态
    if (testJob.status === 'running') {
      return res.status(400).json({ msg: '测试任务已在运行中' });
    }
    
    // 启动测试任务
    const result = await ApiTestEngine.startTestJob(req.params.id);
    
    res.json(result);
  } catch (err) {
    console.error('启动测试任务错误:', err.message);
    res.status(500).send('服务器错误');
  }
});

/**
 * @route   PUT api/v1/tests/:id/cancel
 * @desc    取消测试任务
 * @access  Private
 */
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const testJob = await ScanJob.findById(req.params.id);
    
    if (!testJob) {
      return res.status(404).json({ msg: '测试任务不存在' });
    }
    
    // 验证用户是否有权限取消
    if (testJob.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: '无权取消此测试任务' });
    }
    
    // 检查任务状态
    if (testJob.status !== 'running') {
      return res.status(400).json({ msg: '只能取消正在运行的测试任务' });
    }
    
    // 取消测试任务
    const result = await ApiTestEngine.cancelTestJob(req.params.id);
    
    res.json(result);
  } catch (err) {
    console.error('取消测试任务错误:', err.message);
    res.status(500).send('服务器错误');
  }
});

/**
 * @route   GET api/v1/tests/:id/results
 * @desc    获取测试任务结果
 * @access  Private
 */
router.get('/:id/results', auth, async (req, res) => {
  try {
    const testJob = await ScanJob.findById(req.params.id);
    
    if (!testJob) {
      return res.status(404).json({ msg: '测试任务不存在' });
    }
    
    // 验证用户是否有权限查看
    if (testJob.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: '无权查看此测试任务的结果' });
    }
    
    // 获取测试结果，支持分页
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const results = await ScanResult.find({ jobId: req.params.id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await ScanResult.countDocuments({ jobId: req.params.id });
    
    res.json({
      results,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('获取测试结果错误:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '测试任务不存在' });
    }
    
    res.status(500).send('服务器错误');
  }
});

/**
 * @route   GET api/v1/tests/active
 * @desc    获取活跃的测试任务列表
 * @access  Private
 */
router.get('/active', auth, async (req, res) => {
  try {
    // 只允许管理员访问此接口
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: '需要管理员权限' });
    }
    
    const activeJobs = ApiTestEngine.getActiveTestJobs();
    
    res.json(activeJobs);
  } catch (err) {
    console.error('获取活跃测试任务错误:', err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;
