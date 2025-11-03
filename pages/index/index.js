// 首页
const { IMAGE_URLS } = require("../../constants/index.js");
const authService = require("../../services/auth.js");
const storage = require("../../utils/storage.js");
const { t, getLang, setLanguage } = require("../../utils/i18n.js");

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
  },

  onLoad() {
    console.log("首页加载");
    this.initI18n();
    this.checkGlobalAnalysisState();
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
          analyze: t("index.analyze"),
          analyzing: t("index.analyzing"),
          tipsTitle: t("index.tipsTitle"),
          tips: t("index.tips"),
          disclaimer: t("index.disclaimer"),
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
    this.checkGlobalAnalysisState();
    // 通知tabBar更新状态
    wx.eventBus && wx.eventBus.emit("pageShow");
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
      } else {
        response = await dreamService.analyzeDream({
          dreamDescription: dreamDescription.trim(),
          isPublic: isPublic,
        });
      }

      console.log("解析响应:", response);

      // 兼容新老结构：优先取旧结构的 data，否则取扁平对象
      const raw = response && response.code === 0 && response.data ? response.data : response;

      // 基本有效性校验（至少需要有 analysisId/analysis_id）
      if (raw && (raw.analysisId || raw.analysis_id)) {
        // 完成进度条动画
        this.completeProgressAnimation();

        // 归一化字段到 camelCase，并附加生成类型
        const resultData = {
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

        // 使用全局通知机制
        app.notifyAnalysisComplete(resultData);

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
      console.error("解析失败:", error);
      // 停止进度条动画
      this.stopProgressAnimation();
      // 清除全局状态
      app.clearDreamAnalysisState();
      // 解析失败时也清空输入框，让用户可以重新输入
      this.setData({
        dreamDescription: "",
      });
      // 清理草稿
      storage.remove('draft.dreamDescription');
      storage.remove('draft.isPublic');
      storage.remove('draft.generationType');
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

  // 登录成功回调
  onLoginSuccess(e) {
    console.log("登录成功", e.detail);

    // 检查是否是首次登录
    if (e.detail.isFirstLogin === true) {
      console.log("首次登录，显示个人信息设置弹窗");
      this.setData({
        showProfileSetupModal: true,
      });
    } else {
      console.log("非首次登录，直接开始解析梦境");
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
    console.log("个人信息设置完成", e.detail);
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

  // 登录取消回调
  onLoginCancel() {
    console.log("用户取消登录");
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
      console.warn("事件总线不存在，无法发送语言变化事件");
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
});
