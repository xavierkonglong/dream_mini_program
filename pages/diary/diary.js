// 个人梦境日记页面
const authService = require("../../services/auth.js");
const dreamService = require("../../services/dream.js");
const { IMAGE_URLS } = require("../../constants/index.js");
const { t, getLang } = require("../../utils/i18n.js");

Page({
  data: {
    result: null,
    isLoggedIn: false,
    imageUrls: IMAGE_URLS,
    posterConfig: null,
    showProfileSetupModal: false,
    feedbackRating: 0,
    feedbackContent: "",
    submittingFeedback: false,
    // 加载状态
    loading: true,
    // 视频相关
    isVideoType: false,
    videoTaskId: null,
    videoUrl: null,
    videoStatus: "pending", // pending, processing, completed, failed
    videoPollCount: 0,
    // 图片轮询相关
    imageLoading: false,
    imagePollCount: 0,
    // 疏导性问题相关
    answer1: "",
    answer2: "",
    savingAnswers: false,
    // 折叠面板相关
    activeNames: [], // 默认全部收缩
    // 反馈相关
    feedbackSubmitted: false, // 反馈是否已提交
    // 多语言相关
    language: "zh",
    i18n: {},
    // Painter 相关
    painterPalette: null,
  },

  onLoad(options) {
    this.initI18n(); // Initialize i18n
    // 检查登录状态
    this.checkLoginStatus();

    // 优先检查是否有postId，如果有则调用API获取详情
    if (options.postId) {
      this.loadDiaryDetail(options.postId);
      return;
    }

    // 兼容原有的data传递方式
    if (options.data) {
      try {
        const result = JSON.parse(decodeURIComponent(options.data));
        // 确保analysisId是数字类型
        if (result.analysisId) {
          result.analysisId = parseInt(result.analysisId);
        }

        // 确保hasFeedback字段存在（兼容旧数据）
        if (result.hasFeedback === undefined) {
          result.hasFeedback = false;
        }

        // 格式化解析内容，进行智能分段
        if (result.interpretation) {
          result.interpretationParagraphs = this.formatInterpretation(
            result.interpretation
          );
        }

        // 解析疏导性问题JSON
        if (result.guidingQuestionsJson) {
          try {
            const guidingQuestions = JSON.parse(result.guidingQuestionsJson);
            // 处理问题1和问题2（根据key精确匹配）
            if (guidingQuestions.question1) {
              const questionData = guidingQuestions.question1;
              const question = questionData.question;
              const answer = questionData.answer;

              result.guidingQuestion1 = question;
              result.guidingQuestion1Answer = answer || "";
              if (answer) {
                result.guidingQuestion1 =
                  question + "\n\n💭 我的思考：\n" + answer;
              }
            }

            if (guidingQuestions.question2) {
              const questionData = guidingQuestions.question2;
              const question = questionData.question;
              const answer = questionData.answer;

              result.guidingQuestion2 = question;
              result.guidingQuestion2Answer = answer || "";
              if (answer) {
                result.guidingQuestion2 =
                  question + "\n\n💭 我的思考：\n" + answer;
              }
            }
          } catch (error) {
            result.guidingQuestion1 = "";
            result.guidingQuestion2 = "";
          }
        } else {
          console.log("没有guidingQuestionsJson字段");
        }

        // 检查是否是视频类型：根据 videoPrompt 判断
        const hasVideoPrompt = !!(result.videoPrompt && result.videoPrompt.trim());
        const hasImagePrompt = !!(result.imagePrompt && result.imagePrompt.trim());
        const isVideoType = hasVideoPrompt;
        const isImageType = !hasVideoPrompt && hasImagePrompt;
        const videoUrl = result.videoUrl || null;
        const imageUrl = result.imageUrl || null;

        if (isVideoType) {
          this.setData({
            isVideoType: true,
            videoUrl: videoUrl,
            videoStatus: videoUrl ? 2 : 1, // 如果有videoUrl就是已完成，否则是进行中
          });

          // 如果有 videoPrompt 但没有 videoUrl，且有 postId，开始轮询
          if (hasVideoPrompt && !videoUrl && result.postId) {
            this.startVideoPolling();
          }
        } else if (isImageType) {
          this.setData({
            isVideoType: false,
          });
          
          // 如果有 imagePrompt 但没有 imageUrl，且有 postId，开始轮询
          if (hasImagePrompt && !imageUrl && result.postId) {
            this.setData({ imageLoading: true });
            this.startImagePolling();
          }
        } else {
          this.setData({
            isVideoType: false,
          });
        }

        // 预加载AI图片，转为本地临时路径，避免跨域/域名解析问题
        // 只有文生图模式才处理图片，文生视频不需要图片
        if (!isVideoType && result.imageUrl) {
          this.ensureLocalImage(result.imageUrl)
            .then((localPath) => {
              if (localPath) {
                result.imageUrl = localPath;
              }
              this.setData({ result, loading: false });
            })
            .catch(() => {
              this.setData({ result, loading: false });
            });
        } else {
          this.setData({ result, loading: false });
        }
      } catch (error) {
        console.error("解析结果数据失败:", error);
        wx.showToast({
          title: this.data.i18n.diary.dataError,
          icon: "error",
        });
      }
    }

    // 监听语言变化事件
    this.onLanguageChanged = (newLanguage) => {
      this.initI18n();
    };
    wx.eventBus && wx.eventBus.on("languageChanged", this.onLanguageChanged);
  },

  onShow() {
    this.checkLoginStatus();

    // 强制更新标题
    this.initI18n();
    const newTitle = t("pageTitle.diary");
    wx.setNavigationBarTitle({ title: newTitle });
  },

  onHide() {
    // 停止视频轮询
    this.stopVideoPolling();
    // 停止图片轮询
    this.stopImagePolling();
  },

  onUnload() {
    // 停止视频轮询
    this.stopVideoPolling();
    // 停止图片轮询
    this.stopImagePolling();
    // 移除语言变化事件监听
    wx.eventBus && wx.eventBus.off("languageChanged", this.onLanguageChanged);
    // 清理二维码临时文件（若存在）
    if (this.qrTempPath) {
      this.cleanupTempFile(this.qrTempPath);
      this.qrTempPath = null;
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
        diary: {
          loading: t("diary.loading"),
          dreamContent: t("diary.dreamContent"),
          keywords: t("diary.keywords"),
          dreamAnalysis: t("diary.dreamAnalysis"),
          aiDisclaimer: t("diary.aiDisclaimer"),
          guidingQuestions: t("diary.guidingQuestions"),
          questionsIntro: t("diary.questionsIntro"),
          answerPlaceholder: t("diary.answerPlaceholder"),
          saveAnswers: t("diary.saveAnswers"),
          saving: t("diary.saving"),
          aiImage: t("diary.aiImage"),
          aiVideo: t("diary.aiVideo"),
          imageGenerating: t("diary.imageGenerating"),
          imageGeneratingTip: t("diary.imageGeneratingTip"),
          videoGenerating: t("diary.videoGenerating"),
          videoGeneratingTip: t("diary.videoGeneratingTip"),
          videoFailed: t("diary.videoFailed"),
          videoFailedTip: t("diary.videoFailedTip"),
          publish: t("diary.publish"),
          generatePoster: t("diary.generatePoster"),
          rateUs: t("diary.rateUs"),
          ratingLabel: t("diary.ratingLabel"),
          score: t("diary.score"),
          selectRating: t("diary.selectRating"),
          feedbackLabel: t("diary.feedbackLabel"),
          feedbackPlaceholder: t("diary.feedbackPlaceholder"),
          submitFeedback: t("diary.submitFeedback"),
          submitting: t("diary.submitting"),
          thankYouTitle: t("diary.thankYouTitle"),
          thankYouText: t("diary.thankYouText"),
          noResult: t("diary.noResult"),
          question1: t("diary.question1"),
          question2: t("diary.question2"),
          downloadVideo: t("diary.downloadVideo"),
          setToPrivate: t("diary.setToPrivate"),
          noData: t("diary.noData"),
          generatingPoster: t("diary.generatingPoster"),
          posterComponentNotFound: t("diary.posterComponentNotFound"),
          posterGenerationFailed: t("diary.posterGenerationFailed"),
          dataError: t("diary.dataError"),
          loadFailed: t("diary.loadFailed"),
          videoGenerationComplete: t("diary.videoGenerationComplete"),
          videoGenerationFailed: t("diary.videoGenerationFailed"),
          videoNotGenerated: t("diary.videoNotGenerated"),
          downloading: t("diary.downloading"),
          saveSuccess: t("diary.saveSuccess"),
          saveFailed: t("diary.saveFailed"),
          downloadFailed: t("diary.downloadFailed"),
          authorizationRequired: t("diary.authorizationRequired"),
          allowSaveVideoToAlbum: t("diary.allowSaveVideoToAlbum"),
          dreamAnalysisResult: t("diary.dreamAnalysisResult"),
          publishToCommunity: t("diary.publishToCommunity"),
          publishToCommunityContent: t("diary.publishToCommunityContent"),
          publishing: t("diary.publishing"),
          shareToFriends: t("diary.shareToFriends"),
          saveToAlbum: t("diary.saveToAlbum"),
          copyLink: t("diary.copyLink"),
          copied: t("diary.copied"),
          dataErrorMissingAnalysisId: t("diary.dataErrorMissingAnalysisId"),
          publishSuccess: t("diary.publishSuccess"),
          loginRequired: t("diary.loginRequired"),
          loginRequiredForPublish: t("diary.loginRequiredForPublish"),
          goToLogin: t("diary.goToLogin"),
          publishFailed: t("diary.publishFailed"),
          setToPrivateContent: t("diary.setToPrivateContent"),
          confirm: t("diary.confirm"),
          cancel: t("diary.cancel"),
          setting: t("diary.setting"),
          setSuccess: t("diary.setSuccess"),
          loginRequiredForSetPrivate: t("diary.loginRequiredForSetPrivate"),
          gotIt: t("diary.gotIt"),
          setFailed: t("diary.setFailed"),
          noKeywords: t("diary.noKeywords"),
          noDreamDescription: t("diary.noDreamDescription"),
          noDreamAnalysis: t("diary.noDreamAnalysis"),
          appName: t("diary.appName"),
          aiDreamAnalysis: t("diary.aiDreamAnalysis"),
          pleaseAnswerAtLeastOne: t("diary.pleaseAnswerAtLeastOne"),
          pleaseSelectRatingOrFeedback: t("diary.pleaseSelectRatingOrFeedback"),
          feedbackSubmitSuccess: t("diary.feedbackSubmitSuccess"),
          loginRequiredForFeedback: t("diary.loginRequiredForFeedback"),
          // 海报相关
          myDream: t("diary.myDream"),
          dreamAnalysis: t("diary.dreamAnalysis"),
          aiDreamImage: t("diary.aiDreamImage"),
          aiDreamVideo: t("diary.aiDreamVideo"),
          scanForMore: t("diary.scanForMore"),
          longPressToScan: t("diary.longPressToScan"),
          needAuthForImage: t("diary.needAuthForImage"),
          allowSaveImage: t("diary.allowSaveImage"),
          goToSettings: t("diary.goToSettings"),
          thinkingSaved: t("diary.thinkingSaved"),
          loginRequiredForSave: t("diary.loginRequiredForSave"),
          submitFailed: t("diary.submitFailed"),
          myThinking: t("result.myThinking"), // 复用result中的myThinking
        },
      },
    });
    wx.setNavigationBarTitle({ title: t("pageTitle.diary") });

    // 监听语言切换事件
    wx.eventBus &&
      wx.eventBus.on("languageChanged", () => {
        // 重新设置页面标题
        wx.setNavigationBarTitle({ title: t("pageTitle.diary") });
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
   * 加载梦境日记详情
   * @param {string} postId 梦境日记ID
   */
  async loadDiaryDetail(postId) {
    try {
      wx.showLoading({
        title: this.data.i18n.diary.loading,
      });

      const response = await dreamService.getDiaryDetail(postId);

      if (response && response.data) {
        const diaryData = response.data;

        // 处理keywordsJson字符串，转换为数组
        let keywords = [];
        if (diaryData.keywordsJson) {
          try {
            keywords = JSON.parse(diaryData.keywordsJson);
          } catch (e) {
            console.warn("解析keywordsJson失败:", e);
            keywords = [];
          }
        }

        // 判断是否是专业版
        const isProfessional = diaryData.analysisType === "pro";
        
        // 构建result对象，兼容原有格式
        const result = {
          analysisId: diaryData.analysisId, // 使用API返回的analysisId
          postId: diaryData.postId, // 保留postId字段
          dreamDescription: diaryData.dreamDescription,
          keywords: keywords,
          interpretation: isProfessional ? (diaryData.proMarkdown || "") : (diaryData.interpretation || ""),
          imagePrompt: diaryData.imagePrompt,
          imageUrl: diaryData.imageUrl,
          videoPrompt: diaryData.videoPrompt,
          videoUrl: diaryData.videoUrl,
          guidingQuestionsJson: diaryData.guidingQuestionsJson, // 添加疏导性问题JSON
          likeCount: diaryData.likeCount,
          favoriteCount: diaryData.favoriteCount,
          createdAt: diaryData.createdAt,
          visibility: diaryData.visibility,
          hasFeedback: diaryData.hasFeedback || false, // 是否已提交反馈
          analysisType: diaryData.analysisType || "", // 保存分析类型
        };

        // 格式化解析内容
        if (isProfessional && diaryData.proMarkdown) {
          // 专业版：将 markdown 转换为 HTML
          result.interpretationHTML = this.markdownToHTML(diaryData.proMarkdown);
          result.generationType = "professional";
        } else if (result.interpretation) {
          // 普通版：使用智能分段
          result.interpretationParagraphs = this.formatInterpretation(
            result.interpretation
          );
        }

        // 解析疏导性问题JSON
        if (result.guidingQuestionsJson) {
          try {
            const guidingQuestions = JSON.parse(result.guidingQuestionsJson);
            // 处理问题1和问题2（根据key精确匹配）
            if (guidingQuestions.question1) {
              const questionData = guidingQuestions.question1;
              const question = questionData.question;
              const answer = questionData.answer;

              result.guidingQuestion1 = question;
              result.guidingQuestion1Answer = answer || "";
              if (answer) {
                result.guidingQuestion1 =
                  question + "\n\n💭 我的思考：\n" + answer;
              }
            }

            if (guidingQuestions.question2) {
              const questionData = guidingQuestions.question2;
              const question = questionData.question;
              const answer = questionData.answer;

              result.guidingQuestion2 = question;
              result.guidingQuestion2Answer = answer || "";
              if (answer) {
                result.guidingQuestion2 =
                  question + "\n\n💭 我的思考：\n" + answer;
              }
            }
          } catch (error) {
            result.guidingQuestion1 = "";
            result.guidingQuestion2 = "";
          }
        } else {
          console.log("loadDiaryDetail - 没有guidingQuestionsJson字段");
        }

        // 专业版不需要轮询图片和视频
        if (isProfessional) {
          result.generationType = "professional";
          this.setData({
            isVideoType: false,
            result,
            loading: false,
          });
          wx.hideLoading();
          return;
        }

        // 判断内容类型：根据 videoPrompt 和 imagePrompt 来判断
        // 优先视频，其次图片，最后文本
        const hasVideoPrompt = !!(result.videoPrompt && result.videoPrompt.trim());
        const hasImagePrompt = !!(result.imagePrompt && result.imagePrompt.trim());
        
        const isVideoType = hasVideoPrompt;
        const isImageType = !hasVideoPrompt && hasImagePrompt;

        if (isVideoType) {
          result.generationType = "video";
          
          // 判断是否需要轮询：有 videoPrompt 但没有 videoUrl，且 postId 存在
          const hasVideoUrl = result.videoUrl && typeof result.videoUrl === 'string' && result.videoUrl.trim() !== "";
          const shouldStartPolling = hasVideoPrompt && !hasVideoUrl && postId;
 
          // 确保 result 中有 postId（使用传入的参数或 API 返回的值）
          result.postId = result.postId || postId;
          
          this.setData({
            isVideoType: true,
            videoUrl: result.videoUrl || null,
            videoStatus: result.videoUrl ? 2 : 1, // 如果有videoUrl就是已完成，否则是进行中
            result,
          });
          
          // 如果有 videoPrompt 但没有 videoUrl，开始轮询（postId 一定存在）
          if (shouldStartPolling) {
            // 使用 setTimeout 确保 setData 完成后再启动轮询
            setTimeout(() => {
              this.startVideoPolling();
            }, 100);
          } else {
            console.log("不满足视频轮询条件，跳过轮询");
          }
        } else if (isImageType) {
          result.generationType = "image";
          
          // 确保 result 中有 postId（使用传入的参数或 API 返回的值）
          result.postId = result.postId || postId;
          
          this.setData({
            isVideoType: false,
            result,
          });
          
          // 如果有 imagePrompt 但没有 imageUrl，开始轮询（postId 一定存在）
          const hasImageUrl = result.imageUrl && typeof result.imageUrl === 'string' && result.imageUrl.trim() !== "";
          if (hasImagePrompt && !hasImageUrl && postId) {
            this.setData({ imageLoading: true });
            setTimeout(() => {
              this.startImagePolling();
            }, 100);
          }
        } else {
          result.generationType = "text";
          this.setData({
            isVideoType: false,
            result,
          });
        }

        // 预加载AI图片，转为本地临时路径，避免跨域/域名解析问题
        // 只有文生图模式且有图片URL时才处理
        if (!isVideoType && result.imageUrl) {
          this.ensureLocalImage(result.imageUrl)
            .then((localPath) => {
              if (localPath) {
                result.imageUrl = localPath;
              }
              this.setData({ result, loading: false });
            })
            .catch(() => {
              this.setData({ result, loading: false });
            });
        } else if (!isVideoType && !hasImagePrompt) {
          // 既不是视频，也没有图片提示词，直接设置完成
          this.setData({ result, loading: false });
        } else if (!isVideoType && hasImagePrompt && result.imageUrl) {
          // 有图片提示词且有图片URL，处理图片
          this.ensureLocalImage(result.imageUrl)
            .then((localPath) => {
              if (localPath) {
                result.imageUrl = localPath;
              }
              this.setData({ result, loading: false, imageLoading: false });
            })
            .catch(() => {
              this.setData({ result, loading: false, imageLoading: false });
            });
        } else {
          // 其他情况（正在轮询），保持 loading: false，让轮询处理
          this.setData({ loading: false });
        }

        wx.hideLoading();
      } else {
        throw new Error("API返回数据格式错误");
      }
    } catch (error) {
      console.error("加载梦境日记详情失败:", error);
      this.setData({ loading: false });
      wx.hideLoading();
      wx.showToast({
        title: this.data.i18n.diary.loadFailed,
        icon: "error",
      });
    }
  },

  /**
   * 开始视频状态轮询（串行：每次完成后等待5秒再请求，最多60次）
   */
  startVideoPolling() {
    // 采用串行轮询：本次请求完成后，再等待5秒触发下一次
    this.pollVideoStatus();
  },

  /**
   * 停止视频轮询
   */
  stopVideoPolling() {
    if (this.videoPollingTimer) {
      clearTimeout(this.videoPollingTimer);
      this.videoPollingTimer = null;
    }
  },

  /**
   * 轮询视频状态：使用 getDiaryDetail 接口
   */
  async pollVideoStatus() {
    const { result, videoPollCount, videoStatus } = this.data;

    // 专业版不需要轮询视频
    if (result && result.generationType === "professional") {
      this.stopVideoPolling();
      return;
    }

    // 已完成/失败则停止
    if (videoStatus === 2 || videoStatus === 3) {
      this.stopVideoPolling();
      return;
    }

    // 达到最大次数后停止（最多60次）
    if (videoPollCount >= 60) {
      this.stopVideoPolling();
      return;
    }

    if (!result || !result.postId) {
      this.stopVideoPolling();
      return;
    }

    let requestSucceeded = false;
    try {
      const dreamService = require("../../services/dream.js");
      const response = await dreamService.getDiaryDetail(result.postId);
      if (response && response.code === 0 && response.data) {
        requestSucceeded = true;
        const diaryData = response.data;
        const latestUrl = diaryData.videoUrl || null;

        // 判断视频状态：如果有 videoUrl 就是已完成，如果有 videoPrompt 但没有 videoUrl 就是进行中
        let videoStatusNum = 1; // 默认进行中
        if (latestUrl) {
          videoStatusNum = 2; // 已完成
        } else if (diaryData.videoPrompt && diaryData.videoPrompt.trim()) {
          videoStatusNum = 1; // 进行中
        } else {
          videoStatusNum = 3; // 失败（没有videoPrompt也没有videoUrl）
        }

        // 处理keywordsJson字符串，转换为数组
        let keywords = [];
        if (diaryData.keywordsJson) {
          try {
            keywords = JSON.parse(diaryData.keywordsJson);
          } catch (e) {
            console.warn("解析keywordsJson失败:", e);
            keywords = result.keywords || [];
          }
        } else {
          keywords = result.keywords || [];
        }

        // 判断是否是专业版
        const isProfessional = diaryData.analysisType === "pro";
        
        // 更新完整的 result 对象，包括所有字段
        const updatedResult = {
          ...result,
          analysisId: diaryData.analysisId || result.analysisId,
          postId: diaryData.postId || result.postId,
          dreamDescription: diaryData.dreamDescription || result.dreamDescription || "",
          keywords: keywords,
          interpretation: isProfessional ? (diaryData.proMarkdown || "") : (diaryData.interpretation || result.interpretation || ""),
          imagePrompt: diaryData.imagePrompt || result.imagePrompt || "",
          imageUrl: diaryData.imageUrl || result.imageUrl || null, // 重要：更新 imageUrl
          videoPrompt: diaryData.videoPrompt || result.videoPrompt || "",
          videoUrl: diaryData.videoUrl || result.videoUrl || null,
          guidingQuestionsJson: diaryData.guidingQuestionsJson || result.guidingQuestionsJson || "",
          hasFeedback: result.hasFeedback || false,
          generationType: isProfessional ? "professional" : (result.generationType || "video"),
          analysisType: diaryData.analysisType || result.analysisType || "",
        };

        // 格式化解析内容
        if (isProfessional && diaryData.proMarkdown) {
          // 专业版：将 markdown 转换为 HTML
          updatedResult.interpretationHTML = this.markdownToHTML(diaryData.proMarkdown);
        } else if (updatedResult.interpretation) {
          // 普通版：使用智能分段
          updatedResult.interpretationParagraphs = this.formatInterpretation(
            updatedResult.interpretation
          );
        }

        // 解析疏导性问题JSON（如果存在）
        if (updatedResult.guidingQuestionsJson) {
          try {
            const guidingQuestions = JSON.parse(updatedResult.guidingQuestionsJson);
            if (guidingQuestions.question1) {
              const questionData = guidingQuestions.question1;
              const question = questionData.question;
              const answer = questionData.answer || "";
              updatedResult.guidingQuestion1 = question;
              updatedResult.guidingQuestion1Answer = answer;
              if (answer) {
                updatedResult.guidingQuestion1 =
                  question + "\n\n💭 我的思考：\n" + answer;
              }
            }
            if (guidingQuestions.question2) {
              const questionData = guidingQuestions.question2;
              const question = questionData.question;
              const answer = questionData.answer || "";
              updatedResult.guidingQuestion2 = question;
              updatedResult.guidingQuestion2Answer = answer;
              if (answer) {
                updatedResult.guidingQuestion2 =
                  question + "\n\n💭 我的思考：\n" + answer;
              }
            }
          } catch (error) {
            // 解析失败，保持原有值
          }
        }

        // 如果 imageUrl 是远程 URL，转换为本地路径
        if (updatedResult.imageUrl && typeof updatedResult.imageUrl === 'string' && 
            (updatedResult.imageUrl.startsWith('http://') || updatedResult.imageUrl.startsWith('https://'))) {
          try {
            const localImagePath = await this.ensureLocalImage(updatedResult.imageUrl);
            if (localImagePath) {
              updatedResult.imageUrl = localImagePath;
            }
          } catch (error) {
            console.error("imageUrl 转换失败:", error);
          }
        }

        const update = { videoStatus: videoStatusNum };

        if (videoStatusNum === 2 && latestUrl) {
          update.videoUrl = latestUrl;
          // 完整更新 result 对象，包括 imageUrl
          this.setData({
            ...update,
            result: updatedResult,
          });
          this.stopVideoPolling();
          wx.showToast({
            title: this.data.i18n.diary.videoGenerationComplete,
            icon: "success",
            duration: 2000,
          });
          return;
        }

        if (videoStatusNum === 3) {
          // 失败时也更新 result（可能包含 imageUrl）
          this.setData({
            ...update,
            result: updatedResult,
          });
          this.stopVideoPolling();
          wx.showToast({
            title: this.data.i18n.diary.videoGenerationFailed,
            icon: "error",
            duration: 2000,
          });
          return;
        }

        // 更新进行中状态，同时更新 result（可能包含 imageUrl）
        this.setData({
          ...update,
          result: updatedResult,
        });
      }
    } catch (error) {
      console.error("查询视频状态失败:", error);
      // 不中断，继续串行轮询
    } finally {
      const next = (this.data.videoPollCount || 0) + 1;
      this.setData({ videoPollCount: next });
      // 仅在本次请求成功时，5秒后进入下一次；最多60次
      if (
        requestSucceeded &&
        this.data.videoStatus !== 2 &&
        this.data.videoStatus !== 3 &&
        next < 60
      ) {
        this.videoPollingTimer = setTimeout(() => {
          this.pollVideoStatus();
        }, 5000);
      }
    }
  },

  /**
   * 开始图片状态轮询（串行：每次完成后等待5秒再请求，最多60次）
   */
  startImagePolling() {
    // 采用串行轮询：本次请求完成后，再等待5秒触发下一次
    this.pollImageStatus();
  },

  /**
   * 停止图片轮询
   */
  stopImagePolling() {
    if (this.imagePollingTimer) {
      clearTimeout(this.imagePollingTimer);
      this.imagePollingTimer = null;
    }
  },

  /**
   * 轮询图片状态：使用 getDiaryDetail 接口
   */
  async pollImageStatus() {
    const { result, imagePollCount, imageLoading } = this.data;
    if (!imageLoading) return;

    // 专业版不需要轮询图片
    if (result && result.generationType === "professional") {
      this.stopImagePolling();
      this.setData({ imageLoading: false });
      return;
    }

    // 达到最大次数后停止
    if (imagePollCount >= 60) {
      this.stopImagePolling();
      this.setData({ imageLoading: false });
      return;
    }

    let requestSucceeded = false;
    try {
      const dreamService = require("../../services/dream.js");
      if (!result || !result.postId) {
        console.warn("图片轮询缺少 postId，停止轮询");
        this.stopImagePolling();
        this.setData({ imageLoading: false });
        return;
      }

      const response = await dreamService.getDiaryDetail(result.postId);
      if (response && response.code === 0 && response.data) {
        requestSucceeded = true;
        const diaryData = response.data;

        // 处理keywordsJson字符串，转换为数组
        let keywords = [];
        if (diaryData.keywordsJson) {
          try {
            keywords = JSON.parse(diaryData.keywordsJson);
          } catch (e) {
            console.warn("解析keywordsJson失败:", e);
            keywords = result.keywords || [];
          }
        } else {
          keywords = result.keywords || [];
        }

        // 判断是否是专业版
        const isProfessional = diaryData.analysisType === "pro";
        
        // 归一化结构：保留原有 result 的所有字段，只更新轮询返回的字段
        const normalized = {
          ...result, // 先保留原有所有字段
          // 更新轮询接口返回的字段
          analysisId: diaryData.analysisId || result.analysisId,
          postId: diaryData.postId || result.postId,
          dreamDescription: diaryData.dreamDescription || result.dreamDescription || "",
          keywords: keywords,
          interpretation: isProfessional ? (diaryData.proMarkdown || "") : (diaryData.interpretation || result.interpretation || ""),
          imagePrompt: diaryData.imagePrompt || result.imagePrompt || "",
          // 注意：这里优先使用 API 返回的新值，如果 API 没有返回则保持旧值
          imageUrl: diaryData.imageUrl !== undefined && diaryData.imageUrl !== null ? diaryData.imageUrl : result.imageUrl,
          videoPrompt: diaryData.videoPrompt || result.videoPrompt || "",
          videoUrl: diaryData.videoUrl || result.videoUrl || null,
          guidingQuestionsJson: diaryData.guidingQuestionsJson || result.guidingQuestionsJson || "",
          generationType: isProfessional ? "professional" : (result.generationType || "image"),
          hasFeedback: result.hasFeedback || false, // 保持原有的hasFeedback值，不从轮询接口同步
          analysisType: diaryData.analysisType || result.analysisType || "",
        };

        // 格式化解析内容
        if (isProfessional && diaryData.proMarkdown) {
          // 专业版：将 markdown 转换为 HTML
          normalized.interpretationHTML = this.markdownToHTML(diaryData.proMarkdown);
        } else if (normalized.interpretation) {
          // 普通版：使用智能分段
          normalized.interpretationParagraphs = this.formatInterpretation(
            normalized.interpretation
          );
        }

        // 解析疏导性问题JSON（如果存在）
        if (normalized.guidingQuestionsJson) {
          try {
            const guidingQuestions = JSON.parse(normalized.guidingQuestionsJson);
            if (guidingQuestions.question1) {
              const questionData = guidingQuestions.question1;
              const question = questionData.question;
              const answer = questionData.answer || "";
              normalized.guidingQuestion1 = question;
              normalized.guidingQuestion1Answer = answer;
              if (answer) {
                normalized.guidingQuestion1 =
                  question + "\n\n💭 我的思考：\n" + answer;
              }
            }
            if (guidingQuestions.question2) {
              const questionData = guidingQuestions.question2;
              const question = questionData.question;
              const answer = questionData.answer || "";
              normalized.guidingQuestion2 = question;
              normalized.guidingQuestion2Answer = answer;
              if (answer) {
                normalized.guidingQuestion2 =
                  question + "\n\n💭 我的思考：\n" + answer;
              }
            }
          } catch (error) {
            // 解析失败，保持原有值
          }
        }

        // 检查 API 是否返回了新的 imageUrl（只有新值才处理，避免使用旧值）
        const latestImageUrl = diaryData.imageUrl;
      

        if (latestImageUrl && latestImageUrl.trim()) {
          // API 返回了新的 imageUrl，转换为本地路径
          const localPath = await this.ensureLocalImage(latestImageUrl);
          normalized.imageUrl = localPath || latestImageUrl;
          this.setData({ result: normalized, imageLoading: false });
          this.stopImagePolling();
          return;
        } else {
          console.log("轮询数据中没有新的 imageUrl，继续轮询");
        }

        // 未拿到图片，更新其他字段并继续轮询
        this.setData({ result: normalized });
      }
    } catch (error) {
      // 静默错误，继续尝试下一次
      console.warn("图片轮询失败，继续重试:", error);
    } finally {
      const nextCount = imagePollCount + 1;
      this.setData({ imagePollCount: nextCount });

      // 若仍在加载且未达上限，并且请求成功，则5秒后进入下一次轮询
      if (requestSucceeded && this.data.imageLoading && nextCount < 60) {
        this.imagePollingTimer = setTimeout(() => {
          this.pollImageStatus();
        }, 5000);
      }
    }
  },

  /**
   * 预览视频
   */
  onPreviewVideo() {
    const { videoUrl } = this.data;
    if (!videoUrl) {
      wx.showToast({
        title: this.data.i18n.diary.videoNotGenerated,
        icon: "none",
      });
      return;
    }

    // 使用小程序的视频预览
    wx.previewMedia({
      sources: [
        {
          url: videoUrl,
          type: "video",
        },
      ],
      current: 0,
    });
  },

  /**
   * 为视频生成默认封面图
   */
  generateVideoThumbnail(videoUrl) {
    return new Promise((resolve, reject) => {
      try {
        // 小程序无法直接从视频生成封面图，使用默认的封面图
        // 这里可以返回一个默认的封面图URL，或者生成一个简单的封面图

        // 方案1：使用默认封面图
        const defaultThumbnailUrl =
          this.data.imageUrls?.BACKGROUNDS?.PERSON || null;
        if (defaultThumbnailUrl) {
          this.ensureLocalImage(defaultThumbnailUrl)
            .then(resolve)
            .catch(reject);
        } else {
          // 方案2：生成一个简单的文字封面图
          this.generateTextThumbnail().then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * 生成文字封面图
   */
  generateTextThumbnail() {
    return new Promise((resolve, reject) => {
      try {
        const query = wx.createSelectorQuery();
        query
          .select("#video-canvas")
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res[0]) {
              const canvas = res[0].node;
              const ctx = canvas.getContext("2d");

              // 设置画布尺寸
              canvas.width = 400;
              canvas.height = 400;

              // 绘制背景
              ctx.fillStyle = "#8B5CF6";
              ctx.fillRect(0, 0, 400, 400);

              // 绘制文字
              ctx.fillStyle = "#ffffff";
              ctx.font = "32px Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("AI梦境视频", 200, 180);

              ctx.font = "24px Arial";
              ctx.fillText("点击查看视频", 200, 220);

              // 导出为图片
              wx.canvasToTempFilePath({
                canvas: canvas,
                success: (res) => {
                  resolve(res.tempFilePath);
                },
                fail: reject,
              });
            } else {
              reject(new Error("Canvas not found"));
            }
          });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * 下载视频到本地
   */
  onDownloadVideo() {
    const { videoUrl } = this.data;
    if (!videoUrl) {
      wx.showToast({
        title: this.data.i18n.diary.videoNotGenerated,
        icon: "none",
      });
      return;
    }

    // 先检查相册权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting["scope.writePhotosAlbum"] === false) {
          // 用户之前拒绝了权限，需要引导到设置页面
          wx.showModal({
            title: this.data.i18n.diary.authorizationRequired,
            content: this.data.i18n.diary.allowSaveVideoToAlbum,
            confirmText: this.data.i18n.diary.goToSettings,
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            },
          });
          return;
        }

        // 权限未确定或已授权，先请求权限
        wx.authorize({
          scope: "scope.writePhotosAlbum",
          success: () => {
            this.startVideoDownload(videoUrl);
          },
          fail: () => {
            wx.showModal({
              title: this.data.i18n.diary.authorizationRequired,
              content: this.data.i18n.diary.allowSaveVideoToAlbum,
              confirmText: this.data.i18n.diary.goToSettings,
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting();
                }
              },
            });
          },
        });
      },
    });
  },

  /**
   * 开始下载视频
   */
  startVideoDownload(videoUrl) {
    // 显示下载提示
    wx.showLoading({
      title: this.data.i18n.diary.downloading,
    });

    // 下载视频文件
    wx.downloadFile({
      url: videoUrl,
      success: (res) => {
        wx.hideLoading();

        if (res.statusCode === 200) {
          // 保存到相册
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({
                title: this.data.i18n.diary.saveSuccess,
                icon: "success",
                duration: 2000,
              });
            },
            fail: (err) => {
              console.error("保存视频失败:", err);
              if (err.errMsg.includes("auth deny")) {
                wx.showModal({
                  title: this.data.i18n.diary.authorizationRequired,
                  content: this.data.i18n.diary.allowSaveVideoToAlbum,
                  confirmText: this.data.i18n.diary.goToSettings,
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  },
                });
              } else {
                console.error("保存视频失败，错误信息:", err.errMsg);
                wx.showToast({
                  title: this.data.i18n.diary.saveFailed,
                  icon: "error",
                  duration: 2000,
                });
              }
            },
          });
        } else {
          console.error("视频下载失败，状态码:", res.statusCode);
          wx.showToast({
            title: this.data.i18n.diary.downloadFailed,
            icon: "error",
            duration: 2000,
          });
        }
      },
      fail: (err) => {
        console.error("视频下载失败，详细错误:", err);
        wx.hideLoading();

        // 根据错误类型提供更具体的提示
        let errorMessage = t("diary.downloadFailed");
        if (err.errMsg) {
          if (err.errMsg.includes("network")) {
            errorMessage = "网络连接失败，请检查网络后重试";
          } else if (err.errMsg.includes("timeout")) {
            errorMessage = "下载超时，请重试";
          } else if (err.errMsg.includes("storage")) {
            errorMessage = "存储空间不足，请清理后重试";
          }
        }

        wx.showToast({
          title: errorMessage,
          icon: "error",
          duration: 3000,
        });
      },
    });
  },

  /**
   * Markdown 转 HTML（用于专业版显示）
   */
  markdownToHTML(markdown) {
    if (!markdown || typeof markdown !== "string") {
      return "";
    }

    let html = markdown;

    // 处理标题（必须在处理其他格式之前）
    html = html.replace(/^### (.*$)/gim, '<h3 class="markdown-h3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="markdown-h2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="markdown-h1">$1</h1>');

    // 处理加粗 **text**（需要处理嵌套的情况）
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="markdown-bold">$1</strong>');

    // 处理列表项 - item（需要处理多行）
    const lines = html.split('\n');
    const processedLines = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const listMatch = line.match(/^- (.+)$/);
      
      if (listMatch) {
        if (!inList) {
          processedLines.push('<ul class="markdown-ul">');
          inList = true;
        }
        // 处理列表项中的加粗和其他格式
        let listContent = listMatch[1]
          .replace(/\*\*([^*]+)\*\*/g, '<strong class="markdown-bold">$1</strong>')
          .trim();
        processedLines.push(`<li class="markdown-li">${listContent}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        // 处理普通行中的加粗
        let processedLine = line.replace(/\*\*([^*]+)\*\*/g, '<strong class="markdown-bold">$1</strong>');
        // 如果不是标题，则作为普通文本
        if (!processedLine.match(/^<h[1-3]/)) {
          processedLines.push(processedLine);
        } else {
          processedLines.push(processedLine);
        }
      }
    }
    
    if (inList) {
      processedLines.push('</ul>');
    }
    
    html = processedLines.join('\n');

    // 处理段落：将连续的文本行（非标题、非列表）包裹在 p 标签中
    html = html.split('\n');
    const paragraphLines = [];
    let currentParagraph = [];
    
    for (let i = 0; i < html.length; i++) {
      const line = html[i].trim();
      
      if (!line) {
        // 空行，结束当前段落
        if (currentParagraph.length > 0) {
          paragraphLines.push(`<p class="markdown-p">${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }
      } else if (line.match(/^<h[1-3]|^<ul|^<\/ul|^<li/)) {
        // 标题或列表，先结束当前段落
        if (currentParagraph.length > 0) {
          paragraphLines.push(`<p class="markdown-p">${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }
        paragraphLines.push(line);
      } else {
        // 普通文本，加入当前段落
        currentParagraph.push(line);
      }
    }
    
    // 处理最后一段
    if (currentParagraph.length > 0) {
      paragraphLines.push(`<p class="markdown-p">${currentParagraph.join(' ')}</p>`);
    }
    
    html = paragraphLines.join('\n');

    // 清理空的段落和多余的空白
    html = html.replace(/<p class="markdown-p"><\/p>/g, '');
    html = html.replace(/<p class="markdown-p">\s*<\/p>/g, '');
    html = html.replace(/\n{3,}/g, '\n\n');

    return html;
  },

  /**
   * 智能分段函数
   */
  formatInterpretation(text) {
    if (!text || typeof text !== "string") {
      return [];
    }

    // 清理文本，去除多余空格
    const cleanText = text.replace(/\s+/g, " ").trim();

    // 按句号、问号、感叹号分段，但保留标点符号
    const sentences = cleanText
      .split(/([。！？])/)
      .filter((item) => item.trim());

    // 重新组合句子和标点符号
    const combinedSentences = [];
    for (let i = 0; i < sentences.length; i += 2) {
      if (sentences[i]) {
        const sentence = sentences[i].trim();
        const punctuation = sentences[i + 1] || "";
        if (sentence) {
          combinedSentences.push(sentence + punctuation);
        }
      }
    }

    // 每2-3句组成一个段落，避免段落过长
    const paragraphs = [];
    for (let i = 0; i < combinedSentences.length; i += 2) {
      const paragraphSentences = combinedSentences.slice(i, i + 2);
      const paragraph = paragraphSentences.join("").trim();
      if (paragraph) {
        paragraphs.push(paragraph);
      }
    }

    // 如果分段后段落太少，尝试按逗号进一步分段
    if (paragraphs.length <= 1 && cleanText.length > 200) {
      const commaSplit = cleanText.split(/[，,]/);
      if (commaSplit.length > 2) {
        const newParagraphs = [];
        for (let i = 0; i < commaSplit.length; i += 3) {
          const paragraphSentences = commaSplit.slice(i, i + 3);
          const paragraph = paragraphSentences.join("，").trim();
          if (paragraph) {
            newParagraphs.push(paragraph);
          }
        }
        return newParagraphs.length > 1 ? newParagraphs : paragraphs;
      }
    }

    return paragraphs.length > 0 ? paragraphs : [cleanText];
  },

  /**
   * 个人信息设置完成回调
   */
  onProfileSetupComplete(e) {
    // 更新登录状态
    this.checkLoginStatus();
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
   * 跳过个人信息设置
   */
  onProfileSetupSkip() {
    console.log('用户跳过个人信息设置');
    this.setData({
      showProfileSetupModal: false,
    });
    // 更新登录状态
    this.checkLoginStatus();
  },

  // 返回首页
  onBackHome() {
    try {
      // 先尝试返回上一页
      wx.navigateBack({
        delta: 1,
        fail: (err) => {
          // 如果返回失败，跳转到首页
          wx.reLaunch({
            url: "/pages/index/index",
          });
        },
      });
    } catch (error) {
      console.error("返回操作异常:", error);
      // 异常情况下跳转到首页
      wx.reLaunch({
        url: "/pages/index/index",
      });
    }
  },

  // 关闭页面
  onClose() {
    try {
      // 先尝试返回上一页
      wx.navigateBack({
        delta: 1,
        fail: (err) => {
          // 如果返回失败，跳转到首页
          wx.reLaunch({
            url: "/pages/index/index",
          });
        },
      });
    } catch (error) {
      console.error("关闭操作异常:", error);
      // 异常情况下跳转到首页
      wx.reLaunch({
        url: "/pages/index/index",
      });
    }
  },

  // 预览图片
  onPreviewImage() {
    const { result } = this.data;
    if (result && result.imageUrl) {
      wx.previewImage({
        urls: [result.imageUrl],
        current: result.imageUrl,
      });
    }
  },

  // 分享
  onShare() {
    const { result } = this.data;
    if (result) {
      return {
        title: this.data.i18n.diary.dreamAnalysisResult,
        path: `/pages/diary/diary?data=${encodeURIComponent(
          JSON.stringify(result)
        )}`,
        imageUrl: result.imageUrl || "",
      };
    }
    return {
      title: this.data.i18n.diary.dreamAnalysis,
      path: "/pages/index/index",
    };
  },

  // 长按分享
  onLongPressShare() {
    wx.showActionSheet({
      itemList: [
        this.data.i18n.diary.shareToFriends,
        this.data.i18n.diary.saveToAlbum,
        this.data.i18n.diary.copyLink,
      ],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.onShare();
            break;
          case 1:
            this.saveToAlbum();
            break;
          case 2:
            this.copyLink();
            break;
        }
      },
    });
  },

  // 保存到相册
  saveToAlbum() {
    const { result } = this.data;
    if (result && result.imageUrl) {
      wx.saveImageToPhotosAlbum({
        filePath: result.imageUrl,
        success: () => {
          wx.showToast({
            title: this.data.i18n.diary.saveSuccess,
            icon: "success",
          });
        },
        fail: () => {
          wx.showToast({
            title: this.data.i18n.diary.saveFailed,
            icon: "error",
          });
        },
      });
    }
  },

  // 复制链接
  copyLink() {
    const { result } = this.data;
    if (result) {
      wx.setClipboardData({
        data: `${this.data.i18n.diary.dreamAnalysisResult}：${result.dreamDescription}`,
        success: () => {
          wx.showToast({
            title: this.data.i18n.diary.copied,
            icon: "success",
          });
        },
      });
    }
  },

  // 发布到社区
  onPublishToCommunity() {
    const { result } = this.data;

    if (!result || !result.analysisId) {
      wx.showToast({
        title: this.data.i18n.diary.dataErrorMissingAnalysisId,
        icon: "error",
      });
      return;
    }

    // 显示确认对话框
    wx.showModal({
      title: this.data.i18n.diary.publishToCommunity,
      content: this.data.i18n.diary.publishToCommunityContent,
      confirmText: this.data.i18n.diary.publish,
      cancelText: this.data.i18n.diary.cancel,
      success: (res) => {
        if (res.confirm) {
          this.publishToCommunity();
        }
      },
    });
  },

  // 调用发布接口
  async publishToCommunity() {
    const { result } = this.data;
    try {
      // 显示加载提示
      wx.showLoading({
        title: this.data.i18n.diary.publishing,
      });

      // 调用发布接口
      const http = require("../../services/http.js");
      const requestData = {
        analysisId: result.analysisId,
        isPublic: 1,
      };


      const response = await http.post("/dream/posts/publish", requestData);


      if (response && response.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: this.data.i18n.diary.publishSuccess,
          icon: "success",
          duration: 2000,
        });

        // 立即更新本地可见性为已发布，切换按钮样式与文案
        this.setData({
          "result.visibility": 1,
        });

        // 可以在这里添加其他成功后的处理，比如跳转到社区页面
        setTimeout(() => {
          wx.navigateTo({
            url: "/pages/community/community",
          });
        }, 2000);
      } else {
        throw new Error(response?.message || "发布失败");
      }
    } catch (error) {
      console.error("发布失败:", error);
      wx.hideLoading();

      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.diary.loginRequired,
          content: this.data.i18n.diary.loginRequiredForPublish,
          confirmText: this.data.i18n.diary.goToLogin,
          success: (res) => {
            if (res.confirm) {
              // 跳转到登录页面或显示登录弹窗
              wx.navigateTo({
                url: "/pages/profile/profile",
              });
            }
          },
        });
      } else {
        wx.showToast({
          title: error.message || this.data.i18n.diary.publishFailed,
          icon: "error",
          duration: 2000,
        });
      }
    }
  },

  // 设置为仅个人可见
  async onSetToPrivate() {
    const { result } = this.data;

    try {
      // 显示确认弹窗
      const res = await new Promise((resolve) => {
        wx.showModal({
          title: this.data.i18n.diary.setToPrivate,
          content: this.data.i18n.diary.setToPrivateContent,
          confirmText: this.data.i18n.diary.confirm,
          cancelText: this.data.i18n.diary.cancel,
          success: resolve,
        });
      });

      if (!res.confirm) {
        return;
      }

      // 显示加载提示
      wx.showLoading({
        title: this.data.i18n.diary.setting,
      });

      // 调用设置为私密接口
      const http = require("../../services/http.js");
      const requestData = {
        analysisId: result.analysisId,
        isPublic: 0, // 0表示仅个人可见
      };


      const response = await http.post("/dream/posts/publish", requestData);

      if (response && response.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: this.data.i18n.diary.setSuccess,
          icon: "success",
          duration: 2000,
        });

        // 更新本地数据状态
        this.setData({
          "result.visibility": 0, // 更新为仅个人可见
        });
      } else {
        throw new Error(response?.message || "设置失败");
      }
    } catch (error) {
      console.error("设置为仅个人可见失败:", error);
      wx.hideLoading();

      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.diary.loginRequired,
          content: this.data.i18n.diary.loginRequiredForSetPrivate,
          showCancel: false,
          confirmText: this.data.i18n.diary.gotIt,
        });
      } else {
        wx.showToast({
          title: error.message || this.data.i18n.diary.setFailed,
          icon: "error",
          duration: 2000,
        });
      }
    }
  },

  // 生成海报
  async onGeneratePoster() {
    if (!this.data.result) {
      wx.showToast({
        title: this.data.i18n.diary.noData,
        icon: "error",
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: this.data.i18n.diary.generatingPoster,
    });

    try {
      // 构建 Painter 海报配置
      await this.buildPainterPalette();
    } catch (error) {
      console.error("生成海报配置失败:", error);
      wx.hideLoading();
      wx.showToast({
        title: this.data.i18n.diary.posterGenerationFailed,
        icon: "error",
      });
    }
  },

  // 获取小程序码
  async getQRCode() {
    try {
      const config = require("../../config/env.js");
      // 构建小程序码URL（修正为 /auth/wechat/mini）
      const qrCodeUrl = `${config.baseURL}/auth/wechat/mini?path=pages/index/index`;

      // 先清理旧的二维码文件，避免存储空间累积
      this.cleanupOldQRFiles();

      // 直接下载二维码二进制，写入本地文件后返回本地路径，避免授权头在 downloadFile 中无法携带的问题
      return new Promise((resolve) => {
        const token =
          (getApp() && getApp().globalData && getApp().globalData.token) || "";
        wx.request({
          url: qrCodeUrl,
          method: "GET",
          header: token ? { Authorization: `Bearer ${token}` } : {},
          responseType: "arraybuffer",
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              try {
                const fs = wx.getFileSystemManager();
                const filePath = `${
                  wx.env.USER_DATA_PATH
                }/qr_${Date.now()}.png`;
                fs.writeFile({
                  filePath,
                  data: res.data,
                  encoding: "binary",
                  success: () => {
                    // 记录二维码文件路径以便生成后清理
                    this.qrTempPath = filePath;
                    resolve(filePath);
                  },
                  fail: (e) => {
                    console.warn("写入二维码失败（可能存储空间不足）:", e);
                    // 如果写入 USER_DATA_PATH 失败，尝试使用 downloadFile 下载到临时目录
                    this.downloadQRCodeToTemp(qrCodeUrl, token)
                      .then((tempPath) => {
                        if (tempPath) {
                          this.qrTempPath = tempPath;
                          resolve(tempPath);
                        } else {
                          resolve(null);
                        }
                      })
                      .catch(() => {
                        resolve(null);
                      });
                  },
                });
              } catch (e) {
                console.warn("保存二维码异常:", e);
                // 尝试使用 downloadFile 作为备用方案
                this.downloadQRCodeToTemp(qrCodeUrl, token)
                  .then((tempPath) => {
                    if (tempPath) {
                      this.qrTempPath = tempPath;
                      resolve(tempPath);
                    } else {
                      resolve(null);
                    }
                  })
                  .catch(() => {
                    resolve(null);
                  });
              }
            } else {
              console.warn("获取二维码失败:", res.statusCode);
              resolve(null);
            }
          },
          fail: (err) => {
            console.warn("请求二维码失败:", err);
            // 如果 request 失败，尝试使用 downloadFile
            this.downloadQRCodeToTemp(qrCodeUrl, token)
              .then((tempPath) => {
                if (tempPath) {
                  this.qrTempPath = tempPath;
                  resolve(tempPath);
                } else {
                  resolve(null);
                }
              })
              .catch(() => {
                resolve(null);
              });
          },
        });
      });
    } catch (error) {
      console.error("获取小程序码失败:", error);
      return null;
    }
  },

  // 使用 downloadFile 下载二维码到临时目录（备用方案）
  downloadQRCodeToTemp(qrCodeUrl, token) {
    return new Promise((resolve) => {
      // 如果 URL 需要授权，需要在服务端支持通过 URL 参数传递 token
      // 或者使用其他方式获取二维码
      wx.downloadFile({
        url: qrCodeUrl,
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) {
            resolve(res.tempFilePath);
          } else {
            resolve(null);
          }
        },
        fail: (err) => {
          console.warn("二维码下载失败:", err);
          resolve(null);
        },
      });
    });
  },

  // 清理旧的二维码文件
  cleanupOldQRFiles() {
    try {
      const fs = wx.getFileSystemManager();
      const dirPath = wx.env.USER_DATA_PATH;
      
      // 读取目录，查找所有 qr_ 开头的文件
      fs.readdir({
        dirPath,
        success: (res) => {
          if (res.files && res.files.length > 0) {
            const qrFiles = res.files.filter((file) => file.startsWith("qr_"));
            // 清理所有旧的二维码文件
            qrFiles.forEach((file) => {
              const filePath = `${dirPath}/${file}`;
              fs.unlink({
                filePath,
                success: () => {
                  console.log("清理旧二维码文件:", file);
                },
                fail: () => {
                  // 忽略删除失败的错误
                },
              });
            });
          }
        },
        fail: () => {
          // 如果读取目录失败，忽略错误
        },
      });
    } catch (e) {
      // 忽略清理过程中的错误
      console.warn("清理旧二维码文件时出错:", e);
    }
  },

  // 清理临时文件
  cleanupTempFile(filePath) {
    try {
      if (!filePath) return;
      const fs = wx.getFileSystemManager();
      fs.unlink({ filePath, success: () => {}, fail: () => {} });
    } catch (e) {}
  },

  // 格式化文本，自然换行（不强制分段）
  formatTextWithBreaks(text) {
    if (!text) return "";

    // 清理文本，去除多余空格和换行
    const cleanText = text.replace(/\s+/g, " ").trim();

    // 不进行强制分段，让海报组件根据宽度自然换行
    return cleanText;
  },

  // 不包含小程序码的海报配置
  async buildPosterConfigWithoutQR() {
    const { result } = this.data;

    // 处理关键词，转换为字符串
    const keywordsText =
      result.keywords && result.keywords.length > 0
        ? result.keywords.join("、")
        : this.data.i18n.diary.noKeywords;

    // 处理梦境解析文本，截取前200字符作为摘要
    const fullInterpretation =
      result.interpretation || this.data.i18n.diary.noDreamAnalysis;
    const interpText =
      fullInterpretation.length > 200
        ? fullInterpretation.substring(0, 200) + "..."
        : fullInterpretation;

    const config = {
      width: 750,
      height: 1334,
      backgroundColor: "#8B5CF6",
      debug: false,
      texts: [
        // 主标题 - 光爱梦伴
        {
          x: 375,
          y: 110,
          baseLine: "middle",
          textAlign: "center",
          text: this.data.i18n.diary.appName,
          fontSize: 56,
          color: "#ffffff",
          fontWeight: "bold",
          zIndex: 10,
        },
        // 关键词标签
        {
          x: 60,
          y: 200,
          baseLine: "top",
          textAlign: "left",
          text: this.data.i18n.diary.keywords,
          fontSize: 34,
          color: "#ffffff",
          fontWeight: "bold",
          zIndex: 10,
        },
        // 关键词文本
        {
          x: 80,
          y: 240,
          baseLine: "top",
          textAlign: "left",
          text: keywordsText,
          fontSize: 24,
          color: "#555555",
          width: 550,
          lineHeight: 36,
          zIndex: 10,
        },
        // 梦境解析标签
        {
          x: 60,
          y: 320,
          baseLine: "top",
          textAlign: "left",
          text: this.data.i18n.diary.dreamAnalysis,
          fontSize: 34,
          color: "#ffffff",
          fontWeight: "bold",
          zIndex: 10,
        },
        // 梦境解析文本（摘要版本）
        {
          x: 80,
          y: 360,
          baseLine: "top",
          textAlign: "left",
          text: interpText,
          fontSize: 26,
          color: "#555555",
          width: 550,
          lineHeight: 38,
          zIndex: 10,
        },
        // AI生成海报标签
        {
          x: 375,
          y: 1240,
          baseLine: "middle",
          textAlign: "center",
          text: this.data.i18n.diary.aiGeneratedPoster,
          fontSize: 26,
          color: "#ffffff",
          fontWeight: "normal",
          zIndex: 10,
        },
      ],
      blocks: [
        // 关键词卡片背景
        {
          x: 60,
          y: 220,
          width: 630,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.6)",
          zIndex: 1,
        },
        // 梦境解析卡片背景
        {
          x: 60,
          y: 340,
          width: 630,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.6)",
          zIndex: 1,
        },
      ],
      images: [],
    };

    this.setData({
      posterConfig: config,
    });
    return config;
  },

  // 海报生成成功回调
  onPosterSuccess(e) {
    const { detail } = e;
    wx.hideLoading();

    // 保存到相册
    wx.saveImageToPhotosAlbum({
      filePath: detail,
      success: () => {
        wx.showToast({
          title: t("diary.saveSuccess"),
          icon: "success",
        });
        // 添加预览功能
        wx.previewImage({
          current: detail, // 当前显示图片的链接
          urls: [detail], // 需要预览的图片链接列表
        });
        // 清理二维码临时文件（若存在）
        if (this.qrTempPath) {
          this.cleanupTempFile(this.qrTempPath);
          this.qrTempPath = null;
        }
      },
      fail: (err) => {
        console.error("保存失败:", err);
        console.error("保存失败详情:", JSON.stringify(err, null, 2));
        if (err.errMsg.includes("auth deny")) {
          wx.showModal({
            title: t("diary.needAuthForImage"),
            content: t("diary.allowSaveImage"),
            confirmText: t("diary.goToSettings"),
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            },
          });
        } else {
          wx.showToast({
            title: t("diary.saveFailed"),
            icon: "error",
          });
        }
      },
    });
  },

  // 海报生成失败回调
  onPosterFail(err) {
    console.error("海报生成失败:", err);
    console.error("错误详情:", JSON.stringify(err, null, 2));
    wx.hideLoading();

    // 根据错误类型给出不同的提示
    let errorMessage = "生成失败";
    if (err && err.detail && err.detail.errMsg) {
      if (err.detail.errMsg.includes("downloadFile:fail")) {
        errorMessage = "网络连接失败，请检查网络后重试";
      } else if (err.detail.errMsg.includes("getaddrinfo ENOTFOUND")) {
        errorMessage = "无法连接到服务器，请检查网络设置";
      } else if (err.detail.errMsg.includes("tmp")) {
        errorMessage = "临时文件处理失败，请重试";
      }
    }

    wx.showToast({
      title: errorMessage,
      icon: "error",
      duration: 3000,
    });
  },

  // 点击星星评分
  onStarTap(e) {
    const rating = parseInt(e.currentTarget.dataset.rating);
    const currentRating = this.data.feedbackRating;

    // 如果点击的是当前评分，则取消选择（设为0）
    // 否则设置为点击的评分
    const newRating = rating === currentRating ? 0 : rating;

    this.setData({
      feedbackRating: newRating,
    });
  },

  // 反馈内容输入
  onFeedbackInput(e) {
    this.setData({
      feedbackContent: e.detail.value,
    });
  },

  // 疏导性问题回答输入
  onAnswer1Input(e) {
    this.setData({
      answer1: e.detail.value,
    });
  },

  onAnswer2Input(e) {
    this.setData({
      answer2: e.detail.value,
    });
  },

  // 折叠面板变化处理
  onCollapseChange(e) {
    this.setData({
      activeNames: e.detail,
    });
  },

  // 保存疏导性问题回答
  async onSaveAnswers() {
    if (this.data.savingAnswers) return;

    const { answer1, answer2, result } = this.data;

    // 检查是否有回答内容
    if (!answer1 && !answer2) {
      wx.showToast({
        title: this.data.i18n.diary.pleaseAnswerAtLeastOne,
        icon: "none",
      });
      return;
    }

    this.setData({ savingAnswers: true });

    try {
      const http = require("../../services/http.js");
      const requestData = {
        analysisId: result.analysisId,
      };

      // 只保存有内容的问题回答
      if (answer1 && answer1.trim()) {
        requestData.question1 = answer1;
      }
      if (answer2 && answer2.trim()) {
        requestData.question2 = answer2;
      }

      const response = await http.post(
        "/dream/analysis/save-answers",
        requestData
      );

      if (response && response.code === 0) {
        wx.showToast({
          title: this.data.i18n.diary.thinkingSaved,
          icon: "success",
          duration: 2000,
        });

        // 更新result对象，将答案直接显示在界面上
        const updateData = {
          result: { ...this.data.result }
        };

        // 处理问题1的答案
        if (answer1 && answer1.trim()) {
          // 保存原始问题文本（如果没有保存过）
          const originalQuestion1 = this.data.result.guidingQuestion1Answer 
            ? this.data.result.guidingQuestion1.split('\n\n💭')[0].trim()
            : (this.data.result.guidingQuestion1 || '');
          
          updateData.result.guidingQuestion1Answer = answer1.trim();
          updateData.result.guidingQuestion1 = originalQuestion1 + "\n\n💭 " + this.data.i18n.diary.myThinking + "：\n" + answer1.trim();
          updateData.answer1 = ""; // 清空输入框
        }

        // 处理问题2的答案
        if (answer2 && answer2.trim()) {
          // 保存原始问题文本（如果没有保存过）
          const originalQuestion2 = this.data.result.guidingQuestion2Answer 
            ? this.data.result.guidingQuestion2.split('\n\n💭')[0].trim()
            : (this.data.result.guidingQuestion2 || '');
          
          updateData.result.guidingQuestion2Answer = answer2.trim();
          updateData.result.guidingQuestion2 = originalQuestion2 + "\n\n💭 " + this.data.i18n.diary.myThinking + "：\n" + answer2.trim();
          updateData.answer2 = ""; // 清空输入框
        }

        this.setData(updateData);
      } else {
        throw new Error(response?.message || "保存失败");
      }
    } catch (error) {
      console.error("保存回答失败:", error);

      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.diary.loginRequired,
          content: this.data.i18n.diary.loginRequiredForSave,
          confirmText: this.data.i18n.diary.goToLogin,
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: "/pages/profile/profile",
              });
            }
          },
        });
      } else {
        wx.showToast({
          title: error.message || this.data.i18n.diary.saveFailed,
          icon: "error",
          duration: 2000,
        });
      }
    } finally {
      this.setData({ savingAnswers: false });
    }
  },

  // 提交反馈
  async onSubmitFeedback() {
    if (this.data.submittingFeedback) return;

    const { feedbackRating, feedbackContent, result } = this.data;

    // 检查是否至少有一项内容
    if (
      feedbackRating <= 0 &&
      (!feedbackContent || feedbackContent.trim() === "")
    ) {
      wx.showToast({
        title: this.data.i18n.diary.pleaseSelectRatingOrFeedback,
        icon: "none",
      });
      return;
    }

    // 检查是否有postId
    if (!result || !result.postId) {
      wx.showToast({
        title: "缺少必要参数",
        icon: "error",
      });
      return;
    }

    this.setData({ submittingFeedback: true });

    try {
      const http = require("../../services/http.js");
      const requestData = {
        content: feedbackContent,
        postId: result.postId, // 带上postId
      };

      // 只有当评分大于0时才添加rating参数
      if (feedbackRating > 0) {
        requestData.rating = feedbackRating;
      }

      const response = await http.post("/user/feedback", requestData);

      if (response && response.code === 0) {
        wx.showToast({
          title: this.data.i18n.diary.feedbackSubmitSuccess,
          icon: "success",
        });

        // 清空表单并更新hasFeedback状态
        this.setData({
          feedbackRating: 0,
          feedbackContent: "",
          "result.hasFeedback": true, // 更新hasFeedback状态
        });
      } else {
        throw new Error(response?.message || "反馈提交失败");
      }
    } catch (error) {
      console.error("提交反馈失败:", error);

      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.diary.loginRequired,
          content: this.data.i18n.diary.loginRequiredForFeedback,
          confirmText: this.data.i18n.diary.goToLogin,
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: "/pages/profile/profile",
              });
            }
          },
        });
      } else {
        wx.showToast({
          title: error.message || this.data.i18n.diary.submitFailed,
          icon: "error",
        });
      }
    } finally {
      this.setData({ submittingFeedback: false });
    }
  },

  // 将远程图片转换为本地临时文件，避免跨域/域名解析问题
  ensureLocalImage(remoteUrl) {
    return new Promise((resolve) => {
      if (!remoteUrl) {
        resolve(null);
        return;
      }

      try {
        wx.downloadFile({
          url: remoteUrl,
          success: (res) => {
            if (res.statusCode === 200 && res.tempFilePath) {
              const temp = res.tempFilePath;
              // 统一写入 USER_DATA_PATH，得到 wxfile:// 路径
              try {
                const fs = wx.getFileSystemManager();
                const ext = (temp.split(".").pop() || "png").split("?")[0];
                const target = `${
                  wx.env.USER_DATA_PATH
                }/img_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`;
                fs.readFile({
                  filePath: temp,
                  success: (readRes) => {
                    fs.writeFile({
                      filePath: target,
                      data: readRes.data,
                      encoding: "binary",
                      success: () => {
                        resolve(target);
                      },
                      fail: (e) => {
                        resolve(temp);
                      },
                    });
                  },
                  fail: (e) => {
                    resolve(temp);
                  },
                });
              } catch (e) {
                resolve(temp);
              }
            } else {
              wx.getImageInfo({
                src: remoteUrl,
                success: (info) => {
                  // 同样写入 USER_DATA_PATH，规避 https://tmp
                  const local = info.path || info.src;
                  if (!local) return resolve(null);
                  try {
                    const fs = wx.getFileSystemManager();
                    const ext = "png";
                    const target = `${
                      wx.env.USER_DATA_PATH
                    }/img_${Date.now()}_${Math.floor(
                      Math.random() * 1e6
                    )}.${ext}`;
                    fs.readFile({
                      filePath: local,
                      success: (readRes) => {
                        fs.writeFile({
                          filePath: target,
                          data: readRes.data,
                          encoding: "binary",
                          success: () => resolve(target),
                          fail: () => resolve(local),
                        });
                      },
                      fail: () => resolve(local),
                    });
                  } catch (e) {
                    resolve(local);
                  }
                },
                fail: (err) => {
                  console.log("getImageInfo fail:", err);
                  resolve(null);
                },
              });
            }
          },
          fail: (err) => {
            console.log("downloadFile fail:", err);
            wx.getImageInfo({
              src: remoteUrl,
              success: (info) => {
                const local = info.path || info.src;
                if (!local) return resolve(null);
                try {
                  const fs = wx.getFileSystemManager();
                  const target = `${
                    wx.env.USER_DATA_PATH
                  }/img_${Date.now()}_${Math.floor(Math.random() * 1e6)}.png`;
                  fs.readFile({
                    filePath: local,
                    success: (readRes) => {
                      fs.writeFile({
                        filePath: target,
                        data: readRes.data,
                        encoding: "binary",
                        success: () => resolve(target),
                        fail: () => resolve(local),
                      });
                    },
                    fail: () => resolve(local),
                  });
                } catch (e) {
                  resolve(local);
                }
              },
              fail: (err2) => {
                console.log("getImageInfo fail (fallback):", err2);
                resolve(null);
              },
            });
          },
        });
      } catch (e) {
        console.log("ensureLocalImage exception:", e);
        resolve(null);
      }
    });
  },

  /**
   * 用户点击右上角分享
   */
  async onShareAppMessage() {
    const { result } = this.data;
    
    // 如果用户已登录，调用分享接口记录积分（微信转发，每天仅首次分享有效）
    if (this.data.isLoggedIn) {
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
      imageUrl: result?.imageUrl || "", // 使用解析结果的图片作为分享图
    };
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  async onShareTimeline() {
    const { result } = this.data;
    
    // 如果用户已登录，调用分享接口记录积分（微信转发，每天仅首次分享有效）
    if (this.data.isLoggedIn) {
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
      imageUrl: result?.imageUrl || "", // 使用解析结果的图片作为分享图
    };
  },

  // ========== Painter 相关方法 ==========

  // 构建 Painter 海报配置
  async buildPainterPalette() {
    const { result } = this.data;

    try {
      // 如果图片存在，确保转换为本地路径（Painter 组件需要本地路径）
      // 注意：在 iPhone 上，wxfile:// 格式的路径可能不被 Painter 识别，需要重新转换
      let localImageUrl = null;
      if (result && result.imageUrl) {
        // 检查是否是远程 URL
        const isRemoteUrl = typeof result.imageUrl === 'string' && (result.imageUrl.startsWith('http://') || result.imageUrl.startsWith('https://'));
        // 检查是否是 wxfile:// 格式（需要重新转换）
        const isWxfilePath = typeof result.imageUrl === 'string' && result.imageUrl.startsWith('wxfile://');
        
        if (isRemoteUrl) {
          // 远程 URL，需要转换为本地路径
          try {
            localImageUrl = await this.ensureLocalImage(result.imageUrl);
            if (localImageUrl) {
              result.imageUrl = localImageUrl;
              this.setData({ "result.imageUrl": localImageUrl });
            } else {
              console.warn("图片路径转换失败，使用原始 URL");
              localImageUrl = result.imageUrl;
            }
          } catch (error) {
            console.error("图片路径转换异常:", error);
            localImageUrl = result.imageUrl;
          }
        } else if (isWxfilePath) {
          // wxfile:// 格式路径，在 iPhone 上可能不被识别，需要转换为临时文件路径
          try {
            // 先尝试读取文件，然后重新保存为临时文件
            const fs = wx.getFileSystemManager();
            const tempPath = `${wx.env.USER_DATA_PATH}/poster_img_${Date.now()}.png`;
            
            // 读取原文件
            const fileData = await new Promise((resolve, reject) => {
              fs.readFile({
                filePath: result.imageUrl,
                success: resolve,
                fail: reject
              });
            });
            
            // 写入临时文件
            await new Promise((resolve, reject) => {
              fs.writeFile({
                filePath: tempPath,
                data: fileData.data,
                encoding: "binary",
                success: resolve,
                fail: reject
              });
            });
            
            localImageUrl = tempPath;
            console.log("wxfile:// 路径已转换为临时文件路径:", tempPath);
          } catch (error) {
            console.error("wxfile:// 路径转换失败，尝试使用 getImageInfo:", error);
            // 如果转换失败，尝试使用 getImageInfo 获取可用的路径
            try {
              const imageInfo = await new Promise((resolve, reject) => {
                wx.getImageInfo({
                  src: result.imageUrl,
                  success: resolve,
                  fail: reject
                });
              });
              localImageUrl = imageInfo.path || imageInfo.src || result.imageUrl;
            } catch (imgError) {
              console.error("getImageInfo 也失败:", imgError);
              localImageUrl = result.imageUrl; // 最后使用原路径
            }
          }
        } else {
          // 其他本地路径（如临时文件路径），直接使用
          // 但为了保险起见，也验证一下路径是否有效
          try {
            const fs = wx.getFileSystemManager();
            await new Promise((resolve, reject) => {
              fs.access({
                path: result.imageUrl,
                success: resolve,
                fail: reject
              });
            });
            localImageUrl = result.imageUrl;
          } catch (error) {
            console.warn("本地路径验证失败，尝试重新获取:", error);
            // 如果路径无效，尝试使用 getImageInfo
            try {
              const imageInfo = await new Promise((resolve, reject) => {
                wx.getImageInfo({
                  src: result.imageUrl,
                  success: resolve,
                  fail: reject
                });
              });
              localImageUrl = imageInfo.path || imageInfo.src || result.imageUrl;
            } catch (imgError) {
              console.error("getImageInfo 失败:", imgError);
              localImageUrl = result.imageUrl;
            }
          }
        }
      } else {
        console.warn("海报生成时没有找到图片 URL，result:", result, "result.imageUrl:", result?.imageUrl);
      }

      // 处理文本内容，确保不会过长
      const dreamText = (
        result.dreamDescription || this.data.i18n.diary.dreamContent
      ).substring(0, 120);
      const interpretationText = (
        result.interpretation || this.data.i18n.diary.dreamAnalysis
      ).substring(0, 180);

      // 智能截断：在句号、感叹号、问号处截断，避免截断句子
      const smartTruncate = (text, maxLength) => {
        if (text.length <= maxLength) return text;

        const truncated = text.substring(0, maxLength);
        const lastPunctuation = Math.max(
          truncated.lastIndexOf("。"),
          truncated.lastIndexOf("！"),
          truncated.lastIndexOf("？"),
          truncated.lastIndexOf("，")
        );

        if (lastPunctuation > maxLength * 0.7) {
          return truncated.substring(0, lastPunctuation + 1);
        }
        return truncated + "...";
      };

      const finalDreamText = smartTruncate(dreamText, 120);
      const finalInterpretationText = smartTruncate(interpretationText, 180);

      // 尝试下载背景图片到本地
      let backgroundImageUrl =
        "https://dulele.org.cn/images/assest/dreamAnalysisResult.png";
      try {
        const downloadResult = await wx.downloadFile({
          url: backgroundImageUrl,
        });
        if (downloadResult.statusCode === 200) {
          backgroundImageUrl = downloadResult.tempFilePath;
        }
      } catch (error) {
        console.error("背景图片下载失败:", error);
        // 使用渐变背景作为备用
        backgroundImageUrl = null;
      }

      // 获取二维码
      let qrCodeUrl = null;
      try {
        qrCodeUrl = await this.getQRCode();
      } catch (error) {
        console.error("获取二维码失败:", error);
      }

      // 构建海报数据 - 使用固定尺寸确保兼容性
      const palette = {
        width: "750rpx",
        height: "1334rpx",
        background: "#ffffff",
        borderRadius: "0rpx",
        views: [
          // 背景图片 - 使用下载的本地图片或渐变背景
          ...(backgroundImageUrl
            ? [
                {
                  type: "image",
                  url: backgroundImageUrl,
                  css: {
                    width: "750rpx",
                    height: "1334rpx",
                    top: "0rpx",
                    left: "0rpx",
                    mode: "scaleToFill",
                  },
                },
              ]
            : [
                {
                  type: "rect",
                  css: {
                    width: "750rpx",
                    height: "1334rpx",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #8B5CF6 100%)",
                    top: "0rpx",
                    left: "0rpx",
                  },
                },
              ]),
          // 主标题
          {
            type: "text",
            text: "🐬" + this.data.i18n.diary.appName,
            css: {
              top: "80rpx",
              left: "0rpx",
              width: "750rpx",
              fontSize: "56rpx",
              color: "#ffffff",
              fontWeight: "bold",
              textAlign: "center",
              shadow: "0 4rpx 12rpx rgba(0, 0, 0, 0.8)",
            },
          },
          // 梦境内容标题（去掉卡片背景）
          {
            type: "text",
            text: "💭 " + this.data.i18n.diary.myDream,
            css: {
              top: "200rpx",
              left: "50rpx",
              fontSize: "32rpx",
              color: "#000000",
              fontWeight: "bold",
              shadow: "0 2rpx 4rpx rgba(255, 255, 255, 0.8)",
            },
          },
          // 梦境内容文本
          {
            type: "text",
            text: finalDreamText,
            css: {
              top: "250rpx",
              left: "50rpx",
              width: "650rpx",
              fontSize: "26rpx",
              color: "#000000",
              lineHeight: "38rpx",
              maxLines: 3,
              shadow: "0 1rpx 2rpx rgba(255, 255, 255, 0.8)",
            },
          },
          // 解析标题（去掉卡片背景）
          {
            type: "text",
            text: "🔮 " + this.data.i18n.diary.dreamAnalysis,
            css: {
              top: "380rpx",
              left: "50rpx",
              fontSize: "32rpx",
              color: "#000000",
              fontWeight: "bold",
              shadow: "0 2rpx 4rpx rgba(255, 255, 255, 0.8)",
            },
          },
          // 解析内容
          {
            type: "text",
            text: finalInterpretationText,
            css: {
              top: "430rpx",
              left: "50rpx",
              width: "650rpx",
              fontSize: "24rpx",
              color: "#000000",
              lineHeight: "34rpx",
              maxLines: 4,
              shadow: "0 1rpx 2rpx rgba(255, 255, 255, 0.8)",
            },
          },
          // 关键词标签
          ...(result.keywords && result.keywords.length > 0
            ? [
                {
                  type: "text",
                  text: "🏷️ " + result.keywords.slice(0, 3).join(" · "),
                  css: {
                    top: "590rpx",
                    left: "50rpx",
                    width: "650rpx",
                    fontSize: "22rpx",
                    color: "#000000",
                    textAlign: "center",
                    shadow: "0 1rpx 2rpx rgba(255, 255, 255, 0.8)",
                  },
                },
              ]
            : []),
          // AI生成的梦境图片（如果有）- 使用本地路径
          ...(localImageUrl
            ? [
                {
                  type: "image",
                  url: localImageUrl, // 使用转换后的本地路径
                  css: {
                    top: "630rpx",
                    left: "200rpx",
                    width: "350rpx",
                    height: "280rpx",
                    borderRadius: "16rpx",
                    mode: "aspectFill",
                  },
                },
                {
                  type: "text",
                  text: this.data.i18n.diary.aiDreamImage,
                  css: {
                    top: "920rpx",
                    left: "0rpx",
                    width: "750rpx",
                    fontSize: "20rpx",
                    color: "#000000",
                    textAlign: "center",
                    shadow: "0 1rpx 2rpx rgba(255, 255, 255, 0.8)",
                  },
                },
              ]
            : []),
          // 底部品牌信息
          {
            type: "text",
            text: "✨ " + this.data.i18n.diary.dreamAnalysisResult,
            css: {
              top: "960rpx",
              left: "0rpx",
              width: "750rpx",
              fontSize: "24rpx",
              color: "#000000",
              textAlign: "center",
              fontWeight: "bold",
              shadow: "0 2rpx 4rpx rgba(255, 255, 255, 0.8)",
            },
          },
          // 二维码区域 - 使用真正的二维码图片
          ...(qrCodeUrl
            ? [
                {
                  type: "image",
                  url: qrCodeUrl,
                  css: {
                    top: "1000rpx",
                    left: "275rpx",
                    width: "200rpx",
                    height: "200rpx",
                    borderRadius: "12rpx",
                    mode: "aspectFill",
                  },
                },
              ]
            : [
                {
                  type: "rect",
                  css: {
                    top: "1000rpx",
                    left: "275rpx",
                    width: "200rpx",
                    height: "200rpx",
                    background: "#ffffff",
                    borderRadius: "12rpx",
                    shadow: "0 4rpx 12rpx rgba(0, 0, 0, 0.3)",
                  },
                },
              ]),
        ],
      };

      // 设置 Painter 配置
      this.setData({
        painterPalette: palette,
      });

    } catch (error) {
      console.error("构建 Painter 配置失败:", error);
      throw error;
    }
  },

  // Painter 图片生成成功
  onPainterImgOK(e) {
    const { path } = e.detail;

    wx.hideLoading();

    // 保存到相册
    wx.saveImageToPhotosAlbum({
      filePath: path,
      success: () => {
        wx.showToast({
          title: this.data.i18n.diary.saveSuccess || "保存成功",
          icon: "success",
        });
        // 添加预览功能
        wx.previewImage({
          current: path,
          urls: [path],
        });
        // 清理二维码临时文件（若存在）
        if (this.qrTempPath) {
          this.cleanupTempFile(this.qrTempPath);
          this.qrTempPath = null;
        }
      },
      fail: (err) => {
        console.error("保存失败:", err);
        if (err.errMsg.includes("auth deny")) {
          wx.showModal({
            title: this.data.i18n.diary.needAuthForImage,
            content: this.data.i18n.diary.allowSaveImage,
            confirmText: this.data.i18n.diary.goToSettings,
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            },
          });
        } else {
          wx.showToast({
            title: this.data.i18n.diary.saveFailed,
            icon: "error",
          });
        }
      },
    });
  },

  // Painter 图片生成失败
  onPainterImgErr(e) {
    console.error("Painter 图片生成失败:", e.detail);
    wx.hideLoading();
    wx.showToast({
      title: this.data.i18n.diary.posterGenerationFailed || "海报生成失败",
      icon: "error",
    });
    // 清理二维码临时文件（若存在）
    if (this.qrTempPath) {
      this.cleanupTempFile(this.qrTempPath);
      this.qrTempPath = null;
    }
  },
});
