// pages/profile/profile.js
const authService = require("../../services/auth.js");
const userService = require("../../services/user.js");
const http = require("../../services/http.js");
const logger = require("../../utils/logger.js");
const { IMAGE_URLS } = require("../../constants/index.js");
const { t, getLang, setLanguage } = require("../../utils/i18n.js");

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLoggedIn: false,
    userInfo: null,
    activeTab: "diary",
    dreamDiaryList: [],
    collectionList: [],
    likesList: [],
    showLoginModal: false,
    showProfileSetupModal: false,
    imageUrls: IMAGE_URLS,
    language: "zh", // 语言设置
    i18n: {}, // 国际化文本
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log("我的页面加载");
    this.initI18n();
    this.checkLoginStatus();

    // 监听全局401事件
    this.listenToUnauthorized();

    // 监听语言变化事件
    this.onLanguageChanged = (newLanguage) => {
      console.log("我的页面收到语言变化事件:", newLanguage);
      this.initI18n();
    };
    wx.eventBus && wx.eventBus.on("languageChanged", this.onLanguageChanged);
  },

  /**
   * 初始化国际化
   */
  initI18n() {
    const lang = getLang();

    this.setData({
      language: lang,
      i18n: {
        profile: {
          dreamExplorer: t("profile.dreamExplorer"),
          joinTime: t("profile.joinTime"),
          loginTips: t("profile.loginTips"),
          loginNow: t("profile.loginNow"),
          myDreamDiary: t("profile.myDreamDiary"),
          myCollections: t("profile.myCollections"),
          myLikes: t("profile.myLikes"),
          needLogin: t("profile.needLogin"),
          loginToViewDiary: t("profile.loginToViewDiary"),
          loginToViewCollections: t("profile.loginToViewCollections"),
          loginToViewLikes: t("profile.loginToViewLikes"),
          noDreamDiary: t("profile.noDreamDiary"),
          noDreamDiaryDesc: t("profile.noDreamDiaryDesc"),
          goToDiary: t("profile.goToDiary"),
          noCollections: t("profile.noCollections"),
          noCollectionsDesc: t("profile.noCollectionsDesc"),
          goToCommunity: t("profile.goToCommunity"),
          noLikes: t("profile.noLikes"),
          noLikesDesc: t("profile.noLikesDesc"),
          welcomeTitle: t("profile.welcomeTitle"),
          welcomeSubtitle: t("profile.welcomeSubtitle"),
        },
        app: {
          shareTitle: t("app.shareTitle"),
          timelineTitle: t("app.timelineTitle"),
        },
      },
    });

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: t("pageTitle.profile"),
    });

    // 监听语言切换事件
    wx.eventBus &&
      wx.eventBus.on("languageChanged", () => {
        // 重新设置页面标题
        wx.setNavigationBarTitle({
          title: t("pageTitle.profile"),
        });
      });
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 移除语言变化事件监听
    wx.eventBus && wx.eventBus.off("languageChanged", this.onLanguageChanged);
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    console.log("我的页面渲染完成");
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 强制更新标题
    this.initI18n();
    const newTitle = t("pageTitle.profile");
    console.log("个人页设置新标题:", newTitle);
    wx.setNavigationBarTitle({
      title: newTitle,
    });

    this.checkLoginStatus();
    // 通知tabBar更新状态
    wx.eventBus && wx.eventBus.emit("pageShow");

    // 确保401事件监听器已注册
    this.listenToUnauthorized();

    if (this.data.isLoggedIn) {
      // 只有在当前标签页是diary且没有数据时才重新加载
      if (
        this.data.activeTab === "diary" &&
        this.data.dreamDiaryList.length === 0
      ) {
        this.loadCurrentTabData();
      } else if (this.data.activeTab !== "diary") {
        this.loadCurrentTabData();
      }
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    console.log("我的页面隐藏");
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    console.log("我的页面卸载");
    // 移除事件监听
    wx.eventBus && wx.eventBus.off("unauthorized", this.handleUnauthorized);
  },

  /**
   * 监听全局401未授权事件
   */
  listenToUnauthorized() {
    // 先移除之前的监听器，避免重复注册
    wx.eventBus && wx.eventBus.off("unauthorized", this.handleUnauthorized);

    // 注册新的监听器
    wx.eventBus && wx.eventBus.on("unauthorized", this.handleUnauthorized);
  },

  /**
   * 处理401未授权事件
   */
  handleUnauthorized(data) {
    console.log("收到401未授权事件，显示登录弹窗");
    this.setData({
      showLoginModal: true,
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: t("app.shareTitle"),
      path: "/pages/index/index",
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

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const isLoggedIn = authService.checkLoginStatus();
    const userInfo = authService.getCurrentUser();

    // 格式化创建时间
    if (userInfo && userInfo.createTime) {
      userInfo.createTime = this.formatCreateTime(userInfo.createTime);
    }

    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: userInfo,
    });

    console.log("登录状态检查:", { isLoggedIn, userInfo });
  },

  /**
   * 显示登录弹窗
   */
  onLogin() {
    this.setData({
      showLoginModal: true,
    });
  },

  /**
   * 登录成功回调
   */
  onLoginSuccess(e) {
    console.log("登录成功", e.detail);

    // 检查是否是首次登录
    if (e.detail.isFirstLogin) {
      console.log("首次登录，显示个人信息设置弹窗");
      this.setData({
        showProfileSetupModal: true,
        showLoginModal: false,
      });
    } else {
      // 非首次登录，正常处理
      this.handleLoginSuccess();
    }
  },

  /**
   * 处理登录成功
   */
  handleLoginSuccess() {
    // 更新页面状态
    this.checkLoginStatus();

    // 加载用户数据
    this.loadCurrentTabData();

    // 关闭弹窗
    this.setData({
      showLoginModal: false,
    });
  },

  /**
   * 个人信息设置完成回调
   */
  onProfileSetupComplete(e) {
    console.log("个人信息设置完成", e.detail);
    // 设置完成后正常处理登录成功
    this.handleLoginSuccess();
  },

  /**
   * 关闭个人信息设置弹窗
   */
  onCloseProfileSetupModal() {
    this.setData({
      showProfileSetupModal: false,
    });
  },

  /**
   * 登录取消回调
   */
  onLoginCancel() {
    console.log("用户取消登录");
    this.setData({
      showLoginModal: false,
    });
  },

  /**
   * 关闭登录弹窗
   */
  onCloseLoginModal() {
    this.setData({
      showLoginModal: false,
    });
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: this.data.i18n.profile.confirmLogout,
      content: this.data.i18n.profile.confirmLogoutContent,
      success: (res) => {
        if (res.confirm) {
          authService.logout();
          this.checkLoginStatus();
          this.setData({
            dreamDiaryList: [],
            collectionList: [],
            likesList: [],
          });
        }
      },
    });
  },

  /**
   * 标签切换
   */
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    console.log("切换标签:", tab);

    this.setData({
      activeTab: tab,
    });

    // 切换标签时总是重新加载数据
    this.loadCurrentTabData();
  },

  /**
   * 加载当前标签页数据
   */
  loadCurrentTabData() {
    switch (this.data.activeTab) {
      case "diary":
        this.loadDreamDiary();
        break;
      case "collection":
        this.loadCollection();
        break;
      case "likes":
        this.loadLikes();
        break;
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    console.log("下拉刷新我的梦境日记");
    if (this.data.activeTab === "diary") {
      this.loadDreamDiary().then(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  /**
   * 加载梦境日记
   */
  async loadDreamDiary() {
    try {
      console.log("开始加载我的梦境日记");

      const response = await http.get(
        "/dream/posts/diary/my",
        {
          pageNum: 0,
          pageSize: 20,
        },
        {
          showLoading: false,
        }
      );

      if (response && response.data && response.data.records) {
        const records = response.data.records;
        console.log("收到梦境日记记录数:", records.length);

        // 处理数据，按时间降序排列
        const dreamDiaryList = records.map((item, index) => {
          const createTime = this.formatTime(item.createdAt);

          return {
            id: item.postId,
            postId: item.postId,
            title: this.truncateText(item.dreamDescription, 30),
            fullDescription: item.dreamDescription,
            date: createTime,
            time: createTime,
            description: this.truncateText(item.dreamDescription, 50),
            imageUrl: item.imageUrl || "",
            videoUrl: item.videoUrl || "",
            videoPrompt: item.videoPrompt || "",
            likeCount: item.likeCount || 0,
            favoriteCount: item.favoriteCount || 0,
            createdAt: item.createdAt,
          };
        });

        this.setData({
          dreamDiaryList: dreamDiaryList,
        });

        console.log("梦境日记加载成功，共", dreamDiaryList.length, "条记录");
      } else {
        console.log("响应数据格式异常:", response);
        this.setData({
          dreamDiaryList: [],
        });
        console.log("暂无梦境日记");
      }
    } catch (error) {
      console.error("加载梦境日记失败:", error);

      // 检查是否是401未授权错误，如果是则不显示toast，让全局401处理机制处理
      if (error.message === "未授权") {
        console.log("401错误，由全局401处理机制处理，不显示toast");
        return;
      }

      // 其他错误显示错误提示
      wx.showToast({
        title: this.data.i18n.profile.loadFailed,
        icon: "error",
      });

      // 设置为空数组
      this.setData({
        dreamDiaryList: [],
      });
    }
  },

  /**
   * 加载收藏列表
   */
  async loadCollection() {
    try {
      console.log("开始加载我的收藏");

      const response = await http.get(
        "/dream/posts/my/favorites",
        {
          pageNum: 0,
          pageSize: 20,
        },
        {
          showLoading: false,
        }
      );

      if (response && response.data && response.data.records) {
        const records = response.data.records;

        // 处理数据，按时间降序排列
        const collectionList = records.map((item, index) => {
          const createTime = this.formatTime(item.createdAt);

          // 解析关键词JSON
          let keywords = [];
          try {
            if (item.keywordsJson) {
              keywords = JSON.parse(item.keywordsJson);
            }
          } catch (error) {
            console.error("解析关键词失败:", error);
            keywords = [];
          }

          return {
            id: item.postId,
            postId: item.postId,
            title: this.truncateText(item.dreamDescription, 30),
            fullDescription: item.dreamDescription,
            dreamDescription: item.dreamDescription,
            date: createTime,
            time: createTime,
            description: this.truncateText(item.dreamDescription, 50),
            imageUrl: item.imageUrl || "",
            videoUrl: item.videoUrl || "",
            videoPrompt: item.videoPrompt || "",
            likeCount: item.likeCount || 0,
            favoriteCount: item.favoriteCount || 0,
            createdAt: item.createdAt,
            keywords: keywords,
          };
        });

        this.setData({
          collectionList: collectionList,
        });

        console.log("收藏列表加载成功，共", collectionList.length, "条记录");
      } else {
        console.log("响应数据格式异常:", response);
        this.setData({
          collectionList: [],
        });
        console.log("暂无收藏内容");
      }
    } catch (error) {
      console.error("加载收藏列表失败:", error);

      // 检查是否是401未授权错误，如果是则不显示toast，让全局401处理机制处理
      if (error.message === "未授权") {
        console.log("401错误，由全局401处理机制处理，不显示toast");
        return;
      }

      // 其他错误显示错误提示
      wx.showToast({
        title: this.data.i18n.profile.loadFailed,
        icon: "error",
      });

      // 设置为空数组
      this.setData({
        collectionList: [],
      });
    }
  },

  /**
   * 加载点赞列表
   */
  async loadLikes() {
    try {
      console.log("开始加载我的点赞");

      const response = await http.get(
        "/dream/posts/my/likes",
        {
          pageNum: 0,
          pageSize: 20,
        },
        {
          showLoading: false,
        }
      );

      if (response && response.data && response.data.records) {
        const records = response.data.records;
        console.log("收到点赞记录数:", records.length);

        // 处理数据，按时间降序排列
        const likesList = records.map((item, index) => {
          const createTime = this.formatTime(item.createdAt);

          // 解析关键词JSON
          let keywords = [];
          try {
            if (item.keywordsJson) {
              keywords = JSON.parse(item.keywordsJson);
            }
          } catch (error) {
            console.error("解析关键词失败:", error);
            keywords = [];
          }

          return {
            id: item.postId,
            postId: item.postId,
            title: this.truncateText(item.dreamDescription, 30),
            fullDescription: item.dreamDescription,
            dreamDescription: item.dreamDescription,
            date: createTime,
            time: createTime,
            description: this.truncateText(item.dreamDescription, 50),
            imageUrl: item.imageUrl || "",
            videoUrl: item.videoUrl || "",
            videoPrompt: item.videoPrompt || "",
            likeCount: item.likeCount || 0,
            favoriteCount: item.favoriteCount || 0,
            createdAt: item.createdAt,
            keywords: keywords,
          };
        });

        this.setData({
          likesList: likesList,
        });

        console.log("点赞列表加载成功，共", likesList.length, "条记录");
      } else {
        console.log("响应数据格式异常:", response);
        this.setData({
          likesList: [],
        });
        console.log("暂无点赞内容");
      }
    } catch (error) {
      console.error("加载点赞列表失败:", error);

      // 检查是否是401未授权错误，如果是则不显示toast，让全局401处理机制处理
      if (error.message === "未授权") {
        console.log("401错误，由全局401处理机制处理，不显示toast");
        return;
      }

      // 其他错误显示错误提示
      wx.showToast({
        title: this.data.i18n.profile.loadFailed,
        icon: "error",
      });

      // 设置为空数组
      this.setData({
        likesList: [],
      });
    }
  },

  /**
   * 查看梦境详情
   */
  onViewDream(e) {
    const { id } = e.currentTarget.dataset;
    console.log("查看梦境详情:", id);

    if (id) {
      // 直接跳转到diary页面，让diary页面调用diaryDetail接口
      wx.navigateTo({
        url: `/pages/diary/diary?postId=${id}`,
      });
    } else {
      wx.showToast({
        title: this.data.i18n.profile.postIdNotFound,
        icon: "error",
      });
    }
  },

  /**
   * 查看收藏详情
   */
  onViewCollection(e) {
    const { id } = e.currentTarget.dataset;
    console.log("查看收藏详情:", id);

    if (id) {
      // 直接跳转到帖子详情页，让详情页调用API获取最新数据
      wx.navigateTo({
        url: `/pages/result/post-detail?postId=${id}`,
      });
    } else {
      wx.showToast({
        title: this.data.i18n.profile.postIdNotFound,
        icon: "error",
      });
    }
  },

  /**
   * 查看点赞详情
   */
  onViewLike(e) {
    const { id } = e.currentTarget.dataset;
    console.log("查看点赞详情:", id);

    if (id) {
      // 直接跳转到帖子详情页，让详情页调用API获取最新数据
      wx.navigateTo({
        url: `/pages/result/post-detail?postId=${id}`,
      });
    } else {
      wx.showToast({
        title: this.data.i18n.profile.postIdNotFound,
        icon: "error",
      });
    }
  },

  /**
   * 点赞操作
   */
  onLike(e) {
    e.stopPropagation(); // 阻止事件冒泡
    const { postId } = e.currentTarget.dataset;
    console.log("点赞操作:", postId);

    // 这里可以添加点赞逻辑，或者直接跳转到详情页
    if (postId) {
      wx.navigateTo({
        url: `/pages/result/post-detail?postId=${postId}`,
      });
    }
  },

  /**
   * 收藏操作
   */
  onFavorite(e) {
    e.stopPropagation(); // 阻止事件冒泡
    const { postId } = e.currentTarget.dataset;
    console.log("收藏操作:", postId);

    // 这里可以添加收藏逻辑，或者直接跳转到详情页
    if (postId) {
      wx.navigateTo({
        url: `/pages/result/post-detail?postId=${postId}`,
      });
    }
  },

  /**
   * 头像点击事件
   */
  onAvatarTap() {
    logger.info("点击头像");
    if (!this.data.isLoggedIn) {
      this.onLogin();
      return;
    }

    // 跳转到个人信息详情页
    wx.navigateTo({
      url: "/pages/profile/profile-detail",
    });
  },

  /**
   * 编辑个人信息
   */
  onEditProfile() {
    wx.navigateTo({
      url: "/pages/profile/edit-profile",
    });
  },

  /**
   * 格式化时间
   */
  formatTime(timeStr) {
    if (!timeStr) return "刚刚";

    // 修复iOS日期格式兼容性问题
    let date;
    try {
      const isoTimeStr = timeStr.replace(" ", "T") + "+08:00";
      date = new Date(isoTimeStr);

      if (isNaN(date.getTime())) {
        date = new Date(timeStr.replace(/-/g, "/"));
      }
    } catch (error) {
      console.error("日期解析失败:", error);
      return timeStr;
    }

    // 格式化为 YYYY年MM月DD日 HH点MM分
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${year}年${month}月${day}日 ${hour}点${minute}分`;
  },

  /**
   * 截断文本
   */
  truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
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
   * 跳转到首页记录梦境
   */
  onGoToDiary() {
    wx.switchTab({
      url: "/pages/index/index",
    });
  },

  /**
   * 跳转到社区页面
   */
  onGoToCommunity() {
    wx.switchTab({
      url: "/pages/community/community",
    });
  },
});
