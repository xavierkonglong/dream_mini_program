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
      // 不允许点击遮罩关闭，必须完成设置
      return;
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
     * 提交个人信息
     */
    async onSubmit() {
      if (this.data.submitting) return;

      const { userName, userPhone } = this.data.userInfo;
      
      // 验证昵称
      if (!userName.trim()) {
        wx.showToast({
          title: '请输入昵称',
          icon: 'none'
        });
        return;
      }

      // 验证手机号
      if (userPhone && !/^1[3-9]\d{9}$/.test(userPhone)) {
        wx.showToast({
          title: '请输入正确的手机号',
          icon: 'none'
        });
        return;
      }

      this.setData({ submitting: true });

      try {
        logger.info('开始更新用户信息:', { userName, userPhone });
        
        const response = await http.post('/user/update', {
          userName: userName,
          userPhone: userPhone
        });
        
        logger.info('更新用户信息响应:', response);
        
        if (response && response.code === 0) {
          // 更新本地存储的用户信息
          const currentUser = authService.getCurrentUser() || {};
          const updatedUser = {
            ...currentUser,
            userName: userName,
            userPhone: userPhone,
            userAvatar: this.data.userInfo.userAvatar
          };
          
          authService.setCurrentUser(updatedUser);
          
          wx.showToast({
            title: '设置完成',
            icon: 'success'
          });

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
          title: error.message || '更新失败，请重试',
          icon: 'error'
        });
      } finally {
        this.setData({ submitting: false });
      }
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
