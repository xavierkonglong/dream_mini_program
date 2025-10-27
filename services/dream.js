// 梦境相关API服务
const { post, get } = require('./http.js');
const { t } = require('../utils/i18n.js');

/**
 * 梦境解析 - 文生图
 * @param {Object} data 梦境数据
 * @param {string} data.dreamDescription 梦境描述
 * @param {number} data.isPublic 是否公开 0-仅自己 1-公开
 * @returns {Promise} 解析结果
 */
function analyzeDream(data) {
  return post('/dream/analyze', {
    dreamDescription: data.dreamDescription,
    isPublic: data.isPublic || 0
  }, {
    showLoading: false,
    loadingText: t('dream.analyzingText'),
    timeout: 120000 // 梦境解析专用超时时间：2分钟
  });
}

/**
 * 梦境解析 - 文生视频（异步）
 * @param {Object} data 梦境数据
 * @param {string} data.dreamDescription 梦境描述
 * @param {number} data.isPublic 是否公开 0-仅自己 1-公开
 * @returns {Promise} 解析结果（包含taskId用于轮询）
 */
function analyzeDreamWithVideo(data) {
  return post('/dream/analyze-with-video', {
    dreamDescription: data.dreamDescription,
    isPublic: data.isPublic || 0
  }, {
    showLoading: false,
    loadingText: t('dream.analyzingVideo'),
    timeout: 120000 // 梦境解析专用超时时间：2分钟
  });
}

/**
 * 查询视频生成任务状态
 * @param {string} taskId 视频任务ID
 * @returns {Promise} 任务状态信息
 */
function getVideoStatus(taskId) {
  return get('/dream/video-status', {
    taskId: taskId
  });
}

/**
 * 获取梦境解析历史
 * @param {Object} params 查询参数
 * @param {number} params.page 页码
 * @param {number} params.size 每页数量
 * @param {string} params.keyword 搜索关键词
 * @returns {Promise} 历史记录列表
 */
function getDreamHistory(params = {}) {
  return get('/dream/history', {
    page: params.page || 1,
    size: params.size || 10,
    keyword: params.keyword || ''
  });
}

/**
 * 获取梦境解析详情
 * @param {number} id 梦境ID
 * @returns {Promise} 梦境详情
 */
function getDreamDetail(id) {
  return get(`/dream/${id}`);
}

/**
 * 删除梦境记录
 * @param {number} id 梦境ID
 * @returns {Promise} 删除结果
 */
function deleteDream(id) {
  return post(`/dream/delete`, { id });
}

/**
 * 分享梦境
 * @param {number} id 梦境ID
 * @returns {Promise} 分享结果
 */
function shareDream(id) {
  return post(`/dream/share`, { id });
}

/**
 * 收藏梦境
 * @param {number} id 梦境ID
 * @returns {Promise} 收藏结果
 */
function collectDream(id) {
  return post(`/dream/collect`, { id });
}

/**
 * 取消收藏梦境
 * @param {number} id 梦境ID
 * @returns {Promise} 取消收藏结果
 */
function uncollectDream(id) {
  return post(`/dream/uncollect`, { id });
}

/**
 * 获取收藏的梦境列表
 * @param {Object} params 查询参数
 * @returns {Promise} 收藏列表
 */
function getCollectedDreams(params = {}) {
  return get('/dream/collected', {
    page: params.page || 1,
    size: params.size || 10
  });
}

/**
 * 获取梦境日记详情
 * @param {string} postId 梦境日记ID
 * @returns {Promise} 梦境日记详情
 */
function getDiaryDetail(postId) {
  return get('/dream/posts/diaryDetail', {
    postId: postId
  });
}

module.exports = {
  analyzeDream,
  analyzeDreamWithVideo,
  getVideoStatus,
  getDreamHistory,
  getDreamDetail,
  deleteDream,
  shareDream,
  collectDream,
  uncollectDream,
  getCollectedDreams,
  getDiaryDetail
};
