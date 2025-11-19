// 积分任务签到页面
const { get, post } = require('../../services/http.js');
const { t, getLang } = require('../../utils/i18n.js');

Page({
  data: {
    checkinDays: 0,
    isCheckedIn: false,
    tomorrowReward: 20, // 基础签到奖励20积分
    todayPoints: 0,
    totalPoints: 0,
    monthSigninDays: 0, // 本月签到天数
    isChecking: false, // 签到中状态，防止重复点击
    isFirstLoad: true, // 是否首次加载，防止onLoad和onShow重复请求
    language: 'zh', // 语言设置
    i18n: {}, // 国际化文本
    taskList: [],
    // 刮刮乐相关（简化版）
    scratchPoints: 0,
    scratchShow: false,
    showScratchPopup: false, // 控制刮刮乐弹窗显示
    canvasReady: false // Canvas 是否已准备好
  },

  // 刮刮乐相关实例变量（避免频繁 setData）
  _canvas: null,
  _ctx: null,
  _canvasWidth: 0,
  _canvasHeight: 0,
  _isScratching: false,
  _scratchCount: 0,
  _scratchCardData: null, // 保存刮刮乐信息
  
  // 🔧 测试模式：设为 true 可以重复测试刮刮乐（开发用）
  _testMode: false,

  onLoad(options) {
    this.initI18n();
    this.loadCheckinData();
  },

  onReady() {
    // 不在 onReady 时获取刮刮乐信息，改为签到成功后获取
  },

  onShow() {
    // 检查语言是否变化并重新初始化
    this.initI18n();
    // 页面显示时刷新数据（仅在非首次加载时刷新，避免与onLoad重复请求）
    if (!this.data.isFirstLoad) {
      this.loadCheckinData();
    }
  },

  onUnload() {
    // 移除语言变化事件监听
    if (this.onLanguageChanged) {
      wx.eventBus && wx.eventBus.off('languageChanged', this.onLanguageChanged);
    }
  },

  // 初始化国际化
  initI18n() {
    const lang = getLang();
    
    this.setData({
      language: lang,
      i18n: {
        checkin: {
          rulesTitle: t('checkin.rulesTitle'),
          rulesContent: t('checkin.rulesContent'),
          consecutiveDays: t('checkin.consecutiveDays'),
          day: t('checkin.day'),
          checkinNow: t('checkin.checkinNow'),
          checking: t('checkin.checking'),
          checkedIn: t('checkin.checkedIn'),
          tomorrowReward: t('checkin.tomorrowReward'),
          todayPoints: t('checkin.todayPoints'),
          myPoints: t('checkin.myPoints'),
          tasksTitle: t('checkin.tasksTitle'),
          publishTitle: t('checkin.publishTitle'),
          publishDesc: t('checkin.publishDesc'),
          publishPoints: t('checkin.publishPoints'),
          publishButton: t('checkin.publishButton'),
          shareTitle: t('checkin.shareTitle'),
          shareDesc: t('checkin.shareDesc'),
          sharePoints: t('checkin.sharePoints'),
          shareButton: t('checkin.shareButton'),
          likeTitle: t('checkin.likeTitle'),
          likeDesc: t('checkin.likeDesc'),
          likePoints: t('checkin.likePoints'),
          likeButton: t('checkin.likeButton'),
          completed: t('checkin.completed'),
          taskCompleted: t('checkin.taskCompleted'),
          featureDeveloping: t('checkin.featureDeveloping'),
          publishTip: t('checkin.publishTip'),
          loading: t('checkin.loading'),
          checkingText: t('checkin.checkingText'),
          // 刮刮乐相关
          scratchTitle: t('checkin.scratchTitle'),
          scratchSubtitle: t('checkin.scratchSubtitle'),
          scratchResultLabel: t('checkin.scratchResultLabel')
        },
        app: {
          shareTitle: t('app.shareTitle'),
          timelineTitle: t('app.timelineTitle')
        }
      },
      taskList: [
        {
          id: 1,
          title: t('checkin.publishTitle'),
          desc: t('checkin.publishDesc'),
          points: t('checkin.publishPoints'),
          iconName: 'share-o',
          iconClass: 'publish',
          completed: false,
          buttonText: t('checkin.publishButton'),
          type: 'publish'
        },
        {
          id: 2,
          title: t('checkin.shareTitle'),
          desc: t('checkin.shareDesc'),
          points: t('checkin.sharePoints'),
          iconName: 'share',
          iconClass: 'share',
          completed: false,
          buttonText: t('checkin.shareButton'),
          type: 'share'
        },
        {
          id: 3,
          title: t('checkin.likeTitle'),
          desc: t('checkin.likeDesc'),
          points: t('checkin.likePoints'),
          iconName: 'like-o',
          iconClass: 'like',
          completed: false,
          buttonText: t('checkin.likeButton'),
          type: 'like'
        }
      ]
    });

    // 设置页面标题
    wx.setNavigationBarTitle({
      title: t('pageTitle.checkin')
    });

    // 监听语言变化事件
    this.onLanguageChanged = (newLanguage) => {
      this.initI18n();
    };
    wx.eventBus && wx.eventBus.on('languageChanged', this.onLanguageChanged);
  },

  // 加载签到数据
  async loadCheckinData() {
    try {
      const res = await get('/points/signin', {}, {
        showLoading: true,
        loadingText: this.data.i18n.checkin?.loading || '加载中...'
      });

      if (res.code === 0 && res.data) {
        const { consecutive_days, today_signed, total_points, today_points, month_signin_days } = res.data;
        
        this.setData({
          checkinDays: consecutive_days || 0,
          isCheckedIn: today_signed || false,
          totalPoints: total_points || 0,
          todayPoints: today_points || 0,
          monthSigninDays: month_signin_days || 0,
          tomorrowReward: 20, // 基础签到奖励20积分
          isFirstLoad: false // 标记首次加载完成
        });
      } else {
        // 请求成功但业务失败，也标记首次加载完成
        this.setData({
          isFirstLoad: false
        });
      }
    } catch (error) {
      console.error('加载签到数据失败:', error);
      // 失败时也标记首次加载完成，避免后续无法刷新
      this.setData({
        isFirstLoad: false
      });
      // 失败时不显示错误提示，因为 http.js 已经处理了
    }
  },

  // 显示积分规则
  showRules() {
    wx.showModal({
      title: this.data.i18n.checkin?.rulesTitle || '积分规则',
      content: this.data.i18n.checkin?.rulesContent || '每日签到可获得积分奖励，连续签到天数越多，奖励越丰厚！',
      showCancel: false
    });
  },

  // 处理签到
  async handleCheckin() {
    // 如果已签到，直接返回
    if (this.data.isCheckedIn) {
      wx.showToast({
        title: this.data.i18n.checkin?.checkedIn || '今日已签到',
        icon: 'none'
      });
      return;
    }

    // 防止重复点击
    if (this.data.isChecking) {
      return;
    }

    // 设置签到中状态
    this.setData({
      isChecking: true
    });

    try {
      const res = await post('/points/signin', {}, {
        showLoading: true,
        loadingText: this.data.i18n.checkin?.checkingText || '签到中...'
      });

      if (res.code === 0) {
        // 签到成功，显示服务器返回的提示信息
        const message = res.message || res.data?.message || '签到成功';
        
        wx.showToast({
          title: message,
          icon: 'success',
          duration: 2000
        });

        // 重新加载签到数据，更新页面状态
        await this.loadCheckinData();
        
        // 签到成功后，检查刮刮乐资格
        this.fetchScratchCardInfo();
      }
    } catch (error) {
      console.error('签到失败:', error);
      // 错误提示已在 http.js 中处理
    } finally {
      // 无论成功失败，都重置签到中状态
      this.setData({
        isChecking: false
      });
    }
  },


  // 处理任务
  handleTask(e) {
    const { id } = e.currentTarget.dataset;
    const task = this.data.taskList.find(item => item.id === id);

    if (!task) return;

    if (task.completed) {
      wx.showToast({
        title: this.data.i18n.checkin?.taskCompleted || '任务已完成',
        icon: 'none'
      });
      return;
    }

    // 根据任务类型跳转到对应页面
    switch (task.type) {
      case 'publish':
        // 发布到社区：跳转到我的界面
        wx.switchTab({
          url: '/pages/profile/profile'
        });
        break;
      
      case 'share':
        // 分享功能：使用 open-type="share" 的 button 会直接触发分享
        // 分享接口会在 onShareAppMessage 中自动调用
        break;
      
      case 'like':
        // 点赞任务：跳转到社区页面，让用户查看自己的帖子
        wx.switchTab({
          url: '/pages/community/community'
        });
        wx.showToast({
          title: this.data.i18n.checkin?.publishTip || '发布优质内容，吸引更多点赞',
          icon: 'none',
          duration: 2000
        });
        break;
      
      default:
        wx.showToast({
          title: this.data.i18n.checkin?.featureDeveloping || '功能开发中',
          icon: 'none'
        });
    }
  },

  /**
   * 用户点击右上角分享或使用 open-type="share" 的按钮
   */
  async onShareAppMessage() {
    // 调用分享接口记录积分（微信转发，每天仅首次分享有效）
    // 后端会通过 token 判断用户，未登录会返回 401
    try {
      await post('/dream/share', {}, {
        showLoading: false // 分享时不显示loading，避免影响用户体验
      });
    } catch (error) {
      // 分享接口调用失败不影响分享功能，只记录错误
      console.error('分享积分记录失败:', error);
    }
    
    return {
      title: this.data.i18n.app?.shareTitle || t('app.shareTitle') || '积分任务签到',
      path: '/pages/checkin/checkin',
      imageUrl: '' // 可以设置分享图片
    };
  },

  /**
   * 用户点击右上角分享到朋友圈
   */
  async onShareTimeline() {
    // 调用分享接口记录积分（微信转发，每天仅首次分享有效）
    // 后端会通过 token 判断用户，未登录会返回 401
    try {
      await post('/dream/share', {}, {
        showLoading: false // 分享时不显示loading，避免影响用户体验
      });
    } catch (error) {
      // 分享接口调用失败不影响分享功能，只记录错误
      console.error('分享积分记录失败:', error);
    }
    
    return {
      title: this.data.i18n.app?.timelineTitle || t('app.timelineTitle') || '积分任务签到',
      imageUrl: '' // 可以设置分享图片
    };
  },

  // ========== 刮刮乐（接入API）==========

  /**
   * 获取今日刮刮乐信息（接口）
   */
  async fetchScratchCardInfo() {
    // 🔧 测试模式：使用模拟数据
    if (this._testMode) {
      console.log('【测试模式】使用模拟数据');
      const mockData = {
        points: 15,
        claimed: false,
        claimed_at: null,
        date: new Date().toISOString().split('T')[0],
        is_vip: true
      };
      
      this._scratchCardData = mockData;
      // 先设置积分数据并显示弹窗，Canvas 标记为未准备
      this.setData({ 
        scratchPoints: mockData.points,
        showScratchPopup: true,
        canvasReady: false
      });
      // 弹窗显示后，延迟初始化Canvas并绘制涂层
      setTimeout(() => {
        this.initScratchCard();
      }, 300);
      return;
    }
    
    try {
      const res = await get('/points/scratch-card');
      
      if (res.code === 0) {
        const data = res.data;
        this._scratchCardData = data;
        
        // 检查是否为VIP
        if (!data.is_vip) {
          // 没有资格，不弹窗，只显示提示
          console.log('非VIP用户，无刮刮乐资格');
          return;
        }
        
        // 检查是否已领取
        if (data.claimed) {
          // 今日已领取，不弹窗
          console.log('今日刮刮乐已领取');
          return;
        }
        
        // 有资格且未领取，先显示弹窗，Canvas 标记为未准备
        this.setData({ 
          scratchPoints: data.points,
          showScratchPopup: true,
          canvasReady: false
        });
        
        // 弹窗显示后，延迟初始化Canvas并绘制涂层
        setTimeout(() => {
          this.initScratchCard();
        }, 300);
      }
    } catch (error) {
      console.error('获取刮刮乐信息失败:', error);
      // 获取失败不显示提示，静默处理
    }
  },

  /**
   * 关闭刮刮乐弹窗
   */
  closeScratchPopup() {
    this.setData({
      showScratchPopup: false,
      canvasReady: false // 重置 Canvas 状态
    });
  },

  /**
   * 初始化刮刮乐Canvas
   */
  initScratchCard() {
    const query = wx.createSelectorQuery().in(this);
    query.select('#scratchCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          console.error('Canvas节点未找到');
          return;
        }
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        const width = res[0].width;
        const height = res[0].height;
        
        // 设置canvas尺寸
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        // 保存到实例变量
        this._canvas = canvas;
        this._ctx = ctx;
        this._canvasWidth = width;
        this._canvasHeight = height;
        
        // 绘制灰色涂层
        ctx.fillStyle = '#CCCCCC';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#999999';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('刮开涂层', width / 2, height / 2);
        
        console.log('Canvas初始化完成', { width, height, dpr });
        
        // Canvas 绘制完成，隐藏临时遮罩
        this.setData({
          canvasReady: true
        });
      });
  },

  /**
   * 触摸开始
   */
  onScratchStart(e) {
    if (!this._ctx || this.data.scratchShow) return;
    this._isScratching = true;
    this.scratch(e);
  },

  /**
   * 触摸移动
   */
  onScratchMove(e) {
    if (!this._ctx || !this._isScratching || this.data.scratchShow) return;
    this.scratch(e);
  },

  /**
   * 触摸结束
   */
  onScratchEnd(e) {
    this._isScratching = false;
    // 检查是否刮开足够（通过像素检测更准确）
    this.checkScratchProgress();
  },

  /**
   * 刮开指定位置
   */
  scratch(e) {
    if (!e.touches || !e.touches[0]) return;
    
    // 获取触摸点相对于canvas的坐标
    const query = wx.createSelectorQuery().in(this);
    query.select('#scratchCanvas')
      .boundingClientRect()
      .exec((res) => {
        if (!res[0]) return;
        
        const rect = res[0];
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // 清除圆形区域
        this._ctx.globalCompositeOperation = 'destination-out';
        this._ctx.beginPath();
        this._ctx.arc(x, y, 25, 0, Math.PI * 2);
        this._ctx.fill();
        this._ctx.globalCompositeOperation = 'source-over';
        
        this._scratchCount++;
      });
  },

  /**
   * 检查刮开进度（使用像素检测）
   */
  checkScratchProgress() {
    if (!this._ctx || this.data.scratchShow) return;
    
    try {
      const imageData = this._ctx.getImageData(0, 0, this._canvasWidth, this._canvasHeight);
      const pixels = imageData.data;
      let transparentPixels = 0;
      
      // 检查透明像素（alpha通道为0）
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) {
          transparentPixels++;
        }
      }
      
      const totalPixels = pixels.length / 4;
      const ratio = transparentPixels / totalPixels;
      
      // 刮开超过60%就完成
      if (ratio > 0.6) {
        this.completeScratch();
      }
    } catch (e) {
      console.error('检查刮开进度失败', e);
    }
  },

  /**
   * 完成刮开（调用领取接口）
   */
  async completeScratch() {
    if (this.data.scratchShow) return;
    
    // 清除整个canvas
    this._ctx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
    
    // 显示结果
    this.setData({ scratchShow: true });
    
    // 🔧 测试模式：模拟领取成功
    if (this._testMode) {
      console.log('【测试模式】模拟领取成功');
      wx.showToast({
        title: `恭喜获得${this.data.scratchPoints}积分！`,
        icon: 'success',
        duration: 2000
      });
      // 刷新积分数据
      this.loadCheckinData();
      return;
    }
    
    // 调用领取接口
    try {
      const res = await get('/points/scratch-card/claim');
      
      if (res.code === 0) {
        const data = res.data;
        
        if (data.claimed) {
          // 领取成功
          wx.showToast({
            title: data.message || `恭喜获得${data.points}积分！`,
            icon: 'success',
            duration: 2000
          });
          
          // 刷新用户积分余额
          this.loadCheckinData();
        } else {
          // 领取失败
          wx.showToast({
            title: data.message || '领取失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    } catch (error) {
      console.error('领取刮刮乐积分失败:', error);
      wx.showToast({
        title: '领取失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    }
  }
});

