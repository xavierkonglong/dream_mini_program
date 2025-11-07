// 社区页面
const http = require("../../services/http.js");
const authService = require("../../services/auth.js");
const { IMAGE_URLS } = require("../../constants/index.js");
const { t, getLang, setLanguage } = require("../../utils/i18n.js");
import Toast from "@vant/weapp/toast/toast";

Page({
  /**
   * 页面的初始数据
   */
  data: {
    dreamPosts: [],
    loading: false,
    hasMore: true,
    pageNum: 1,
    pageSize: 10,
    isLoggedIn: false,
    imageUrls: IMAGE_URLS,
    statusBarHeight: wx.getSystemInfoSync().statusBarHeight,
    showLoginModal: false,
    pendingAction: null, // 待执行的行动：'like' 或 'favorite'
    pendingPostId: null, // 待执行的帖子ID
    isProcessing: false, // 防止重复点击
    language: "zh", // 语言设置
    i18n: {}, // 国际化文本
    // 排序：time(最新) | like(点赞最多) | favorite(收藏最多)
    activeSort: "time",
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initI18n();
    // 设置状态栏高度
    const { statusBarHeight } = wx.getSystemInfoSync();
    this.setData({
      headerPadding: statusBarHeight + 44 + 20, // 状态栏 + 导航栏 + 额外间距
    });
    this.checkLoginStatus();
    this.loadDreamPosts();

    // 监听语言变化事件
    this.onLanguageChanged = (newLanguage) => {
      this.initI18n();
    };
    wx.eventBus && wx.eventBus.on("languageChanged", this.onLanguageChanged);
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 移除语言变化事件监听
    wx.eventBus && wx.eventBus.off("languageChanged", this.onLanguageChanged);
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 检查语言是否变化并重新初始化
    const currentLang = getLang();

    // 强制检查并更新标题，不依赖语言变化检测
    this.initI18n();
    const newTitle = t("pageTitle.community");
    wx.setNavigationBarTitle({
      title: newTitle,
    });

    this.checkLoginStatus();
    // 通知tabBar更新状态
    wx.eventBus && wx.eventBus.emit("pageShow");

    // 检查是否需要刷新数据（从帖子详情页返回时）
    const app = getApp();
    if (app.globalData && app.globalData.needRefreshCommunity) {

      // 如果有最近更新的帖子信息，优先进行局部更新
      if (app.globalData.lastUpdatedPost) {
        const postIndex = this.data.dreamPosts.findIndex(
          (post) => post.postId === app.globalData.lastUpdatedPost.postId
        );

        if (postIndex !== -1) {
          const newDreamPosts = [...this.data.dreamPosts];
          newDreamPosts[postIndex] = {
            ...newDreamPosts[postIndex],
            ...app.globalData.lastUpdatedPost,
          };

          this.setData({ dreamPosts: newDreamPosts });

          // 清除更新标记
          app.globalData.needRefreshCommunity = false;
          app.globalData.lastUpdatedPost = null;
          return;
        }
      }

      // 如果找不到对应帖子或没有局部更新信息，则刷新整个列表
      app.globalData.needRefreshCommunity = false;
      this.refreshData();
    } else {
      // 如果数据为空，则加载数据
      if (this.data.dreamPosts.length === 0) {
        this.loadDreamPosts();
      }
    }
  },

  /**
   * 初始化国际化
   */
  initI18n() {
    const lang = getLang();

    this.setData({
      language: lang,
      i18n: {
        community: {
          subtitle: t("community.subtitle"),
          noMoreContent: t("community.noMoreContent"),
          loading: t("community.loading"),
          loadingMore: t("community.loadingMore"),
          emptyTitle: t("community.emptyTitle"),
          emptyDesc: t("community.emptyDesc"),
          loginTitle: t("community.loginTitle"),
          loginSubtitle: t("community.loginSubtitle"),
          // 排序标签
          sortLatest: t("community.sortLatest"),
          sortMostLiked: t("community.sortMostLiked"),
          sortMostFavorited: t("community.sortMostFavorited"),
          // 交互反馈
          likeSuccess: t("community.likeSuccess"),
          unlikeSuccess: t("community.unlikeSuccess"),
          favoriteSuccess: t("community.favoriteSuccess"),
          unfavoriteSuccess: t("community.unfavoriteSuccess"),
          operationFailed: t("community.operationFailed"),
        },
        app: {
          shareTitle: t("app.shareTitle"),
          timelineTitle: t("app.timelineTitle"),
        },
      },
    });

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: t("pageTitle.community"),
    });

    // 监听语言切换事件
    wx.eventBus &&
      wx.eventBus.on("languageChanged", () => {
        // 重新设置页面标题
        wx.setNavigationBarTitle({
          title: t("pageTitle.community"),
        });
      });
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const isLoggedIn = authService.checkLoginStatus();
    this.setData({
      isLoggedIn: isLoggedIn,
    });
  },

  /**
   * 刷新数据
   */
  refreshData() {
    this.setData({
      dreamPosts: [],
      pageNum: 1,
      hasMore: true,
    });
    this.loadDreamPosts();
  },

  /**
   * 加载梦境帖子列表
   */
  async loadDreamPosts() {
    if (this.data.loading || !this.data.hasMore) {
      return;
    }

    this.setData({ loading: true });

    try {

      // 根据 activeSort 组装接口需要的参数
      const dimension = this.data.activeSort; // time | like | favorite
      const order = "desc"; // 所有排序都使用降序（最新的/最多的在前）

      const response = await http.get("/dream/posts/public", {
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize,
        dimension,
        order,
      });


      if (response && response.data && response.data.records) {
        const records = response.data.records;

        // 处理数据，按时间降序排列
        const dreamPosts = records.map((item, index) => {
          // 解析关键词JSON
          let keywords = [];
          try {
            if (item.keywordsJson) {
              keywords = JSON.parse(item.keywordsJson);
            }
          } catch (error) {
            console.error("解析关键词失败:", error);
            // 如果JSON解析失败，尝试按逗号分割
            if (typeof item.keywordsJson === "string") {
              keywords = item.keywordsJson
                .split(/[,，]/)
                .map((k) => k.trim())
                .filter((k) => k && k.length > 0 && k.length < 20);
            }
          }

          return {
            id: item.postId,
            postId: item.postId,
            dreamDescription: item.dreamDescription,
            imageUrl: item.imageUrl || "",
            videoUrl: item.videoUrl || "",
            videoPrompt: item.videoPrompt || "",
            likeCount: item.likeCount || 0,
            favoriteCount: item.favoriteCount || 0,
            createdAt: item.createdAt,
            keywords: keywords,
            isLiked: item.isLiked || false,
            isFavorited: item.isFavorited || false,
          };
        });

        // 如果是第一页，直接替换；否则追加
        const newDreamPosts =
          this.data.pageNum === 1
            ? dreamPosts
            : [...this.data.dreamPosts, ...dreamPosts];

        this.setData({
          dreamPosts: newDreamPosts,
          hasMore: records.length === this.data.pageSize,
          pageNum: this.data.pageNum + 1,
        });
      } else {
        this.setData({
          hasMore: false,
        });
      }
    } catch (error) {
      console.error("=== 加载梦境帖子失败 ===");
      console.error("错误信息:", error);
      wx.showToast({
        title: this.data.i18n.community.loadFailed,
        icon: "error",
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 切换筛选排序（Tabs）
   */
  onChangeSort(e) {
    // vant tabs 在 weapp 下 change 事件 detail 可能包含 { name, title, index }
    const nextSort = e?.detail?.name || (e?.detail?.index === 1 ? "like" : e?.detail?.index === 2 ? "favorite" : "time");
    if (nextSort === this.data.activeSort) return;
    this.setData({
      activeSort: nextSort,
      dreamPosts: [],
      pageNum: 1,
      hasMore: true,
    });
    this.loadDreamPosts();
  },

  /**
   * 查看梦境详情
   */
  onViewDream(e) {
    const postId = e.currentTarget.dataset.postId;
    if (!postId) {
      wx.showToast({
        title: this.data.i18n.community.paramError,
        icon: "error",
      });
      return;
    }

    // 使用预加载优化页面切换体验
    const eventChannel = this.getOpenerEventChannel();
    const currentPost = this.data.dreamPosts.find(
      (post) => post.postId === postId
    );

    wx.navigateTo({
      url: `/pages/result/post-detail?postId=${postId}`,
      events: {
        // 可以传递一些数据给详情页
        acceptDataFromOpenerPage: function (data) {
          console.log("详情页接收数据:");
        },
      },
      success: (res) => {
        // 将当前帖子数据传给详情页，减少加载时间
        res.eventChannel.emit("acceptDataFromOpenerPage", {
          data: currentPost,
        });
      },
      fail: (error) => {
        console.error("页面跳转失败:", error);
        wx.showToast({
          title: this.data.i18n.community.navigateFailed,
          icon: "none",
        });
      },
    });
  },

  /**
   * 点赞操作
   */
  async onLike(e) {
    if (this.data.isProcessing) {
      return;
    }

    const postId = e.currentTarget.dataset.postId;
    if (!postId) {
      wx.showToast({
        title: this.data.i18n.community.paramError,
        icon: "error",
      });
      return;
    }

    // 设置处理状态，防止重复点击
    this.setData({ isProcessing: true });

    // 检查登录状态
    const isLoggedIn = this.checkLoginStatus();
    if (!isLoggedIn) {
      this.setData({
        showLoginModal: true,
        pendingAction: "like",
        pendingPostId: postId,
        isProcessing: false,
      });
      return;
    }

    // 直接执行点赞操作
    this.performLike(postId);
  },

  /**
   * 收藏操作
   */
  async onFavorite(e) {
    if (this.data.isProcessing) {
      return;
    }

    const postId = e.currentTarget.dataset.postId;
    if (!postId) {
      wx.showToast({
        title: this.data.i18n.community.paramError,
        icon: "error",
      });
      return;
    }

    // 设置处理状态，防止重复点击
    this.setData({ isProcessing: true });

    // 检查登录状态
    const isLoggedIn = this.checkLoginStatus();
    if (!isLoggedIn) {
      this.setData({
        showLoginModal: true,
        pendingAction: "favorite",
        pendingPostId: postId,
        isProcessing: false,
      });
      return;
    }

    // 直接执行收藏操作
    this.performFavorite(postId);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.refreshData();
    wx.stopPullDownRefresh();
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    this.loadDreamPosts();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    try {
      const isLoggedIn = authService.checkLoginStatus();
      return isLoggedIn;
    } catch (error) {
      return false;
    }
  },

  /**
   * 登录成功回调
   */
  onLoginSuccess(e) {
    this.setData({
      showLoginModal: false,
      isLoggedIn: true,
    });

    // 执行待执行的操作
    const { pendingAction } = this.data;
    if (pendingAction === "like") {
      // 重新触发点赞操作
      const postId = this.data.pendingPostId;
      if (postId) {
        this.performLike(postId);
      }
    } else if (pendingAction === "favorite") {
      // 重新触发收藏操作
      const postId = this.data.pendingPostId;
      if (postId) {
        this.performFavorite(postId);
      }
    }

    this.setData({
      pendingAction: null,
      pendingPostId: null,
    });
  },

  /**
   * 关闭登录弹窗
   */
  onCloseLoginModal() {
    this.setData({
      showLoginModal: false,
      pendingAction: null,
      pendingPostId: null,
      isProcessing: false,
    });
  },

  /**
   * 执行点赞操作（内部方法）
   */
  async performLike(postId) {
    this.setData({ isProcessing: true });

    try {
      // 找到对应的帖子
      const postIndex = this.data.dreamPosts.findIndex(
        (post) => post.postId === postId
      );
      if (postIndex === -1) {
        wx.showToast({
          title: this.data.i18n.community.postNotFound,
          icon: "error",
        });
        return;
      }

      const post = this.data.dreamPosts[postIndex];

      // 调用点赞/取消点赞接口
      const response = await http.post("/dream/posts/like", {
        postId: postId,
      });

      if (response && response.code === 0 && response.data) {
        // 使用接口返回的数据更新本地状态
        const newDreamPosts = [...this.data.dreamPosts];
        newDreamPosts[postIndex] = {
          ...post,
          isLiked: response.data.isLiked,
          likeCount: response.data.likeCount,
        };

        this.setData({
          dreamPosts: newDreamPosts,
        });

        Toast({
          type: "success",
          message: response.data.isLiked
            ? this.data.i18n.community.likeSuccess
            : this.data.i18n.community.unlikeSuccess,
          duration: 1500,
        });
      } else {
        wx.showToast({
          title: response?.message || this.data.i18n.community.operationFailed,
          icon: "error",
        });
      }
    } catch (error) {
      console.error("点赞操作失败:", error);
      wx.showToast({
        title: this.data.i18n.community.operationFailed,
        icon: "error",
      });
    } finally {
      this.setData({ isProcessing: false });
    }
  },

  /**
   * 执行收藏操作（内部方法）
   */
  async performFavorite(postId) {
    this.setData({ isProcessing: true });

    try {
      // 找到对应的帖子
      const postIndex = this.data.dreamPosts.findIndex(
        (post) => post.postId === postId
      );
      if (postIndex === -1) {
        wx.showToast({
          title: this.data.i18n.community.postNotFound,
          icon: "error",
        });
        return;
      }

      const post = this.data.dreamPosts[postIndex];

      // 调用收藏/取消收藏接口
      const response = await http.post("/dream/posts/favorite", {
        postId: postId,
      });

      if (response && response.code === 0 && response.data) {
        // 使用接口返回的数据更新本地状态
        const newDreamPosts = [...this.data.dreamPosts];
        newDreamPosts[postIndex] = {
          ...post,
          isFavorited: response.data.isFavorited,
          favoriteCount: response.data.favoriteCount,
        };

        this.setData({
          dreamPosts: newDreamPosts,
        });

        Toast({
          type: "success",
          message: response.data.isFavorited
            ? this.data.i18n.community.favoriteSuccess
            : this.data.i18n.community.unfavoriteSuccess,
          duration: 1500,
        });
      } else {
        wx.showToast({
          title: response?.message || this.data.i18n.community.operationFailed,
          icon: "error",
        });
      }
    } catch (error) {
      console.error("收藏操作失败:", error);
      wx.showToast({
        title: this.data.i18n.community.operationFailed,
        icon: "error",
      });
    } finally {
      this.setData({ isProcessing: false });
    }
  },

  /**
   * 用户点击右上角分享
   */
  async onShareAppMessage() {
    
    // 调用分享接口记录积分（微信转发，每天仅首次分享有效）
    // 后端会通过 token 判断用户，未登录会返回 401
    try {
      await http.post("/dream/share", {}, {
        showLoading: false // 分享时不显示loading，避免影响用户体验
      });
    } catch (error) {
      // 分享接口调用失败不影响分享功能，只记录错误
    }
    
    return {
      title: t("app.shareTitle"),
      path: "/pages/index/index",
      imageUrl: "", // 可以设置分享图片
    };
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  async onShareTimeline() {
    console.log("社区页面 - onShareTimeline 被调用");
    
    // 调用分享接口记录积分（微信转发，每天仅首次分享有效）
    // 后端会通过 token 判断用户，未登录会返回 401
    try {
      console.log("社区页面 - 开始调用分享接口");
      await http.post("/dream/share", {}, {
        showLoading: false // 分享时不显示loading，避免影响用户体验
      });
      console.log("社区页面 - 分享接口调用成功");
    } catch (error) {
      // 分享接口调用失败不影响分享功能，只记录错误
      console.error("社区页面 - 分享积分记录失败:", error);
    }
    
    return {
      title: t("app.timelineTitle"),
      imageUrl: "", // 可以设置分享图片
    };
  },
});
