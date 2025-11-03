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

        // 检查是否是视频类型
        const isVideoType = result.generationType === "video";
        const videoTaskId = result.videoTaskId || null;
        const videoUrl = result.videoUrl || null;

        if (isVideoType) {
          this.setData({
            isVideoType: true,
            videoUrl: videoUrl,
            videoStatus: videoUrl ? 2 : 1, // 如果有videoUrl就是已完成，否则是进行中
          });

          // 如果有videoTaskId但没有videoUrl，开始轮询
          if (videoTaskId && !videoUrl) {
            this.setData({
              videoTaskId: videoTaskId,
            });
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
      console.log("梦境日记页面收到语言变化事件:", newLanguage);
      this.initI18n();
    };
    wx.eventBus && wx.eventBus.on("languageChanged", this.onLanguageChanged);
  },

  onShow() {
    console.log("梦境日记页显示");
    this.checkLoginStatus();

    // 强制更新标题
    this.initI18n();
    const newTitle = t("pageTitle.diary");
    console.log("日记页设置新标题:", newTitle);
    wx.setNavigationBarTitle({ title: newTitle });
  },

  onHide() {
    console.log("梦境日记页隐藏");
    // 停止视频轮询
    this.stopVideoPolling();
  },

  onUnload() {
    console.log("梦境日记页卸载");
    // 停止视频轮询
    this.stopVideoPolling();
    // 移除语言变化事件监听
    wx.eventBus && wx.eventBus.off("languageChanged", this.onLanguageChanged);
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

        // 构建result对象，兼容原有格式
        const result = {
          analysisId: diaryData.analysisId, // 使用API返回的analysisId
          postId: diaryData.postId, // 保留postId字段
          dreamDescription: diaryData.dreamDescription,
          keywords: keywords,
          interpretation: diaryData.interpretation,
          imagePrompt: diaryData.imagePrompt,
          imageUrl: diaryData.imageUrl,
          videoPrompt: diaryData.videoPrompt,
          videoUrl: diaryData.videoUrl,
          guidingQuestionsJson: diaryData.guidingQuestionsJson, // 添加疏导性问题JSON
          likeCount: diaryData.likeCount,
          favoriteCount: diaryData.favoriteCount,
          createdAt: diaryData.createdAt,
          visibility: diaryData.visibility,
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

        // 判断内容类型：优先视频，其次图片，最后文本
        const isVideoType = !!(result.videoUrl || result.videoPrompt);
        const isImageType = !!(result.imageUrl || result.imagePrompt);

        if (isVideoType) {
          result.generationType = "video";
          this.setData({
            isVideoType: true,
            videoUrl: result.videoUrl,
            videoStatus: result.videoUrl ? 2 : 1, // 如果有videoUrl就是已完成，否则是进行中
          });
        } else if (isImageType) {
          result.generationType = "image";
          this.setData({
            isVideoType: false,
          });
        } else {
          result.generationType = "text";
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
   * 开始视频状态轮询（每15秒一次）
   */
  startVideoPolling() {
    console.log("开始视频轮询");
    // 先立即查询一次
    this.pollVideoStatus();
    // 然后每15秒查询一次
    this.videoPollingTimer = setInterval(() => {
      this.pollVideoStatus();
    }, 15000); // 15秒
  },

  /**
   * 停止视频轮询
   */
  stopVideoPolling() {
    if (this.videoPollingTimer) {
      console.log("停止视频轮询");
      clearInterval(this.videoPollingTimer);
      this.videoPollingTimer = null;
    }
  },

  /**
   * 轮询视频状态
   */
  async pollVideoStatus() {
    const { videoTaskId, videoStatus } = this.data;

    // 如果任务已完成或失败，停止轮询
    if (videoStatus === 2 || videoStatus === 3) {
      this.stopVideoPolling();
      return;
    }

    if (!videoTaskId) {
      console.error("缺少视频任务ID");
      return;
    }

    try {
      console.log("查询视频状态, taskId:", videoTaskId);
      const dreamService = require("../../services/dream.js");
      const response = await dreamService.getVideoStatus(videoTaskId);

      console.log("视频状态响应:", response);

      if (response && response.code === 0 && response.data) {
        const { status, videoUrl } = response.data;

        console.log("视频状态:", status, "视频URL:", videoUrl);

        // 更新状态 - 直接使用后端返回的数字状态
        const updateData = {
          videoStatus: status,
        };

        if (status === 2 && videoUrl) {
          updateData.videoUrl = videoUrl;
          // 停止轮询
          this.stopVideoPolling();
          // 提示用户视频已生成
          wx.showToast({
            title: this.data.i18n.diary.videoGenerationComplete,
            icon: "success",
            duration: 2000,
          });
        } else if (status === 3) {
          // 停止轮询
          this.stopVideoPolling();
          wx.showToast({
            title: this.data.i18n.diary.videoGenerationFailed,
            icon: "error",
            duration: 2000,
          });
        }

        this.setData(updateData);
      }
    } catch (error) {
      console.error("查询视频状态失败:", error);
      // 不中断轮询，继续尝试
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

    console.log("开始下载视频:", videoUrl);

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
            console.log("相册权限已授权，开始下载视频");
            this.startVideoDownload(videoUrl);
          },
          fail: () => {
            console.log("用户拒绝了相册权限");
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
        console.log("视频下载响应:", res);
        wx.hideLoading();

        if (res.statusCode === 200) {
          console.log("视频下载成功，开始保存到相册");
          // 保存到相册
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              console.log("视频保存到相册成功");
              wx.showToast({
                title: this.data.i18n.diary.saveSuccess,
                icon: "success",
                duration: 2000,
              });
            },
            fail: (err) => {
              console.error("保存视频失败:", err);
              if (err.errMsg.includes("auth deny")) {
                console.log("用户拒绝了相册权限");
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
    console.log("个人信息设置完成", e.detail);
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

  // 返回首页
  onBackHome() {
    console.log("点击返回按钮");
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
    console.log("点击关闭按钮");
    try {
      // 先尝试返回上一页
      wx.navigateBack({
        delta: 1,
        fail: (err) => {
          console.log("navigateBack失败:", err);
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

    console.log("准备发布，result:", result);
    console.log("analysisId存在:", !!result?.analysisId);
    console.log("analysisId值:", result?.analysisId);

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

      console.log("发布接口URL: /dream/posts/publish");

      const response = await http.post("/dream/posts/publish", requestData);

      console.log("发布响应:", response);

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

    console.log(
      "准备设置为仅个人可见，analysisId:",
      result.analysisId,
      "类型:",
      typeof result.analysisId
    );

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

      console.log("设置私密请求数据:", requestData);
      console.log("设置私密接口URL: /dream/posts/publish");

      const response = await http.post("/dream/posts/publish", requestData);

      console.log("设置私密响应:", response);

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

  // 构建海报配置
  // buildPosterConfig() {
  //   const { result } = this.data;
  //   console.log("buildPosterConfig: result data used for config", result);

  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       // 只处理二维码
  //       const qrCodeUrl = await this.getQRCode();
  //       console.log("二维码处理结果:", qrCodeUrl);

  //       // 处理关键词，转换为字符串
  //       const keywordsText =
  //         result.keywords && result.keywords.length > 0
  //           ? result.keywords.join("、")
  //           : t("diary.noKeywords");

  //       // 布局与样式参数 - 优化后的设计（去掉梦境内容）
  //       const cardX = 40;
  //       const cardWidth = 670;
  //       const innerX = 60;
  //       const textWidth = 590;
  //       const titleFontSize = 48;
  //       const labelFontSize = 36;
  //       const keywordFontSize = 26;
  //       const interpFontSize = 28;
  //       const keywordLineHeight = 38;
  //       const interpLineHeight = 40;

  //       // 估算文本所需高度 - 更精确的自适应计算
  //       const estimateBlockHeight = (
  //         text,
  //         fontSize,
  //         width,
  //         lineHeight,
  //         minHeight
  //       ) => {
  //         const safeText = (text || "").toString();
  //         const charsPerLine = Math.max(
  //           8,
  //           Math.floor(width / (fontSize * 0.6))
  //         ); // 调整字符计算
  //         const lines = Math.max(1, Math.ceil(safeText.length / charsPerLine));
  //         const height = lines * lineHeight + 20; // 进一步减少内边距
  //         return Math.max(minHeight, height);
  //       };

  //       // 处理梦境解析文本，截取前200字符作为摘要
  //       const fullInterpretation =
  //         result.interpretation || t("diary.noDreamAnalysis");
  //       const interpText =
  //         fullInterpretation.length > 200
  //           ? fullInterpretation.substring(0, 200) + "..."
  //           : fullInterpretation;

  //       const keywordBlockHeight = estimateBlockHeight(
  //         keywordsText,
  //         keywordFontSize,
  //         textWidth,
  //         keywordLineHeight,
  //         30
  //       );
  //       const interpBlockHeight = estimateBlockHeight(
  //         interpText,
  //         interpFontSize,
  //         textWidth,
  //         interpLineHeight,
  //         80
  //       );

  //       // 调整后的布局位置 - 去掉梦境内容，重新布局
  //       const keywordLabelY = 220; // 关键词标签位置
  //       const keywordBlockY = keywordLabelY + 30; // 统一30px间距
  //       const keywordTextY = keywordBlockY + 30; // 统一30px间距

  //       const interpLabelY = keywordTextY + keywordBlockHeight + 40; // 解析标签位置
  //       const interpBlockY = interpLabelY + 30; // 统一30px间距
  //       const interpTextY = interpBlockY + 30; // 统一30px间距

  //       const config = {
  //         width: 750,
  //         height: 1334,
  //         backgroundColor: "#FFFFFF", // 纯白背景更简洁
  //         debug: false,
  //         texts: [
  //           // 主标题 - 光爱梦伴
  //           {
  //             x: 375,
  //             y: 120,
  //             baseLine: "middle",
  //             textAlign: "center",
  //             text: t("diary.appName"),
  //             fontSize: 56,
  //             color: "#1A1A1A",
  //             fontWeight: "bold",
  //             zIndex: 10,
  //           },
  //           // 副标题
  //           {
  //             x: 375,
  //             y: 180,
  //             baseLine: "middle",
  //             textAlign: "center",
  //             text: t("diary.aiDreamAnalysis"),
  //             fontSize: 26,
  //             color: "#1A1A1A",
  //             fontWeight: "600",
  //             zIndex: 10,
  //           },
  //           // 关键词标签
  //           {
  //             x: cardX,
  //             y: keywordLabelY,
  //             baseLine: "top",
  //             textAlign: "left",
  //             text: t("diary.keywords"),
  //             fontSize: 36,
  //             color: "#1A1A1A",
  //             fontWeight: "bold",
  //             zIndex: 10,
  //           },
  //           // 关键词文本
  //           {
  //             x: innerX,
  //             y: keywordTextY,
  //             baseLine: "top",
  //             textAlign: "left",
  //             text: keywordsText,
  //             fontSize: 26,
  //             color: "#000000",
  //             width: textWidth,
  //             lineHeight: 38,
  //             lineNum: 3,
  //             zIndex: 10,
  //           },
  //           // 梦境解析标签
  //           {
  //             x: cardX,
  //             y: interpLabelY,
  //             baseLine: "top",
  //             textAlign: "left",
  //             text: t("diary.dreamAnalysis"),
  //             fontSize: 36,
  //             color: "#1A1A1A",
  //             fontWeight: "bold",
  //             zIndex: 10,
  //           },
  //           // 梦境解析文本（摘要版本）
  //           {
  //             x: innerX,
  //             y: interpTextY,
  //             baseLine: "top",
  //             textAlign: "left",
  //             text: interpText,
  //             fontSize: 28,
  //             color: "#000000",
  //             width: textWidth,
  //             lineHeight: 40,
  //             lineNum: 4,
  //             zIndex: 10,
  //           },
  //         ],
  //         blocks: [
  //           // 顶部渐变背景
  //           {
  //             x: 0,
  //             y: 0,
  //             width: 750,
  //             height: 200,
  //             backgroundColor: "rgba(139, 92, 246, 0.03)",
  //             borderRadius: 0,
  //             borderWidth: 0,
  //             borderColor: "transparent",
  //             zIndex: 0,
  //           },
  //           // 去掉所有内容块的白色背景，让内容直接显示在背景图片上
  //         ],
  //         images: [],
  //       };

  //       // 添加背景图片
  //       config.images.push({
  //         x: 0,
  //         y: 0,
  //         width: 750,
  //         height: 1334,
  //         url: "https://dulele.org.cn/images/assest/dreamAnalysisResult.png",
  //         zIndex: 0,
  //       });

  //       // 添加接口返回的图片（如果有的话）
  //       if (result.imageUrl) {
  //         const imageWidth = 350; // 图片宽度，增加宽度
  //         const imageHeight = 300; // 图片高度
  //         const imageX = (750 - imageWidth) / 2; // 水平居中
  //         // 计算图片位置：在梦境解析内容下方，固定10px间距
  //         const imageY = interpTextY + interpBlockHeight + 10; // 在梦境解析下方固定10px间距

  //         config.images.push({
  //           x: imageX,
  //           y: imageY,
  //           width: imageWidth,
  //           height: imageHeight,
  //           url: result.imageUrl,
  //           zIndex: 2,
  //         });
  //       }

  //       // 智能计算二维码位置，避免与内容重叠
  //       if (qrCodeUrl) {
  //         const qrSize = 160; // 二维码尺寸
  //         const qrX = (750 - qrSize) / 2; // 水平居中

  //         // 计算内容总高度
  //         const contentEndY = interpTextY + interpBlockHeight;
  //         const minSpacing = 60; // 最小间距
  //         // 如果有图片，二维码位置需要在图片下方
  //         let baseQrY = 1000; // 默认位置
  //         if (result.imageUrl) {
  //           // 图片位置 + 图片高度 + 间距
  //           const imageY = interpTextY + interpBlockHeight + 10; // 使用固定的10px间距
  //           const imageHeight = 300; // 使用新的图片高度
  //           baseQrY = imageY + imageHeight + 20; // 图片下方20px间距，保持紧凑布局
  //         }
  //         const qrY = Math.max(contentEndY + minSpacing, baseQrY);

  //         // 检查是否会超出画布底部，确保兼容不同手机
  //         const qrBottomY = qrY + qrSize + 40; // 二维码底部 + 说明文字高度
  //         let finalQrY = qrY;

  //         if (qrBottomY > 1334) {
  //           console.warn("二维码位置可能超出画布，调整位置");
  //           // 如果超出，调整到画布底部，确保在所有设备上都能显示
  //           finalQrY = Math.max(1334 - qrSize - 40, 800); // 最小位置800px，确保不会太靠上
  //           console.log("调整后的二维码Y位置:", finalQrY);
  //         }

  //         // 添加调试信息，帮助排查问题
  //         console.log("海报布局调试信息:", {
  //           interpTextY: interpTextY,
  //           interpBlockHeight: interpBlockHeight,
  //           imageY: result.imageUrl
  //             ? interpTextY + interpBlockHeight + 10
  //             : null,
  //           qrY: qrY,
  //           finalQrY: finalQrY,
  //           hasImage: !!result.imageUrl,
  //         });

  //         console.log("二维码位置信息:", {
  //           contentEndY,
  //           calculatedQrY: qrY,
  //           finalQrY,
  //           qrBottomY: finalQrY + qrSize + 40,
  //           canvasHeight: 1334,
  //         });

  //         // 二维码上方说明文字
  //         config.texts.push({
  //           x: 375,
  //           y: finalQrY - 30,
  //           baseLine: "middle",
  //           textAlign: "center",
  //           text: t("result.scanForMore"),
  //           fontSize: 20,
  //           color: "#6B7280",
  //           fontWeight: "normal",
  //           zIndex: 10,
  //         });

  //         // 小程序码图
  //         config.images.push({
  //           x: qrX,
  //           y: finalQrY,
  //           width: qrSize,
  //           height: qrSize,
  //           url: qrCodeUrl,
  //           zIndex: 3,
  //         });

  //         // 二维码下方说明文字
  //         config.texts.push({
  //           x: 375,
  //           y: finalQrY + qrSize + 20,
  //           baseLine: "middle",
  //           textAlign: "center",
  //           text: t("result.longPressToScan"),
  //           fontSize: 20,
  //           color: "#6B7280",
  //           fontWeight: "normal",
  //           zIndex: 10,
  //         });
  //       }

  //       this.setData({
  //         posterConfig: config,
  //       });
  //       console.log(
  //         "buildPosterConfig: final posterConfig",
  //         this.data.posterConfig
  //       );
  //       resolve(config);
  //     } catch (error) {
  //       console.error("构建海报配置失败:", error);
  //       // 即使处理图片失败，也尝试生成不带图片的海报
  //       try {
  //         const config = await this.buildPosterConfigWithoutQR();
  //         resolve(config);
  //       } catch (fallbackError) {
  //         console.error("生成备用海报配置也失败:", fallbackError);
  //         resolve({
  //           width: 750,
  //           height: 1334,
  //           backgroundColor: "#8B5CF6",
  //           debug: false,
  //           texts: [],
  //           blocks: [],
  //           images: [],
  //         });
  //       }
  //     }
  //   });
  // },

  // 获取小程序码
  async getQRCode() {
    try {
      const config = require("../../config/env.js");
      // 构建小程序码URL（修正为 /auth/wechat/mini）
      const qrCodeUrl = `${config.baseURL}/auth/wechat/mini?path=pages/index/index`;
      console.log("小程序码URL:", qrCodeUrl);

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
                    console.warn("写入二维码失败:", e);
                    resolve(null);
                  },
                });
              } catch (e) {
                console.warn("保存二维码异常:", e);
                resolve(null);
              }
            } else {
              console.warn("获取二维码失败:", res.statusCode);
              resolve(null);
            }
          },
          fail: (err) => {
            console.warn("请求二维码失败:", err);
            resolve(null);
          },
        });
      });
    } catch (error) {
      console.error("获取小程序码失败:", error);
      return null;
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
      console.log("保存疏导性问题回答:", { answer1, answer2 });

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

      console.log("保存回答响应:", response);

      if (response && response.code === 0) {
        wx.showToast({
          title: this.data.i18n.diary.thinkingSaved,
          icon: "success",
          duration: 2000,
        });

        // 清空已保存的回答
        const updateData = {};
        if (answer1 && answer1.trim()) {
          updateData.answer1 = "";
        }
        if (answer2 && answer2.trim()) {
          updateData.answer2 = "";
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

    const { feedbackRating, feedbackContent } = this.data;

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

    this.setData({ submittingFeedback: true });

    try {
      console.log("提交反馈:", {
        rating: feedbackRating,
        content: feedbackContent,
      });

      const http = require("../../services/http.js");
      const requestData = {
        content: feedbackContent,
      };

      // 只有当评分大于0时才添加rating参数
      if (feedbackRating > 0) {
        requestData.rating = feedbackRating;
      }

      const response = await http.post("/user/feedback", requestData);

      console.log("反馈提交响应:", response);

      if (response && response.code === 0) {
        wx.showToast({
          title: this.data.i18n.diary.feedbackSubmitSuccess,
          icon: "success",
        });

        // 清空表单并标记反馈已提交
        this.setData({
          feedbackRating: 0,
          feedbackContent: "",
          feedbackSubmitted: true,
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
        console.log("ensureLocalImage: 无图片URL");
        resolve(null);
        return;
      }

      console.log("ensureLocalImage: 开始处理图片", remoteUrl);

      try {
        wx.downloadFile({
          url: remoteUrl,
          success: (res) => {
            console.log("downloadFile success:", res);
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
                console.log("getImageInfo success (fallback):", info);
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

  // ========== Painter 相关方法 ==========

  // 构建 Painter 海报配置
  async buildPainterPalette() {
    const { result } = this.data;
    console.log("构建 Painter 海报配置:", result);

    try {
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
          console.log("背景图片下载成功:", backgroundImageUrl);
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
        console.log("二维码获取结果:", qrCodeUrl);
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
          // AI生成的梦境图片（如果有）
          ...(result.imageUrl
            ? [
                {
                  type: "image",
                  url: result.imageUrl,
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

      console.log("Painter 配置设置完成");
    } catch (error) {
      console.error("构建 Painter 配置失败:", error);
      throw error;
    }
  },

  // Painter 图片生成成功
  onPainterImgOK(e) {
    const { path } = e.detail;
    console.log("Painter 图片生成成功:", path);

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
  },
});
