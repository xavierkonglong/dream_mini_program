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
    taskList: []
  },

  onLoad(options) {
    this.initI18n();
    this.loadCheckinData();
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
          checkingText: t('checkin.checkingText')
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
  }
});

