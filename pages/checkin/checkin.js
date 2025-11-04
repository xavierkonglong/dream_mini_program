// 积分任务签到页面
Page({
  data: {
    checkinDays: 12,
    isCheckedIn: false,
    tomorrowReward: 4,
    todayPoints: 68,
    totalPoints: 200,
    taskList: [
      {
        id: 1,
        title: 'title1',
        desc: 'desc1',
        points: '每次+10分,每日最多30分',
        iconEmoji: '📱',
        iconClass: 'blood-glucose',
        completed: false,
        buttonText: '去记录 >'
      },
      {
        id: 2,
        title: 'title2',
        desc: 'desc2',
        points: '+300分',
        iconEmoji: '📱',
        iconClass: 'zhongan',
        completed: true,
        buttonText: '已绑定 >'
      }
    ]
  },

  onLoad(options) {
    this.loadCheckinData();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadCheckinData();
  },

  // 加载签到数据
  loadCheckinData() {
    // TODO: 从后端获取签到数据
    // 这里暂时使用模拟数据
    const today = new Date().toDateString();
    const lastCheckinDate = wx.getStorageSync('lastCheckinDate');
    const checkinDays = wx.getStorageSync('checkinDays') || 0;
    
    if (lastCheckinDate === today) {
      this.setData({
        isCheckedIn: true
      });
    } else {
      this.setData({
        isCheckedIn: false
      });
    }
  },

  // 显示积分规则
  showRules() {
    wx.showModal({
      title: '积分规则',
      content: '每日签到可获得积分奖励，连续签到天数越多，奖励越丰厚！',
      showCancel: false
    });
  },

  // 处理签到
  handleCheckin() {
    if (this.data.isCheckedIn) {
      wx.showToast({
        title: '今日已签到',
        icon: 'none'
      });
      return;
    }

    // 计算连续签到天数
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const lastCheckinDate = wx.getStorageSync('lastCheckinDate');
    let checkinDays = wx.getStorageSync('checkinDays') || 0;

    if (lastCheckinDate === yesterday) {
      // 连续签到
      checkinDays += 1;
    } else if (lastCheckinDate !== today) {
      // 重新开始
      checkinDays = 1;
    }

    // 保存签到信息
    wx.setStorageSync('lastCheckinDate', today);
    wx.setStorageSync('checkinDays', checkinDays);

    // 计算奖励积分
    const baseReward = 4;
    const reward = baseReward + Math.min(checkinDays, 7); // 最多额外7积分

    // 更新今日积分和总积分
    const todayPoints = this.data.todayPoints + reward;
    const totalPoints = this.data.totalPoints + reward;

    this.setData({
      checkinDays,
      isCheckedIn: true,
      todayPoints,
      totalPoints
    });

    // 显示成功提示
    wx.showToast({
      title: `签到成功！+${reward}积分`,
      icon: 'success',
      duration: 2000
    });
  },

  // 处理任务
  handleTask(e) {
    const { id } = e.currentTarget.dataset;
    const task = this.data.taskList.find(item => item.id === id);

    if (!task) return;

    if (task.completed) {
      wx.showToast({
        title: '任务已完成',
        icon: 'none'
      });
      return;
    }

    // 根据任务ID跳转到对应页面
    if (id === 1) {
      // 跳转到记录血糖页面
      wx.navigateTo({
        url: '/pages/diary/diary'
      });
    } else if (id === 2) {
      // 跳转到绑定账户页面
      wx.showToast({
        title: '绑定功能开发中',
        icon: 'none'
      });
    }
  }
});

