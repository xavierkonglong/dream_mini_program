// 环境配置
const { DEFAULT_CONFIG } = require('../constants/index.js');

// 当前环境 (dev | test | prod)
// const ENV = 'prod';
const ENV = 'prod';

// 环境配置映射
const ENV_CONFIG = {
  // 开发环境
  dev: {
    env: 'dev',
    baseURL: 'http://192.168.1.55:8087/api/v1',
    enableLog: true,
    enableMock: true,
    enableDebug: true,
    timeout: DEFAULT_CONFIG.REQUEST_TIMEOUT,
    retryCount: DEFAULT_CONFIG.RETRY_COUNT,
    features: {
      enableShare: true,
      enableCollect: true,
      enableHistory: true,
      enableUserCenter: true
    }
  },
  
  // 测试环境
  test: {
    env: 'test',
    baseURL: 'http://47.96.10.214:8088/api/v1',
    enableLog: true,
    enableMock: false,
    enableDebug: true,
    timeout: DEFAULT_CONFIG.REQUEST_TIMEOUT,
    retryCount: DEFAULT_CONFIG.RETRY_COUNT,
    features: {
      enableShare: true,
      enableCollect: true,
      enableHistory: true,
      enableUserCenter: true
    }
  },
  
  // 生产环境
  prod: {
    env: 'prod',
    baseURL: 'https://dulele.org.cn/dreamanalysis/api/v1',
    enableLog: false,
    enableMock: false,
    enableDebug: false,
    timeout: DEFAULT_CONFIG.REQUEST_TIMEOUT,
    retryCount: DEFAULT_CONFIG.RETRY_COUNT,
    features: {
      enableShare: true,
      enableCollect: true,
      enableHistory: true,
      enableUserCenter: true
    }
  }
};

// 获取当前环境配置
const config = ENV_CONFIG[ENV] || ENV_CONFIG.dev;

// 验证配置
if (!config) {
  throw new Error(`未找到环境配置: ${ENV}`);
}

// 导出配置
module.exports = config;
