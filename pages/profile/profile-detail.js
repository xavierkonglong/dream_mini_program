// pages/profile/profile-detail.js
const authService = require("../../services/auth.js");
const logger = require("../../utils/logger.js");
const { IMAGE_URLS } = require("../../constants/index.js");
const { t, getLang, setLanguage } = require("../../utils/i18n.js");

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    imageUrls: IMAGE_URLS,
    language: "zh", // 语言设置
    i18n: {}, // 国际化文本
  },

  onLoad(options) {
    logger.info("个人信息详情页面加载");
    this.initI18n();
    this.checkLoginStatus();
  },

  onShow() {
    logger.info("个人信息详情页面显示");

    // 强制更新标题
    this.initI18n();
    const newTitle = t("pageTitle.profileDetail");
    console.log("详情页设置新标题:", newTitle);
    wx.setNavigationBarTitle({
      title: newTitle,
    });

    // 完全禁用onShow中的checkLoginStatus调用
    // 避免在编辑页面操作时触发页面闪烁
    console.log("profile-detail onShow 被调用，但跳过checkLoginStatus");
  },

  onReady() {
    logger.info("个人信息详情页面渲染完成");
  },

  onHide() {
    logger.info("个人信息详情页面隐藏");
  },

  onUnload() {
    logger.info("个人信息详情页面卸载");
  },

  /**
   * 初始化国际化
   */
  initI18n() {
    const lang = getLang();

    this.setData({
      language: lang,
      i18n: {
        profileDetail: {
          dreamExplorer: t("profileDetail.dreamExplorer"),
          joinTime: t("profileDetail.joinTime"),
          editProfile: t("profileDetail.editProfile"),
          helpFeedback: t("profileDetail.helpFeedback"),
          helpContent: t("profileDetail.helpContent"),
          versionInfo: t("profileDetail.versionInfo"),
          versionContent: t("profileDetail.versionContent"),
          logout: t("profileDetail.logout"),
          confirmLogout: t("profileDetail.confirmLogout"),
          confirmLogoutContent: t("profileDetail.confirmLogoutContent"),
          cancel: t("profileDetail.cancel"),
          logoutFailed: t("profileDetail.logoutFailed"),
          pleaseLoginFirst: t("profileDetail.pleaseLoginFirst"),
          gotIt: t("profileDetail.gotIt"),
        },
        app: {
          shareTitle: t("app.shareTitle"),
          timelineTitle: t("app.timelineTitle"),
        },
      },
    });

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: t("pageTitle.profileDetail"),
    });

    // 监听语言切换事件
    wx.eventBus &&
      wx.eventBus.on("languageChanged", () => {
        // 重新设置页面标题
        wx.setNavigationBarTitle({
          title: t("pageTitle.profileDetail"),
        });
      });
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const isLoggedIn = authService.checkLoginStatus();
    const userInfo = authService.getCurrentUser();

    console.log("用户信息:", userInfo);

    // 格式化创建时间
    if (userInfo && userInfo.createTime) {
      userInfo.createTime = this.formatCreateTime(userInfo.createTime);
    }

    this.setData({
      isLoggedIn,
      userInfo: userInfo || {},
    });

    // 如果未登录，返回上一页
    if (!isLoggedIn) {
      wx.showToast({
        title: this.data.i18n.profileDetail.pleaseLoginFirst,
        icon: "error",
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 编辑个人信息
   */
  onEditProfile() {
    logger.info("点击编辑个人信息");
    wx.navigateTo({
      url: "/pages/profile/edit-profile",
    });
  },

  /**
   * 关于我们
   */
  onAboutUs() {
    // 菜单已隐藏，兜底避免误触
    logger.info("关于我们入口已关闭");
  },

  /**
   * 帮助与反馈
   */
  onHelp() {
    logger.info("点击帮助与反馈");
    wx.showModal({
      title: this.data.i18n.profileDetail.helpFeedback,
      content: this.data.i18n.profileDetail.helpContent,
      showCancel: false,
      confirmText: this.data.i18n.profileDetail.gotIt,
    });
  },

  /**
   * 版本信息
   */
  onVersion() {
    logger.info("点击版本信息");
    wx.showModal({
      title: this.data.i18n.profileDetail.versionInfo,
      content: this.data.i18n.profileDetail.versionContent,
      showCancel: false,
      confirmText: this.data.i18n.profileDetail.gotIt,
    });
  },

  /**
   * 退出登录
   */
  onLogout() {
    logger.info("点击退出登录");
    wx.showModal({
      title: this.data.i18n.profileDetail.confirmLogout,
      content: this.data.i18n.profileDetail.confirmLogoutContent,
      confirmText: this.data.i18n.profileDetail.logout,
      cancelText: this.data.i18n.profileDetail.cancel,
      confirmColor: "#ff3b30",
      success: (res) => {
        if (res.confirm) {
          this.performLogout();
        }
      },
    });
  },

  /**
   * 执行退出登录
   */
  performLogout() {
    try {
      logger.info("执行退出登录");
      authService.logout();

      // 返回个人页面
      wx.navigateBack({
        success: () => {
          // 刷新个人页面
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 1];
          if (prevPage && prevPage.checkLoginStatus) {
            prevPage.checkLoginStatus();
          }
        },
      });
    } catch (error) {
      logger.error("退出登录失败:", error);
      wx.showToast({
        title: this.data.i18n.profileDetail.logoutFailed,
        icon: "error",
      });
    }
  },

  /**
   * 格式化创建时间
   */
  formatCreateTime(timeStr) {
    if (!timeStr) return "";

    try {
      console.log("原始时间字符串:", timeStr);

      // 处理ISO格式时间（包含T）
      let date;
      if (timeStr.includes("T")) {
        // ISO格式：2025-09-30T10:25:03
        // 直接使用new Date()解析ISO格式
        date = new Date(timeStr);
      } else {
        // 其他格式
        date = new Date(timeStr.replace(/-/g, "/"));
      }

      if (isNaN(date.getTime())) {
        console.error("时间解析失败:", timeStr);
        return timeStr;
      }

      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const formattedTime = `${year}年${month}月`;
      console.log("格式化后的时间:", formattedTime);

      return formattedTime;
    } catch (error) {
      console.error("时间格式化失败:", error);
      return timeStr;
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: t("app.shareTitle"),
      path: "/pages/index/index",
      imageUrl: "", // 可以设置分享图片
    };
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: t("app.timelineTitle"),
      imageUrl: "", // 可以设置分享图片
    };
  },
});
