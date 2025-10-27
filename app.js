// 小程序入口文件
const authService = require('./services/auth.js');
const { t } = require('./utils/i18n.js');

App({
  globalData: {
    userInfo: null,
    token: null,
    isLoggedIn: false,
    baseURL: '',
    // 页面刷新标志
    needRefreshCommunity: false,
    // 梦境解析状态
    dreamAnalysis: {
      isAnalyzing: false,
      dreamDescription: '',
      isPublic: 0,
      startTime: null,
      progress: 0
    }
  },
  
  onLaunch() {
    console.log('梦境解析小程序启动');
    
    // 初始化事件总线
    this.initEventBus();
    
    // 初始化配置
    this.initConfig();
    // 检查登录状态
    this.checkLoginStatus();
  },

  // 初始化事件总线
  initEventBus() {
    // 简单的事件总线实现
    wx.eventBus = {
      events: {},
      on(event, callback) {
        if (!this.events[event]) {
          this.events[event] = [];
        }
        this.events[event].push(callback);
      },
      off(event, callback) {
        if (this.events[event]) {
          this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
      },
      emit(event, data) {
        if (this.events[event]) {
          this.events[event].forEach(callback => {
            if (typeof callback === 'function') {
              callback(data);
            }
          });
        }
      }
    };
  },
  
  onShow() {
    console.log('小程序显示');
    // 检查解析状态
    this.checkGlobalAnalysisStatus();
  },
  
  onHide() {
    console.log('小程序隐藏');
  },
  
  onError(error) {
    console.error('小程序发生错误:', error);
  },
  
  // 初始化配置
  initConfig() {
    const config = require('./config/env.js');
    this.globalData.baseURL = config.baseURL;
  },
  
  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = authService.checkLoginStatus();
    const userInfo = authService.getCurrentUser();
    const token = authService.getCurrentToken();
    
    this.globalData.isLoggedIn = isLoggedIn;
    this.globalData.userInfo = userInfo;
    this.globalData.token = token;
    
  },
  
  // 设置用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
  },
  
  // 设置token
  setToken(token) {
    this.globalData.token = token;
    const storage = require('./utils/storage.js');
    storage.set('token', token);
  },
  
  // 清除登录信息
  clearLoginInfo() {
    this.globalData.userInfo = null;
    this.globalData.token = null;
    this.globalData.isLoggedIn = false;
    const storage = require('./utils/storage.js');
    storage.remove('token');
    storage.remove('userInfo');
  },

  // 设置梦境解析状态
  setDreamAnalysisState(state) {
    this.globalData.dreamAnalysis = {
      ...this.globalData.dreamAnalysis,
      ...state
    };
  },

  // 清除梦境解析状态
  clearDreamAnalysisState() {
    this.globalData.dreamAnalysis = {
      isAnalyzing: false,
      dreamDescription: '',
      isPublic: 0,
      startTime: null,
      progress: 0
    };
  },

  // 通知解析完成
  notifyAnalysisComplete(result) {
    // 显示全局通知
    wx.showToast({
      title: t('app.dreamAnalysisComplete'),
      icon: 'success',
      duration: 2000
    });
    
    // 触发全局事件
    wx.eventBus && wx.eventBus.emit('dreamAnalysisComplete', result);
  },

  // 全局检查解析状态
  checkGlobalAnalysisStatus() {
    const { dreamAnalysis } = this.globalData;
    
    if (dreamAnalysis.isAnalyzing) {
      // 计算进度
      const elapsed = Date.now() - dreamAnalysis.startTime;
      const progress = Math.min(elapsed / 120000, 1); // 2分钟完成
      
      if (progress >= 1) {
        // 解析完成，显示通知
        this.showAnalysisCompleteNotification();
        // 清除解析状态
        this.clearDreamAnalysisState();
      }
    }
  },

  // 显示解析完成通知
  showAnalysisCompleteNotification() {
    wx.showModal({
      title: t('app.analysisComplete'),
      content: t('app.analysisCompleteContent'),
      confirmText: t('app.viewResult'),
      cancelText: t('app.viewLater'),
      success: (res) => {
        if (res.confirm) {
          // 跳转到首页让用户查看结果
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

});
