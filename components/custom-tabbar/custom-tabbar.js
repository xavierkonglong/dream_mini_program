// components/custom-tabbar/custom-tabbar.js
const { t, getLang } = require('../../utils/i18n.js');

Component({
  data: {
    selected: 0,
    language: 'zh',
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
      
      // 执行跳转 - 确保路径以 / 开头
      const targetPath = path.startsWith('/') ? path : '/' + path;
      
      wx.switchTab({
        url: targetPath,
        success: () => {
          // 跳转成功后立即更新状态
          this.setData({
            selected: index
          });
          // 重新初始化i18n以确保语言同步
          this.initI18n();
        },
        fail: (error) => {
          console.error('跳转失败:', error);
        }
      });
    }
  }
});
