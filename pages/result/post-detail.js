// 帖子详情页
const http = require('../../services/http.js');
const authService = require('../../services/auth.js');
const { IMAGE_URLS } = require('../../constants/index.js');
const { t, getLang, setLanguage } = require('../../utils/i18n.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    postData: null,
    postId: null,
    loading: false,
    showLoginModal: false,
    pendingAction: null, // 待执行的行动：'like' 或 'favorite'
    isProcessing: false, // 防止重复点击
    imageUrls: IMAGE_URLS,
    language: 'zh', // 语言设置
    i18n: {} // 国际化文本
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initI18n();
    
    // 隐藏系统分享按钮（包括"发送给朋友""分享到朋友圈"）
    try {
      wx.hideShareMenu({
        menus: ['shareAppMessage', 'shareTimeline']
      });
    } catch (e) {
      console.warn('隐藏分享菜单失败（可能运行环境不支持）:', e);
    }

    const { postId } = options;
    this.setData({ postId: postId });
    
    // 获取上一页传来的数据
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('acceptDataFromOpenerPage', (res) => {
      // 只有在没有postData时才使用传递来的数据
      if (res && res.data && !this.data.postData) {
        this.setData({ 
          postData: res.data,
          loading: false 
        });
      }
    });
    
    // 同时发起API请求获取最新数据
    if (postId) {
      this.loadPostData(postId);
    } else {
      console.error('没有postId，无法加载详情');
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      });
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
        postDetail: {
          dreamContent: t('postDetail.dreamContent'),
          keywords: t('postDetail.keywords'),
          analysis: t('postDetail.analysis'),
          aiVideo: t('postDetail.aiVideo'),
          aiImage: t('postDetail.aiImage'),
          liked: t('postDetail.liked'),
          like: t('postDetail.like'),
          favorited: t('postDetail.favorited'),
          favorite: t('postDetail.favorite'),
          postNotFound: t('postDetail.postNotFound'),
          loginRequired: t('postDetail.loginRequired'),
          loginSubtitle: t('postDetail.loginSubtitle'),
          aiDisclaimer: t('postDetail.aiDisclaimer')
        },
        app: {
          shareTitle: t('app.shareTitle'),
          timelineTitle: t('app.timelineTitle')
        }
      }
    });
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: t('pageTitle.postDetail')
    });
    
    // 监听语言切换事件
    wx.eventBus && wx.eventBus.on('languageChanged', () => {
      // 重新设置页面标题
      wx.setNavigationBarTitle({
        title: t('pageTitle.postDetail')
      });
    });
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
    const newTitle = t('pageTitle.postDetail');
    console.log('帖子详情页设置新标题:', newTitle);
    wx.setNavigationBarTitle({
      title: newTitle
    });
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
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: this.data.i18n.app.shareTitle,
      path: '/pages/index/index'
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
  },

  /**
   * 加载帖子数据
   */
  async loadPostData(postId) {
    if (!postId) return;
    
    this.setData({ loading: true });
    
    try {
      // 调用API获取帖子详情
      const response = await http.get(`/dream/posts/detail/${postId}`, {}, {
        showLoading: false
      });
      
      if (response && response.data) {
        const postData = response.data;
        
        // 处理关键词
        let keywords = [];
        if (postData.keywordsJson) {
          try {
            keywords = JSON.parse(postData.keywordsJson);
          } catch (error) {
            console.error('解析关键词失败:', error);
          }
        }
        
        // 格式化时间
        const createTime = this.formatTime(postData.createdAt);
        
        // 格式化解析内容，进行智能分段
        let interpretationParagraphs = [];
        if (postData.interpretation) {
          interpretationParagraphs = this.formatInterpretation(postData.interpretation);
        }
        
        // 构建页面数据
        const formattedData = {
          postId: postData.postId,
          dreamDescription: postData.dreamDescription,
          keywords: keywords,
          interpretation: postData.interpretation,
          interpretationParagraphs: interpretationParagraphs,
          imageUrl: postData.imageUrl,
          imagePrompt: postData.imagePrompt,
          videoUrl: postData.videoUrl,
          videoPrompt: postData.videoPrompt,
          likeCount: postData.likeCount || 0,
          favoriteCount: postData.favoriteCount || 0,
          isLiked: postData.isLiked || false,
          isFavorited: postData.isFavorited || false,
          createTime: createTime
        };
        
        this.setData({
          postData: formattedData,
          loading: false
        });
      }
    } catch (error) {
      console.error('加载帖子详情失败:', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'error'
      });
    }
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
    
    // 简化分段逻辑：按句号、问号、感叹号分段
    const sentences = cleanText.split(/([。！？])/);
    
    // 重新组合句子和标点符号
    const combinedSentences = [];
    for (let i = 0; i < sentences.length; i += 2) {
      if (sentences[i] && sentences[i].trim()) {
        const sentence = sentences[i].trim();
        const punctuation = sentences[i + 1] || '';
        const fullSentence = sentence + punctuation;
        if (fullSentence.trim()) {
          combinedSentences.push(fullSentence.trim());
        }
      }
    }
    
    // 如果分段后只有一个段落，尝试按逗号进一步分段
    if (combinedSentences.length <= 1 && cleanText.length > 200) {
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
        return newParagraphs.length > 1 ? newParagraphs : combinedSentences;
      }
    }
    
    return combinedSentences.length > 0 ? combinedSentences : [cleanText];
  },

  /**
   * 格式化时间
   */
  formatTime(timeStr) {
    if (!timeStr) return '';
    
    // 修复iOS日期格式兼容性问题
    let date;
    try {
      const isoTimeStr = timeStr.replace(' ', 'T') + '+08:00';
      date = new Date(isoTimeStr);
      
      if (isNaN(date.getTime())) {
        date = new Date(timeStr.replace(/-/g, '/'));
      }
    } catch (error) {
      console.error('日期解析失败:', error);
      return timeStr;
    }
    
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * 切换点赞状态
   */
  onToggleLike() {
    const { postData, isProcessing } = this.data;
    if (!postData || isProcessing) return;
    
    // 设置处理状态，防止重复点击
    this.setData({ isProcessing: true });
    
    // 检查登录状态
    const isLoggedIn = this.checkLoginStatus();
    if (!isLoggedIn) {
      this.setData({
        showLoginModal: true,
        pendingAction: 'like',
        isProcessing: false
      });
      return;
    }
    
    const newIsLiked = !postData.isLiked;
    const newLikeCount = newIsLiked ? (postData.likeCount + 1) : (postData.likeCount - 1);
    
    this.setData({
      'postData.isLiked': newIsLiked,
      'postData.likeCount': newLikeCount
    });
    
    // 显示提示（移除触觉反馈避免页面闪烁）
    wx.showToast({
      title: newIsLiked ? '已点赞' : '取消点赞',
      icon: 'success',
      duration: 1500
    });
    
    // 调用API保存点赞状态
    this.saveLikeStatus(newIsLiked);
    
    // 延迟重置处理状态
    setTimeout(() => {
      this.setData({ isProcessing: false });
    }, 500);
  },

  /**
   * 切换收藏状态
   */
  onToggleFavorite() {
    const { postData, isProcessing } = this.data;
    if (!postData || isProcessing) return;
    
    // 设置处理状态，防止重复点击
    this.setData({ isProcessing: true });
    
    // 检查登录状态
    const isLoggedIn = this.checkLoginStatus();
    if (!isLoggedIn) {
      this.setData({
        showLoginModal: true,
        pendingAction: 'favorite',
        isProcessing: false
      });
      return;
    }
    
    const newIsFavorited = !postData.isFavorited;
    
    this.setData({
      'postData.isFavorited': newIsFavorited
    });
    
    // 显示提示（移除触觉反馈避免页面闪烁）
    wx.showToast({
      title: newIsFavorited ? '已收藏' : '取消收藏',
      icon: 'success',
      duration: 1500
    });
    
    // 调用API保存收藏状态
    this.saveFavoriteStatus(newIsFavorited);
    
    // 延迟重置处理状态
    setTimeout(() => {
      this.setData({ isProcessing: false });
    }, 500);
  },

  /**
   * 保存点赞状态
   */
  async saveLikeStatus(isLiked) {
    try {
      const response = await http.post('/dream/posts/like', {
        postId: this.data.postId
      }, {
        showLoading: false
      });
      
      if (response && response.data) {
        const { isLiked: newIsLiked, likeCount } = response.data;
        this.setData({
          'postData.isLiked': newIsLiked,
          'postData.likeCount': likeCount
        });

        // 设置全局标志和最新状态，通知社区页面需要更新
        const app = getApp();
        app.globalData.needRefreshCommunity = true;
        app.globalData.lastUpdatedPost = {
          postId: this.data.postId,
          isLiked: newIsLiked,
          likeCount: likeCount,
          isFavorited: this.data.postData.isFavorited,
          favoriteCount: this.data.postData.favoriteCount
        };
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      
      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        this.setData({
          showLoginModal: true,
          pendingAction: 'like'
        });
        return;
      }
      
      // 回滚状态
      const { postData } = this.data;
      this.setData({
        'postData.isLiked': !postData.isLiked,
        'postData.likeCount': postData.isLiked ? (postData.likeCount - 1) : (postData.likeCount + 1)
      });
      
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'error'
      });
    }
  },

  /**
   * 保存收藏状态
   */
  async saveFavoriteStatus(isFavorited) {
    try {
      const response = await http.post('/dream/posts/favorite', {
        postId: this.data.postId
      }, {
        showLoading: false
      });
      
      if (response && response.data) {
        const { isFavorited: newIsFavorited, favoriteCount } = response.data;
        this.setData({
          'postData.isFavorited': newIsFavorited,
          'postData.favoriteCount': favoriteCount
        });

        // 设置全局标志和最新状态，通知社区页面需要更新
        const app = getApp();
        app.globalData.needRefreshCommunity = true;
        app.globalData.lastUpdatedPost = {
          postId: this.data.postId,
          isLiked: this.data.postData.isLiked,
          likeCount: this.data.postData.likeCount,
          isFavorited: newIsFavorited,
          favoriteCount: favoriteCount
        };
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      
      // 检查是否是401未授权错误
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        this.setData({
          showLoginModal: true,
          pendingAction: 'favorite'
        });
        return;
      }
      
      // 回滚状态
      const { postData } = this.data;
      this.setData({
        'postData.isFavorited': !postData.isFavorited
      });
      
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'error'
      });
    }
  },

  /**
   * 预览图片
   */
  onPreviewImage() {
    const { postData } = this.data;
    if (!postData || !postData.imageUrl) return;
    
    wx.previewImage({
      urls: [postData.imageUrl],
      current: postData.imageUrl
    });
  },

  /**
   * 返回上一页
   */
  onBack() {
    // 设置全局标志，通知社区页面需要刷新数据
    getApp().globalData.needRefreshCommunity = true;
    
    // 检查是否有可返回的页面
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1,
        fail: (err) => {
          // 如果返回失败，尝试跳转到首页
          wx.switchTab({
            url: '/pages/community/community'
          });
        }
      });
    } else {
      wx.switchTab({
        url: '/pages/community/community'
      });
    }
  },

  /**
   * 关闭页面
   */
  onClose() {
    // 设置全局标志，通知社区页面需要刷新数据
    getApp().globalData.needRefreshCommunity = true;
    
    // 检查是否有可返回的页面
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1,
        fail: (err) => {
          // 如果返回失败，尝试跳转到首页
          wx.switchTab({
            url: '/pages/community/community'
          });
        }
      });
    } else {
      wx.switchTab({
        url: '/pages/community/community'
      });
    }
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    try {
      return authService.checkLoginStatus();
    } catch (error) {
      return false;
    }
  },

  /**
   * 登录成功回调
   */
  onLoginSuccess(e) {
    this.setData({ showLoginModal: false });
    
    // 执行待执行的操作
    const { pendingAction } = this.data;
    if (pendingAction === 'like') {
      this.onToggleLike();
    } else if (pendingAction === 'favorite') {
      this.onToggleFavorite();
    }
    
    this.setData({ pendingAction: null });
  },

  /**
   * 关闭登录弹窗
   */
  onCloseLoginModal() {
    this.setData({ 
      showLoginModal: false,
      pendingAction: null
    });
  },

  /**
   * 自定义分享功能
   */
  // 若页面仍存在自定义“分享”按钮，提示已关闭
  onCustomShare() {
    wx.showToast({
      title: '已关闭分享',
      icon: 'none'
    });
  },

  /**
   * 分享给好友
   */
  shareToFriend() {
    // 在微信小程序中，分享给好友只能通过右上角分享按钮触发
    // 这里我们提示用户使用右上角分享按钮
    wx.showToast({
      title: '请点击右上角分享按钮',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 分享到朋友圈
   */
  shareToTimeline() {
    // 在微信小程序中，分享到朋友圈只能通过右上角分享按钮触发
    // 这里我们提示用户使用右上角分享按钮
    wx.showToast({
      title: '请点击右上角分享按钮',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 复制链接
   */
  copyLink() {
    const shareUrl = `/pages/result/post-detail?postId=${this.data.postId}`;
    
    wx.setClipboardData({
      data: shareUrl,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 保存图片
   */
  saveImage() {
    const { postData } = this.data;
    
    if (!postData || !postData.imageUrl) {
      wx.showToast({
        title: '没有可保存的图片',
        icon: 'none'
      });
      return;
    }

    // 先下载图片到临时文件
    wx.downloadFile({
      url: postData.imageUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存图片到相册
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({
                title: '图片已保存到相册',
                icon: 'success'
              });
            },
            fail: (err) => {
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '需要授权',
                  content: '需要授权访问相册才能保存图片',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'error'
                });
              }
            }
          });
        } else {
          wx.showToast({
            title: '图片下载失败',
            icon: 'error'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '图片下载失败',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 显示分享提示
   */
  showShareTip() {
    wx.showModal({
      title: '分享提示',
      content: '请点击右上角的分享按钮，选择"发送给朋友"或"分享到朋友圈"来分享这个梦境解析帖子。',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});


