// 登录弹窗组件
const authService = require('../../services/auth.js');
const logger = require('../../utils/logger.js');
const { IMAGE_URLS } = require('../../constants/index.js');
const { t, getLang } = require('../../utils/i18n.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    subtitle: {
      type: String,
      value: ''
    }
  },

  /**
   * 数据监听器
   */
  observers: {
    'show': function(show) {
      if (show) {
        // 当弹窗显示时，立即同步语言状态
        const currentLang = getLang();
        this.setData({
          language: currentLang
        });
        
        // 立即更新按钮文字
        this.updateButtonTexts();
        // 重新初始化i18n
        this.initI18n();
        
        // 延迟再次初始化，确保数据正确加载
        setTimeout(() => {
          this.updateButtonTexts();
          this.initI18n();
        }, 200);
      }
    },
    // 监听语言变化
    'language': function(newLang, oldLang) {
      if (newLang !== oldLang && newLang && oldLang !== undefined) {
        this.updateButtonTexts();
        this.initI18n();
      }
    }
  },


  /**
   * 组件的初始数据
   */
  data: {
    isLogging: false,
    imageUrls: IMAGE_URLS,
    language: 'zh',
    i18n: {},
    // 按钮文字 - 提供默认值
    loginButtonText: '微信授权登录',
    loggingText: '登录中...',
    cancelText: '暂不登录',
    tipsText: '登录后可保存梦境记录、参与社区互动'
  },

  /**
   * 组件生命周期
   */
  attached() {
    // 立即初始化国际化
    this.initI18n();
    // 立即设置按钮文字
    this.updateButtonTexts();
    
    // 监听语言切换事件
    this.onLanguageChanged = (newLanguage) => {
      // 防止重复处理相同的语言
      if (this.data.language === newLanguage) {
        return;
      }
      
      // 更新组件内部语言状态
      this.setData({
        language: newLanguage
      });
      
      // 延迟一点时间确保语言设置已更新
      setTimeout(() => {
        this.updateButtonTexts();
        this.initI18n();
      }, 100);
    };
    
    // 确保事件总线存在
    if (wx.eventBus) {
      wx.eventBus.on('languageChanged', this.onLanguageChanged);
    } else {
      console.warn('事件总线不存在，登录弹窗无法监听语言变化');
    }
    
    // 移除定时检查机制，避免与事件监听冲突
    // this.startLanguageCheck();
  },

  /**
   * 组件显示时重新初始化
   */
  ready() {
    this.initI18n();
    this.updateButtonTexts();
    
    // 确保语言状态同步
    const currentLang = getLang();
    if (this.data.language !== currentLang) {
      this.setData({
        language: currentLang
      });
      this.updateButtonTexts();
    }
  },


  /**
   * 组件卸载时清理事件监听
   */
  detached() {
    wx.eventBus && wx.eventBus.off('languageChanged', this.onLanguageChanged);
    this.stopLanguageCheck();
  },



  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 启动语言检查机制（已禁用，避免无限循环）
     */
    startLanguageCheck() {
      // 已禁用定时检查机制，避免与事件监听冲突
    },

    /**
     * 停止语言检查机制
     */
    stopLanguageCheck() {
      if (this.languageCheckTimer) {
        clearInterval(this.languageCheckTimer);
        this.languageCheckTimer = null;
      }
    },

    /**
     * 更新按钮文字
     */
    updateButtonTexts() {
      try {
        // 优先使用组件内部的语言状态，然后使用存储的语言设置
        const componentLang = this.data.language;
        const storedLang = wx.getStorageSync('language') || 'zh';
        const currentLang = componentLang || storedLang;
        const isChinese = currentLang === 'zh';
        
        // 使用i18n工具获取翻译文本
        const newTexts = {
          loginButtonText: isChinese ? '微信授权登录' : 'WeChat Login',
          loggingText: isChinese ? '登录中...' : 'Logging in...',
          cancelText: isChinese ? '暂不登录' : 'Not now',
          tipsText: isChinese ? '登录后可保存梦境记录、参与社区互动' : 'Login to save dream records and participate in community'
        };
        
        this.setData(newTexts);
        
      } catch (error) {
        console.error('更新按钮文字失败:', error);
        // 如果出错，至少保持中文默认值
        this.setData({
          loginButtonText: '微信授权登录',
          loggingText: '登录中...',
          cancelText: '暂不登录',
          tipsText: '登录后可保存梦境记录、参与社区互动'
        });
      }
    },

    /**
     * 初始化国际化
     */
    initI18n() {
      const lang = getLang();
      
      // 防止重复初始化相同语言
      if (this.data.language === lang && this.data.i18n && this.data.i18n.loginModal) {
        return;
      }
      
      // 更新组件内部语言状态
      this.setData({
        language: lang
      });
      
      // 更新按钮文字
      this.updateButtonTexts();
      
      const i18nData = {
        loginModal: {
          title: t('loginModal.title'),
          subtitle: t('loginModal.subtitle'),
          loginButton: t('loginModal.loginButton'),
          logging: t('loginModal.logging'),
          cancel: t('loginModal.cancel'),
          tips: t('loginModal.tips'),
          loginSuccess: t('loginModal.loginSuccess'),
          loginFailed: t('loginModal.loginFailed')
        }
      };
      
      this.setData({
        i18n: i18nData
      });
    },

    /**
     * 点击遮罩层
     */
    onMaskTap() {
      // 不允许点击遮罩关闭，必须选择登录或取消
      return;
    },

    /**
     * 点击登录按钮
     */
    async onLogin() {
      if (this.data.isLogging) {
        return;
      }

      try {
        this.setData({ isLogging: true });
        
        logger.info('用户点击登录按钮');
        
        // 调用登录服务
        const result = await authService.wechatLogin();
        
        if (result.success) {
          // 登录成功，触发事件
          this.triggerEvent('loginSuccess', {
            userInfo: result.userInfo,
            isFirstLogin: result.isFirstLogin
          });
          
          // 关闭弹窗
          this.triggerEvent('close');
          
          // 显示成功提示
          wx.showToast({
            title: this.data.i18n.loginModal.loginSuccess,
            icon: 'success',
            duration: 1500
          });
        }
        
      } catch (error) {
        logger.error('登录失败', error);
        
        // 显示错误提示
        wx.showToast({
          title: error.message || this.data.i18n.loginModal.loginFailed,
          icon: 'error',
          duration: 2000
        });
        
      } finally {
        this.setData({ isLogging: false });
      }
    },

    /**
     * 点击取消按钮
     */
    onCancel() {
      logger.info('用户取消登录');
      
      // 触发取消事件
      this.triggerEvent('loginCancel');
      
      // 关闭弹窗
      this.triggerEvent('close');
    }
  }
});


