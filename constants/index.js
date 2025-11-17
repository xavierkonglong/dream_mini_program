// 常量定义

/**
 * 隐私设置
 */
const PRIVACY = {
  PRIVATE: 0,  // 仅自己可看
  PUBLIC: 1    // 发布到社区
};

/**
 * 错误码
 */
const ERROR_CODE = {
  SUCCESS: 0,
  PARAM_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  NETWORK_ERROR: -1,
  TIMEOUT: -2
};

/**
 * 错误信息映射
 */
const ERROR_MESSAGE = {
  [ERROR_CODE.SUCCESS]: '操作成功',
  [ERROR_CODE.PARAM_ERROR]: '参数错误',
  [ERROR_CODE.UNAUTHORIZED]: '未授权，请重新登录',
  [ERROR_CODE.FORBIDDEN]: '权限不足',
  [ERROR_CODE.NOT_FOUND]: '资源不存在',
  [ERROR_CODE.SERVER_ERROR]: '服务器错误',
  [ERROR_CODE.NETWORK_ERROR]: '网络连接失败',
  [ERROR_CODE.TIMEOUT]: '请求超时'
};

/**
 * 梦境解析状态
 */
const DREAM_STATUS = {
  PENDING: 'pending',      // 待解析
  ANALYZING: 'analyzing',  // 解析中
  COMPLETED: 'completed',  // 解析完成
  FAILED: 'failed'         // 解析失败
};

/**
 * 用户类型
 */
const USER_TYPE = {
  NORMAL: 'normal',        // 普通用户
  VIP: 'vip',             // VIP用户
  ADMIN: 'admin'          // 管理员
};

/**
 * 页面路径
 */
const PAGE_PATH = {
  INDEX: '/pages/index/index',
  RESULT: '/pages/result/result',
  HISTORY: '/pages/history/history',
  PROFILE: '/pages/profile/profile',
  LOGIN: '/pages/login/login'
};

/**
 * 存储键名
 */
const STORAGE_KEY = {
  TOKEN: 'token',
  USER_INFO: 'userInfo',
  DREAM_HISTORY: 'dreamHistory',
  SETTINGS: 'settings',
  THEME: 'theme'
};

/**
 * 网络请求状态
 */
const REQUEST_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

/**
 * 主题配置
 */
const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

/**
 * 分享类型
 */
const SHARE_TYPE = {
  DREAM: 'dream',         // 分享梦境
  APP: 'app',            // 分享应用
  RESULT: 'result'       // 分享解析结果
};

/**
 * 动画类型
 */
const ANIMATION_TYPE = {
  FADE_IN: 'fadeIn',
  FADE_OUT: 'fadeOut',
  SLIDE_IN_LEFT: 'slideInLeft',
  SLIDE_IN_RIGHT: 'slideInRight',
  SLIDE_IN_UP: 'slideInUp',
  SLIDE_IN_DOWN: 'slideInDown',
  ZOOM_IN: 'zoomIn',
  ZOOM_OUT: 'zoomOut'
};

/**
 * 正则表达式
 */
const REGEX = {
  PHONE: /^1[3-9]\d{9}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  CHINESE: /[\u4e00-\u9fa5]/,
  ENGLISH: /^[a-zA-Z\s]+$/
};

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  PAGE_SIZE: 10,          // 默认分页大小
  REQUEST_TIMEOUT: 120000, // 请求超时时间(ms) - 增加到2分钟
  RETRY_COUNT: 3,         // 重试次数
  CACHE_TIME: 300000,     // 缓存时间(ms) 5分钟
  MAX_UPLOAD_SIZE: 10485760, // 最大上传文件大小(10MB)
  MAX_DREAM_LENGTH: 2000  // 最大梦境描述长度
};

/**
 * 事件名称
 */
const EVENT_NAME = {
  DREAM_ANALYZED: 'dreamAnalyzed',
  USER_LOGIN: 'userLogin',
  USER_LOGOUT: 'userLogout',
  THEME_CHANGED: 'themeChanged',
  LANGUAGE_CHANGED: 'languageChanged'
};

/**
 * 图片资源URL配置
 */
const IMAGE_URLS = {
  // 基础域名
  BASE_URL: 'https://dulele.org.cn/images',
  
  // 背景图片
  BACKGROUNDS: {
    INDEX: 'https://dulele.org.cn/images/assest/index_v3_bg.png',
    COMMUNITY: 'https://dulele.org.cn/images/assest/community.png',
    PERSON: 'https://dulele.org.cn/images/assest/person.png',
    PROFILE: 'https://dulele.org.cn/images/assest/profile.png',
    DREAM_ANALYSIS_RESULT: 'https://dulele.org.cn/images/assest/dreamAnalysisResult.png'
  },
  
  // 图标（本地路径，用于页面内显示）
  ICONS: {
    HOME: '../../assets/icons/首页.png',
    COMMUNITY: '../../assets/icons/社区.png',
    PROFILE: '../../assets/icons/我的.png',
    FAVORITE: '../../assets/icons/收藏.png'
  },
  
  // 默认头像
  DEFAULT_AVATAR: 'https://dulele.org.cn/images/assest/default-avatar.png'
};

module.exports = {
  PRIVACY,
  ERROR_CODE,
  ERROR_MESSAGE,
  DREAM_STATUS,
  USER_TYPE,
  PAGE_PATH,
  STORAGE_KEY,
  REQUEST_STATUS,
  THEME,
  SHARE_TYPE,
  ANIMATION_TYPE,
  REGEX,
  DEFAULT_CONFIG,
  EVENT_NAME,
  IMAGE_URLS
};


