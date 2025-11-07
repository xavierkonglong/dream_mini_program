// 结果页
const authService = require("../../services/auth.js");
const { IMAGE_URLS } = require("../../constants/index.js");
const { t, getLang } = require("../../utils/i18n.js");

Page({
  data: {
    result: null,
    isLoggedIn: false,
    imageUrls: IMAGE_URLS,
    posterConfig: null,
    // 文生图轮询
    imageLoading: false,
    imagePollCount: 0,
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
    videoStatus: "pending", // 统一内部语义：'pending'|'processing'|'completed'|'failed'
    videoPollCount: 0,
    // 疏导性问题相关
    answer1: "",
    answer2: "",
    savingAnswers: false,
    // 折叠面板相关
    activeNames: [], // 默认全部收缩
    // 反馈相关（已废弃，现在使用 result.hasFeedback）
    // feedbackSubmitted: false, // 反馈是否已提交
    // 多语言相关
    language: "zh",
    i18n: {},
    // Painter 相关
    painterPalette: null,
  },

  onLoad(options) {
    // 初始化多语言
    this.initI18n();

    // 检查登录状态
    this.checkLoginStatus();

    if (options.data) {
      try {
        let result = JSON.parse(decodeURIComponent(options.data));

        // 归一化：兼容新蛇形扁平结构，转成 camelCase
        result = {
          analysisId: result.analysisId || result.analysis_id || "",
          dreamDescription: result.dreamDescription || result.dream_description || "",
          keywords: result.keywords || [],
          interpretation: result.interpretation || "",
          imagePrompt: result.imagePrompt || result.image_prompt || "",
          imageTaskId: result.imageTaskId || result.image_task_id || "",
          imageStatus: result.imageStatus || result.image_status || "",
          imageUrl: result.imageUrl || result.image_url || null,
          guidingQuestionsJson:
            result.guidingQuestionsJson || result.guiding_questions_json || "",
          generationType: result.generationType || "image",
          hasFeedback: result.hasFeedback || false, // 是否已提交反馈
          // 兼容保留原始字段，避免后续逻辑意外依赖
          _raw: result,
        };

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
  

            // 处理问题1和问题2（不依赖顺序）
            const questionKeys = Object.keys(guidingQuestions);
            let question1Processed = false;
            let question2Processed = false;

            for (const key of questionKeys) {
              if (key.startsWith("question") && guidingQuestions[key]) {
                const questionData = guidingQuestions[key];
                const question = questionData.question;
                const answer = questionData.answer;

                if (!question1Processed) {
                  result.guidingQuestion1 = question;
                  result.guidingQuestion1Answer = answer || "";
                  if (answer) {
                    result.guidingQuestion1 =
                      question +
                      "\n\n💭 " +
                      this.data.i18n.result.myThinking +
                      "：\n" +
                      answer;
                  }
                  question1Processed = true;
                } else if (!question2Processed) {
                  result.guidingQuestion2 = question;
                  result.guidingQuestion2Answer = answer || "";
                  if (answer) {
                    result.guidingQuestion2 =
                      question +
                      "\n\n💭 " +
                      this.data.i18n.result.myThinking +
                      "：\n" +
                      answer;
                  }
                  question2Processed = true;
                }
              }
            }
          } catch (error) {
            console.error("result.js - 解析疏导性问题JSON失败:", error);
            result.guidingQuestion1 = "";
            result.guidingQuestion2 = "";
          }
        } else {
          console.log("result.js - 没有guidingQuestionsJson字段");
        }

        // 检查是否是视频类型
        const isVideoType = result.generationType === "video";
        const videoTaskId = result.videoTaskId || null;

        if (isVideoType) {
          // 先落盘 result，避免轮询时取不到 analysisId
          this.setData({
            result,
            loading: false,
            isVideoType: true,
            videoTaskId: videoTaskId,
            videoStatus: (result._raw?.video_status || result.videoStatus || "processing"),
          });
          // 若还没有视频URL，基于 analysisId 轮询 /dream/status
          if (!result.videoUrl) {
            this.startVideoPolling();
          }
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
        } else if (!isVideoType && !result.imageUrl) {
          // 文生图还未就绪，开始轮询图片
          this.setData({ result, loading: false, imageLoading: true });
          this.startImagePolling();
        } else {
          this.setData({ result, loading: false });
        }
      } catch (error) {
        console.error("解析结果数据失败:", error);
        this.setData({ loading: false });
        wx.showToast({
          title: this.data.i18n.result.dataError,
          icon: "error",
        });
      }
    }
  },

  /**
   * 开始图片轮询（每5秒一次，最多10次）
   */
  startImagePolling() {
    try {
      // 采用串行轮询：本次请求完成后，再等待5秒触发下一次
      this.pollImageStatus();
    } catch (e) {
      console.error("启动图片轮询失败:", e);
    }
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
   * 轮询图片状态：调用 /api/v1/dream/status?analysis_id=xxx，
   * 若返回的 image_url 为 null 则继续，最多10次或页面离开。
   */
  async pollImageStatus() {
    const { result, imagePollCount, imageLoading } = this.data;
    if (!imageLoading) return;

    // 达到最大次数后停止
    if (imagePollCount >= 60) {
      this.stopImagePolling();
      this.setData({ imageLoading: false });
      return;
    }

    let requestSucceeded = false;
    try {
      const dreamService = require("../../services/dream.js");
      if (!result || !result.analysisId) {
        console.warn("图片轮询缺少 analysisId，停止轮询");
        this.stopImagePolling();
        this.setData({ imageLoading: false });
        return;
      }

      const resp = await dreamService.getDreamStatus(result.analysisId);
      if (resp && resp.code === 0 && resp.data) {
        requestSucceeded = true;
        const latest = resp.data;

        // 归一化结构
        const normalized = {
          analysisId: latest.analysis_id || latest.analysisId || result.analysisId,
          dreamDescription: latest.dream_description || latest.dreamDescription || result.dreamDescription || "",
          keywords: latest.keywords || result.keywords || [],
          interpretation: latest.interpretation || result.interpretation || "",
          imagePrompt: latest.image_prompt || latest.imagePrompt || result.imagePrompt || "",
          imageTaskId: latest.image_task_id || latest.imageTaskId || result.imageTaskId || "",
          imageStatus: latest.image_status || latest.imageStatus || result.imageStatus || "",
          imageUrl: latest.image_url || latest.imageUrl || null,
          guidingQuestionsJson: latest.guiding_questions_json || latest.guidingQuestionsJson || result.guidingQuestionsJson || "",
          generationType: result.generationType || "image",
          hasFeedback: result.hasFeedback || false, // 保持原有的hasFeedback值，不从轮询接口同步
          _raw: latest,
        };

        if (normalized.interpretation) {
          normalized.interpretationParagraphs = this.formatInterpretation(
            normalized.interpretation
          );
        }

        if (normalized.imageUrl) {
          const localPath = await this.ensureLocalImage(normalized.imageUrl);
          normalized.imageUrl = localPath || normalized.imageUrl;
          this.setData({ result: normalized, imageLoading: false });
          this.stopImagePolling();
          return;
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

      // 若仍在加载且未达上限，并且请求成功，则3秒后进入下一次轮询
      if (requestSucceeded && this.data.imageLoading && nextCount < 60) {
        this.imagePollingTimer = setTimeout(() => {
          this.pollImageStatus();
        }, 3000);
      }
    }
  },

  /**
   * 初始化多语言
   */
  initI18n() {
    const language = getLang();
    this.setData({
      language: language,
      i18n: {
        result: {
          dataError: t("result.dataError"),
          videoNotGenerated: t("result.videoNotGenerated"),
          videoGenerationComplete: t("result.videoGenerationComplete"),
          videoGenerationFailed: t("result.videoGenerationFailed"),
          downloading: t("result.downloading"),
          saveSuccess: t("result.saveSuccess"),
          saveFailed: t("result.saveFailed"),
          needAuth: t("result.needAuth"),
          allowSaveVideo: t("result.allowSaveVideo"),
          goToSettings: t("result.goToSettings"),
          downloadFailed: t("result.downloadFailed"),
          dreamAnalysisResult: t("result.dreamAnalysisResult"),
          dreamAnalysis: t("result.dreamAnalysis"),
          shareToFriends: t("result.shareToFriends"),
          saveToAlbum: t("result.saveToAlbum"),
          copyLink: t("result.copyLink"),
          copied: t("result.copied"),
          publishToCommunity: t("result.publishToCommunity"),
          confirmPublish: t("result.confirmPublish"),
          publish: t("result.publish"),
          cancel: t("result.cancel"),
          setToPrivate: t("result.setToPrivate"),
          setSuccess: t("result.setSuccess"),
          dataErrorMissingId: t("result.dataErrorMissingId"),
          publishing: t("result.publishing"),
          publishSuccess: t("result.publishSuccess"),
          publishFailed: t("result.publishFailed"),
          loginRequired: t("result.loginRequired"),
          loginRequiredForPublish: t("result.loginRequiredForPublish"),
          goToLogin: t("result.goToLogin"),
          noData: t("result.noData"),
          generatingPoster: t("result.generatingPoster"),
          posterComponentNotFound: t("result.posterComponentNotFound"),
          generationFailed: t("result.generationFailed"),
          noKeywords: t("result.noKeywords"),
          noDreamDescription: t("result.noDreamDescription"),
          noDreamAnalysis: t("result.noDreamAnalysis"),
          appName: t("result.appName"),
          aiDreamAnalysis: t("result.aiDreamAnalysis"),
          dreamContent: t("result.dreamContent"),
          keywords: t("result.keywords"),
          dreamAnalysis: t("result.dreamAnalysis"),
          scanForMore: t("result.scanForMore"),
          longPressToScan: t("result.longPressToScan"),
          aiGeneratedPoster: t("result.aiGeneratedPoster"),
          needAuthForImage: t("result.needAuthForImage"),
          allowSaveImage: t("result.allowSaveImage"),
          generationFailed: t("result.generationFailed"),
          networkFailed: t("result.networkFailed"),
          serverConnectionFailed: t("result.serverConnectionFailed"),
          tempFileFailed: t("result.tempFileFailed"),
          pleaseAnswerAtLeastOne: t("result.pleaseAnswerAtLeastOne"),
          thinkingSaved: t("result.thinkingSaved"),
          saveFailed: t("result.saveFailed"),
          loginRequiredForSave: t("result.loginRequiredForSave"),
          pleaseSelectRatingOrFeedback: t(
            "result.pleaseSelectRatingOrFeedback"
          ),
          feedbackSubmitSuccess: t("result.feedbackSubmitSuccess"),
          feedbackSubmitFailed: t("result.feedbackSubmitFailed"),
          loginRequiredForFeedback: t("result.loginRequiredForFeedback"),
          submitFailed: t("result.submitFailed"),
          myThinking: t("result.myThinking"),
          aiDreamVideo: t("result.aiDreamVideo"),
          clickToViewVideo: t("result.clickToViewVideo"),
          loading: t("result.loading"),
          aiDisclaimer: t("result.aiDisclaimer"),
          guidingQuestions: t("result.guidingQuestions"),
          questionsIntro: t("result.questionsIntro"),
          question1: t("result.question1"),
          question2: t("result.question2"),
          answerPlaceholder: t("result.answerPlaceholder"),
          saveAnswers: t("result.saveAnswers"),
          saving: t("result.saving"),
          aiImage: t("result.aiImage"),
          imageGenerating: t("result.imageGenerating"),
          imageGeneratingTip: t("result.imageGeneratingTip"),
          videoGenerating: t("result.videoGenerating"),
          videoGeneratingTip: t("result.videoGeneratingTip"),
          videoFailed: t("result.videoFailed"),
          videoFailedTip: t("result.videoFailedTip"),
          downloadVideo: t("result.downloadVideo"),
          generatePoster: t("result.generatePoster"),
          rateUs: t("result.rateUs"),
          ratingLabel: t("result.ratingLabel"),
          score: t("result.score"),
          selectRating: t("result.selectRating"),
          feedbackLabel: t("result.feedbackLabel"),
          feedbackPlaceholder: t("result.feedbackPlaceholder"),
          submitFeedback: t("result.submitFeedback"),
          submitting: t("result.submitting"),
          thankYouTitle: t("result.thankYouTitle"),
          thankYouText: t("result.thankYouText"),
          noResult: t("result.noResult"),
          // Painter 相关
          myDream: t("result.myDream"),
          dreamAnalysis: t("result.dreamAnalysis"),
          aiDreamImage: t("result.aiDreamImage"),
          aiDreamVideo: t("result.aiDreamVideo"),
          scanForMore: t("result.scanForMore"),
          longPressToScan: t("result.longPressToScan"),
          needAuthForImage: t("result.needAuthForImage"),
          allowSaveImage: t("result.allowSaveImage"),
          goToSettings: t("result.goToSettings"),
          thinkingSaved: t("result.thinkingSaved"),
          loginRequiredForSave: t("result.loginRequiredForSave"),
          submitFailed: t("result.submitFailed"),
        },
        app: {
          shareTitle: t("app.shareTitle"),
          timelineTitle: t("app.timelineTitle"),
        },
      },
    });
    wx.setNavigationBarTitle({ title: t("pageTitle.result") });

    // 监听语言切换事件
    wx.eventBus &&
      wx.eventBus.on("languageChanged", () => {
        // 重新设置页面标题
        wx.setNavigationBarTitle({ title: t("pageTitle.result") });
      });
  },

  onShow() {
    this.checkLoginStatus();

    // 强制更新标题
    this.initI18n();
    const newTitle = t("pageTitle.result");
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
    // 清理二维码临时文件（若存在）
    if (this.qrTempPath) {
      this.cleanupTempFile(this.qrTempPath);
      this.qrTempPath = null;
    }
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
   * 开始视频状态轮询（串行：每次完成后等待5秒再请求，最多10次）
   */
  startVideoPolling() {
    // 首次进入先延迟100秒再开始轮询
    this.videoPollingTimer = setTimeout(() => {
      this.pollVideoStatus();
    }, 100000);
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
   * 轮询视频状态
   */
  async pollVideoStatus() {
    const { result, videoPollCount, videoStatus } = this.data;

    // 已完成/失败则停止
    if (videoStatus === "completed" || videoStatus === "failed") {
      this.stopVideoPolling();
      return;
    }

    // 达到最大次数后停止（最多50次）
    if (videoPollCount >= 50) {
      this.stopVideoPolling();
      return;
    }

    if (!result || !result.analysisId) {
      console.error("缺少 analysisId，无法轮询视频状态");
      this.stopVideoPolling();
      return;
    }

    let requestSucceeded = false;
    try {
      const dreamService = require("../../services/dream.js");
      const response = await dreamService.getDreamStatus(result.analysisId);
      if (response && response.code === 0 && response.data) {
        requestSucceeded = true;
        const latest = response.data;
        const latestStatus = latest.video_status || latest.videoStatus || "processing";
        const latestUrl = latest.video_url || latest.videoUrl || null;
        const latestImageUrl = latest.image_url || latest.imageUrl || null;

        const update = { videoStatus: latestStatus };

        if (latestStatus === "completed" && latestUrl) {
          update.videoUrl = latestUrl;
          this.setData(update);
          // 同步最新的封面图（image_url）到 result.imageUrl，供海报使用
          if (latestImageUrl) {
            try {
              const localCover = await this.ensureLocalImage(latestImageUrl);
              this.setData({
                result: Object.assign({}, this.data.result, {
                  imageUrl: localCover || latestImageUrl,
                }),
              });
            } catch (e) {
              // 忽略封面处理失败
            }
          }
          this.stopVideoPolling();
          wx.showToast({
            title: this.data.i18n.result.videoGenerationComplete,
            icon: "success",
            duration: 2000,
          });
          return;
        }

        if (latestStatus === "failed") {
          this.setData(update);
          this.stopVideoPolling();
          wx.showToast({
            title: this.data.i18n.result.videoGenerationFailed,
            icon: "error",
            duration: 2000,
          });
          return;
        }

        // 更新进行中状态
        this.setData(update);
        // 进行中也尽量同步封面图（如果后端已产生）
        if (latestImageUrl && !this.data.result?.imageUrl) {
          try {
            const localCover = await this.ensureLocalImage(latestImageUrl);
            this.setData({
              result: Object.assign({}, this.data.result, {
                imageUrl: localCover || latestImageUrl,
              }),
            });
          } catch (e) {}
        }
      }
    } catch (error) {
      console.error("查询视频状态失败:", error);
      // 不中断，继续串行轮询
    } finally {
      const next = (this.data.videoPollCount || 0) + 1;
      this.setData({ videoPollCount: next });
      // 仅在本次请求成功时，5秒后进入下一次；最多50次
      if (
        requestSucceeded &&
        this.data.videoStatus !== "completed" &&
        this.data.videoStatus !== "failed" &&
        next < 50
      ) {
        this.videoPollingTimer = setTimeout(() => {
          this.pollVideoStatus();
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
        title: this.data.i18n.result.videoNotGenerated,
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
   * 为视频生成第一帧封面图
   */
  generateVideoThumbnail(videoUrl) {
    return new Promise((resolve, reject) => {
      try {

        // 使用微信小程序的 getVideoInfo API 获取视频信息
        wx.getVideoInfo({
          src: videoUrl,
          success: (res) => {

            // 如果视频有 poster 属性，直接使用
            if (res.poster) {
              resolve(res.poster);
              return;
            }

            // 如果没有poster，尝试使用 createVideoContext 获取第一帧
            this.getVideoFirstFrame(videoUrl)
              .then(resolve)
              .catch((error) => {
                // 降级到默认图片
                this.getDefaultThumbnail().then(resolve).catch(reject);
              });
          },
          fail: (error) => {
            // 降级到默认图片
            this.getDefaultThumbnail().then(resolve).catch(reject);
          },
        });
      } catch (error) {
        // 降级到默认图片
        this.getDefaultThumbnail().then(resolve).catch(reject);
      }
    });
  },

  /**
   * 获取视频第一帧
   */
  getVideoFirstFrame(videoUrl) {
    return new Promise((resolve, reject) => {
      try {
        // 创建一个临时的video元素来获取第一帧
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

              // 创建video元素
              const video = canvas.createVideo();
              video.src = videoUrl;
              video.crossOrigin = "anonymous";

              video.onloadeddata = () => {
                try {
                  // 绘制视频第一帧到canvas
                  ctx.drawImage(video, 0, 0, 400, 400);

                  // 导出为图片
                  wx.canvasToTempFilePath({
                    canvas: canvas,
                    success: (res) => {
                      resolve(res.tempFilePath);
                    },
                    fail: (err) => {
                      reject(err);
                    },
                  });
                } catch (error) {
                  reject(error);
                }
              };

              video.onerror = (error) => {
                reject(error);
              };
            } else {
              reject(new Error("Canvas not found"));
            }
          });
      } catch (error) {
        console.error("获取视频第一帧异常:", error);
        reject(error);
      }
    });
  },

  /**
   * 获取默认封面图
   */
  getDefaultThumbnail() {
    return new Promise((resolve, reject) => {
      try {
        // 方案1：使用默认封面图
        const defaultThumbnailUrl =
          this.data.imageUrls?.BACKGROUNDS?.PERSON || null;
        if (defaultThumbnailUrl) {
          this.ensureLocalImage(defaultThumbnailUrl)
            .then(resolve)
            .catch(() => {
              // 方案2：生成一个简单的文字封面图
              this.generateTextThumbnail().then(resolve).catch(reject);
            });
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
              ctx.fillText(this.data.i18n.result.aiDreamVideo, 200, 180);

              ctx.font = "24px Arial";
              ctx.fillText(this.data.i18n.result.clickToViewVideo, 200, 220);

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
        title: this.data.i18n.result.videoNotGenerated,
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
            title: this.data.i18n.result.needAuth,
            content: this.data.i18n.result.allowSaveVideo,
            confirmText: this.data.i18n.result.goToSettings,
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
              title: this.data.i18n.result.needAuth,
              content: this.data.i18n.result.allowSaveVideo,
              confirmText: this.data.i18n.result.goToSettings,
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
      title: this.data.i18n.result.downloading,
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
                title: this.data.i18n.result.saveSuccess,
                icon: "success",
                duration: 2000,
              });
            },
            fail: (err) => {
              console.error("保存视频失败:", err);
              if (err.errMsg.includes("auth deny")) {
                wx.showModal({
                  title: this.data.i18n.result.needAuth,
                  content: this.data.i18n.result.allowSaveVideo,
                  confirmText: this.data.i18n.result.goToSettings,
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  },
                });
              } else {
                wx.showToast({
                  title: this.data.i18n.result.saveFailed,
                  icon: "error",
                  duration: 2000,
                });
              }
            },
          });
        } else {
          wx.showToast({
            title: this.data.i18n.result.downloadFailed,
            icon: "error",
            duration: 2000,
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();

        // 根据错误类型提供更具体的提示
        let errorMessage = this.data.i18n.result.downloadFailed;
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
        title: this.data.i18n.result.dreamAnalysisResult,
        path: `/pages/result/result?data=${encodeURIComponent(
          JSON.stringify(result)
        )}`,
        imageUrl: result.imageUrl || "",
      };
    }
    return {
      title: this.data.i18n.result.dreamAnalysis,
      path: "/pages/index/index",
    };
  },

  // 长按分享
  onLongPressShare() {
    wx.showActionSheet({
      itemList: [
        this.data.i18n.result.shareToFriends,
        this.data.i18n.result.saveToAlbum,
        this.data.i18n.result.copyLink,
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
            title: this.data.i18n.result.saveSuccess,
            icon: "success",
          });
        },
        fail: () => {
          wx.showToast({
            title: this.data.i18n.result.saveFailed,
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
        data: `${this.data.i18n.result.dreamAnalysisResult}：${result.dreamDescription}`,
        success: () => {
          wx.showToast({
            title: this.data.i18n.result.copied,
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
        title: this.data.i18n.result.dataErrorMissingId,
        icon: "error",
      });
      return;
    }

    // 显示确认对话框
    wx.showModal({
      title: this.data.i18n.result.publishToCommunity,
      content: this.data.i18n.result.confirmPublish,
      confirmText: this.data.i18n.result.publish,
      cancelText: this.data.i18n.result.cancel,
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
        title: this.data.i18n.result.publishing,
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
          title: this.data.i18n.result.publishSuccess,
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
        throw new Error(
          response?.message || this.data.i18n.result.publishFailed
        );
      }
    } catch (error) {
      console.error("发布失败:", error);
      wx.hideLoading();

      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.result.loginRequired,
          content: this.data.i18n.result.loginRequiredForPublish,
          confirmText: this.data.i18n.result.goToLogin,
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
          title: error.message || this.data.i18n.result.publishFailed,
          icon: "error",
          duration: 2000,
        });
      }
    }
  },

  // 设为仅个人可见（取消发布）
  async setToPrivate() {
    const { result } = this.data;
    if (!result || !result.analysisId) return;
    try {
      wx.showLoading({ title: this.data.i18n.result.publishing });
      const http = require("../../services/http.js");
      const requestData = { analysisId: result.analysisId, isPublic: 0 };
      const response = await http.post("/dream/posts/publish", requestData);
      if (response && response.code === 0) {
        wx.hideLoading();
        wx.showToast({ title: this.data.i18n.result.setSuccess || "设置成功", icon: "success", duration: 1500 });
        this.setData({ "result.visibility": 0 });
      } else {
        throw new Error(response?.message || this.data.i18n.result.publishFailed);
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || this.data.i18n.result.publishFailed, icon: "error" });
    }
  },

  // 切换：未发布→发布；已发布→设为仅个人可见
  onTogglePublishOrPrivate() {
    const { result } = this.data;
    if (!result || !result.analysisId) return;
    if (result.visibility === 1) {
      this.setToPrivate();
    } else {
      this.onPublishToCommunity();
    }
  },

  // 生成海报
  async onGeneratePoster() {
    if (!this.data.result) {
      wx.showToast({
        title: this.data.i18n.result.noData,
        icon: "error",
      });
      return;
    }

    // 生成前先清理旧临时文件，避免空间不足
    try {
      this.cleanupUserDataDirSafe && this.cleanupUserDataDirSafe();
    } catch (e) {}

    // 显示加载提示
    wx.showLoading({
      title: this.data.i18n.result.generatingPoster,
    });

    try {
      // 构建 Painter 海报配置
      await this.buildPainterPalette();
    } catch (error) {
      console.error("生成海报配置失败:", error);
      wx.hideLoading();
      wx.showToast({
        title: this.data.i18n.result.generationFailed,
        icon: "error",
      });
    }
  },

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
        result.dreamDescription || this.data.i18n.result.dreamContent
      ).substring(0, 120);
      const interpretationText = (
        result.interpretation || this.data.i18n.result.dreamAnalysis
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
            text: "🐬" + this.data.i18n.result.appName,
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
            text: "💭 " + this.data.i18n.result.dreamContent,
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
            text: "🔮 " + this.data.i18n.result.dreamAnalysis,
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
          // AI生成的梦境图片（如果有）- 使用处理后的本地路径
          ...(localImageUrl
            ? [
                {
                  type: "image",
                  url: localImageUrl,
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
                  text: this.data.i18n.result.aiImage,
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
            text: "✨ " + this.data.i18n.result.dreamAnalysisResult,
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
          title: this.data.i18n.result.saveSuccess,
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
            title: this.data.i18n.result.needAuthForImage,
            content: this.data.i18n.result.allowSaveImage,
            confirmText: this.data.i18n.result.goToSettings,
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            },
          });
        } else {
          wx.showToast({
            title: this.data.i18n.result.saveFailed,
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
      title: this.data.i18n.result.generationFailed,
      icon: "error",
    });
    // 清理二维码临时文件（若存在）
    if (this.qrTempPath) {
      this.cleanupTempFile(this.qrTempPath);
      this.qrTempPath = null;
    }
  },

  // 构建海报配置
  buildPosterConfig() {
    const { result } = this.data;

    return new Promise(async (resolve, reject) => {
      try {
        // 只处理二维码
        const qrCodeUrl = await this.getQRCode();

        // 处理关键词，转换为字符串
        const keywordsText =
          result.keywords && result.keywords.length > 0
            ? result.keywords.join("、")
            : this.data.i18n.result.noKeywords;

        // 布局与样式参数 - 优化后的设计（去掉梦境内容）
        const cardX = 40;
        const cardWidth = 670;
        const innerX = 60;
        const textWidth = 590;
        const titleFontSize = 48;
        const labelFontSize = 36;
        const keywordFontSize = 26;
        const interpFontSize = 28;
        const keywordLineHeight = 38;
        const interpLineHeight = 40;

        // 估算文本所需高度 - 更精确的自适应计算
        const estimateBlockHeight = (
          text,
          fontSize,
          width,
          lineHeight,
          minHeight
        ) => {
          const safeText = (text || "").toString();
          const charsPerLine = Math.max(
            8,
            Math.floor(width / (fontSize * 0.6))
          ); // 调整字符计算
          const lines = Math.max(1, Math.ceil(safeText.length / charsPerLine));
          const height = lines * lineHeight + 20; // 进一步减少内边距
          return Math.max(minHeight, height);
        };

        // 处理梦境解析文本，截取前200字符作为摘要
        const fullInterpretation =
          result.interpretation || this.data.i18n.result.noDreamAnalysis;
        const interpText =
          fullInterpretation.length > 200
            ? fullInterpretation.substring(0, 200) + "..."
            : fullInterpretation;

        const keywordBlockHeight = estimateBlockHeight(
          keywordsText,
          keywordFontSize,
          textWidth,
          keywordLineHeight,
          30
        );
        const interpBlockHeight = estimateBlockHeight(
          interpText,
          interpFontSize,
          textWidth,
          interpLineHeight,
          80
        );

        // 调整后的布局位置 - 去掉梦境内容，重新布局
        const keywordLabelY = 220; // 关键词标签位置
        const keywordBlockY = keywordLabelY + 30; // 统一30px间距
        const keywordTextY = keywordBlockY + 30; // 统一30px间距

        const interpLabelY = keywordTextY + keywordBlockHeight + 40; // 解析标签位置
        const interpBlockY = interpLabelY + 30; // 统一30px间距
        const interpTextY = interpBlockY + 30; // 统一30px间距

        // 不再使用图片，移除相关变量

        const config = {
          width: 750,
          height: 1334,
          backgroundColor: "#FFFFFF", // 纯白背景更简洁
          debug: false,
          texts: [
            // 主标题 - 光爱梦伴
            {
              x: 375,
              y: 120,
              baseLine: "middle",
              textAlign: "center",
              text: this.data.i18n.result.appName,
              fontSize: 56,
              color: "#1A1A1A",
              fontWeight: "bold",
              zIndex: 10,
            },
            // 副标题
            {
              x: 375,
              y: 180,
              baseLine: "middle",
              textAlign: "center",
              text: this.data.i18n.result.aiDreamAnalysis,
              fontSize: 26,
              color: "#1A1A1A",
              fontWeight: "600",
              zIndex: 10,
            },
            // 关键词标签
            {
              x: cardX,
              y: keywordLabelY,
              baseLine: "top",
              textAlign: "left",
              text: this.data.i18n.result.keywords,
              fontSize: 36,
              color: "#1A1A1A",
              fontWeight: "bold",
              zIndex: 10,
            },
            // 关键词文本
            {
              x: innerX,
              y: keywordTextY,
              baseLine: "top",
              textAlign: "left",
              text: keywordsText,
              fontSize: 26,
              color: "#000000",
              width: textWidth,
              lineHeight: 38,
              lineNum: 3,
              zIndex: 10,
            },
            // 梦境解析标签
            {
              x: cardX,
              y: interpLabelY,
              baseLine: "top",
              textAlign: "left",
              text: this.data.i18n.result.dreamAnalysis,
              fontSize: 36,
              color: "#1A1A1A",
              fontWeight: "bold",
              zIndex: 10,
            },
            // 梦境解析文本（摘要版本）
            {
              x: innerX,
              y: interpTextY,
              baseLine: "top",
              textAlign: "left",
              text: interpText,
              fontSize: 28,
              color: "#000000",
              width: textWidth,
              lineHeight: 40,
              lineNum: 4,
              zIndex: 10,
            },
          ],
          blocks: [
            // 顶部装饰条
            {
              x: 0,
              y: 0,
              width: 750,
              height: 8,
              backgroundColor: "#8B5CF6",
              borderRadius: 0,
              borderWidth: 0,
              borderColor: "transparent",
              zIndex: 1,
            },
            // 顶部渐变背景
            {
              x: 0,
              y: 0,
              width: 750,
              height: 200,
              backgroundColor: "rgba(139, 92, 246, 0.03)",
              borderRadius: 0,
              borderWidth: 0,
              borderColor: "transparent",
              zIndex: 0,
            },
            // 去掉所有内容块的白色背景，让内容直接显示在背景图片上
          ],
          images: [],
        };

        // 添加背景图片
        config.images.push({
          x: 0,
          y: 0,
          width: 750,
          height: 1334,
          url: "https://dulele.org.cn/images/assest/dreamAnalysisResult.png",
          zIndex: 0,
        });

        // 生成纯文字海报，不包含任何图片

        // 智能计算二维码位置，避免与内容重叠
        if (qrCodeUrl) {
          const qrSize = 160; // 二维码尺寸
          const qrX = (750 - qrSize) / 2; // 水平居中

          // 计算内容总高度
          const contentEndY = interpTextY + interpBlockHeight;
          const minSpacing = 60; // 最小间距
          const qrY = Math.max(contentEndY + minSpacing, 1000); // 确保在内容下方，最小位置1000px

          // 检查是否会超出画布底部
          const qrBottomY = qrY + qrSize + 40; // 二维码底部 + 说明文字高度
          let finalQrY = qrY;

          if (qrBottomY > 1334) {
            console.warn("二维码位置可能超出画布，调整位置");
            // 如果超出，调整到画布底部
            finalQrY = 1334 - qrSize - 40;
          }

          // 二维码上方说明文字
          config.texts.push({
            x: 375,
            y: finalQrY - 30,
            baseLine: "middle",
            textAlign: "center",
            text: t("result.scanForMore"),
            fontSize: 20,
            color: "#6B7280",
            fontWeight: "normal",
            zIndex: 10,
          });

          // 小程序码图
          config.images.push({
            x: qrX,
            y: finalQrY,
            width: qrSize,
            height: qrSize,
            url: qrCodeUrl,
            zIndex: 3,
          });

          // 二维码下方说明文字
          config.texts.push({
            x: 375,
            y: finalQrY + qrSize + 20,
            baseLine: "middle",
            textAlign: "center",
            text: t("result.longPressToScan"),
            fontSize: 20,
            color: "#6B7280",
            fontWeight: "normal",
            zIndex: 10,
          });
        }

        this.setData({
          posterConfig: config,
        });
       
        resolve(config);
      } catch (error) {
        console.error("构建海报配置失败:", error);
        // 即使处理图片失败，也尝试生成不带图片的海报
        try {
          const config = await this.buildPosterConfigWithoutQR();
          resolve(config);
        } catch (fallbackError) {
          console.error("生成备用海报配置也失败:", fallbackError);
          resolve({
            width: 750,
            height: 1334,
            backgroundColor: "#8B5CF6",
            debug: false,
            texts: [],
            blocks: [],
            images: [],
          });
        }
      }
    });
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
                    const msg = (e && e.errMsg) || "";
                    if (msg.includes("storage") || msg.includes("limit")) {
                      // 先清理旧文件
                      try {
                        this.cleanupUserDataDirSafe && this.cleanupUserDataDirSafe();
                      } catch (ce) {}
                      // 清理后重试一次
                      fs.writeFile({
                        filePath,
                        data: res.data,
                        encoding: "binary",
                        success: () => {
                          this.qrTempPath = filePath;
                          resolve(filePath);
                        },
                        fail: () => {
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
                    } else {
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
                    }
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

  // 安全清理用户数据目录下我们生成的临时文件
  cleanupUserDataDirSafe() {
    try {
      const fs = wx.getFileSystemManager();
      const dir = wx.env.USER_DATA_PATH;
      const names = fs.readdirSync(dir) || [];
      const now = Date.now();
      names.forEach((name) => {
        if (name.startsWith('qr_') || name.startsWith('poster_img_')) {
          const p = `${dir}/${name}`;
          try {
            const stat = fs.statSync(p);
            const mtime = stat && stat.stats && stat.stats.mtimeMs ? stat.stats.mtimeMs : now - (11 * 60 * 1000);
            if (now - mtime > 10 * 60 * 1000) {
              fs.unlinkSync(p);
            }
          } catch (_) {}
        }
      });
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
        : this.data.i18n.result.noKeywords;

    // 处理梦境解析文本，截取前200字符作为摘要
    const fullInterpretation =
      result.interpretation || this.data.i18n.result.noDreamAnalysis;
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
          text: this.data.i18n.result.appName,
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
          text: this.data.i18n.result.keywords,
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
          text: this.data.i18n.result.dreamAnalysis,
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
          text: this.data.i18n.result.aiGeneratedPoster,
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
          title: this.data.i18n.result.saveSuccess,
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
            title: this.data.i18n.result.needAuthForImage,
            content: this.data.i18n.result.allowSaveImage,
            confirmText: this.data.i18n.result.goToSettings,
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            },
          });
        } else {
          wx.showToast({
            title: this.data.i18n.result.saveFailed,
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
    let errorMessage = this.data.i18n.result.generationFailed;
    if (err && err.detail && err.detail.errMsg) {
      if (err.detail.errMsg.includes("downloadFile:fail")) {
        errorMessage = this.data.i18n.result.networkFailed;
      } else if (err.detail.errMsg.includes("getaddrinfo ENOTFOUND")) {
        errorMessage = this.data.i18n.result.serverConnectionFailed;
      } else if (err.detail.errMsg.includes("tmp")) {
        errorMessage = this.data.i18n.result.tempFileFailed;
      }
    }

    wx.showToast({
      title: errorMessage,
      icon: "error",
      duration: 3000,
    });
    // 失败时也尝试清理二维码临时文件
    if (this.qrTempPath) {
      this.cleanupTempFile(this.qrTempPath);
      this.qrTempPath = null;
    }
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

  // 折叠面板状态变化
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
        title: this.data.i18n.result.pleaseAnswerAtLeastOne,
        icon: "none",
      });
      return;
    }

    this.setData({ savingAnswers: true });

    try {

      const http = require("../../services/http.js");
      const requestData = {
        analysisId: result.analysisId,
        question1: answer1,
        question2: answer2,
      };

      const response = await http.post(
        "/dream/analysis/save-answers",
        requestData
      );


      if (response && response.code === 0) {
        wx.showToast({
          title: this.data.i18n.result.thinkingSaved,
          icon: "success",
          duration: 2000,
        });
      } else {
        throw new Error(response?.message || this.data.i18n.result.saveFailed);
      }
    } catch (error) {
      console.error("保存回答失败:", error);

      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.result.loginRequired,
          content: this.data.i18n.result.loginRequiredForSave,
          confirmText: this.data.i18n.result.goToLogin,
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
          title: error.message || this.data.i18n.result.saveFailed,
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
        title: this.data.i18n.result.pleaseSelectRatingOrFeedback,
        icon: "none",
      });
      return;
    }

    // 检查是否有analysisId
    if (!result || !result.analysisId) {
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
        analysisId: result.analysisId, // 带上analysisId
      };

      // 只有当评分大于0时才添加rating参数
      if (feedbackRating > 0) {
        requestData.rating = feedbackRating;
      }

      const response = await http.post("/user/feedback", requestData);


      if (response && response.code === 0) {
        wx.showToast({
          title: this.data.i18n.result.feedbackSubmitSuccess,
          icon: "success",
        });

        // 清空表单并更新hasFeedback状态
        this.setData({
          feedbackRating: 0,
          feedbackContent: "",
          "result.hasFeedback": true, // 更新hasFeedback状态
        });
      } else {
        throw new Error(
          response?.message || this.data.i18n.result.feedbackSubmitFailed
        );
      }
    } catch (error) {
      console.error("提交反馈失败:", error);

      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.result.loginRequired,
          content: this.data.i18n.result.loginRequiredForFeedback,
          confirmText: this.data.i18n.result.goToLogin,
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
          title: error.message || this.data.i18n.result.submitFailed,
          icon: "error",
        });
      }
    } finally {
      this.setData({ submittingFeedback: false });
    }
  },

  // 清理存储空间
  clearStorage() {
    try {
      const fs = wx.getFileSystemManager();
      // 清理临时文件
      fs.rmdir({
        dirPath: wx.env.USER_DATA_PATH,
        recursive: true,
        success: () => {
          console.log("存储空间清理成功");
        },
        fail: (err) => {
          console.log("存储空间清理失败:", err);
        },
      });
    } catch (error) {
      console.error("清理存储异常:", error);
    }
  },

  // 将远程图片转换为本地临时文件，避免跨域/域名解析问题
  ensureLocalImage(remoteUrl) {
    return new Promise((resolve) => {
      if (!remoteUrl) {
        resolve(null);
        return;
      }


      // 检查是否是本地文件路径
      if (
        remoteUrl.startsWith("http://usr/") ||
        remoteUrl.startsWith("file://") ||
        remoteUrl.startsWith("wxfile://")
      ) {
        // 使用转换方法
        const convertedUrl = this.convertImageUrlForPoster(remoteUrl);
        resolve(convertedUrl);
        return;
      }

      // 先检查存储空间
      wx.getStorageInfo({
        success: (res) => {
          const usedSize = res.currentSize;
          const limitSize = res.limitSize;

          // 如果使用超过80%，先清理
          if (usedSize / limitSize > 0.8) {
            this.clearStorage();
          }

          // 继续下载逻辑
          this.downloadImage(remoteUrl, resolve);
        },
        fail: () => {
          // 获取存储信息失败，直接下载
          this.downloadImage(remoteUrl, resolve);
        },
      });
    });
  },

  // 下载图片的通用方法
  downloadImage(remoteUrl, resolve) {
    try {

      // 检查是否是本地文件路径
      if (
        remoteUrl.startsWith("http://usr/") ||
        remoteUrl.startsWith("file://")
      ) {
        // 使用转换方法
        const convertedUrl = this.convertImageUrlForPoster(remoteUrl);
        resolve(convertedUrl);
        return;
      }

      wx.downloadFile({
        url: remoteUrl,
        timeout: 30000, // 30秒超时
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) {
            // 验证文件是否有效
            wx.getFileInfo({
              filePath: res.tempFilePath,
              success: (fileInfo) => {
                if (fileInfo.size > 0) {
                  // 将临时文件复制到持久存储目录
                  this.persistImageFile(res.tempFilePath, resolve);
                } else {
                  this.getImageInfo(remoteUrl, resolve);
                }
              },
              fail: (err) => {
                this.getImageInfo(remoteUrl, resolve);
              },
            });
          } else {
            this.getImageInfo(remoteUrl, resolve);
          }
        },
        fail: (err) => {
          this.getImageInfo(remoteUrl, resolve);
        },
      });
    } catch (e) {
      resolve(null);
    }
  },

  // 持久化图片文件
  persistImageFile(tempFilePath, resolve) {
    // 避免占用持久空间，直接使用 downloadFile 返回的临时文件路径
    resolve(tempFilePath);
  },

  // 获取图片信息的通用方法
  getImageInfo(remoteUrl, resolve) {
    wx.getImageInfo({
      src: remoteUrl,
      success: (info) => {
        const local = info.path || info.src;
        if (!local) {
          resolve(null);
          return;
        }
        // 直接使用获取到的本地路径，不进行额外写入
        resolve(local);
      },
      fail: (err) => {
        resolve(null);
      },
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
      path: `/pages/result/result?data=${encodeURIComponent(JSON.stringify({
        analysisId: result?.analysisId || "",
        dreamDescription: result?.dreamDescription || "",
        // 可以添加分享标识
        fromShare: true
      }))}`,
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
});
