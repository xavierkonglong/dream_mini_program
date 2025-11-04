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
      // 处理ISO格式时间（包含T）
      let date;
      if (timeStr.includes("T")) {
        // ISO格式：2025-09-30T10:25:03
        date = new Date(timeStr);
      } else {
        // 其他常见格式：2025-11-04 04:55:46
        const isoTimeStr = timeStr.replace(" ", "T") + "+08:00";
        date = new Date(isoTimeStr);
        if (isNaN(date.getTime())) {
          date = new Date(timeStr.replace(/-/g, "/"));
        }
      }

      if (isNaN(date.getTime())) {
        return timeStr;
      }

      const lang = getLang();
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (lang === "en") {
        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        return `${months[month - 1]} ${year}`;
      }

      return `${year}年${month}月`;
    } catch (error) {
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
