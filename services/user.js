// 用户服务
const http = require('./http.js');
const logger = require('../utils/logger.js');

class UserService {
  /**
   * 获取用户信息
   */
  async getUserInfo(userId) {
    try {
      logger.info('获取用户信息', { userId });
      
      const response = await http.get(`/user/info/${userId}`);
      
      if (response.code === 0 && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '获取用户信息失败');
      }
    } catch (error) {
      logger.error('获取用户信息失败', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(userId, userData) {
    try {
      logger.info('更新用户信息', { userId, userData });
      
      const response = await http.put(`/user/update/${userId}`, userData);
      
      if (response.code === 0) {
        // 更新本地存储的用户信息
        const authService = require('./auth.js');
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData };
          authService.setLoginInfo({
            token: authService.getCurrentToken(),
            userId: updatedUser.userId,
            userName: updatedUser.userName,
            userAvatar: updatedUser.userAvatar,
            createTime: updatedUser.createTime
          });
        }
        
        return response.data;
      } else {
        throw new Error(response.message || '更新用户信息失败');
      }
    } catch (error) {
      logger.error('更新用户信息失败', error);
      throw error;
    }
  }

  /**
   * 获取用户梦境日记
   */
  async getUserDreamDiary(userId, page = 1, pageSize = 10) {
    try {
      logger.info('获取用户梦境日记', { userId, page, pageSize });
      
      const response = await http.get('/user/dream-diary', {
        userId: userId,
        page: page,
        pageSize: pageSize
      });
      
      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.message || '获取梦境日记失败');
      }
    } catch (error) {
      logger.error('获取用户梦境日记失败', error);
      throw error;
    }
  }

  /**
   * 获取用户收藏
   */
  async getUserCollections(userId, page = 1, pageSize = 10) {
    try {
      logger.info('获取用户收藏', { userId, page, pageSize });
      
      const response = await http.get('/user/collections', {
        userId: userId,
        page: page,
        pageSize: pageSize
      });
      
      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.message || '获取收藏失败');
      }
    } catch (error) {
      logger.error('获取用户收藏失败', error);
      throw error;
    }
  }

  /**
   * 获取用户点赞
   */
  async getUserLikes(userId, page = 1, pageSize = 10) {
    try {
      logger.info('获取用户点赞', { userId, page, pageSize });
      
      const response = await http.get('/user/likes', {
        userId: userId,
        page: page,
        pageSize: pageSize
      });
      
      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.message || '获取点赞失败');
      }
    } catch (error) {
      logger.error('获取用户点赞失败', error);
      throw error;
    }
  }
}

// 创建单例实例
const userService = new UserService();

module.exports = userService;


