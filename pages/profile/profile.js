// pages/profile/profile.js
const authService = require("../../services/auth.js");
const userService = require("../../services/user.js");
const http = require("../../services/http.js");
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
    // 梦境日记分页相关
    diaryPageNum: 0, // 当前页码，从0开始
    diaryPageSize: 20, // 每页数量
    diaryHasMore: true, // 是否还有更多数据
    diaryLoading: false, // 是否正在加载
    // 收藏分页相关
    collectionPageNum: 0, // 当前页码，从0开始
    collectionPageSize: 20, // 每页数量
    collectionHasMore: true, // 是否还有更多数据
    collectionLoading: false, // 是否正在加载
    // 点赞分页相关
    likesPageNum: 0, // 当前页码，从0开始
    likesPageSize: 20, // 每页数量
    likesHasMore: true, // 是否还有更多数据
    likesLoading: false, // 是否正在加载
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initI18n();
    this.checkLoginStatus();

    // 监听全局401事件
    this.listenToUnauthorized();

    // 监听语言变化事件
    this.onLanguageChanged = (newLanguage) => {
      this.initI18n();
      
      // 重新格式化时间，确保语言切换后时间格式也更新
      this.refreshTimeFormats();
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
          loadFailed: t("profile.loadFailed"),
            noMore: t("profile.noMore"),
            pullUpToLoadMore: t("profile.pullUpToLoadMore"),
          loading: t("profile.loading"),
          jumpFailed: t("profile.jumpFailed"),
          loadMoreFailed: t("profile.loadMoreFailed"),
          postIdNotFound: t("profile.postIdNotFound"),
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
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 强制更新标题
    this.initI18n();
    const newTitle = t("pageTitle.profile");
    wx.setNavigationBarTitle({
      title: newTitle,
    });

    this.checkLoginStatus();
    // 通知tabBar更新状态
    wx.eventBus && wx.eventBus.emit("pageShow");

    // 确保401事件监听器已注册
    this.listenToUnauthorized();

    if (this.data.isLoggedIn) {
      // 每次进入页面时，如果已登录，都加载当前选中标签页的数据
      this.loadCurrentTabData();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
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

    // 格式化创建时间，但保存原始时间字符串用于语言切换
    if (userInfo && userInfo.createTime) {
      // 如果还没有保存原始时间，保存它
      if (!userInfo._originalCreateTime) {
        // 检查是否是已经格式化的时间（包含"年"或月份缩写）
        const isFormatted = userInfo.createTime.includes("年") || 
                           userInfo.createTime.includes("月") ||
                           /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(userInfo.createTime);
        if (!isFormatted) {
          // 是原始时间字符串，保存它
          userInfo._originalCreateTime = userInfo.createTime;
        } else {
          // 已经是格式化后的时间，尝试从 storage 获取原始时间
          const storage = require("../../utils/storage.js");
          const rawUserInfo = storage.get("userInfo");
          if (rawUserInfo && rawUserInfo.createTime) {
            const rawIsFormatted = rawUserInfo.createTime.includes("年") || 
                                  rawUserInfo.createTime.includes("月") ||
                                  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(rawUserInfo.createTime);
            if (!rawIsFormatted) {
              userInfo._originalCreateTime = rawUserInfo.createTime;
            }
          }
        }
      }
      // 使用原始时间字符串格式化（如果存在）
      const timeToFormat = userInfo._originalCreateTime || userInfo.createTime;
      userInfo.createTime = this.formatCreateTime(timeToFormat);
    }

    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: userInfo,
    });
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
    // 检查是否是首次登录
    if (e.detail.isFirstLogin) {
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
    const activeTab = this.data.activeTab;
    
    if (activeTab === "diary") {
      this.loadDreamDiary().then(() => {
        wx.stopPullDownRefresh();
      });
    } else if (activeTab === "collection") {
      this.loadCollection().then(() => {
        wx.stopPullDownRefresh();
      });
    } else if (activeTab === "likes") {
      this.loadLikes().then(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (!this.data.isLoggedIn) {
      return;
    }

    // 根据当前标签页触发对应的加载更多
    if (this.data.activeTab === "diary") {
      if (!this.data.diaryLoading && this.data.diaryHasMore) {
        this.loadDreamDiary(true);
      }
    } else if (this.data.activeTab === "collection") {
      if (!this.data.collectionLoading && this.data.collectionHasMore) {
        this.loadCollection(true);
      }
    } else if (this.data.activeTab === "likes") {
      if (!this.data.likesLoading && this.data.likesHasMore) {
        this.loadLikes(true);
      }
    }
  },

  /**
   * 加载梦境日记
   * @param {boolean} loadMore - 是否为加载更多（追加数据）
   */
  async loadDreamDiary(loadMore = false) {
    // 如果正在加载，直接返回
    if (this.data.diaryLoading) {
      return;
    }

    // 如果是加载更多，但没有更多数据了，直接返回
    if (loadMore && !this.data.diaryHasMore) {
      return;
    }

    // 如果不是加载更多，重置分页状态
    if (!loadMore) {
      this.setData({
        diaryPageNum: 0,
        diaryHasMore: true,
        dreamDiaryList: [],
      });
    }

    this.setData({ diaryLoading: true });

    try {
      const currentPageNum = loadMore ? this.data.diaryPageNum + 1 : 0;

      const response = await http.get(
        "/dream/posts/diary/my",
        {
          pageNum: currentPageNum,
          pageSize: this.data.diaryPageSize,
        },
        {
          showLoading: false,
        }
      );

      if (response && response.data && response.data.records) {
        const records = response.data.records;

        // 处理数据，按时间降序排列
        const newRecords = records.map((item, index) => {
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

        // 判断是否还有更多数据
        const hasMore = records.length >= this.data.diaryPageSize;
        const totalRecords = response.data.total || 0;
        const currentTotal = loadMore 
          ? this.data.dreamDiaryList.length + newRecords.length 
          : newRecords.length;
        const hasMoreData = currentTotal < totalRecords || hasMore;

        // 如果是加载更多，追加数据；否则替换数据
        const dreamDiaryList = loadMore 
          ? [...this.data.dreamDiaryList, ...newRecords]
          : newRecords;

        this.setData({
          dreamDiaryList: dreamDiaryList,
          diaryPageNum: currentPageNum,
          diaryHasMore: hasMoreData,
          diaryLoading: false,
        });
      } else {
        this.setData({
          dreamDiaryList: loadMore ? this.data.dreamDiaryList : [],
          diaryHasMore: false,
          diaryLoading: false,
        });
      }
    } catch (error) {
      this.setData({ diaryLoading: false });

      // 检查是否是401未授权错误，如果是则不显示toast，让全局401处理机制处理
      if (error.message === "未授权") {
        return;
      }

      // 其他错误显示错误提示（仅在首次加载时显示）
      if (!loadMore) {
        wx.showToast({
          title: this.data.i18n.profile.loadFailed,
          icon: "error",
        });

        // 设置为空数组
        this.setData({
          dreamDiaryList: [],
        });
      } else {
        // 加载更多失败，提示用户
        wx.showToast({
          title: this.data.i18n.profile.loadMoreFailed,
          icon: "none",
          duration: 1500,
        });
      }
    }
  },

  /**
   * 加载收藏列表
   * @param {boolean} loadMore - 是否为加载更多（追加数据）
   */
  async loadCollection(loadMore = false) {
    // 如果正在加载，直接返回
    if (this.data.collectionLoading) {
      return;
    }

    // 如果是加载更多，但没有更多数据了，直接返回
    if (loadMore && !this.data.collectionHasMore) {
      return;
    }

    // 如果不是加载更多，重置分页状态
    if (!loadMore) {
      this.setData({
        collectionPageNum: 0,
        collectionHasMore: true,
        collectionList: [],
      });
    }

    this.setData({ collectionLoading: true });

    try {
      const currentPageNum = loadMore ? this.data.collectionPageNum + 1 : 0;

      const response = await http.get(
        "/dream/posts/my/favorites",
        {
          pageNum: currentPageNum,
          pageSize: this.data.collectionPageSize,
        },
        {
          showLoading: false,
        }
      );

      if (response && response.data && response.data.records) {
        const records = response.data.records;

        // 处理数据，按时间降序排列
        const newRecords = records.map((item, index) => {
          const createTime = this.formatTime(item.createdAt);

          // 解析关键词JSON
          let keywords = [];
          try {
            if (item.keywordsJson) {
              keywords = JSON.parse(item.keywordsJson);
            }
          } catch (error) {
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

        // 判断是否还有更多数据
        const hasMore = records.length >= this.data.collectionPageSize;
        const totalRecords = response.data.total || 0;
        const currentTotal = loadMore 
          ? this.data.collectionList.length + newRecords.length 
          : newRecords.length;
        const hasMoreData = currentTotal < totalRecords || hasMore;

        // 如果是加载更多，追加数据；否则替换数据
        const collectionList = loadMore 
          ? [...this.data.collectionList, ...newRecords]
          : newRecords;

        this.setData({
          collectionList: collectionList,
          collectionPageNum: currentPageNum,
          collectionHasMore: hasMoreData,
          collectionLoading: false,
        });
      } else {
        this.setData({
          collectionList: loadMore ? this.data.collectionList : [],
          collectionHasMore: false,
          collectionLoading: false,
        });
      }
    } catch (error) {
      this.setData({ collectionLoading: false });

      // 检查是否是401未授权错误，如果是则不显示toast，让全局401处理机制处理
      if (error.message === "未授权") {
        return;
      }

      // 其他错误显示错误提示（仅在首次加载时显示）
      if (!loadMore) {
        wx.showToast({
          title: this.data.i18n.profile.loadFailed,
          icon: "error",
        });

        // 设置为空数组
        this.setData({
          collectionList: [],
        });
      } else {
        // 加载更多失败，提示用户
        wx.showToast({
          title: this.data.i18n.profile.loadMoreFailed,
          icon: "none",
          duration: 1500,
        });
      }
    }
  },

  /**
   * 加载点赞列表
   * @param {boolean} loadMore - 是否为加载更多（追加数据）
   */
  async loadLikes(loadMore = false) {
    // 如果正在加载，直接返回
    if (this.data.likesLoading) {
      return;
    }

    // 如果是加载更多，但没有更多数据了，直接返回
    if (loadMore && !this.data.likesHasMore) {
      return;
    }

    // 如果不是加载更多，重置分页状态
    if (!loadMore) {
      this.setData({
        likesPageNum: 0,
        likesHasMore: true,
        likesList: [],
      });
    }

    this.setData({ likesLoading: true });

    try {
      const currentPageNum = loadMore ? this.data.likesPageNum + 1 : 0;

      const response = await http.get(
        "/dream/posts/my/likes",
        {
          pageNum: currentPageNum,
          pageSize: this.data.likesPageSize,
        },
        {
          showLoading: false,
        }
      );

      if (response && response.data && response.data.records) {
        const records = response.data.records;

        // 处理数据，按时间降序排列
        const newRecords = records.map((item, index) => {
          const createTime = this.formatTime(item.createdAt);

          // 解析关键词JSON
          let keywords = [];
          try {
            if (item.keywordsJson) {
              keywords = JSON.parse(item.keywordsJson);
            }
          } catch (error) {
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

        // 判断是否还有更多数据
        const hasMore = records.length >= this.data.likesPageSize;
        const totalRecords = response.data.total || 0;
        const currentTotal = loadMore 
          ? this.data.likesList.length + newRecords.length 
          : newRecords.length;
        const hasMoreData = currentTotal < totalRecords || hasMore;

        // 如果是加载更多，追加数据；否则替换数据
        const likesList = loadMore 
          ? [...this.data.likesList, ...newRecords]
          : newRecords;

        this.setData({
          likesList: likesList,
          likesPageNum: currentPageNum,
          likesHasMore: hasMoreData,
          likesLoading: false,
        });
      } else {
        this.setData({
          likesList: loadMore ? this.data.likesList : [],
          likesHasMore: false,
          likesLoading: false,
        });
      }
    } catch (error) {
      this.setData({ likesLoading: false });

      // 检查是否是401未授权错误，如果是则不显示toast，让全局401处理机制处理
      if (error.message === "未授权") {
        return;
      }

      // 其他错误显示错误提示（仅在首次加载时显示）
      if (!loadMore) {
        wx.showToast({
          title: this.data.i18n.profile.loadFailed,
          icon: "error",
        });

        // 设置为空数组
        this.setData({
          likesList: [],
        });
      } else {
        // 加载更多失败，提示用户
        wx.showToast({
          title: this.data.i18n.profile.loadMoreFailed,
          icon: "none",
          duration: 1500,
        });
      }
    }
  },

  /**
   * 查看梦境详情
   */
  onViewDream(e) {
    const { id } = e.currentTarget.dataset;

    if (id) {
      // 显示加载提示
      wx.showLoading({
        title: this.data.i18n.profile.loading,
        mask: true,
      });

      // 直接跳转到diary页面，让diary页面调用diaryDetail接口
      wx.navigateTo({
        url: `/pages/diary/diary?postId=${id}`,
        success: () => {
          // 跳转成功，延迟隐藏 loading（diary 页面会自己显示 loading）
          // 延迟 500ms 确保 diary 页面已经显示了自己的 loading
          setTimeout(() => {
            wx.hideLoading();
          }, 500);
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({
            title: this.data.i18n.profile.jumpFailed,
            icon: "error",
          });
        },
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

    if (id) {
      // 显示加载提示
      wx.showLoading({
        title: this.data.i18n.profile.loading,
        mask: true,
      });

      // 直接跳转到帖子详情页，让详情页调用API获取最新数据
      wx.navigateTo({
        url: `/pages/result/post-detail?postId=${id}`,
        success: () => {
          // 跳转成功，post-detail 页面会在加载完成后隐藏 loading
          // 延迟 500ms 确保 post-detail 页面已经显示了自己的 loading
          setTimeout(() => {
            wx.hideLoading();
          }, 500);
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({
            title: this.data.i18n.profile.jumpFailed,
            icon: "error",
          });
        },
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

    if (id) {
      // 显示加载提示
      wx.showLoading({
        title: this.data.i18n.profile.loading,
        mask: true,
      });

      // 直接跳转到帖子详情页，让详情页调用API获取最新数据
      wx.navigateTo({
        url: `/pages/result/post-detail?postId=${id}`,
        success: () => {
          // 跳转成功，post-detail 页面会在加载完成后隐藏 loading
          // 延迟 500ms 确保 post-detail 页面已经显示了自己的 loading
          setTimeout(() => {
            wx.hideLoading();
          }, 500);
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({
            title: this.data.i18n.profile.jumpFailed,
            icon: "error",
          });
        },
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
   * 格式化时间（支持国际化）
   */
  formatTime(timeStr) {
    if (!timeStr) {
      const lang = getLang();
      return lang === "en" ? "Just now" : "刚刚";
    }

    // 修复iOS日期格式兼容性问题
    let date;
    try {
      const isoTimeStr = timeStr.replace(" ", "T") + "+08:00";
      date = new Date(isoTimeStr);

      if (isNaN(date.getTime())) {
        date = new Date(timeStr.replace(/-/g, "/"));
      }
    } catch (error) {
      return timeStr;
    }

    const lang = getLang();
    
    if (lang === "en") {
      // 英文格式：Nov 04, 2025 04:55
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const year = date.getFullYear();
      const month = months[date.getMonth()];
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");
      
      return `${month} ${day}, ${year} ${hour}:${minute}`;
    } else {
      // 中文格式：YYYY年MM月DD日 HH点MM分
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");

      return `${year}年${month}月${day}日 ${hour}点${minute}分`;
    }
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
   * 格式化创建时间（支持国际化）
   */
  formatCreateTime(timeStr) {
    if (!timeStr) return "";

    try {
      // 处理ISO格式时间（包含T）
      let date;
      if (timeStr.includes("T")) {
        // ISO格式：2025-09-30T10:25:03
        // 直接使用new Date()解析ISO格式
        date = new Date(timeStr);
      } else {
        // 其他格式，如：2025-11-04 04:55:46
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

      let formattedTime;
      if (lang === "en") {
        // 英文格式：Nov 2025
        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        formattedTime = `${months[month - 1]} ${year}`;
      } else {
        // 中文格式：YYYY年MM月
        formattedTime = `${year}年${month}月`;
      }

      return formattedTime;
    } catch (error) {
      return timeStr;
    }
  },

  /**
   * 刷新时间格式（语言切换时调用）
   */
  refreshTimeFormats() {
    // 更新用户信息的创建时间
    const userInfo = this.data.userInfo;
    if (userInfo) {
      // 优先使用保存的原始时间字符串
      let originalTime = userInfo._originalCreateTime;
      
      // 如果没有保存原始时间，尝试从 storage 获取
      if (!originalTime) {
        const storage = require("../../utils/storage.js");
        const rawUserInfo = storage.get("userInfo");
        if (rawUserInfo && rawUserInfo.createTime) {
          // 检查是否是原始时间字符串（不是格式化后的）
          const isFormatted = rawUserInfo.createTime.includes("年") || 
                             rawUserInfo.createTime.includes("月") ||
                             /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(rawUserInfo.createTime);
          if (!isFormatted) {
            originalTime = rawUserInfo.createTime;
          }
        }
      }
      
      // 如果还是找不到原始时间，使用当前的 createTime（可能是格式化后的，需要特殊处理）
      if (!originalTime && userInfo.createTime) {
        // 检查当前 createTime 是否是格式化后的
        const isFormatted = userInfo.createTime.includes("年") || 
                           userInfo.createTime.includes("月") ||
                           /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(userInfo.createTime);
        if (isFormatted) {
          // 已经是格式化后的，无法重新格式化，跳过
        } else {
          originalTime = userInfo.createTime;
        }
      }
      
      // 使用原始时间字符串重新格式化
      if (originalTime) {
        const formattedTime = this.formatCreateTime(originalTime);
        this.setData({
          "userInfo.createTime": formattedTime,
          "userInfo._originalCreateTime": originalTime, // 保存原始时间字符串
        });
      }
    }

    // 更新梦境日记列表的时间
    if (this.data.dreamDiaryList && this.data.dreamDiaryList.length > 0) {
      const updatedList = this.data.dreamDiaryList.map((item) => {
        if (item.createdAt) {
          const formattedTime = this.formatTime(item.createdAt);
          return {
            ...item,
            date: formattedTime,
            time: formattedTime,
          };
        }
        return item;
      });
      this.setData({
        dreamDiaryList: updatedList,
      });
    }

    // 更新收藏列表的时间
    if (this.data.collectionList && this.data.collectionList.length > 0) {
      const updatedList = this.data.collectionList.map((item) => {
        if (item.createdAt) {
          const formattedTime = this.formatTime(item.createdAt);
          return {
            ...item,
            date: formattedTime,
            time: formattedTime,
          };
        }
        return item;
      });
      this.setData({
        collectionList: updatedList,
      });
    }

    // 更新点赞列表的时间
    if (this.data.likesList && this.data.likesList.length > 0) {
      const updatedList = this.data.likesList.map((item) => {
        if (item.createdAt) {
          const formattedTime = this.formatTime(item.createdAt);
          return {
            ...item,
            date: formattedTime,
            time: formattedTime,
          };
        }
        return item;
      });
      this.setData({
        likesList: updatedList,
      });
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
