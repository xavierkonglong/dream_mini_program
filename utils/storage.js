// 本地存储工具
const logger = require('./logger.js');

/**
 * 存储工具类
 */
const storage = {
  /**
   * 获取存储数据
   * @param {string} key 存储键
   * @param {*} defaultValue 默认值
   * @returns {*} 存储的值或默认值
   */
  get(key, defaultValue = null) {
    try {
      const value = wx.getStorageSync(key);
      return value !== '' ? value : defaultValue;
    } catch (error) {
      logger.error('获取存储数据失败:', { key, error });
      return defaultValue;
    }
  },

  /**
   * 设置存储数据
   * @param {string} key 存储键
   * @param {*} value 存储值
   * @returns {boolean} 是否成功
   */
  set(key, value) {
    try {
      wx.setStorageSync(key, value);
      logger.info('存储数据成功:', { key });
      return true;
    } catch (error) {
      logger.error('存储数据失败:', { key, value, error });
      return false;
    }
  },

  /**
   * 删除存储数据
   * @param {string} key 存储键
   * @returns {boolean} 是否成功
   */
  remove(key) {
    try {
      wx.removeStorageSync(key);
      logger.info('删除存储数据成功:', { key });
      return true;
    } catch (error) {
      logger.error('删除存储数据失败:', { key, error });
      return false;
    }
  },

  /**
   * 清空所有存储数据
   * @returns {boolean} 是否成功
   */
  clear() {
    try {
      wx.clearStorageSync();
      logger.info('清空所有存储数据成功');
      return true;
    } catch (error) {
      logger.error('清空存储数据失败:', error);
      return false;
    }
  },

  /**
   * 获取存储信息
   * @returns {Object} 存储信息
   */
  getInfo() {
    try {
      return wx.getStorageInfoSync();
    } catch (error) {
      logger.error('获取存储信息失败:', error);
      return null;
    }
  },

  /**
   * 检查存储空间
   * @returns {boolean} 是否有足够空间
   */
  checkSpace() {
    const info = this.getInfo();
    if (info) {
      const used = info.currentSize;
      const total = info.limitSize;
      const available = total - used;
      logger.info('存储空间信息:', { used, total, available });
      return available > 1024; // 至少1KB可用空间
    }
    return true;
  },

  /**
   * 批量设置存储数据
   * @param {Object} data 要存储的数据对象
   * @returns {boolean} 是否全部成功
   */
  setMultiple(data) {
    let success = true;
    for (const [key, value] of Object.entries(data)) {
      if (!this.set(key, value)) {
        success = false;
      }
    }
    return success;
  },

  /**
   * 批量获取存储数据
   * @param {Array<string>} keys 要获取的键数组
   * @returns {Object} 存储数据对象
   */
  getMultiple(keys) {
    const result = {};
    keys.forEach(key => {
      result[key] = this.get(key);
    });
    return result;
  }
};

module.exports = storage;
