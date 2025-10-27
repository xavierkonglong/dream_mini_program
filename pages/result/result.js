// 结果页
const authService = require('../../services/auth.js');
const { IMAGE_URLS } = require('../../constants/index.js');
const { t, getLang } = require('../../utils/i18n.js');

Page({
  data: {
    result: null,
    isLoggedIn: false,
    imageUrls: IMAGE_URLS,
    posterConfig: null,
    showProfileSetupModal: false,
    feedbackRating: 0,
    feedbackContent: '',
    submittingFeedback: false,
    // 加载状态
    loading: true,
    // 视频相关
    isVideoType: false,
    videoTaskId: null,
    videoUrl: null,
    videoStatus: 'pending', // pending, processing, completed, failed
    // 疏导性问题相关
    answer1: '',
    answer2: '',
    savingAnswers: false,
    // 折叠面板相关
    activeNames: [], // 默认全部收缩
    // 反馈相关
    feedbackSubmitted: false, // 反馈是否已提交
    // 多语言相关
    language: 'zh',
    i18n: {}
  },

  onLoad(options) {
    console.log('结果页加载', options);
    console.log('背景图片URL:', this.data.imageUrls.BACKGROUNDS.DREAM_ANALYSIS_RESULT);
    
    // 初始化多语言
    this.initI18n();
    
    // 检查登录状态
    this.checkLoginStatus();
    
    if (options.data) {
      try {
        const result = JSON.parse(decodeURIComponent(options.data));
        console.log('解析结果数据:', result);
        console.log('analysisId:', result.analysisId);
        console.log('analysisId类型:', typeof result.analysisId);
        console.log('generationType:', result.generationType);
        
        // 确保analysisId是数字类型
        if (result.analysisId) {
          result.analysisId = parseInt(result.analysisId);
          console.log('转换后的analysisId:', result.analysisId);
        }
        
        // 格式化解析内容，进行智能分段
        if (result.interpretation) {
          result.interpretationParagraphs = this.formatInterpretation(result.interpretation);
        }
        
        // 解析疏导性问题JSON
        if (result.guidingQuestionsJson) {
          try {
            console.log('result.js - 原始guidingQuestionsJson:', result.guidingQuestionsJson);
            const guidingQuestions = JSON.parse(result.guidingQuestionsJson);
            console.log('result.js - 解析后的guidingQuestions:', guidingQuestions);
            
            // 处理问题1和问题2（不依赖顺序）
            const questionKeys = Object.keys(guidingQuestions);
            let question1Processed = false;
            let question2Processed = false;
            
            for (const key of questionKeys) {
              if (key.startsWith('question') && guidingQuestions[key]) {
                const questionData = guidingQuestions[key];
                const question = questionData.question;
                const answer = questionData.answer;
                
                if (!question1Processed) {
                  result.guidingQuestion1 = question;
                  result.guidingQuestion1Answer = answer || '';
                  if (answer) {
                    result.guidingQuestion1 = question + '\n\n💭 ' + this.data.i18n.result.myThinking + '：\n' + answer;
                  }
                  question1Processed = true;
                } else if (!question2Processed) {
                  result.guidingQuestion2 = question;
                  result.guidingQuestion2Answer = answer || '';
                  if (answer) {
                    result.guidingQuestion2 = question + '\n\n💭 ' + this.data.i18n.result.myThinking + '：\n' + answer;
                  }
                  question2Processed = true;
                }
              }
            }
          } catch (error) {
            console.error('result.js - 解析疏导性问题JSON失败:', error);
            result.guidingQuestion1 = '';
            result.guidingQuestion2 = '';
          }
        } else {
          console.log('result.js - 没有guidingQuestionsJson字段');
        }
        
        // 检查是否是视频类型
        const isVideoType = result.generationType === 'video';
        const videoTaskId = result.videoTaskId || null;
        
        if (isVideoType && videoTaskId) {
          console.log('视频类型，任务ID:', videoTaskId);
          this.setData({
            isVideoType: true,
            videoTaskId: videoTaskId,
            videoStatus: 1 // 改为数字 1，表示进行中
          });
          // 开始轮询视频状态
          this.startVideoPolling();
        }
        
        // 预加载AI图片，转为本地临时路径，避免跨域/域名解析问题
        // 只有文生图模式才处理图片，文生视频不需要图片
        if (!isVideoType && result.imageUrl) {
          this.ensureLocalImage(result.imageUrl).then(localPath => {
            if (localPath) {
              result.imageUrl = localPath;
            }
            this.setData({ result, loading: false });
          }).catch(() => {
            this.setData({ result, loading: false });
          });
        } else {
          this.setData({ result, loading: false });
        }
      } catch (error) {
        console.error('解析结果数据失败:', error);
        this.setData({ loading: false });
        wx.showToast({
          title: this.data.i18n.result.dataError,
          icon: 'error'
        });
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
          dataError: t('result.dataError'),
          videoNotGenerated: t('result.videoNotGenerated'),
          videoGenerationComplete: t('result.videoGenerationComplete'),
          videoGenerationFailed: t('result.videoGenerationFailed'),
          downloading: t('result.downloading'),
          saveSuccess: t('result.saveSuccess'),
          saveFailed: t('result.saveFailed'),
          needAuth: t('result.needAuth'),
          allowSaveVideo: t('result.allowSaveVideo'),
          goToSettings: t('result.goToSettings'),
          downloadFailed: t('result.downloadFailed'),
          dreamAnalysisResult: t('result.dreamAnalysisResult'),
          dreamAnalysis: t('result.dreamAnalysis'),
          shareToFriends: t('result.shareToFriends'),
          saveToAlbum: t('result.saveToAlbum'),
          copyLink: t('result.copyLink'),
          copied: t('result.copied'),
          publishToCommunity: t('result.publishToCommunity'),
          confirmPublish: t('result.confirmPublish'),
          publish: t('result.publish'),
          cancel: t('result.cancel'),
          dataErrorMissingId: t('result.dataErrorMissingId'),
          publishing: t('result.publishing'),
          publishSuccess: t('result.publishSuccess'),
          publishFailed: t('result.publishFailed'),
          loginRequired: t('result.loginRequired'),
          loginRequiredForPublish: t('result.loginRequiredForPublish'),
          goToLogin: t('result.goToLogin'),
          noData: t('result.noData'),
          generatingPoster: t('result.generatingPoster'),
          posterComponentNotFound: t('result.posterComponentNotFound'),
          generationFailed: t('result.generationFailed'),
          noKeywords: t('result.noKeywords'),
          noDreamDescription: t('result.noDreamDescription'),
          noDreamAnalysis: t('result.noDreamAnalysis'),
          appName: t('result.appName'),
          aiDreamAnalysis: t('result.aiDreamAnalysis'),
          dreamContent: t('result.dreamContent'),
          keywords: t('result.keywords'),
          dreamAnalysis: t('result.dreamAnalysis'),
          scanForMore: t('result.scanForMore'),
          longPressToScan: t('result.longPressToScan'),
          aiGeneratedPoster: t('result.aiGeneratedPoster'),
          needAuthForImage: t('result.needAuthForImage'),
          allowSaveImage: t('result.allowSaveImage'),
          generationFailed: t('result.generationFailed'),
          networkFailed: t('result.networkFailed'),
          serverConnectionFailed: t('result.serverConnectionFailed'),
          tempFileFailed: t('result.tempFileFailed'),
          pleaseAnswerAtLeastOne: t('result.pleaseAnswerAtLeastOne'),
          thinkingSaved: t('result.thinkingSaved'),
          saveFailed: t('result.saveFailed'),
          loginRequiredForSave: t('result.loginRequiredForSave'),
          pleaseSelectRatingOrFeedback: t('result.pleaseSelectRatingOrFeedback'),
          feedbackSubmitSuccess: t('result.feedbackSubmitSuccess'),
          feedbackSubmitFailed: t('result.feedbackSubmitFailed'),
          loginRequiredForFeedback: t('result.loginRequiredForFeedback'),
          submitFailed: t('result.submitFailed'),
          myThinking: t('result.myThinking'),
          aiDreamVideo: t('result.aiDreamVideo'),
          clickToViewVideo: t('result.clickToViewVideo'),
          loading: t('result.loading'),
          aiDisclaimer: t('result.aiDisclaimer'),
          guidingQuestions: t('result.guidingQuestions'),
          questionsIntro: t('result.questionsIntro'),
          question1: t('result.question1'),
          question2: t('result.question2'),
          answerPlaceholder: t('result.answerPlaceholder'),
          saveAnswers: t('result.saveAnswers'),
          saving: t('result.saving'),
          aiImage: t('result.aiImage'),
          videoGenerating: t('result.videoGenerating'),
          videoGeneratingTip: t('result.videoGeneratingTip'),
          videoFailed: t('result.videoFailed'),
          videoFailedTip: t('result.videoFailedTip'),
          downloadVideo: t('result.downloadVideo'),
          generatePoster: t('result.generatePoster'),
          rateUs: t('result.rateUs'),
          ratingLabel: t('result.ratingLabel'),
          score: t('result.score'),
          selectRating: t('result.selectRating'),
          feedbackLabel: t('result.feedbackLabel'),
          feedbackPlaceholder: t('result.feedbackPlaceholder'),
          submitFeedback: t('result.submitFeedback'),
          submitting: t('result.submitting'),
          thankYouTitle: t('result.thankYouTitle'),
          thankYouText: t('result.thankYouText'),
          noResult: t('result.noResult')
        },
        app: {
          shareTitle: t('app.shareTitle'),
          timelineTitle: t('app.timelineTitle')
        }
      }
    });
    wx.setNavigationBarTitle({ title: t('pageTitle.result') });
    
    // 监听语言切换事件
    wx.eventBus && wx.eventBus.on('languageChanged', () => {
      // 重新设置页面标题
      wx.setNavigationBarTitle({ title: t('pageTitle.result') });
    });
  },

  onShow() {
    console.log('结果页显示');
    this.checkLoginStatus();
    
    // 强制更新标题
    this.initI18n();
    const newTitle = t('pageTitle.result');
    console.log('结果页设置新标题:', newTitle);
    wx.setNavigationBarTitle({ title: newTitle });
  },

  onHide() {
    console.log('结果页隐藏');
    // 停止视频轮询
    this.stopVideoPolling();
  },

  onUnload() {
    console.log('结果页卸载');
    // 停止视频轮询
    this.stopVideoPolling();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const isLoggedIn = authService.checkLoginStatus();
    this.setData({
      isLoggedIn: isLoggedIn
    });
  },

  /**
   * 开始视频状态轮询（每15秒一次）
   */
  startVideoPolling() {
    console.log('开始视频轮询');
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
      console.log('停止视频轮询');
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
      console.error('缺少视频任务ID');
      return;
    }

    try {
      console.log('查询视频状态, taskId:', videoTaskId);
      const dreamService = require('../../services/dream.js');
      const response = await dreamService.getVideoStatus(videoTaskId);
      
      console.log('视频状态响应:', response);

      if (response && response.code === 0 && response.data) {
        const { status, videoUrl } = response.data;
        
        console.log('视频状态:', status, '视频URL:', videoUrl);

        // 更新状态 - 直接使用后端返回的数字状态
        const updateData = {
          videoStatus: status
        };

        if (status === 2 && videoUrl) {
          updateData.videoUrl = videoUrl;
          // 停止轮询
          this.stopVideoPolling();
          // 提示用户视频已生成
          wx.showToast({
            title: this.data.i18n.result.videoGenerationComplete,
            icon: 'success',
            duration: 2000
          });
        } else if (status === 3) {
          // 停止轮询
          this.stopVideoPolling();
          wx.showToast({
            title: this.data.i18n.result.videoGenerationFailed,
            icon: 'error',
            duration: 2000
          });
        }

        this.setData(updateData);
      }
    } catch (error) {
      console.error('查询视频状态失败:', error);
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
        title: this.data.i18n.result.videoNotGenerated,
        icon: 'none'
      });
      return;
    }

    // 使用小程序的视频预览
    wx.previewMedia({
      sources: [{
        url: videoUrl,
        type: 'video'
      }],
      current: 0
    });
  },

  /**
   * 为视频生成第一帧封面图
   */
  generateVideoThumbnail(videoUrl) {
    return new Promise((resolve, reject) => {
      try {
        console.log('开始生成视频第一帧:', videoUrl);
        
        // 使用微信小程序的 getVideoInfo API 获取视频信息
        wx.getVideoInfo({
          src: videoUrl,
          success: (res) => {
            console.log('视频信息获取成功:', res);
            
            // 如果视频有 poster 属性，直接使用
            if (res.poster) {
              console.log('使用视频自带的poster:', res.poster);
              resolve(res.poster);
              return;
            }
            
            // 如果没有poster，尝试使用 createVideoContext 获取第一帧
            this.getVideoFirstFrame(videoUrl).then(resolve).catch((error) => {
              console.log('获取视频第一帧失败，使用默认图片:', error);
              // 降级到默认图片
              this.getDefaultThumbnail().then(resolve).catch(reject);
            });
          },
          fail: (error) => {
            console.log('获取视频信息失败:', error);
            // 降级到默认图片
            this.getDefaultThumbnail().then(resolve).catch(reject);
          }
        });
      } catch (error) {
        console.error('生成视频封面异常:', error);
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
        query.select('#video-canvas').fields({ node: true, size: true }).exec((res) => {
          if (res[0]) {
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            
            // 设置画布尺寸
            canvas.width = 400;
            canvas.height = 400;
            
            // 创建video元素
            const video = canvas.createVideo();
            video.src = videoUrl;
            video.crossOrigin = 'anonymous';
            
            video.onloadeddata = () => {
              try {
                // 绘制视频第一帧到canvas
                ctx.drawImage(video, 0, 0, 400, 400);
                
                // 导出为图片
                wx.canvasToTempFilePath({
                  canvas: canvas,
                  success: (res) => {
                    console.log('视频第一帧生成成功:', res.tempFilePath);
                    resolve(res.tempFilePath);
                  },
                  fail: (err) => {
                    console.error('导出视频第一帧失败:', err);
                    reject(err);
                  }
                });
              } catch (error) {
                console.error('绘制视频第一帧失败:', error);
                reject(error);
              }
            };
            
            video.onerror = (error) => {
              console.error('视频加载失败:', error);
              reject(error);
            };
          } else {
            reject(new Error('Canvas not found'));
          }
        });
      } catch (error) {
        console.error('获取视频第一帧异常:', error);
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
        const defaultThumbnailUrl = this.data.imageUrls?.BACKGROUNDS?.PERSON || null;
        if (defaultThumbnailUrl) {
          this.ensureLocalImage(defaultThumbnailUrl).then(resolve).catch(() => {
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
        query.select('#video-canvas').fields({ node: true, size: true }).exec((res) => {
          if (res[0]) {
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            
            // 设置画布尺寸
            canvas.width = 400;
            canvas.height = 400;
            
            // 绘制背景
            ctx.fillStyle = '#8B5CF6';
            ctx.fillRect(0, 0, 400, 400);
            
            // 绘制文字
            ctx.fillStyle = '#ffffff';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.data.i18n.result.aiDreamVideo, 200, 180);
            
            ctx.font = '24px Arial';
            ctx.fillText(this.data.i18n.result.clickToViewVideo, 200, 220);
            
            // 导出为图片
            wx.canvasToTempFilePath({
              canvas: canvas,
              success: (res) => {
                resolve(res.tempFilePath);
              },
              fail: reject
            });
          } else {
            reject(new Error('Canvas not found'));
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
        icon: 'none'
      });
      return;
    }

    console.log('开始下载视频:', videoUrl);

    // 先检查相册权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          // 用户之前拒绝了权限，需要引导到设置页面
          wx.showModal({
            title: this.data.i18n.result.needAuth,
            content: this.data.i18n.result.allowSaveVideo,
            confirmText: this.data.i18n.result.goToSettings,
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
          return;
        }
        
        // 权限未确定或已授权，先请求权限
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => {
            console.log('相册权限已授权，开始下载视频');
            this.startVideoDownload(videoUrl);
          },
          fail: () => {
            console.log('用户拒绝了相册权限');
            wx.showModal({
              title: this.data.i18n.result.needAuth,
              content: this.data.i18n.result.allowSaveVideo,
              confirmText: this.data.i18n.result.goToSettings,
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting();
                }
              }
            });
          }
        });
      }
    });
  },

  /**
   * 开始下载视频
   */
  startVideoDownload(videoUrl) {
    // 显示下载提示
    wx.showLoading({
      title: this.data.i18n.result.downloading
    });

    // 下载视频文件
    wx.downloadFile({
      url: videoUrl,
      success: (res) => {
        console.log('视频下载响应:', res);
        wx.hideLoading();
        
        if (res.statusCode === 200) {
          console.log('视频下载成功，开始保存到相册');
          // 保存到相册
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              console.log('视频保存到相册成功');
              wx.showToast({
                title: this.data.i18n.result.saveSuccess,
                icon: 'success',
                duration: 2000
              });
            },
            fail: (err) => {
              console.error('保存视频失败:', err);
              if (err.errMsg.includes('auth deny')) {
                console.log('用户拒绝了相册权限');
                wx.showModal({
                  title: this.data.i18n.result.needAuth,
                  content: this.data.i18n.result.allowSaveVideo,
                  confirmText: this.data.i18n.result.goToSettings,
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                console.error('保存视频失败，错误信息:', err.errMsg);
                wx.showToast({
                  title: this.data.i18n.result.saveFailed,
                  icon: 'error',
                  duration: 2000
                });
              }
            }
          });
        } else {
          console.error('视频下载失败，状态码:', res.statusCode);
          wx.showToast({
            title: this.data.i18n.result.downloadFailed,
            icon: 'error',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('视频下载失败，详细错误:', err);
        wx.hideLoading();
        
        // 根据错误类型提供更具体的提示
        let errorMessage = this.data.i18n.result.downloadFailed;
        if (err.errMsg) {
          if (err.errMsg.includes('network')) {
            errorMessage = '网络连接失败，请检查网络后重试';
          } else if (err.errMsg.includes('timeout')) {
            errorMessage = '下载超时，请重试';
          } else if (err.errMsg.includes('storage')) {
            errorMessage = '存储空间不足，请清理后重试';
          }
        }
        
        wx.showToast({
          title: errorMessage,
          icon: 'error',
          duration: 3000
        });
      }
    });
  },

  /**
   * 智能分段函数
   */
  formatInterpretation(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    // 清理文本，去除多余空格
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // 按句号、问号、感叹号分段，但保留标点符号
    const sentences = cleanText.split(/([。！？])/).filter(item => item.trim());
    
    // 重新组合句子和标点符号
    const combinedSentences = [];
    for (let i = 0; i < sentences.length; i += 2) {
      if (sentences[i]) {
        const sentence = sentences[i].trim();
        const punctuation = sentences[i + 1] || '';
        if (sentence) {
          combinedSentences.push(sentence + punctuation);
        }
      }
    }
    
    // 每2-3句组成一个段落，避免段落过长
    const paragraphs = [];
    for (let i = 0; i < combinedSentences.length; i += 2) {
      const paragraphSentences = combinedSentences.slice(i, i + 2);
      const paragraph = paragraphSentences.join('').trim();
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
          const paragraph = paragraphSentences.join('，').trim();
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
    console.log('个人信息设置完成', e.detail);
    // 更新登录状态
    this.checkLoginStatus();
  },

  /**
   * 关闭个人信息设置弹窗
   */
  onCloseProfileSetupModal() {
    this.setData({
      showProfileSetupModal: false
    });
  },

  // 返回首页
  onBackHome() {
    console.log('点击返回按钮');
    try {
      // 先尝试返回上一页
      wx.navigateBack({
        delta: 1,
        fail: (err) => {
          console.log('navigateBack失败:', err);
          // 如果返回失败，跳转到首页
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
    } catch (error) {
      console.error('返回操作异常:', error);
      // 异常情况下跳转到首页
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  // 关闭页面
  onClose() {
    console.log('点击关闭按钮');
    try {
      // 先尝试返回上一页
      wx.navigateBack({
        delta: 1,
        fail: (err) => {
          console.log('navigateBack失败:', err);
          // 如果返回失败，跳转到首页
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
    } catch (error) {
      console.error('关闭操作异常:', error);
      // 异常情况下跳转到首页
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  // 预览图片
  onPreviewImage() {
    const { result } = this.data;
    if (result && result.imageUrl) {
      wx.previewImage({
        urls: [result.imageUrl],
        current: result.imageUrl
      });
    }
  },

  // 分享
  onShare() {
    const { result } = this.data;
    if (result) {
      return {
        title: this.data.i18n.result.dreamAnalysisResult,
        path: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(result))}`,
        imageUrl: result.imageUrl || ''
      };
    }
    return {
      title: this.data.i18n.result.dreamAnalysis,
      path: '/pages/index/index'
    };
  },

  // 长按分享
  onLongPressShare() {
    wx.showActionSheet({
      itemList: [this.data.i18n.result.shareToFriends, this.data.i18n.result.saveToAlbum, this.data.i18n.result.copyLink],
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
      }
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
            icon: 'success'
          });
        },
        fail: () => {
          wx.showToast({
            title: this.data.i18n.result.saveFailed,
            icon: 'error'
          });
        }
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
            icon: 'success'
          });
        }
      });
    }
  },

  // 发布到社区
  onPublishToCommunity() {
    const { result } = this.data;
    
    console.log('准备发布，result:', result);
    console.log('analysisId存在:', !!result?.analysisId);
    console.log('analysisId值:', result?.analysisId);
    
    if (!result || !result.analysisId) {
      wx.showToast({
        title: this.data.i18n.result.dataErrorMissingId,
        icon: 'error'
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
      }
    });
  },

  // 调用发布接口
  async publishToCommunity() {
    const { result } = this.data;
    
    console.log('准备发布，analysisId:', result.analysisId, '类型:', typeof result.analysisId);
    
    try {
      // 显示加载提示
      wx.showLoading({
        title: this.data.i18n.result.publishing
      });

      // 调用发布接口
      const http = require('../../services/http.js');
      const requestData = {
        analysisId: result.analysisId,
        isPublic: 1
      };
      
      console.log('发布请求数据:', requestData);
      console.log('发布接口URL: /dream/posts/publish');
      
      const response = await http.post('/dream/posts/publish', requestData);

      console.log('发布响应:', response);

      if (response && response.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: this.data.i18n.result.publishSuccess,
          icon: 'success',
          duration: 2000
        });
        
        // 可以在这里添加其他成功后的处理，比如跳转到社区页面
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/community/community'
          });
        }, 2000);
      } else {
        throw new Error(response?.message || this.data.i18n.result.publishFailed);
      }
    } catch (error) {
      console.error('发布失败:', error);
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
                url: '/pages/profile/profile'
              });
            }
          }
        });
      } else {
        wx.showToast({
          title: error.message || this.data.i18n.result.publishFailed,
          icon: 'error',
          duration: 2000
        });
      }
    }
  },

  // 生成海报
  async onGeneratePoster() {
    console.log('onGeneratePoster: this.data.result', this.data.result);
    if (!this.data.result) {
      wx.showToast({
        title: this.data.i18n.result.noData,
        icon: 'error'
      });
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: this.data.i18n.result.generatingPoster
    });
    
    try {
      // 先清理存储空间
      this.clearStorage();
      
      // 等待一下再生成，确保清理完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 构建海报配置并等待完成
      await this.buildPosterConfig();
    
      // 获取poster组件并调用onCreate方法
      const poster = this.selectComponent('#poster');
      if (poster) {
        console.log('开始生成海报...');
        poster.onCreate(true);
      } else {
        wx.hideLoading();
        wx.showToast({
          title: this.data.i18n.result.posterComponentNotFound,
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('生成海报配置失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: this.data.i18n.result.generationFailed,
        icon: 'error'
      });
    }
  },

  // 构建海报配置
  buildPosterConfig() {
    const { result } = this.data;
    console.log('buildPosterConfig: result data used for config', result);
    
    return new Promise(async (resolve, reject) => {
      try {
        // 只处理二维码
        const qrCodeUrl = await this.getQRCode();
        console.log('二维码处理结果:', qrCodeUrl);
        
        // 处理关键词，转换为字符串
        const keywordsText = result.keywords && result.keywords.length > 0 
          ? result.keywords.join('、') 
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
        const estimateBlockHeight = (text, fontSize, width, lineHeight, minHeight) => {
          const safeText = (text || '').toString();
          const charsPerLine = Math.max(8, Math.floor(width / (fontSize * 0.6))); // 调整字符计算
          const lines = Math.max(1, Math.ceil(safeText.length / charsPerLine));
          const height = lines * lineHeight + 20; // 进一步减少内边距
          return Math.max(minHeight, height);
        };

        // 处理梦境解析文本，截取前200字符作为摘要
        const fullInterpretation = result.interpretation || this.data.i18n.result.noDreamAnalysis;
        const interpText = fullInterpretation.length > 200 
          ? fullInterpretation.substring(0, 200) + '...' 
          : fullInterpretation;

        const keywordBlockHeight = estimateBlockHeight(keywordsText, keywordFontSize, textWidth, keywordLineHeight, 30);
        const interpBlockHeight = estimateBlockHeight(interpText, interpFontSize, textWidth, interpLineHeight, 80);

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
          backgroundColor: '#FFFFFF', // 纯白背景更简洁
          debug: false,
          texts: [
            // 主标题 - 光爱梦伴
            {
              x: 375,
              y: 120,
              baseLine: 'middle',
              textAlign: 'center',
              text: this.data.i18n.result.appName,
              fontSize: 56,
              color: '#1A1A1A',
              fontWeight: 'bold',
              zIndex: 10
            },
            // 副标题
            {
              x: 375,
              y: 180,
              baseLine: 'middle',
              textAlign: 'center',
              text: this.data.i18n.result.aiDreamAnalysis,
              fontSize: 26,
              color: '#1A1A1A',
              fontWeight: '600',
              zIndex: 10
            },
            // 关键词标签
            {
              x: cardX,
              y: keywordLabelY,
              baseLine: 'top',
              textAlign: 'left',
              text: this.data.i18n.result.keywords,
              fontSize: 36,
              color: '#1A1A1A',
              fontWeight: 'bold',
              zIndex: 10
            },
            // 关键词文本
            {
              x: innerX,
              y: keywordTextY,
              baseLine: 'top',
              textAlign: 'left',
              text: keywordsText,
              fontSize: 26,
              color: '#000000',
              width: textWidth,
              lineHeight: 38,
              lineNum: 3,
              zIndex: 10
            },
            // 梦境解析标签
            {
              x: cardX,
              y: interpLabelY,
              baseLine: 'top',
              textAlign: 'left',
              text: this.data.i18n.result.dreamAnalysis,
              fontSize: 36,
              color: '#1A1A1A',
              fontWeight: 'bold',
              zIndex: 10
            },
            // 梦境解析文本（摘要版本）
            {
              x: innerX,
              y: interpTextY,
              baseLine: 'top',
              textAlign: 'left',
              text: interpText,
              fontSize: 28,
              color: '#000000',
              width: textWidth,
              lineHeight: 40,
              lineNum: 4,
              zIndex: 10
            }
          ],
          blocks: [
            // 顶部装饰条
            {
              x: 0,
              y: 0,
              width: 750,
              height: 8,
              backgroundColor: '#8B5CF6',
              borderRadius: 0,
              borderWidth: 0,
              borderColor: 'transparent',
              zIndex: 1
            },
            // 顶部渐变背景
            {
              x: 0,
              y: 0,
              width: 750,
              height: 200,
              backgroundColor: 'rgba(139, 92, 246, 0.03)',
              borderRadius: 0,
              borderWidth: 0,
              borderColor: 'transparent',
              zIndex: 0
            },
            // 去掉所有内容块的白色背景，让内容直接显示在背景图片上
          ],
          images: []
        };
        
        // 添加背景图片
        config.images.push({
          x: 0,
          y: 0,
          width: 750,
          height: 1334,
          url: 'https://dulele.org.cn/images/assest/dreamAnalysisResult.png',
          zIndex: 0
        });

        // 生成纯文字海报，不包含任何图片
        console.log('📝 生成纯文字海报');

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
            console.warn('二维码位置可能超出画布，调整位置');
            // 如果超出，调整到画布底部
            finalQrY = 1334 - qrSize - 40;
            console.log('调整后的二维码Y位置:', finalQrY);
          }
          
          console.log('二维码位置信息:', {
            contentEndY,
            calculatedQrY: qrY,
            finalQrY,
            qrBottomY: finalQrY + qrSize + 40,
            canvasHeight: 1334
          });
          
          // 二维码上方说明文字
          config.texts.push({
            x: 375,
            y: finalQrY - 30,
            baseLine: 'middle',
            textAlign: 'center',
            text: this.data.i18n.result.scanForMore,
            fontSize: 20,
            color: '#6B7280',
            fontWeight: 'normal',
            zIndex: 10
          });
          
          // 小程序码图
          config.images.push({
            x: qrX,
            y: finalQrY,
            width: qrSize,
            height: qrSize,
            url: qrCodeUrl,
            zIndex: 3
          });
          
          // 二维码下方说明文字
          config.texts.push({
            x: 375,
            y: finalQrY + qrSize + 20,
            baseLine: 'middle',
            textAlign: 'center',
            text: this.data.i18n.result.longPressToScan,
            fontSize: 20,
            color: '#6B7280',
            fontWeight: 'normal',
            zIndex: 10
          });
        }
        
        this.setData({
          posterConfig: config
        });
        console.log('buildPosterConfig: final posterConfig', this.data.posterConfig);
        console.log('海报配置中的图片数量:', config.images.length);
        console.log('海报配置中的图片详情:', config.images);
        resolve(config);
      } catch (error) {
        console.error('构建海报配置失败:', error);
        // 即使处理图片失败，也尝试生成不带图片的海报
        try {
          const config = await this.buildPosterConfigWithoutQR();
          resolve(config);
        } catch (fallbackError) {
          console.error('生成备用海报配置也失败:', fallbackError);
          resolve({
            width: 750,
            height: 1334,
            backgroundColor: '#8B5CF6',
            debug: false,
            texts: [],
            blocks: [],
            images: []
          });
        }
      }
    });
  },

  // 获取小程序码
  async getQRCode() {
    try {
      const config = require('../../config/env.js');
      // 构建小程序码URL（修正为 /auth/wechat/mini）
      const qrCodeUrl = `${config.baseURL}/auth/wechat/mini?path=pages/index/index`;
      console.log('小程序码URL:', qrCodeUrl);

      // 直接下载二维码二进制，写入本地文件后返回本地路径，避免授权头在 downloadFile 中无法携带的问题
      return new Promise((resolve) => {
        const token = (getApp() && getApp().globalData && getApp().globalData.token) || '';
        wx.request({
          url: qrCodeUrl,
          method: 'GET',
          header: token ? { Authorization: `Bearer ${token}` } : {},
          responseType: 'arraybuffer',
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              try {
                const fs = wx.getFileSystemManager();
                const filePath = `${wx.env.USER_DATA_PATH}/qr_${Date.now()}.png`;
                fs.writeFile({
                  filePath,
                  data: res.data,
                  encoding: 'binary',
                  success: () => resolve(filePath),
                  fail: (e) => {
                    console.warn('写入二维码失败:', e);
                    resolve(null);
                  }
                });
              } catch (e) {
                console.warn('保存二维码异常:', e);
                resolve(null);
              }
            } else {
              console.warn('获取二维码失败:', res.statusCode);
              resolve(null);
            }
          },
          fail: (err) => {
            console.warn('请求二维码失败:', err);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('获取小程序码失败:', error);
      return null;
    }
  },

  // 格式化文本，自然换行（不强制分段）
  formatTextWithBreaks(text) {
    if (!text) return '';
    
    // 清理文本，去除多余空格和换行
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // 不进行强制分段，让海报组件根据宽度自然换行
    return cleanText;
  },

  // 不包含小程序码的海报配置
  async buildPosterConfigWithoutQR() {
    const { result } = this.data;
    
    // 处理关键词，转换为字符串
    const keywordsText = result.keywords && result.keywords.length > 0 
      ? result.keywords.join('、') 
      : this.data.i18n.result.noKeywords;
    
    // 处理梦境解析文本，截取前200字符作为摘要
    const fullInterpretation = result.interpretation || this.data.i18n.result.noDreamAnalysis;
    const interpText = fullInterpretation.length > 200 
      ? fullInterpretation.substring(0, 200) + '...' 
      : fullInterpretation;
    
    const config = {
      width: 750,
      height: 1334,
      backgroundColor: '#8B5CF6',
      debug: false,
      texts: [
        // 主标题 - 光爱梦伴
        {
          x: 375,
          y: 110,
          baseLine: 'middle',
          textAlign: 'center',
          text: this.data.i18n.result.appName,
          fontSize: 56,
          color: '#ffffff',
          fontWeight: 'bold',
          zIndex: 10
        },
        // 关键词标签
        {
          x: 60,
          y: 200,
          baseLine: 'top',
          textAlign: 'left',
          text: this.data.i18n.result.keywords,
          fontSize: 34,
          color: '#ffffff',
          fontWeight: 'bold',
          zIndex: 10
        },
        // 关键词文本
        {
          x: 80,
          y: 240,
          baseLine: 'top',
          textAlign: 'left',
          text: keywordsText,
          fontSize: 24,
          color: '#555555',
          width: 550,
          lineHeight: 36,
          zIndex: 10
        },
        // 梦境解析标签
        {
          x: 60,
          y: 320,
          baseLine: 'top',
          textAlign: 'left',
          text: this.data.i18n.result.dreamAnalysis,
          fontSize: 34,
          color: '#ffffff',
          fontWeight: 'bold',
          zIndex: 10
        },
        // 梦境解析文本（摘要版本）
        {
          x: 80,
          y: 360,
          baseLine: 'top',
          textAlign: 'left',
          text: interpText,
          fontSize: 26,
          color: '#555555',
          width: 550,
          lineHeight: 38,
          zIndex: 10
        },
        // AI生成海报标签
        {
          x: 375,
          y: 1240,
          baseLine: 'middle',
          textAlign: 'center',
          text: this.data.i18n.result.aiGeneratedPoster,
          fontSize: 26,
          color: '#ffffff',
          fontWeight: 'normal',
          zIndex: 10
        }
      ],
      blocks: [
        // 关键词卡片背景
        {
          x: 60,
          y: 220,
          width: 630,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.6)',
          zIndex: 1
        },
        // 梦境解析卡片背景
        {
          x: 60,
          y: 340,
          width: 630,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.6)',
          zIndex: 1
        }
      ],
      images: []
    };
    
    this.setData({
      posterConfig: config
    });
    console.log('buildPosterConfigWithoutQR: final posterConfig', this.data.posterConfig);
    return config;
  },

  // 海报生成成功回调
  onPosterSuccess(e) {
    const { detail } = e;
    console.log('海报生成成功:', detail);
    wx.hideLoading();
    
    // 保存到相册
    wx.saveImageToPhotosAlbum({
      filePath: detail,
      success: () => {
        wx.showToast({
          title: this.data.i18n.result.saveSuccess,
          icon: 'success'
        });
        // 添加预览功能
        wx.previewImage({
          current: detail, // 当前显示图片的链接
          urls: [detail]   // 需要预览的图片链接列表
        });
      },
      fail: (err) => {
        console.error('保存失败:', err);
        console.error('保存失败详情:', JSON.stringify(err, null, 2));
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: this.data.i18n.result.needAuthForImage,
            content: this.data.i18n.result.allowSaveImage,
            confirmText: this.data.i18n.result.goToSettings,
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showToast({
            title: this.data.i18n.result.saveFailed,
            icon: 'error'
          });
        }
      }
    });
  },

  // 海报生成失败回调
  onPosterFail(err) {
    console.error('海报生成失败:', err);
    console.error('错误详情:', JSON.stringify(err, null, 2));
    wx.hideLoading();
    
    // 根据错误类型给出不同的提示
    let errorMessage = this.data.i18n.result.generationFailed;
    if (err && err.detail && err.detail.errMsg) {
      if (err.detail.errMsg.includes('downloadFile:fail')) {
        errorMessage = this.data.i18n.result.networkFailed;
      } else if (err.detail.errMsg.includes('getaddrinfo ENOTFOUND')) {
        errorMessage = this.data.i18n.result.serverConnectionFailed;
      } else if (err.detail.errMsg.includes('tmp')) {
        errorMessage = this.data.i18n.result.tempFileFailed;
      }
    }
    
    wx.showToast({
      title: errorMessage,
      icon: 'error',
      duration: 3000
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
      feedbackRating: newRating
    });
  },

  // 反馈内容输入
  onFeedbackInput(e) {
    this.setData({
      feedbackContent: e.detail.value
    });
  },

  // 疏导性问题回答输入
  onAnswer1Input(e) {
    this.setData({
      answer1: e.detail.value
    });
  },

  onAnswer2Input(e) {
    this.setData({
      answer2: e.detail.value
    });
  },

  // 折叠面板状态变化
  onCollapseChange(e) {
    this.setData({
      activeNames: e.detail
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
        icon: 'none'
      });
      return;
    }

    this.setData({ savingAnswers: true });

    try {
      console.log('保存疏导性问题回答:', { answer1, answer2 });
      
      const http = require('../../services/http.js');
      const requestData = {
        analysisId: result.analysisId,
        question1: answer1,
        question2: answer2
      };
      
      const response = await http.post('/dream/analysis/save-answers', requestData);
      
      console.log('保存回答响应:', response);
      
      if (response && response.code === 0) {
        wx.showToast({
          title: this.data.i18n.result.thinkingSaved,
          icon: 'success',
          duration: 2000
        });
      } else {
        throw new Error(response?.message || this.data.i18n.result.saveFailed);
      }
    } catch (error) {
      console.error('保存回答失败:', error);
      
      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.result.loginRequired,
          content: this.data.i18n.result.loginRequiredForSave,
          confirmText: this.data.i18n.result.goToLogin,
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/profile/profile'
              });
            }
          }
        });
      } else {
        wx.showToast({
          title: error.message || this.data.i18n.result.saveFailed,
          icon: 'error',
          duration: 2000
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
    if (feedbackRating <= 0 && (!feedbackContent || feedbackContent.trim() === '')) {
      wx.showToast({
        title: this.data.i18n.result.pleaseSelectRatingOrFeedback,
        icon: 'none'
      });
      return;
    }

    this.setData({ submittingFeedback: true });

    try {
      console.log('提交反馈:', { rating: feedbackRating, content: feedbackContent });
      
      const http = require('../../services/http.js');
      const requestData = {
        content: feedbackContent
      };
      
      // 只有当评分大于0时才添加rating参数
      if (feedbackRating > 0) {
        requestData.rating = feedbackRating;
      }
      
      const response = await http.post('/user/feedback', requestData);
      
      console.log('反馈提交响应:', response);
      
      if (response && response.code === 0) {
        wx.showToast({
          title: this.data.i18n.result.feedbackSubmitSuccess,
          icon: 'success'
        });
        
        // 设置反馈已提交状态
        this.setData({
          feedbackSubmitted: true,
          feedbackRating: 0,
          feedbackContent: ''
        });
      } else {
        throw new Error(response?.message || this.data.i18n.result.feedbackSubmitFailed);
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
      
      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        wx.showModal({
          title: this.data.i18n.result.loginRequired,
          content: this.data.i18n.result.loginRequiredForFeedback,
          confirmText: this.data.i18n.result.goToLogin,
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/profile/profile'
              });
            }
          }
        });
      } else {
        wx.showToast({
          title: error.message || this.data.i18n.result.submitFailed,
          icon: 'error'
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
          console.log('存储空间清理成功');
        },
        fail: (err) => {
          console.log('存储空间清理失败:', err);
        }
      });
    } catch (error) {
      console.error('清理存储异常:', error);
    }
  },


  // 将远程图片转换为本地临时文件，避免跨域/域名解析问题
  ensureLocalImage(remoteUrl) {
    return new Promise((resolve) => {
      if (!remoteUrl) {
        console.log('ensureLocalImage: 无图片URL');
        resolve(null);
        return;
      }
      
      console.log('ensureLocalImage: 开始处理图片', remoteUrl);
      
      // 检查是否是本地文件路径
      if (remoteUrl.startsWith('http://usr/') || remoteUrl.startsWith('file://') || remoteUrl.startsWith('wxfile://')) {
        console.log('检测到本地文件路径，需要转换为可用的格式:', remoteUrl);
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
            console.log('存储空间不足，清理中...');
            this.clearStorage();
          }
          
          // 继续下载逻辑
          this.downloadImage(remoteUrl, resolve);
        },
        fail: () => {
          // 获取存储信息失败，直接下载
          this.downloadImage(remoteUrl, resolve);
        }
      });
    });
  },

  // 下载图片的通用方法
  downloadImage(remoteUrl, resolve) {
    try {
      console.log('downloadImage: 开始下载图片', remoteUrl);
      
      // 检查是否是本地文件路径
      if (remoteUrl.startsWith('http://usr/') || remoteUrl.startsWith('file://')) {
        console.log('检测到本地文件路径，需要转换格式:', remoteUrl);
        // 使用转换方法
        const convertedUrl = this.convertImageUrlForPoster(remoteUrl);
        resolve(convertedUrl);
        return;
      }
      
      wx.downloadFile({
        url: remoteUrl,
        timeout: 30000, // 30秒超时
        success: (res) => {
          console.log('downloadFile success:', res);
          if (res.statusCode === 200 && res.tempFilePath) {
            // 验证文件是否有效
            wx.getFileInfo({
              filePath: res.tempFilePath,
              success: (fileInfo) => {
                console.log('文件信息:', fileInfo);
                if (fileInfo.size > 0) {
                  // 将临时文件复制到持久存储目录
                  this.persistImageFile(res.tempFilePath, resolve);
                } else {
                  console.log('文件大小为0，尝试getImageInfo');
                  this.getImageInfo(remoteUrl, resolve);
                }
              },
              fail: (err) => {
                console.log('获取文件信息失败:', err);
                this.getImageInfo(remoteUrl, resolve);
              }
            });
          } else {
            console.log('ensureLocalImage: 下载失败，状态码:', res.statusCode);
            this.getImageInfo(remoteUrl, resolve);
          }
        },
        fail: (err) => {
          console.log('downloadFile fail:', err);
          this.getImageInfo(remoteUrl, resolve);
        }
      });
    } catch (e) {
      console.log('downloadImage exception:', e);
      resolve(null);
    }
  },

  // 持久化图片文件
  persistImageFile(tempFilePath, resolve) {
    try {
      const fs = wx.getFileSystemManager();
      const ext = (tempFilePath.split('.').pop() || 'png').split('?')[0];
      const target = `${wx.env.USER_DATA_PATH}/poster_img_${Date.now()}_${Math.floor(Math.random()*1e6)}.${ext}`;
      
      fs.readFile({
        filePath: tempFilePath,
        success: (readRes) => {
          fs.writeFile({
            filePath: target,
            data: readRes.data,
            encoding: 'binary',
            success: () => {
              console.log('ensureLocalImage: 持久化到本地成功', target);
              resolve(target);
            },
            fail: (e) => {
              console.log('ensureLocalImage: 写入失败，回退temp', e);
              resolve(tempFilePath);
            }
          });
        },
        fail: (e) => {
          console.log('ensureLocalImage: 读取失败，回退temp', e);
          resolve(tempFilePath);
        }
      });
    } catch (e) {
      console.log('ensureLocalImage: 持久化异常，回退temp', e);
      resolve(tempFilePath);
    }
  },

  // 获取图片信息的通用方法
  getImageInfo(remoteUrl, resolve) {
    wx.getImageInfo({
      src: remoteUrl,
      success: (info) => {
        console.log('getImageInfo success:', info);
        const local = info.path || info.src;
        if (!local) {
          resolve(null);
          return;
        }
        // 直接使用获取到的本地路径，不进行额外写入
        resolve(local);
      },
      fail: (err) => {
        console.log('getImageInfo fail:', err);
        resolve(null);
      }
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: this.data.i18n.app.shareTitle,
      path: '/pages/result/result',
      imageUrl: '' // 可以设置分享图片
    };
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: this.data.i18n.app.timelineTitle,
      imageUrl: '' // 可以设置分享图片
    };
  }
});

