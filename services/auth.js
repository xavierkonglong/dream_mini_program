// 微信登录服务
const http = require('./http.js');
const storage = require('../utils/storage.js');
const logger = require('../utils/logger.js');

class AuthService {
  constructor() {
    this.isLoggedIn = false;
    this.userInfo = null;
    this.token = null;
  }

  /**
   * 微信登录
   */
  async wechatLogin() {
    try {
      logger.info('开始微信登录流程');
      
      // 1. 调用微信登录接口获取code
      const loginRes = await this.getWxCode();
      if (!loginRes.code) {
        throw new Error('获取微信code失败');
      }

      // 2. 发送code到后端进行登录
      const loginData = {
        code: loginRes.code
      };

      logger.info('发送登录请求到后端', { code: loginRes.code });
      
      const response = await http.post('/auth/wechat/login', loginData, {
        showLoading: true,
        loadingText: '登录中...'
      });

      if (response.code === 0 && response.data) {
        const { accessToken, userId, userName, userAvatar, isFirstLogin, createTime } = response.data;
        
        // 3. 保存登录信息
        this.setLoginInfo({
          token: accessToken,
          userId: userId,
          userName: userName,
          userAvatar: userAvatar,
          createTime: createTime
        });

        logger.info('微信登录成功', { userId, userName, isFirstLogin, createTime });
        
        return {
          success: true,
          isFirstLogin: isFirstLogin || false,
          userInfo: {
            userId: userId,
            userName: userName,
            userAvatar: userAvatar,
            createTime: createTime
          }
        };
      } else {
        throw new Error(response.message || '登录失败');
      }

    } catch (error) {
      logger.error('微信登录失败', error);
      throw error;
    }
  }

  /**
   * 获取微信登录code
   */
  getWxCode() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res);
          } else {
            reject(new Error('获取微信code失败'));
          }
        },
        fail: (error) => {
          reject(new Error('微信登录失败: ' + error.errMsg));
        }
      });
    });
  }

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    try {
      const token = storage.get('token');
      const userInfo = storage.get('userInfo');
      
      if (token && userInfo) {
        this.isLoggedIn = true;
        this.token = token;
        this.userInfo = userInfo;
        
        // 更新全局状态
        const app = getApp();
        app.globalData.token = token;
        app.globalData.userInfo = userInfo;
        app.globalData.isLoggedIn = true;
        
        logger.info('用户已登录', { userId: userInfo.userId, userName: userInfo.userName });
        return true;
      } else {
        this.isLoggedIn = false;
        this.token = null;
        this.userInfo = null;
        
        // 更新全局状态
        const app = getApp();
        app.globalData.token = null;
        app.globalData.userInfo = null;
        app.globalData.isLoggedIn = false;
        
        logger.info('用户未登录');
        return false;
      }
    } catch (error) {
      logger.error('检查登录状态失败', error);
      return false;
    }
  }

  /**
   * 设置登录信息
   */
  setLoginInfo(loginData) {
    const { token, userId, userName, userAvatar, createTime } = loginData;
    
    this.isLoggedIn = true;
    this.token = token;
    this.userInfo = {
      userId: userId,
      userName: userName,
      userAvatar: userAvatar,
      createTime: createTime
    };

    // 保存到本地存储
    storage.set('token', token);
    storage.set('userInfo', this.userInfo);

    // 更新全局状态
    const app = getApp();
    app.globalData.token = token;
    app.globalData.userInfo = this.userInfo;
    app.globalData.isLoggedIn = true;
  }

  /**
   * 登出
   */
  logout() {
    try {
      logger.info('用户登出');
      
      // 清除本地状态
      this.isLoggedIn = false;
      this.token = null;
      this.userInfo = null;

      // 清除本地存储
      storage.remove('token');
      storage.remove('userInfo');

      // 更新全局状态
      const app = getApp();
      app.globalData.token = null;
      app.globalData.userInfo = null;
      app.globalData.isLoggedIn = false;

      // 显示提示
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      });

    } catch (error) {
      logger.error('登出失败', error);
    }
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    return this.userInfo;
  }

  /**
   * 设置当前用户信息
   */
  setCurrentUser(userInfo) {
    this.userInfo = userInfo;
    
    // 保存到本地存储
    storage.set('userInfo', userInfo);
    
    // 更新全局状态
    const app = getApp();
    app.globalData.userInfo = userInfo;
    
    logger.info('更新用户信息', userInfo);
  }

  /**
   * 获取当前token
   */
  getCurrentToken() {
    return this.token;
  }

  /**
   * 是否已登录
   */
  isUserLoggedIn() {
    return this.isLoggedIn;
  }
}

// 创建单例实例
const authService = new AuthService();

module.exports = authService;

