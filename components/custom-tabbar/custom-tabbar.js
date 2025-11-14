// components/custom-tabbar/custom-tabbar.js
const { t, getLang } = require('../../utils/i18n.js');

Component({
  data: {
    selected: 0,
    language: 'zh',
    switching: false, // 是否正在切换中
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        icon: 'wap-home-o',
        selectedIcon: 'wap-home'
      },
      {
        pagePath: 'pages/community/community',
        text: '社区',
        icon: 'chat-o',
        selectedIcon: 'chat'
      },
      {
        pagePath: 'pages/profile/profile',
        text: '我的',
        icon: 'contact',
        selectedIcon: 'contact'
      }
    ]
  },

  attached() {
    this.initI18n();
    this.updateSelected();
    // 监听页面切换事件
    const self = this;
    this.onPageShow = function() {
      // 检查语言是否变化并重新初始化
      const currentLang = getLang();
      if (self.data.language !== currentLang) {
        self.initI18n();
      }
      setTimeout(() => {
        self.updateSelected();
      }, 100);
    };
    
    // 监听语言变化事件
    this.onLanguageChanged = function(newLanguage) {
      console.log('导航栏收到语言变化事件:', newLanguage);
      self.initI18n();
    };
    
    // 安全地添加事件监听器
    if (wx.eventBus) {
      wx.eventBus.on('pageShow', this.onPageShow);
      wx.eventBus.on('languageChanged', this.onLanguageChanged);
    }
  },

  detached() {
    // 安全地移除事件监听
    if (wx.eventBus) {
      if (typeof this.onPageShow === 'function') {
        wx.eventBus.off('pageShow', this.onPageShow);
      }
      if (typeof this.onLanguageChanged === 'function') {
        wx.eventBus.off('languageChanged', this.onLanguageChanged);
      }
    }
  },

  ready() {
    // 检查语言是否变化并重新初始化
    const currentLang = getLang();
    if (this.data.language !== currentLang) {
      this.initI18n();
    }
    this.updateSelected();
  },

  pageLifetimes: {
    show() {
      // 检查语言是否变化并重新初始化
      const currentLang = getLang();
      if (this.data.language !== currentLang) {
        this.initI18n();
      }
      // 延迟更新，确保页面完全加载
      const self = this;
      setTimeout(() => {
        self.updateSelected();
      }, 50);
    }
  },

  methods: {
    initI18n() {
      const lang = getLang();
      const list = [
        {
          pagePath: 'pages/index/index',
          text: t('tabbar.home'),
          icon: 'wap-home-o',
          selectedIcon: 'wap-home'
        },
        {
          pagePath: 'pages/community/community',
          text: t('tabbar.community'),
          icon: 'chat-o',
          selectedIcon: 'chat'
        },
        {
          pagePath: 'pages/profile/profile',
          text: t('tabbar.profile'),
          icon: 'contact',
          selectedIcon: 'contact'
        }
      ];
      
      this.setData({
        language: lang,
        list: list
      });
    },
    
    updateSelected() {
      // 获取当前页面路径，设置对应的选中状态
      const pages = getCurrentPages();
      if (pages.length === 0) return;
      
      const currentPage = pages[pages.length - 1];
      const currentPath = currentPage.route;
      
      const selectedIndex = this.data.list.findIndex(item => item.pagePath === currentPath);
      
      if (selectedIndex !== -1) {
        this.setData({
          selected: selectedIndex
        });
      }
    },
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset;
      
      // 防抖处理：如果正在切换中，直接返回
      if (this.data.switching) {
        return;
      }
      
      // 检查是否已经在目标页面
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        const currentPath = currentPage.route;
        if (currentPath === path) {
          // 已经在目标页面，不需要跳转
          return;
        }
      }
      
      // 执行跳转 - 确保路径以 / 开头
      const targetPath = path.startsWith('/') ? path : '/' + path;
      
      // 设置切换状态
      this.setData({
        switching: true
      });
      
      wx.switchTab({
        url: targetPath,
        success: () => {
          // 跳转成功后立即更新状态
          this.setData({
            selected: index,
            switching: false
          });
          // 重新初始化i18n以确保语言同步
          this.initI18n();
        },
        fail: (error) => {
          console.error('跳转失败:', error);
          // 跳转失败时重置状态
          this.setData({
            switching: false
          });
          
          // 如果是超时错误，提示用户
          if (error.errMsg && error.errMsg.includes('timeout')) {
            console.warn('switchTab 超时，可能是页面加载过慢或网络问题');
            // 不显示错误提示，避免打扰用户，静默处理
            // 用户可以通过再次点击来重试
          }
        }
      });
      
      // 设置超时保护，3秒后自动重置状态
      setTimeout(() => {
        if (this.data.switching) {
          this.setData({
            switching: false
          });
        }
      }, 3000);
    }
  }
});
