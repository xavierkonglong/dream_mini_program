// 日志工具
const config = require('../config/env.js');

/**
 * 日志级别
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * 日志工具类
 */
const logger = {
  /**
   * 格式化日志信息
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   * @returns {string} 格式化后的日志
   */
  format(level, message, data) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  },

  /**
   * 输出日志
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  log(level, message, data) {
    if (!config.enableLog) return;
    
    const formatted = this.format(level, message, data);
    
    switch (level) {
      case 'ERROR':
        console.error(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'INFO':
        console.info(formatted);
        break;
      case 'DEBUG':
        console.log(formatted);
        break;
      default:
        console.log(formatted);
    }
  },

  /**
   * 错误日志
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  error(message, data) {
    this.log('ERROR', message, data);
  },

  /**
   * 警告日志
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  warn(message, data) {
    this.log('WARN', message, data);
  },

  /**
   * 信息日志
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  info(message, data) {
    this.log('INFO', message, data);
  },

  /**
   * 调试日志
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   */
  debug(message, data) {
    this.log('DEBUG', message, data);
  },

  /**
   * 性能日志
   * @param {string} name 性能标记名称
   * @param {number} startTime 开始时间
   * @param {number} endTime 结束时间
   */
  performance(name, startTime, endTime) {
    const duration = endTime - startTime;
    this.info(`性能监控: ${name}`, { duration: `${duration}ms` });
  },

  /**
   * 网络请求日志
   * @param {string} method 请求方法
   * @param {string} url 请求地址
   * @param {*} requestData 请求数据
   * @param {*} responseData 响应数据
   * @param {number} duration 请求耗时
   */
  network(method, url, requestData, responseData, duration) {
    this.info('网络请求', {
      method,
      url,
      request: requestData,
      response: responseData,
      duration: `${duration}ms`
    });
  }
};

module.exports = logger;
