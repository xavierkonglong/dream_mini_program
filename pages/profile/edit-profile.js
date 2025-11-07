// pages/profile/edit-profile.js
const authService = require("../../services/auth.js");
const http = require("../../services/http.js");
const { IMAGE_URLS } = require("../../constants/index.js");
const { t, getLang } = require("../../utils/i18n.js");

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      nickName: "",
      phone: "",
      avatarUrl: "",
    },
    originalUserInfo: {
      nickName: "",
      phone: "",
      avatarUrl: "",
    },
    updating: false,
    imageUrls: IMAGE_URLS,
    uploading: false,
    pageReady: false,
    isPageActive: true,
    language: "zh",
    i18n: {},
  },

  /**
   * 初始化国际化
   */
  initI18n() {
    const lang = getLang();

    this.setData({
      language: lang,
      i18n: {
        editProfile: {
          title: t("editProfile.title"),
          nickname: t("editProfile.nickname"),
          nicknamePlaceholder: t("editProfile.nicknamePlaceholder"),
          phone: t("editProfile.phone"),
          phonePlaceholder: t("editProfile.phonePlaceholder"),
          save: t("editProfile.save"),
          saving: t("editProfile.saving"),
          cancel: t("editProfile.cancel"),
          saveSuccess: t("editProfile.saveSuccess"),
          saveError: t("editProfile.saveError"),
          nicknameRequired: t("editProfile.nicknameRequired"),
          phoneRequired: t("editProfile.phoneRequired"),
          phoneInvalid: t("editProfile.phoneInvalid"),
          uploading: t("editProfile.uploading"),
          clickToChange: t("editProfile.clickToChange"),
        },
        app: {
          shareTitle: t("app.shareTitle"),
          timelineTitle: t("app.timelineTitle"),
        },
      },
    });

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: t("pageTitle.editProfile"),
    });

    // 监听语言切换事件
    wx.eventBus &&
      wx.eventBus.on("languageChanged", () => {
        // 重新设置页面标题
        wx.setNavigationBarTitle({
          title: t("pageTitle.editProfile"),
        });
      });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    console.log("个人信息编辑页面加载");
    this.initI18n();
    await this.loadUserInfo();
    this.setData({ pageReady: true });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    console.log("个人信息编辑页面渲染完成");
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    console.log("个人信息编辑页面显示，页面状态:", this.data.pageReady);

    // 强制更新标题
    this.initI18n();
    const newTitle = t("pageTitle.editProfile");
    console.log("编辑页设置新标题:", newTitle);
    wx.setNavigationBarTitle({
      title: newTitle,
    });

    this.setData({ isPageActive: true });
    // 只有在页面准备就绪时才处理显示逻辑
    if (this.data.pageReady) {
      console.log("页面已准备就绪，无需重新加载");
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    console.log("个人信息编辑页面隐藏");
    this.setData({ isPageActive: false });
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    console.log("个人信息编辑页面卸载");
  },

  /**
   * 用户点击右上角分享
   */
  async onShareAppMessage() {
    // 如果用户已登录，调用分享接口记录积分（微信转发，每天仅首次分享有效）
    const authService = require("../../services/auth.js");
    if (authService.checkLoginStatus()) {
      try {
        const http = require("../../services/http.js");
        await http.post("/dream/share", {}, {
          showLoading: false // 分享时不显示loading，避免影响用户体验
        });
      } catch (error) {
        // 分享接口调用失败不影响分享功能，只记录错误
        console.error("分享积分记录失败:", error);
      }
    }
    
    return {
      title: t("app.shareTitle"),
      path: "/pages/index/index",
    };
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  async onShareTimeline() {
    // 如果用户已登录，调用分享接口记录积分（微信转发，每天仅首次分享有效）
    const authService = require("../../services/auth.js");
    if (authService.checkLoginStatus()) {
      try {
        const http = require("../../services/http.js");
        await http.post("/dream/share", {}, {
          showLoading: false // 分享时不显示loading，避免影响用户体验
        });
      } catch (error) {
        // 分享接口调用失败不影响分享功能，只记录错误
        console.error("分享积分记录失败:", error);
      }
    }
    
    return {
      title: t("app.timelineTitle"),
      imageUrl: "", // 可以设置分享图片
    };
  },

  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    try {
      console.log("开始加载用户信息...");

      // 调用 /user/me API 获取最新用户信息
      const response = await http.get("/user/me");

      console.log("用户信息API响应:", response);

      if (response && response.code === 0 && response.data) {
        const userData = response.data;
        const formData = {
          // 后端字段为下划线命名
          nickName: userData.user_name || "",
          phone: userData.user_phone || "",
          avatarUrl: userData.user_avatar || "",
        };

        this.setData({
          userInfo: formData,
          originalUserInfo: { ...formData },
        });

        console.log("加载用户信息成功:", formData);
      } else {
        throw new Error(response?.message || "获取用户信息失败");
      }
    } catch (error) {
      console.error("加载用户信息失败:", error);

      // 如果API调用失败，回退到本地存储的用户信息
      const userInfo = authService.getCurrentUser() || {};
      const userData = {
        nickName: userInfo.userName || "",
        phone: userInfo.userPhone || "",
        avatarUrl: userInfo.userAvatar || "",
      };

      this.setData({
        userInfo: userData,
        originalUserInfo: { ...userData },
      });

      console.log("使用本地用户信息:", userData);

      // 显示错误提示
      wx.showToast({
        title: this.data.i18n.editProfile.getUserInfoFailed,
        icon: "none",
        duration: 2000,
      });
    }
  },

  /**
   * 昵称输入
   */
  onNickNameInput(e) {
    const value = (e && e.detail && typeof e.detail.value !== "undefined")
      ? String(e.detail.value)
      : "";
    this.setData({
      "userInfo.nickName": value,
    });
  },

  /**
   * 手机号输入
   */
  onPhoneInput(e) {
    const value = (e && e.detail && typeof e.detail.value !== "undefined")
      ? String(e.detail.value)
      : "";
    console.log("手机号输入:", value);
    // 阻止事件冒泡，防止触发其他页面的事件
    e.stopPropagation && e.stopPropagation();
    this.setData({
      "userInfo.phone": value,
    });
  },

  /**
   * 更新个人信息
   */
  async onUpdateProfile() {
    if (this.data.updating) return;

    const { nickName, phone } = this.data.userInfo;
    const { originalUserInfo } = this.data;

    // 检查是否有变化
    const hasChanges =
      nickName !== originalUserInfo.nickName ||
      phone !== originalUserInfo.phone;

    if (!hasChanges) {
      wx.showToast({
        title: this.data.i18n.editProfile.noChanges || "信息未发生变化",
        icon: "none",
      });
      return;
    }

    // 验证昵称
    if (!nickName.trim()) {
      wx.showToast({
        title: this.data.i18n.editProfile.nicknameRequired,
        icon: "none",
      });
      return;
    }

    // 验证手机号
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: this.data.i18n.editProfile.phoneInvalid,
        icon: "none",
      });
      return;
    }

    this.setData({ updating: true });

    try {
      const response = await http.post("/user/update", {
        userName: nickName,
        userPhone: phone,
      });

      if (response && response.code === 0) {
        // 更新本地存储的用户信息
        const currentUser = authService.getCurrentUser() || {};
        const updatedUser = {
          ...currentUser,
          userName: nickName,
          userPhone: phone,
        };

        authService.setCurrentUser(updatedUser);

        // 立即同步更新上一页（个人信息页）的显示名称，避免返回后短暂不刷新
        const pages = getCurrentPages();
        const prevPage = pages && pages.length > 1 ? pages[pages.length - 2] : null;
        if (prevPage && prevPage.setData) {
          // 通用处理：如果上一页有 userInfo，就直接更新 userName
          try {
            prevPage.setData({
              "userInfo.userName": nickName,
            });
          } catch (e) {
            // 忽略非致命错误
          }
        }

        wx.showToast({
          title: this.data.i18n.editProfile.saveSuccess,
          icon: "success",
        });

        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(response?.message || "更新失败");
      }
    } catch (error) {
      console.error("更新用户信息失败:", error);

      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.editProfile.loginExpired,
          content: this.data.i18n.editProfile.loginExpiredContent,
          showCancel: false,
          success: () => {
            authService.logout();
            wx.reLaunch({
              url: "/pages/index/index",
            });
          },
        });
        return;
      }

      wx.showToast({
        title: error.message || this.data.i18n.editProfile.saveError,
        icon: "error",
      });
    } finally {
      this.setData({ updating: false });
    }
  },

  /**
   * 头像点击事件
   */
  onAvatarTap() {
    if (this.data.uploading) return;

    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      camera: "back",
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadAvatar(tempFilePath);
      },
      fail: (error) => {
        console.error("选择图片失败/已取消:", error);
        // 用户主动取消选择时不提示错误
        if (error && error.errMsg && error.errMsg.indexOf("cancel") !== -1) {
          return;
        }
        wx.showToast({
          title: this.data.i18n.editProfile.selectImageFailed,
          icon: "error",
        });
      },
    });
  },

  /**
   * 上传头像
   */
  async uploadAvatar(filePath) {
    this.setData({ uploading: true });

    try {
      console.log("开始上传头像:", filePath);

      const response = await http.upload("/user/avatar", filePath, "file");

      console.log("上传头像响应:", response);

      if (response && response.code === 0) {
        const avatarUrl = response.data;

        // 更新本地用户信息
        const currentUser = authService.getCurrentUser() || {};
        const updatedUser = {
          ...currentUser,
          userAvatar: avatarUrl, // 修复：使用 userAvatar 字段
        };

        authService.setCurrentUser(updatedUser);

        // 更新页面数据
        this.setData({
          "userInfo.avatarUrl": avatarUrl,
        });

        wx.showToast({
          title: this.data.i18n.editProfile.uploadSuccess,
          icon: "success",
        });
      } else {
        throw new Error(response?.message || "头像上传失败");
      }
    } catch (error) {
      console.error("上传头像失败:", error);

      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.editProfile.loginExpired,
          content: this.data.i18n.editProfile.loginExpiredContent,
          showCancel: false,
          success: () => {
            authService.logout();
            wx.reLaunch({
              url: "/pages/index/index",
            });
          },
        });
        return;
      }

      wx.showToast({
        title: error.message || "头像上传失败，请重试",
        icon: "error",
      });
    } finally {
      this.setData({ uploading: false });
    }
  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 阻止页面跳转
   */
  preventNavigation() {
    console.log("阻止页面跳转");
    return false;
  },
});
