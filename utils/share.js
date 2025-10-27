/**
 * 分享工具类
 * 提供统一的分享功能
 */

const { t } = require('./i18n.js');

/**
 * 分享工具类
 */
class ShareUtils {
  /**
   * 获取默认分享配置
   * @param {string} pageType 页面类型
   * @param {Object} customData 自定义数据
   * @returns {Object} 分享配置
   */
  static getDefaultShareConfig(pageType = 'default', customData = {}) {
    const baseConfig = {
      title: t('app.shareTitle') || '光爱梦伴小程序',
      imageUrl: '', // 可以设置默认分享图片
      path: '/pages/index/index'
    };

    // 根据页面类型设置不同的分享内容
    const pageConfigs = {
      'index': {
        title: t('app.shareTitle') || '光爱梦伴小程序',
        path: '/pages/index/index'
      },
      'community': {
        title: t('app.shareTitle') || '光爱梦伴小程序',
        path: '/pages/community/community'
      },
      'profile': {
        title: t('app.shareTitle') || '光爱梦伴小程序',
        path: '/pages/profile/profile'
      },
      'result': {
        title: t('app.shareTitle') || '光爱梦伴小程序',
        path: '/pages/result/result'
      },
      'diary': {
        title: t('app.shareTitle') || '光爱梦伴小程序',
        path: '/pages/diary/diary'
      }
    };

    const config = pageConfigs[pageType] || baseConfig;
    
    // 合并自定义数据
    return {
      ...config,
      ...customData
    };
  }

  /**
   * 获取朋友圈分享配置
   * @param {string} pageType 页面类型
   * @param {Object} customData 自定义数据
   * @returns {Object} 朋友圈分享配置
   */
  static getTimelineShareConfig(pageType = 'default', customData = {}) {
    const baseConfig = {
      title: t('app.timelineTitle') || '光爱梦伴小程序 - 探索你的梦境世界',
      imageUrl: '' // 可以设置默认分享图片
    };

    // 根据页面类型设置不同的分享内容
    const pageConfigs = {
      'index': {
        title: t('app.timelineTitle') || '光爱梦伴小程序 - 探索你的梦境世界'
      },
      'community': {
        title: t('app.timelineTitle') || '光爱梦伴小程序 - 探索你的梦境世界'
      },
      'profile': {
        title: t('app.timelineTitle') || '光爱梦伴小程序 - 探索你的梦境世界'
      },
      'result': {
        title: t('app.timelineTitle') || '光爱梦伴小程序 - 探索你的梦境世界'
      },
      'diary': {
        title: t('app.timelineTitle') || '光爱梦伴小程序 - 探索你的梦境世界'
      }
    };

    const config = pageConfigs[pageType] || baseConfig;
    
    // 合并自定义数据
    return {
      ...config,
      ...customData
    };
  }

  /**
   * 生成分享图片
   * @param {Object} options 生成选项
   * @returns {Promise<string>} 图片路径
   */
  static async generateShareImage(options = {}) {
    const {
      title = '梦境解析小程序',
      subtitle = '探索你的梦境世界',
      qrCode = '',
      background = '#8B5CF6'
    } = options;

    try {
      // 这里可以使用 canvas 生成分享图片
      // 或者使用第三方图片生成服务
      return '';
    } catch (error) {
      console.error('生成分享图片失败:', error);
      return '';
    }
  }

  /**
   * 检查是否支持分享到朋友圈
   * @returns {boolean} 是否支持
   */
  static checkTimelineSupport() {
    // 检查基础库版本
    const systemInfo = wx.getSystemInfoSync();
    const SDKVersion = systemInfo.SDKVersion;
    
    // 基础库 2.11.3 开始支持分享到朋友圈
    const minVersion = '2.11.3';
    
    return this.compareVersion(SDKVersion, minVersion) >= 0;
  }

  /**
   * 比较版本号
   * @param {string} v1 版本1
   * @param {string} v2 版本2
   * @returns {number} 比较结果
   */
  static compareVersion(v1, v2) {
    const arr1 = v1.split('.').map(Number);
    const arr2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(arr1.length, arr2.length); i++) {
      const num1 = arr1[i] || 0;
      const num2 = arr2[i] || 0;
      
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    
    return 0;
  }


}

module.exports = ShareUtils;
