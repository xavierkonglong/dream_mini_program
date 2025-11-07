// 个人信息设置弹窗组件
const authService = require('../../services/auth.js');
const http = require('../../services/http.js');
const logger = require('../../utils/logger.js');
const { IMAGE_URLS } = require('../../constants/index.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer: function(newVal, oldVal) {
        if (newVal) {
          console.log('个人信息设置弹窗显示，初始化用户信息');
          const currentUser = authService.getCurrentUser() || {};
          this.setData({
            userInfo: {
              userName: currentUser.userName || '',
              userPhone: currentUser.userPhone || '',
              userAvatar: currentUser.userAvatar || ''
            }
          });
        }
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    userInfo: {
      userName: '',
      userPhone: '',
      userAvatar: ''
    },
    submitting: false,
    uploading: false,
    imageUrls: IMAGE_URLS
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 点击遮罩层
     */
    onMaskTap() {
      // 允许点击遮罩关闭，但需要确认
      this.onClose();
    },

    /**
     * 关闭弹窗
     */
    onClose() {
      // 直接调用提交方法，等同于完成设置
      this.doSubmit(true); // true 表示跳过验证
    },

    /**
     * 稍后完善
     */
    onSkip() {
      // 直接调用提交方法，等同于完成设置
      this.doSubmit(true); // true 表示跳过验证
    },

    /**
     * 昵称输入
     */
    onUserNameInput(e) {
      this.setData({
        'userInfo.userName': e.detail.value
      });
    },

    /**
     * 手机号输入
     */
    onUserPhoneInput(e) {
      this.setData({
        'userInfo.userPhone': e.detail.value
      });
    },

    /**
     * 头像点击事件
     */
    onAvatarTap() {
      if (this.data.uploading) return;
      
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        camera: 'back',
        success: (res) => {
          const tempFilePath = res.tempFiles[0].tempFilePath;
          this.uploadAvatar(tempFilePath);
        },
        fail: (error) => {
          console.error('选择图片失败:', error);
          wx.showToast({
            title: '选择图片失败',
            icon: 'error'
          });
        }
      });
    },

    /**
     * 上传头像
     */
    async uploadAvatar(filePath) {
      this.setData({ uploading: true });
      
      try {
        logger.info('开始上传头像:', filePath);
        
        const response = await http.upload('/user/avatar', filePath, 'file');
        
        logger.info('上传头像响应:', response);
        
        if (response && response.code === 0) {
          const avatarUrl = response.data;
          
          // 更新页面数据
          this.setData({
            'userInfo.userAvatar': avatarUrl
          });
          
          wx.showToast({
            title: '头像上传成功',
            icon: 'success'
          });
        } else {
          throw new Error(response?.message || '头像上传失败');
        }
      } catch (error) {
        logger.error('上传头像失败:', error);
        
        // 检查是否是401未授权错误
        if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
          wx.showModal({
            title: '登录过期',
            content: '您的登录已过期，请重新登录',
            showCancel: false,
            success: () => {
              authService.logout();
              wx.reLaunch({
                url: '/pages/index/index'
              });
            }
          });
          return;
        }
        
        wx.showToast({
          title: error.message || '头像上传失败，请重试',
          icon: 'error'
        });
      } finally {
        this.setData({ uploading: false });
      }
    },

    /**
     * 提交个人信息（内部方法）
     * @param {Boolean} skipValidation - 是否跳过验证
     */
    async doSubmit(skipValidation = false) {
      if (this.data.submitting) return;

      let { userName, userPhone } = this.data.userInfo;
      
      // 如果跳过验证且没有昵称，生成默认昵称
      if (skipValidation && !userName.trim()) {
        const currentUser = authService.getCurrentUser() || {};
        // 如果用户已有昵称，使用已有昵称；否则生成默认昵称
        userName = currentUser.userName || `梦境用户${Math.floor(Math.random() * 10000)}`;
        this.setData({
          'userInfo.userName': userName
        });
      }
      
      // 验证昵称（仅在非跳过验证模式下）
      if (!skipValidation && !userName.trim()) {
        wx.showToast({
          title: '请输入昵称',
          icon: 'none'
        });
        return;
      }

      // 验证手机号（仅在非跳过验证模式下）
      if (!skipValidation && userPhone && !/^1[3-9]\d{9}$/.test(userPhone)) {
        wx.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        });
        return;
      }

      this.setData({ submitting: true });

      try {
        logger.info('开始更新用户信息:', { userName, userPhone, skipValidation });
        
        const response = await http.post('/user/update', {
          userName: userName,
          userPhone: userPhone || '' // 手机号可以为空
        });
        
        logger.info('更新用户信息响应:', response);
        
        if (response && response.code === 0) {
          // 更新本地存储的用户信息
          const currentUser = authService.getCurrentUser() || {};
          const updatedUser = {
            ...currentUser,
            userName: userName,
            userPhone: userPhone || currentUser.userPhone || '',
            userAvatar: this.data.userInfo.userAvatar || currentUser.userAvatar || ''
          };
          
          authService.setCurrentUser(updatedUser);
          
          if (!skipValidation) {
            wx.showToast({
              title: '设置完成',
              icon: 'success'
            });
          }

          // 触发完成事件
          this.triggerEvent('setupComplete', {
            userInfo: updatedUser
          });
          
          // 关闭弹窗
          this.triggerEvent('close');
        } else {
          throw new Error(response?.message || '更新失败');
        }
      } catch (error) {
        logger.error('更新用户信息失败:', error);
        
        // 检查是否是401未授权错误
        if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
          // 如果是跳过验证模式，不显示modal，直接关闭弹窗
          if (skipValidation) {
            logger.warn('跳过验证模式下遇到401错误，直接关闭弹窗');
            this.triggerEvent('close');
            return;
          }
          
          // 正常模式下显示登录过期提示
          wx.showModal({
            title: '登录过期',
            content: '您的登录已过期，请重新登录',
            showCancel: false,
            success: () => {
              authService.logout();
              wx.reLaunch({
                url: '/pages/index/index'
              });
            }
          });
          return;
        }
        
        // 如果跳过验证时出错，不显示任何提示，直接关闭弹窗
        if (skipValidation) {
          logger.warn('跳过验证模式下更新失败，但仍然关闭弹窗');
          this.triggerEvent('close');
        } else {
          // 正常模式下显示错误提示
          wx.showToast({
            title: error.message || '更新失败，请重试',
            icon: 'error'
          });
        }
      } finally {
        this.setData({ submitting: false });
      }
    },

    /**
     * 提交个人信息（用户主动点击完成设置按钮）
     */
    async onSubmit() {
      // 正常模式，需要验证
      this.doSubmit(false);
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件实例被放入页面节点树时执行
      logger.info('个人信息设置弹窗组件已加载');
    },
    
    detached() {
      // 组件实例被从页面节点树移除时执行
      logger.info('个人信息设置弹窗组件已卸载');
    }
  },

  /**
   * 组件所在页面的生命周期
   */
  pageLifetimes: {
    show() {
      // 页面被展示时执行
      if (this.data.show) {
        // 初始化用户信息
        const currentUser = authService.getCurrentUser() || {};
        this.setData({
          userInfo: {
            userName: currentUser.userName || '',
            userPhone: currentUser.userPhone || '',
            userAvatar: currentUser.userAvatar || ''
          }
        });
      }
    }
  }
});
