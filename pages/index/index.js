// 首页
const { IMAGE_URLS } = require("../../constants/index.js");
const authService = require("../../services/auth.js");
const storage = require("../../utils/storage.js");
const { t, getLang, setLanguage } = require("../../utils/i18n.js");
const membershipService = require("../../services/membership.js");

Page({
  data: {
    dreamDescription: "",
    isPublic: 0,
    analyzing: false,
    inputFocused: false,
    progress: 0,
    progressText: "0%", 
    imageUrls: IMAGE_URLS,
    showLoginModal: false,
    showProfileSetupModal: false,
    generationType: "image", // 'image' 或 'video'
    language: "zh", // 'zh' 中文, 'en' 英文
    i18n: {}, // 国际化文本，由initI18n()方法填充
    // 会员和积分相关
    // ============================================
    // 【重要】会员状态切换方法：
    // 1. 在微信开发者工具的控制台中执行：
    //    wx.setStorageSync('user.isMember', true)  // 设置为会员
    //    wx.setStorageSync('user.isMember', false) // 设置为非会员
    // 2. 或者在代码中调用：
    //    const storage = require('../../utils/storage.js');
    //    storage.set('user.isMember', true);
    // 3. 后续会员制度完善后，可以从接口获取会员状态
    // ============================================
    isMember: false, // 是否为会员
    totalPoints: 0, // 总积分
    pointsCost: {
      image: 20, // 文生图消耗20积分
      video: 50, // 文生视频消耗50积分
      professional: 100, // 专业版解析消耗100积分
    },
    isNewVersion: true, // 是否为新版本，用于控制文生视频按钮显示
    isLoggedIn: false, // 登录状态
    // 会员信息
    membershipInfo: null,
    isVip: false,
  },

  onLoad() {
    this.initI18n();
    this.checkLoginStatus();
    this.checkGlobalAnalysisState();
    this.loadUserPoints();
    this.loadMemberStatus();
    // 首页初始化接口调用
    this.loadHomePageData();
    // 加载会员信息
    if (this.data.isLoggedIn) {
      this.loadMembershipInfo();
    }
  },

  // 初始化国际化
  initI18n() {
    const lang = getLang();

    this.setData({
      language: lang,
      i18n: {
        index: {
          title: t("index.title"),
          subtitle: t("index.subtitle"),
          placeholder: t("index.placeholder"),
          generationType: t("index.generationType"),
          textToImage: t("index.textToImage"),
          textToVideo: t("index.textToVideo"),
          professionalAnalysis: t("index.professionalAnalysis"),
          analyze: t("index.analyze"),
          analyzing: t("index.analyzing"),
          tipsTitle: t("index.tipsTitle"),
          tips: t("index.tips"),
          disclaimer: t("index.disclaimer"),
          checkinToGetPoints: t("index.checkinToGetPoints"),
          currentPoints: t("index.currentPoints"),
          points: t("index.points"),
          forbiddenContent: t("index.forbiddenContent"),
          insufficientPoints: t("index.insufficientPoints"),
          greetingTitle: t("index.greetingTitle"),
          greetingSubtitle: t("index.greetingSubtitle"),
          placeholderLine1: t("index.placeholderLine1"),
          placeholderLine2: t("index.placeholderLine2"),
          placeholderLine3: t("index.placeholderLine3"),
          generateImage: t("index.generateImage"),
          generateVideo: t("index.generateVideo"),
          dreamAnalysis: t("index.dreamAnalysis"),
          usageTips: t("index.usageTips"),
          times: t("index.times"),
          discount: t("index.discount"),
        },
        app: {
          shareTitle: t("app.shareTitle"),
          timelineTitle: t("app.timelineTitle"),
        },
        loginModal: {
          title: t("loginModal.title"),
          subtitle: t("loginModal.subtitle"),
          loginButton: t("loginModal.loginButton"),
          logging: t("loginModal.logging"),
          cancel: t("loginModal.cancel"),
          tips: t("loginModal.tips"),
          loginSuccess: t("loginModal.loginSuccess"),
          loginFailed: t("loginModal.loginFailed"),
        },
      },
    });

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: t("pageTitle.index"),
    });
  },

  onShow() {
    this.checkLoginStatus();
    this.checkGlobalAnalysisState();
    // 通知tabBar更新状态
    wx.eventBus && wx.eventBus.emit("pageShow");
    // 刷新积分和会员状态
    this.loadUserPoints();
    this.loadMemberStatus();
    // 加载会员信息
    if (this.data.isLoggedIn) {
      this.loadMembershipInfo();
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      // 刷新会员状态（同步方法）
      this.loadMemberStatus();
      // 刷新积分和首页数据（异步方法）
      await Promise.all([
        this.loadUserPoints(),
        this.loadHomePageData(),
        this.loadMembershipInfo()
      ]);
    } catch (error) {
      console.error('下拉刷新失败:', error);
    } finally {
      // 停止下拉刷新动画
      wx.stopPullDownRefresh();
    }
  },

  // 检查全局解析状态
  checkGlobalAnalysisState() {
    const app = getApp();
    const { dreamAnalysis } = app.globalData;

    if (dreamAnalysis.isAnalyzing) {
      // 如果正在解析，恢复状态
      this.setData({
        dreamDescription: dreamAnalysis.dreamDescription,
        isPublic: dreamAnalysis.isPublic,
        analyzing: true,
        progress: dreamAnalysis.progress || 0,
        progressText: Math.round(dreamAnalysis.progress || 0) + "%",
      });

      // 如果进度小于90%，继续动画
      if (dreamAnalysis.progress < 90) {
        this.startProgressAnimation();
      }
    }
  },

  // 输入梦境描述
  onDreamInput(e) {
    this.setData({
      dreamDescription: e.detail.value,
    });
  },

  // 输入框获得焦点
  onInputFocus() {
    this.setData({
      inputFocused: true,
    });
  },

  // 输入框失去焦点
  onInputBlur() {
    this.setData({
      inputFocused: false,
    });
  },

  // 切换生成类型
  onGenerationTypeChange(e) {
    this.setData({
      generationType: e.detail.value,
    });
  },

  // 选择文生图
  onSelectImage() {
    this.setData({
      generationType: 'image',
    });
  },

  // 选择文生视频
  onSelectVideo() {
    this.setData({
      generationType: 'video',
    });
  },

  // 点击梦境解析按钮（根据当前类型触发解析）
  onParseDream() {
    // 直接调用解析方法，会根据当前的 generationType 调用对应接口
    this.onAnalyzeDream();
  },

  // 开始解析梦境
  async onAnalyzeDream() {
    const { dreamDescription, isPublic, analyzing, generationType } = this.data;

    // 防抖处理：如果正在解析，直接返回
    if (analyzing) {
      return;
    }

    // 检查登录状态
    if (!authService.isUserLoggedIn()) {
      // 在弹出登录前，保存当前输入为草稿，避免登录流程导致内容丢失
      storage.set('draft.dreamDescription', dreamDescription);
      storage.set('draft.isPublic', isPublic);
      storage.set('draft.generationType', generationType);
      this.setData({
        showLoginModal: true,
      });
      return;
    }

    if (!dreamDescription.trim()) {
      wx.showToast({
        title: this.data.i18n.index.dreamContentRequired,
        icon: "error",
        duration: 2000,
      });
      return;
    }

    if (dreamDescription.trim().length > 1000) {
      wx.showToast({
        title: this.data.i18n.index.dreamContentTooLong,
        icon: "error",
        duration: 2000,
      });
      return;
    }

    // 平滑设置analyzing状态
    this.setData({
      analyzing: true,
      progress: 0,
      progressText: "0%",
    });

    // 显示解析提示
    wx.showToast({
      title: this.data.i18n.index.analyzingMessage,
      icon: "loading",
      duration: 2000,
    });

    // 设置全局状态
    const app = getApp();
    app.setDreamAnalysisState({
      isAnalyzing: true,
      dreamDescription: dreamDescription.trim(),
      isPublic: isPublic,
      startTime: Date.now(),
      progress: 0,
    });

    // 开始进度条动画
    this.startProgressAnimation();

    try {
      const dreamService = require("../../services/dream.js");

      // 根据生成类型调用不同接口
      let response;
      if (generationType === "video") {
        response = await dreamService.analyzeDreamWithVideo({
          dreamDescription: dreamDescription.trim(),
          isPublic: isPublic,
        });
      } else if (generationType === "professional") {
        response = await dreamService.analyzeDreamProfessional({
          dreamDescription: dreamDescription.trim(),
          isPublic: isPublic,
        });
      } else {
        response = await dreamService.analyzeDream({
          dreamDescription: dreamDescription.trim(),
          isPublic: isPublic,
        });
      }

      // 检查是否是敏感词检测错误
      if (response.message === "FORBIDDEN_CONTENT") {
        // 停止进度条动画
        this.stopProgressAnimation();
        // 清除全局状态
        const app = getApp();
        app.clearDreamAnalysisState();
        // 显示敏感词提示
        wx.showToast({
          title: this.data.i18n.index.forbiddenContent,
          icon: "none",
          duration: 3000,
        });
        // 停止解析状态，但保留输入内容让用户修改
        this.setData({
          analyzing: false,
        });
        return;
      }

      // 检查是否是积分不足错误
      if (response.message === "INSUFFICIENT_POINTS") {
        // 停止进度条动画
        this.stopProgressAnimation();
        // 清除全局状态
        const app = getApp();
        app.clearDreamAnalysisState();
        // 显示积分不足提示
        wx.showToast({
          title: this.data.i18n.index.insufficientPoints,
          icon: "none",
          duration: 3000,
        });
        // 停止解析状态，但保留输入内容
        this.setData({
          analyzing: false,
        });
        // 刷新积分显示
        this.loadUserPoints();
        return;
      }

      // 处理专业版解析的特殊数据结构
      let resultData;
      if (generationType === "professional" && response && response.code === 0 && response.data) {
        // 专业版解析的新数据结构
        const professionalData = response.data;
        
        // 只使用 analysis_markdown，不再使用 analysis_raw.raw_markdown（两者重复）
        const analysisMarkdown = professionalData.analysis_markdown || "";
        
        // 完成进度条动画
        this.completeProgressAnimation();
        
        // 转换为统一的数据结构
        resultData = {
          analysisId: professionalData.request_id || "",
          dreamDescription: dreamDescription.trim(),
          keywords: [], // 专业版不再从结构化数据提取关键词
          interpretation: analysisMarkdown, // 直接使用 markdown 作为解析内容
          imagePrompt: "",
          imageTaskId: "",
          imageStatus: "none", // 专业版没有图片，设置为 "none" 表示不需要轮询
          imageUrl: null,
          guidingQuestionsJson: "", // 专业版不再有引导性问题
          // 视频相关（专业版不支持）
          videoPrompt: null,
          videoStatus: "none", // 专业版没有视频，设置为 "none" 表示不需要轮询
          videoUrl: null,
          generationType: generationType,
          // 专业版特有字段
          pointsBalance: professionalData.points_balance || 0,
          requestId: professionalData.request_id || "",
          // 保存 markdown 格式的分析内容（主要数据源）
          analysisMarkdown: analysisMarkdown
        };
      } else {
        // 兼容新老结构：优先取旧结构的 data，否则取扁平对象
        const raw = response && response.code === 0 && response.data ? response.data : response;

        // 基本有效性校验（至少需要有 analysisId/analysis_id）
        if (!raw || (!raw.analysisId && !raw.analysis_id)) {
          throw new Error(response?.message || "解析失败");
        }
        
        // 完成进度条动画
        this.completeProgressAnimation();

        // 归一化字段到 camelCase，并附加生成类型
        resultData = {
          analysisId: raw.analysisId || raw.analysis_id,
          dreamDescription: raw.dreamDescription || raw.dream_description || "",
          keywords: raw.keywords || [],
          interpretation: raw.interpretation || "",
          imagePrompt: raw.imagePrompt || raw.image_prompt || "",
          imageTaskId: raw.imageTaskId || raw.image_task_id || "",
          imageStatus: raw.imageStatus || raw.image_status || "",
          imageUrl: raw.imageUrl || raw.image_url || null,
          guidingQuestionsJson:
            raw.guidingQuestionsJson || raw.guiding_questions_json || "",
          // 视频相关（仅在视频模式时有值）
          videoPrompt: raw.videoPrompt || raw.video_prompt || null,
          videoStatus: raw.videoStatus || raw.video_status || null,
          videoUrl: raw.videoUrl || raw.video_url || null,
          generationType: generationType,
        };
      }

      if (resultData) {

        // 使用全局通知机制
        app.notifyAnalysisComplete(resultData);

        // 刷新会员信息（更新剩余次数）
        this.loadMembershipInfo();

        // 等待进度条完成后再跳转
        setTimeout(() => {
          // 清除全局状态
          app.clearDreamAnalysisState();
          // 清空输入框内容
          this.setData({
            dreamDescription: "",
          });
          // 清理草稿
          storage.remove('draft.dreamDescription');
          storage.remove('draft.isPublic');
          storage.remove('draft.generationType');
          wx.navigateTo({
            url: `/pages/result/result?data=${encodeURIComponent(
              JSON.stringify(resultData)
            )}`,
          });
        }, 2000); // 延迟2秒，等待进度条完成
      } else {
        throw new Error(response?.message || "解析失败");
      }
    } catch (error) {
      // 停止进度条动画
      this.stopProgressAnimation();
      // 清除全局状态
      app.clearDreamAnalysisState();
      // 错误时保留输入内容，让用户可以修改后重试
      // 不清空 dreamDescription，不删除草稿
      wx.showToast({
        title: error.message || "解析失败，请重试",
        icon: "error",
        duration: 2000,
      });
    } finally {
      this.setData({ analyzing: false });
    }
  },

  // 清空输入
  onClearInput() {
    this.setData({
      dreamDescription: "",
    });
    // 同步清理草稿
    storage.remove('draft.dreamDescription');
  },

  // 开始进度条动画
  startProgressAnimation() {
    const interval = 200; // 每200ms更新一次，让数字变化更明显
    let currentProgress = this.data.progress || 0;
    const maxProgress = 90; // 最大到90%，等待API返回后完成到100%

    const progressTimer = setInterval(() => {
      // 使用缓动函数，让进度条增长越来越慢
      const increment = Math.max(1, (maxProgress - currentProgress) * 0.05);
      currentProgress = Math.min(currentProgress + increment, maxProgress);

      const roundedProgress = Math.round(currentProgress);
      this.setData({
        progress: roundedProgress,
        progressText: roundedProgress + "%",
      });

      // 更新全局状态
      const app = getApp();
      app.setDreamAnalysisState({
        progress: roundedProgress,
      });

      if (currentProgress >= maxProgress) {
        clearInterval(progressTimer);
        this.progressTimer = null;
      }
    }, interval);

    // 保存定时器引用，以便在需要时清除
    this.progressTimer = progressTimer;
  },

  // 完成进度条动画
  completeProgressAnimation() {
    // 停止当前动画
    this.stopProgressAnimation();

    // 快速完成到100%
    const interval = 100; // 每100ms更新一次
    let currentProgress = this.data.progress;

    const completeTimer = setInterval(() => {
      currentProgress = Math.min(currentProgress + 3, 100); // 每次增加3%

      const roundedProgress = Math.round(currentProgress);
      this.setData({
        progress: roundedProgress,
        progressText: roundedProgress + "%",
      });

      // 更新全局状态
      const app = getApp();
      app.setDreamAnalysisState({
        progress: roundedProgress,
      });

      if (currentProgress >= 100) {
        clearInterval(completeTimer);
      }
    }, interval);
  },

  // 停止进度条动画
  stopProgressAnimation() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = authService.checkLoginStatus();
    this.setData({
      isLoggedIn: isLoggedIn,
    });
  },

  // 登录成功回调
  async onLoginSuccess(e) {
    // 更新登录状态
    this.checkLoginStatus();

    // 加载会员信息
    await this.loadMembershipInfo();

    // 检查是否是首次登录
    if (e.detail.isFirstLogin === true) {
      this.setData({
        showProfileSetupModal: true,
      });
    } else {
      // 恢复草稿（若输入为空）
      const draftDesc = storage.get('draft.dreamDescription');
      const draftPublic = storage.get('draft.isPublic');
      const draftGenType = storage.get('draft.generationType');
      if (!this.data.dreamDescription && draftDesc) {
        this.setData({
          dreamDescription: draftDesc,
          isPublic: typeof draftPublic === 'number' ? draftPublic : this.data.isPublic,
          generationType: draftGenType || this.data.generationType,
        });
      }
      // 非首次登录，直接开始解析梦境
      this.onAnalyzeDream();
    }
  },

  // 个人信息设置完成回调
  onProfileSetupComplete(e) {
    // 恢复草稿（若输入为空）
    const draftDesc = storage.get('draft.dreamDescription');
    const draftPublic = storage.get('draft.isPublic');
    const draftGenType = storage.get('draft.generationType');
    if (!this.data.dreamDescription && draftDesc) {
      this.setData({
        dreamDescription: draftDesc,
        isPublic: typeof draftPublic === 'number' ? draftPublic : this.data.isPublic,
        generationType: draftGenType || this.data.generationType,
      });
    }
    // 设置完成后开始解析梦境
    this.onAnalyzeDream();
  },

  // 关闭个人信息设置弹窗
  onCloseProfileSetupModal() {
    this.setData({
      showProfileSetupModal: false,
    });
  },

  // 跳过个人信息设置
  onProfileSetupSkip() {
    this.setData({
      showProfileSetupModal: false,
    });
    // 恢复草稿（若输入为空）
    const draftDesc = storage.get('draft.dreamDescription');
    const draftPublic = storage.get('draft.isPublic');
    const draftGenType = storage.get('draft.generationType');
    if (!this.data.dreamDescription && draftDesc) {
      this.setData({
        dreamDescription: draftDesc,
        isPublic: typeof draftPublic === 'number' ? draftPublic : this.data.isPublic,
        generationType: draftGenType || this.data.generationType,
      });
    }
    // 允许用户继续使用，但提示可以稍后完善
    wx.showToast({
      title: '可以稍后在个人中心完善信息',
      icon: 'none',
      duration: 2000
    });
  },

  // 登录取消回调
  onLoginCancel() {
    this.setData({
      showLoginModal: false,
    });
  },

  // 关闭登录弹窗
  onCloseLoginModal() {
    this.setData({
      showLoginModal: false,
    });
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
        // 分享接口调用失败不影响分享功能，静默处理
      }
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
    // 如果用户已登录，调用分享接口记录积分（微信转发，每天仅首次分享有效）
    const authService = require("../../services/auth.js");
    if (authService.checkLoginStatus()) {
      try {
        const http = require("../../services/http.js");
        await http.post("/dream/share", {}, {
          showLoading: false // 分享时不显示loading，避免影响用户体验
        });
      } catch (error) {
        // 分享接口调用失败不影响分享功能，静默处理
      }
    }
    
    return {
      title: t("app.timelineTitle"),
      imageUrl: "", // 可以设置分享图片
    };
  },

  /**
   * 语言切换
   */
  onLanguageToggle() {
    const newLanguage = this.data.language === "zh" ? "en" : "zh";

    // 使用i18n工具保存语言偏好
    setLanguage(newLanguage);

    // 重新初始化i18n
    this.initI18n();

    // 重新设置页面标题
    const newTitle = t("pageTitle.index");
    wx.setNavigationBarTitle({
      title: newTitle,
    });

    // 通知所有组件语言已切换
    if (wx.eventBus) {
      wx.eventBus.emit("languageChanged", newLanguage);
    } else {
      this.triggerLoginModalUpdate();
    }
  },

  /**
   * 触发登录弹窗更新（当事件总线不可用时）
   */
  triggerLoginModalUpdate() {
    // 通过页面数据变化来触发登录弹窗更新
    this.setData({
      language: this.data.language,
    });
  },

  /**
   * 跳转到签到页面
   */
  goToCheckin() {
    wx.navigateTo({
      url: '/pages/checkin/checkin'
    });
  },

  /**
   * 加载用户积分
   */
  async loadUserPoints() {
    // 如果未登录，不加载积分
    if (!authService.isUserLoggedIn()) {
      this.setData({
        totalPoints: 0,
      });
      return;
    }

    try {
      const http = require("../../services/http.js");
      const res = await http.get('/points/signin', {}, {
        showLoading: false, // 不显示loading，避免影响用户体验
      });

      if (res.code === 0 && res.data) {
        this.setData({
          totalPoints: res.data.total_points || 0,
        });
      }
    } catch (error) {
      // 失败时不显示错误提示，静默处理
    }
  },

  /**
   * 加载会员状态
   * 暂时从storage读取，后续可以改为从接口获取
   * 切换会员状态的方法：在控制台或代码中执行 storage.set('user.isMember', true) 或 storage.set('user.isMember', false)
   */
  loadMemberStatus() {
    // 暂时从storage读取会员状态，后续可以改为从接口获取
    const isMember = storage.get('user.isMember') || false;
    this.setData({
      isMember: isMember,
    });
  },

  /**
   * 加载会员信息
   */
  async loadMembershipInfo() {
    if (!this.data.isLoggedIn) {
      return;
    }
    
    try {
      const membershipInfo = await membershipService.getMembershipInfo();
      this.setData({
        membershipInfo: membershipInfo,
        isVip: membershipInfo.is_vip || membershipInfo.active || false,
      });
      console.log('首页会员信息加载成功:', membershipInfo);
    } catch (error) {
      console.error('加载会员信息失败:', error);
      // 失败时设置为非会员
      this.setData({
        membershipInfo: null,
        isVip: false,
      });
    }
  },

  /**
   * 首页初始化数据加载
   * 可以在这里添加首页需要的接口调用
   */
  async loadHomePageData() {
    try {
      const http = require("../../services/http.js");
      // 检查是否为新版本（无论登录与否都请求）
      const versionRes = await http.get('/config/is_new_version', {}, {
        showLoading: false, // 不显示loading，避免影响用户体验
      });
      
      if (versionRes.code === 0 && versionRes.data) {
        const isNewVersion = versionRes.data.is_new_version || false;
        
        // 保存版本检查结果，用于控制文生视频按钮显示
        this.setData({
          isNewVersion: isNewVersion,
        });
        
      }
      
    } catch (error) {
      this.setData({
        isNewVersion: false,
      });
      
    }
  },
});
