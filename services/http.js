// 统一网络请求封装
const config = require('../config/env.js');
const logger = require('../utils/logger.js');
const { t } = require('../utils/i18n.js');

/**
 * 统一请求方法
 * @param {Object} options 请求参数
 * @param {string} options.url 请求地址
 * @param {string} options.method 请求方法 GET/POST/PUT/DELETE
 * @param {Object} options.data 请求数据
 * @param {Object} options.header 请求头
 * @param {boolean} options.showLoading 是否显示loading
 * @param {string} options.loadingText loading文字
 * @returns {Promise} 请求结果
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    showLoading = true,
    loadingText,
    timeout
  } = options;

  // 构建完整URL
  const fullUrl = url.startsWith('http') ? url : `${config.baseURL}${url}`;
  
  // 获取全局token
  const app = getApp();
  const token = app.globalData.token;
  
  // 构建请求头
  const requestHeader = {
    'Content-Type': 'application/json',
    ...header
  };
  
  // 添加token到请求头
  if (token) {
    requestHeader['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    // 显示loading
    if (showLoading) {
      wx.showLoading({
        title: loadingText || t('http.processing'),
        mask: true
      });
    }

    wx.request({
      url: fullUrl,
      method,
      data,
      header: requestHeader,
      timeout: timeout || config.timeout || 30000,
      success: (res) => {
        // 只有在显示了loading的情况下才隐藏
        if (showLoading) {
          wx.hideLoading();
        }
        // 处理响应
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 业务成功
          if (res.data && res.data.code === 0) {
            resolve(res.data);
          } else {
            // 业务失败
            const errorMsg = res.data?.message || t('http.requestFailed');
            wx.showToast({
              title: errorMsg,
              icon: 'error',
              duration: 2000
            });
            reject(new Error(errorMsg));
          }
        } else if (res.statusCode === 401 || res.statusCode === 400) {
          // 未授权或token过期（400/401），清除token并跳转登录
          app.clearLoginInfo();
          wx.eventBus && wx.eventBus.emit('unauthorized', {
            statusCode: res.statusCode,
            message: res.data?.message || t('http.unauthorized')
          });
          // wx.showToast({
          //   title: '登录已过期',
          //   icon: 'error'
          // });
          reject(new Error(t('http.unauthorized')));
        } else if (res.statusCode === 408) {
          // 408 请求超时，使用后端返回的具体错误消息
          const errorMsg = res.data?.message || t('http.timeoutMessage');
          wx.showToast({
            title: errorMsg,
            icon: 'error',
            duration: 2000
          });
          const error = new Error(errorMsg);
          error.statusCode = 408;
          reject(error);
        } else {
          // HTTP错误
          const errorMsg = `${t('http.requestFailed')} (${res.statusCode})`;
          wx.showToast({
            title: errorMsg,
            icon: 'error'
          });
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        wx.hideLoading();
        
        logger.error('请求失败:', err);
        
        // 网络错误处理
        let errorMsg = t('http.networkFailed');
        if (err.errMsg) {
          if (err.errMsg.includes('timeout')) {
            errorMsg = t('http.timeoutMessage');
          } else if (err.errMsg.includes('fail')) {
            errorMsg = t('http.networkFailed');
          }
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'error',
          duration: 2000
        });
        
        reject(err);
      }
    });
  });
}

/**
 * GET请求
 * @param {string} url 请求地址
 * @param {Object} data 请求参数
 * @param {Object} options 其他选项
 */
function get(url, data = {}, options = {}) {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  });
}

/**
 * POST请求
 * @param {string} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他选项
 */
function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
}

/**
 * PUT请求
 * @param {string} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他选项
 */
function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  });
}

/**
 * DELETE请求
 * @param {string} url 请求地址
 * @param {Object} data 请求参数
 * @param {Object} options 其他选项
 */
function del(url, data = {}, options = {}) {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  });
}

/**
 * 文件上传
 * @param {string} url 上传地址
 * @param {string} filePath 文件路径
 * @param {string} name 文件字段名
 * @param {Object} formData 额外表单数据
 * @param {Object} options 其他选项
 */
function upload(url, filePath, name = 'file', formData = {}, options = {}) {
  const {
    showLoading = true,
    loadingText,
    timeout
  } = options;

  // 构建完整URL
  const fullUrl = url.startsWith('http') ? url : `${config.baseURL}${url}`;
  
  // 获取全局token
  const app = getApp();
  const token = app.globalData.token;
  
  // 构建请求头
  const requestHeader = {};
  
  // 添加token到请求头
  if (token) {
    requestHeader['Authorization'] = `Bearer ${token}`;
  }


  return new Promise((resolve, reject) => {
    // 显示loading
    if (showLoading) {
      wx.showLoading({
        title: loadingText || t('http.uploading'),
        mask: true
      });
    }

    wx.uploadFile({
      url: fullUrl,
      filePath: filePath,
      name: name,
      formData: formData,
      header: requestHeader,
      timeout: timeout || config.timeout || 30000,
      success: (res) => {
        // 只有在显示了loading的情况下才隐藏
        if (showLoading) {
          wx.hideLoading();
        }
        
        try {
          const data = JSON.parse(res.data);
          
          // 处理响应
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // 业务成功
            if (data && data.code === 0) {
              resolve(data);
            } else {
              // 业务失败
              const errorMsg = data?.message || t('http.uploadFailed');
              wx.showToast({
                title: errorMsg,
                icon: 'error',
                duration: 2000
              });
              reject(new Error(errorMsg));
            }
        } else if (res.statusCode === 401 || res.statusCode === 400) {
          // 未授权或token过期（400/401），清除token
          app.clearLoginInfo();
          
          // 触发全局401事件，让页面自己处理登录弹窗
          wx.eventBus && wx.eventBus.emit('unauthorized', {
            statusCode: res.statusCode,
            message: res.data?.message || t('http.unauthorized')
          });
          
          reject(new Error(t('http.unauthorized')));
          } else {
            // HTTP错误
            const errorMsg = `${t('http.uploadFailed')} (${res.statusCode})`;
            wx.showToast({
              title: errorMsg,
              icon: 'error'
            });
            reject(new Error(errorMsg));
          }
        } catch (parseError) {
          logger.error('解析上传响应失败:', parseError);
          reject(new Error(t('http.parseFailed')));
        }
      },
      fail: (err) => {
        // 只有在显示了loading的情况下才隐藏
        if (showLoading) {
          wx.hideLoading();
        }
        
        logger.error('上传失败:', err);
        
        // 网络错误处理
        let errorMsg = t('http.uploadFailed');
        if (err.errMsg) {
          if (err.errMsg.includes('timeout')) {
            errorMsg = t('http.uploadTimeout');
          } else if (err.errMsg.includes('fail')) {
            errorMsg = t('http.uploadNetworkFailed');
          }
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'error',
          duration: 2000
        });
        
        reject(err);
      }
    });
  });
}

module.exports = {
  request,
  get,
  post,
  put,
  delete: del,
  upload
};
