// 会员服务
const http = require('./http.js');
const logger = require('../utils/logger.js');

class MembershipService {
  /**
   * 获取会员信息
   */
  async getMembershipInfo() {
    try {
      logger.info('获取会员信息');
      
      const response = await http.get('/membership/info', {}, {
        showLoading: false
      });
      
      if (response.code === 0 && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '获取会员信息失败');
      }
    } catch (error) {
      logger.error('获取会员信息失败', error);
      throw error;
    }
  }

  /**
   * 创建预订单（开通会员）
   */
  async createPrepay() {
    try {
      logger.info('创建会员预订单');
      
      const response = await http.post('/membership/prepay', {}, {
        showLoading: true,
        loadingText: '正在创建订单...'
      });
      
      if (response.code === 0 && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '创建订单失败');
      }
    } catch (error) {
      logger.error('创建会员预订单失败', error);
      throw error;
    }
  }

  /**
   * 权限校验
   */
  async checkMembershipPermission() {
    try {
      logger.info('校验会员权限');
      
      const response = await http.get('/membership/check', {}, {
        showLoading: false
      });
      
      if (response.code === 0 && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '权限校验失败');
      }
    } catch (error) {
      logger.error('校验会员权限失败', error);
      throw error;
    }
  }

  /**
   * 获取充值历史
   */
  async getRechargeHistory(page = 1, size = 10) {
    try {
      logger.info('获取充值历史', { page, size });
      
      const response = await http.get('/membership/history', {
        page,
        size
      }, {
        showLoading: false
      });
      
      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.message || '获取充值历史失败');
      }
    } catch (error) {
      logger.error('获取充值历史失败', error);
      throw error;
    }
  }

  /**
   * 校验是否是VIP（轻量级接口）
   */
  async checkIsVip() {
    try {
      logger.info('校验是否是VIP');
      
      const response = await http.get('/membership/is_vip', {}, {
        showLoading: false
      });
      
      if (response.code === 0 && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || '校验VIP状态失败');
      }
    } catch (error) {
      logger.error('校验VIP状态失败', error);
      throw error;
    }
  }
}

// 创建单例实例
const membershipService = new MembershipService();

module.exports = membershipService;

