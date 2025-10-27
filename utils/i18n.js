// 国际化配置文件
const i18n = {
  // 中文配置
  zh: {
    // 首页
    index: {
      title: '💭 分享你的梦境',
      subtitle: '详细描述你的梦境，AI将为你解析其中的含义',
      placeholder: '例如：我梦见自己在天空中飞翔，俯瞰着美丽的城市，感觉非常自由和快乐...',
      generationType: '生成类型',
      textToImage: '文生图（快速）',
      textToVideo: '文生视频（较慢）',
      analyze: '梦境解析',
      analyzing: '解析中...',
      tipsTitle: '💡 使用小贴士',
      tips: [
        '• 描述越详细，解析越准确',
        '• 包含梦中的情绪和感受',
        '• 记录梦中出现的人物、场景和物品',
        '• 解析结果仅供参考，请保持批判性思考'
      ],
      disclaimer: '内容由AI生成，仅供参考',
      appName: '光爱梦伴小程序',
      dreamContentRequired: '请输入梦境内容',
      dreamContentTooLong: '梦境内容不能超过1000字',
      analyzingMessage: '解析中，请稍后查看梦境日记',
      shareTitle: '梦境解析小程序',
      timelineTitle: '梦境解析小程序 - 探索你的梦境世界'
    },
    
    // 社区页面
    community: {
      title: '梦境社区',
      subtitle: '分享你的梦境，探索内心世界',
      noMoreContent: '没有更多内容了',
      loading: '加载中...',
      loadingMore: '正在加载更多...',
      emptyTitle: '暂无梦境分享',
      emptyDesc: '去首页记录你的第一个梦境吧',
      loginTitle: '欢迎来到梦境世界',
      loginSubtitle: '请先登录以体验完整功能',
      appName: '光爱梦伴小程序',
      loadFailed: '加载失败',
      paramError: '参数错误',
      navigateFailed: '跳转失败',
      postNotFound: '帖子不存在',
      operationFailed: '操作失败',
      shareTitle: '梦境社区',
      timelineTitle: '梦境社区 - 分享你的梦境故事'
    },
    
    // 个人页面
    profile: {
      title: '我的',
      dreamDiary: '梦境日记',
      collections: '我的收藏',
      likes: '我的点赞',
      noDreamDiary: '暂无梦境日记',
      noDreamDiaryDesc: '记录你的第一个梦境吧',
      goToDiary: '去记录梦境',
      dreamExplorer: '梦境探索者',
      joinTime: '加入时间：',
      loginTips: '登录后可保存梦境记录',
      loginNow: '立即登录',
      myDreamDiary: '我的梦境日记',
      myCollections: '我的收藏',
      myLikes: '我的点赞',
      needLogin: '需要登录查看',
      loginToViewDiary: '登录后可查看您的梦境日记',
      loginToViewCollections: '登录后可查看您的收藏内容',
      loginToViewLikes: '登录后可查看您的点赞内容',
      noCollections: '暂无收藏内容',
      noCollectionsDesc: '去社区发现精彩内容吧',
      goToCommunity: '去社区逛逛',
      noLikes: '暂无点赞内容',
      noLikesDesc: '去社区发现精彩内容吧',
      welcomeTitle: '欢迎来到梦境世界',
      welcomeSubtitle: '请先登录以体验完整功能',
      appName: '光爱梦伴小程序',
      confirmLogout: '确认退出',
      confirmLogoutContent: '确定要退出登录吗？',
      loadFailed: '加载失败，请重试',
      shareTitle: '我的梦境',
      timelineTitle: '我的梦境 - 记录美好梦境',
      postIdNotFound: '帖子ID不存在'
    },
    
    // 个人信息详情页
    profileDetail: {
      dreamExplorer: '梦境探索者',
      joinTime: '加入时间：',
      editProfile: '编辑个人信息',
      helpFeedback: '帮助与反馈',
      helpContent: '如有问题或建议，请联系我们：\n\n邮箱：guangai@exploredali.com',
      versionInfo: '版本信息',
      versionContent: '梦境解析小程序\n版本：v3.0\n\n更新内容：\n• 全新UI设计\n• 梦境分析功能\n• 社区互动\n• 个人中心',
      logout: '退出登录',
      confirmLogout: '确认退出',
      confirmLogoutContent: '确定要退出登录吗？',
      cancel: '取消',
      logoutFailed: '退出失败',
      pleaseLoginFirst: '请先登录',
      gotIt: '知道了'
    },
    
    // 编辑个人信息页
    editProfile: {
      title: '编辑个人信息',
      nickname: '昵称',
      nicknamePlaceholder: '请输入昵称',
      phone: '手机号',
      phonePlaceholder: '请输入手机号',
      save: '保存',
      saving: '保存中...',
      cancel: '取消',
      saveSuccess: '保存成功',
      saveError: '保存失败',
      nicknameRequired: '请输入昵称',
      phoneRequired: '请输入手机号',
      phoneInvalid: '请输入正确的手机号',
      uploading: '上传中...',
      clickToChange: '点击更换',
      noChanges: '信息未发生变化',
      getUserInfoFailed: '获取用户信息失败，使用本地数据',
      loginExpired: '登录过期',
      loginExpiredContent: '您的登录已过期，请重新登录',
      selectImageFailed: '选择图片失败',
      uploadSuccess: '头像上传成功',
      appName: '光爱梦伴小程序'
    },
    
    // 帖子详情页
    postDetail: {
      dreamContent: '梦境内容',
      keywords: '关键词',
      analysis: '梦境解析',
      aiVideo: 'AI梦境视频',
      aiImage: 'AI梦境图像',
      liked: '已点赞',
      like: '点赞',
      favorited: '已收藏',
      favorite: '收藏',
      postNotFound: '帖子不存在',
      loginRequired: '需要登录',
      loginSubtitle: '请先登录以进行点赞和收藏操作',
      aiDisclaimer: 'AI生成仅供参考'
    },
    
    // 导航栏
    tabbar: {
      home: '首页',
      community: '社区',
      profile: '我的'
    },
    
    // 页面标题
    pageTitle: {
      index: '梦境',
      community: '梦境社区',
      profile: '我的',
      profileDetail: '个人信息',
      editProfile: '编辑个人信息',
      postDetail: '梦境详情',
      diary: '梦境日记',
      result: '解析结果'
    },
    
    // 登录弹窗
    loginModal: {
      title: '欢迎来到梦境世界',
      subtitle: '请先登录以体验完整功能',
      loginButton: '微信授权登录',
      logging: '登录中...',
      cancel: '暂不登录',
      tips: '登录后可保存梦境记录、参与社区互动',
      loginSuccess: '登录成功',
      loginFailed: '登录失败'
    },
    
    // 梦境日记页面
    diary: {
      loading: '加载中...',
      dreamContent: '梦境内容',
      keywords: '关键词',
      dreamAnalysis: '梦境解析',
      aiDisclaimer: 'AI生成仅供参考',
      guidingQuestions: '情绪疏导问题',
      questionsIntro: '💭 以下问题可以帮助您更好地理解梦境背后的情绪和潜意识信息',
      answerPlaceholder: '您可以在这里写下对这个问题的思考...',
      saveAnswers: '💾 保存我的思考',
      saving: '保存中...',
      aiImage: 'AI梦境图像',
      aiVideo: 'AI梦境视频',
      videoGenerating: '视频生成中，请稍候...',
      videoGeneratingTip: '视频生成需要一定时间，您可以先浏览其他内容',
      videoFailed: '视频生成失败',
      videoFailedTip: '请稍后重试或选择文生图模式',
      publish: '发布',
      generatePoster: '生成海报',
      rateUs: '给我们评分',
      ratingLabel: '请为本次解析评分：',
      score: '分',
      selectRating: '请选择评分',
      feedbackLabel: '反馈建议（可选）：',
      feedbackPlaceholder: '请告诉我们您的想法和建议...',
      submitFeedback: '提交反馈',
      submitting: '提交中...',
      thankYouTitle: '感谢您的反馈！',
      thankYouText: '您的建议对我们非常重要，我们会持续改进服务质量。',
      noResult: '暂无解析结果',
      question1: '🤔 问题一',
      question2: '💡 问题二',
      downloadVideo: '下载视频',
      setToPrivate: '设置为仅个人可见',
      noData: '暂无数据',
      generatingPoster: '生成海报中...',
      posterComponentNotFound: '海报组件未找到',
      posterGenerationFailed: '生成海报失败',
      dataError: '数据错误',
      loadFailed: '加载失败',
      videoGenerationComplete: '视频生成完成',
      videoGenerationFailed: '视频生成失败',
      videoNotGenerated: '视频尚未生成',
      downloading: '下载中...',
      saveSuccess: '保存成功',
      saveFailed: '保存失败',
      downloadFailed: '下载失败',
      authorizationRequired: '需要授权',
      allowSaveVideoToAlbum: '请允许保存视频到相册',
      dreamAnalysisResult: '梦境解析结果',
      publishToCommunity: '发布到社区',
      publishToCommunityContent: '确定要将此梦境解析结果发布到社区吗？其他用户将可以看到你的梦境内容。',
      publishing: '发布中...',
      shareToFriends: '分享给朋友',
      saveToAlbum: '保存到相册',
      copyLink: '复制链接',
      copied: '已复制',
      dataErrorMissingAnalysisId: '数据错误，缺少analysisId',
      publishSuccess: '发布成功',
      loginRequired: '需要登录',
      loginRequiredForPublish: '请先登录后再发布到社区',
      goToLogin: '去登录',
      publishFailed: '发布失败，请重试',
      setToPrivateContent: '确定要将此梦境解析结果设置为仅个人可见吗？其他用户将无法再看到你的梦境内容。',
      confirm: '确定',
      cancel: '取消',
      setting: '设置中...',
      setSuccess: '设置成功',
      loginRequiredForSetPrivate: '请先登录后再设置为仅个人可见',
      gotIt: '知道了',
      setFailed: '设置失败，请重试',
      noKeywords: '暂无关键词',
      noDreamDescription: '暂无梦境描述',
      noDreamAnalysis: '暂无梦境解析',
      appName: '光爱梦伴',
      aiDreamAnalysis: 'AI梦境解析',
      pleaseAnswerAtLeastOne: '请至少回答一个问题',
      pleaseSelectRatingOrFeedback: '请至少选择评分或填写反馈内容',
      feedbackSubmitSuccess: '反馈提交成功',
      loginRequiredForFeedback: '请先登录后再提交反馈'
    },
    
    // 结果页
    result: {
      dataError: '数据错误',
      videoNotGenerated: '视频尚未生成',
      videoGenerationComplete: '视频生成完成',
      videoGenerationFailed: '视频生成失败',
      downloading: '下载中...',
      saveSuccess: '保存成功',
      saveFailed: '保存失败',
      needAuth: '需要授权',
      allowSaveVideo: '请允许保存视频到相册',
      goToSettings: '去设置',
      downloadFailed: '下载失败',
      dreamAnalysisResult: '梦境解析结果',
      dreamAnalysis: '梦境解析',
      shareToFriends: '分享给朋友',
      saveToAlbum: '保存到相册',
      copyLink: '复制链接',
      copied: '已复制',
      publishToCommunity: '发布到社区',
      confirmPublish: '确定要将此梦境解析结果发布到社区吗？其他用户将可以看到你的梦境内容。',
      publish: '发布',
      cancel: '取消',
      dataErrorMissingId: '数据错误，缺少analysisId',
      publishing: '发布中...',
      publishSuccess: '发布成功',
      publishFailed: '发布失败，请重试',
      loginRequired: '需要登录',
      loginRequiredForPublish: '请先登录后再发布到社区',
      goToLogin: '去登录',
      noData: '暂无数据',
      generatingPoster: '生成海报中...',
      posterComponentNotFound: '海报组件未找到',
      generationFailed: '生成失败，请重试',
      noKeywords: '暂无关键词',
      noDreamDescription: '暂无梦境描述',
      noDreamAnalysis: '暂无梦境解析',
      appName: '光爱梦伴',
      aiDreamAnalysis: 'AI梦境解析',
      dreamContent: '梦境内容',
      keywords: '关键词',
      dreamAnalysis: '梦境解析',
      scanForMore: '扫码体验更多AI梦境解析',
      longPressToScan: '长按识别小程序码',
      aiGeneratedPoster: 'AI生成海报',
      needAuthForImage: '需要授权',
      allowSaveImage: '请允许保存图片到相册',
      networkFailed: '网络连接失败，请检查网络后重试',
      serverConnectionFailed: '无法连接到服务器，请检查网络设置',
      tempFileFailed: '临时文件处理失败，请重试',
      pleaseAnswerAtLeastOne: '请至少回答一个问题',
      thinkingSaved: '思考已保存',
      saveFailed: '保存失败，请重试',
      loginRequiredForSave: '请先登录后再保存回答',
      pleaseSelectRatingOrFeedback: '请至少选择评分或填写反馈内容',
      feedbackSubmitSuccess: '反馈提交成功',
      feedbackSubmitFailed: '反馈提交失败',
      loginRequiredForFeedback: '请先登录后再提交反馈',
      submitFailed: '提交失败，请重试',
      myThinking: '我的思考',
      aiDreamVideo: 'AI梦境视频',
      clickToViewVideo: '点击查看视频',
      loading: '加载中...',
      aiDisclaimer: 'AI生成仅供参考',
      guidingQuestions: '情绪疏导问题',
      questionsIntro: '💭 以下问题可以帮助您更好地理解梦境背后的情绪和潜意识信息',
      question1: '🤔 问题一',
      question2: '💡 问题二',
      answerPlaceholder: '您可以在这里写下对这个问题的思考...',
      saveAnswers: '💾 保存我的思考',
      saving: '保存中...',
      aiImage: 'AI梦境图像',
      videoGenerating: '视频生成中，请稍候...',
      videoGeneratingTip: '视频生成需要一定时间，您可以先浏览其他内容',
      videoFailed: '视频生成失败',
      videoFailedTip: '请稍后重试或选择文生图模式',
      downloadVideo: '下载视频',
      generatePoster: '生成海报',
      rateUs: '给我们评分',
      ratingLabel: '请为本次解析评分：',
      score: '分',
      selectRating: '请选择评分',
      feedbackLabel: '反馈建议（可选）：',
      feedbackPlaceholder: '请告诉我们您的想法和建议...',
      submitFeedback: '提交反馈',
      submitting: '提交中...',
      thankYouTitle: '感谢您的反馈！',
      thankYouText: '您的建议对我们非常重要，我们会持续改进服务质量。',
      noResult: '暂无解析结果'
    },
    
    // HTTP服务
    http: {
      processing: '处理中...',
      requestFailed: '请求失败',
      unauthorized: '未授权，请先登录',
      networkFailed: '网络连接失败',
      timeoutMessage: '解析时间较长，请稍后查看梦境日记',
      uploading: '上传中...',
      uploadFailed: '上传失败',
      uploadTimeout: '上传超时，请重试',
      uploadNetworkFailed: '上传失败，请检查网络',
      parseFailed: '上传响应解析失败'
    },
    
    // 梦境服务
    dream: {
      analyzingText: '解析中，请稍后查看梦境日记',
      analyzingVideo: '解析中，视频生成中...'
    },
    
    // 海报生成
    poster: {
      generating: '生成中',
      generateFailed: '生成失败'
    },
    
    // 应用全局
    app: {
      dreamAnalysisComplete: '梦境解析完成',
      analysisComplete: '解析完成',
      analysisCompleteContent: '您的梦境解析已完成，是否立即查看结果？',
      viewResult: '查看结果',
      viewLater: '稍后查看'
    },
    
    // 通用
    common: {
      loading: '加载中...',
      success: '操作成功',
      error: '操作失败',
      confirm: '确认',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      share: '分享',
      back: '返回',
      close: '关闭'
    }
  },
  
  // 英文配置
  en: {
    // 首页
    index: {
      title: '💭 Share Your Dream',
      subtitle: 'Describe your dream in detail, AI will analyze its meaning for you',
      placeholder: 'For example: I dreamed I was flying in the sky, overlooking a beautiful city, feeling very free and happy...',
      generationType: 'Generation Type',
      textToImage: 'Text to Image (Fast)',
      textToVideo: 'Text to Video (Slower)',
      analyze: 'Dream Analysis',
      analyzing: 'Analyzing...',
      tipsTitle: '💡 Usage Tips',
      tips: [
        '• The more detailed the description, the more accurate the analysis',
        '• Include emotions and feelings in the dream',
        '• Record people, scenes and objects that appear in the dream',
        '• Analysis results are for reference only, please maintain critical thinking'
      ],
      disclaimer: 'Content generated by AI, for reference only',
      appName: 'Dream Companion Mini Program',
      dreamContentRequired: 'Please enter dream content',
      dreamContentTooLong: 'Dream content cannot exceed 1000 characters',
      analyzingMessage: 'Analyzing, please check dream diary later'
    },
    
    // 社区页面
    community: {
      title: 'Dream Community',
      subtitle: 'Share your dreams, explore your inner world',
      noMoreContent: 'No more content',
      loading: 'Loading...',
      loadingMore: 'Loading more...',
      emptyTitle: 'No dream shares yet',
      emptyDesc: 'Go to homepage to record your first dream',
      loginTitle: 'Welcome to the Dream World',
      loginSubtitle: 'Please log in to experience full features',
      appName: 'Dream Companion Mini Program',
      loadFailed: 'Load failed',
      paramError: 'Parameter error',
      navigateFailed: 'Navigation failed',
      postNotFound: 'Post not found',
      operationFailed: 'Operation failed'
    },
    
    // 个人页面
    profile: {
      title: 'My Profile',
      dreamDiary: 'Dream Diary',
      collections: 'My Collections',
      likes: 'My Likes',
      noDreamDiary: 'No Dream Diary',
      noDreamDiaryDesc: 'Record your first dream',
      goToDiary: 'Go to Record Dream',
      dreamExplorer: 'Dream Explorer',
      joinTime: 'Joined: ',
      loginTips: 'Login to save dream records',
      loginNow: 'Login Now',
      myDreamDiary: 'Dream Diary',
      myCollections: 'My Collections',
      myLikes: 'My Likes',
      needLogin: 'Login Required',
      loginToViewDiary: 'Login to view your dream diary',
      loginToViewCollections: 'Login to view your collections',
      loginToViewLikes: 'Login to view your likes',
      noCollections: 'No Collections',
      noCollectionsDesc: 'Discover amazing content in community',
      goToCommunity: 'Go to Community',
      noLikes: 'No Likes',
      noLikesDesc: 'Discover amazing content in community',
      welcomeTitle: 'Welcome to Dream World',
      welcomeSubtitle: 'Please log in to experience full features',
      appName: 'Dream Companion Mini Program',
      confirmLogout: 'Confirm Logout',
      confirmLogoutContent: 'Are you sure you want to logout?',
      loadFailed: 'Load failed, please try again',
      postIdNotFound: 'Post ID not found'
    },
    
    // 个人信息详情页
    profileDetail: {
      dreamExplorer: 'Dream Explorer',
      joinTime: 'Joined: ',
      editProfile: 'Edit Profile',
      helpFeedback: 'Help & Feedback',
      helpContent: 'If you have any questions or suggestions, please contact us:\n\nEmail: guangai@exploredali.com',
      versionInfo: 'Version Info',
      versionContent: 'Dream Analysis Mini Program\nVersion: v3.0\n\nUpdates:\n• Brand new UI design\n• Dream analysis features\n• Community interaction\n• Personal center',
      logout: 'Logout',
      confirmLogout: 'Confirm Logout',
      confirmLogoutContent: 'Are you sure you want to logout?',
      cancel: 'Cancel',
      logoutFailed: 'Logout failed',
      pleaseLoginFirst: 'Please login first',
      gotIt: 'Got it'
    },
    
    // 编辑个人信息页
    editProfile: {
      title: 'Edit Profile',
      nickname: 'Nickname',
      nicknamePlaceholder: 'Please enter nickname',
      phone: 'Phone Number',
      phonePlaceholder: 'Please enter phone number',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      saveSuccess: 'Saved successfully',
      saveError: 'Save failed',
      nicknameRequired: 'Please enter nickname',
      phoneRequired: 'Please enter phone number',
      phoneInvalid: 'Please enter valid phone number',
      uploading: 'Uploading...',
      clickToChange: 'Click to change',
      noChanges: 'No changes detected',
      getUserInfoFailed: 'Failed to get user info, using local data',
      loginExpired: 'Login Expired',
      loginExpiredContent: 'Your login has expired, please log in again',
      selectImageFailed: 'Failed to select image',
      uploadSuccess: 'Avatar uploaded successfully',
      appName: 'Dream Companion Mini Program'
    },
    
    // 帖子详情页
    postDetail: {
      dreamContent: 'Dream Content',
      keywords: 'Keywords',
      analysis: 'Dream Analysis',
      aiVideo: 'AI Dream Video',
      aiImage: 'AI Dream Image',
      liked: 'Liked',
      like: 'Like',
      favorited: 'Favorited',
      favorite: 'Favorite',
      postNotFound: 'Post not found',
      loginRequired: 'Login Required',
      loginSubtitle: 'Please log in to like and favorite',
      aiDisclaimer: 'AI generated for reference only'
    },
    
    // 导航栏
    tabbar: {
      home: 'Home',
      community: 'Community',
      profile: 'Profile'
    },
    
    // 页面标题
    pageTitle: {
      index: 'Dream',
      community: 'Dream Community',
      profile: 'My Profile',
      profileDetail: 'Profile',
      editProfile: 'Edit Profile',
      postDetail: 'Dream Detail',
      diary: 'Dream Diary',
      result: 'Analysis Result'
    },
    
    // 登录弹窗
    loginModal: {
      title: 'Welcome to Dream World',
      subtitle: 'Please log in to experience full features',
      loginButton: 'WeChat Login',
      logging: 'Logging in...',
      cancel: 'Not now',
      tips: 'Login to save dream records and participate in community',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed'
    },
    
    // 梦境日记页面
    diary: {
      loading: 'Loading...',
      dreamContent: 'Dream Content',
      keywords: 'Keywords',
      dreamAnalysis: 'Dream Analysis',
      aiDisclaimer: 'AI generated for reference only',
      guidingQuestions: 'Emotional Guidance Questions',
      questionsIntro: '💭 The following questions can help you better understand the emotions and subconscious information behind your dreams',
      answerPlaceholder: 'You can write your thoughts about this question here...',
      saveAnswers: '💾 Save My Thoughts',
      saving: 'Saving...',
      aiImage: 'AI Dream Image',
      aiVideo: 'AI Dream Video',
      videoGenerating: 'Video generating, please wait...',
      videoGeneratingTip: 'Video generation takes time, you can browse other content first',
      videoFailed: 'Video generation failed',
      videoFailedTip: 'Please try again later or choose text-to-image mode',
      publish: 'Publish',
      generatePoster: 'Generate Poster',
      rateUs: 'Rate Us',
      ratingLabel: 'Please rate this analysis:',
      score: ' points',
      selectRating: 'Please select rating',
      feedbackLabel: 'Feedback (optional):',
      feedbackPlaceholder: 'Please tell us your thoughts and suggestions...',
      submitFeedback: 'Submit Feedback',
      submitting: 'Submitting...',
      thankYouTitle: 'Thank you for your feedback!',
      thankYouText: 'Your suggestions are very important to us, we will continue to improve our service quality.',
      noResult: 'No analysis result',
      question1: '🤔 Question 1',
      question2: '💡 Question 2',
      downloadVideo: 'Download Video',
      setToPrivate: 'Set to Private',
      noData: 'No data available',
      generatingPoster: 'Generating poster...',
      posterComponentNotFound: 'Poster component not found',
      posterGenerationFailed: 'Poster generation failed',
      dataError: 'Data error',
      loadFailed: 'Load failed',
      videoGenerationComplete: 'Video generation complete',
      videoGenerationFailed: 'Video generation failed',
      videoNotGenerated: 'Video not generated yet',
      downloading: 'Downloading...',
      saveSuccess: 'Save successful',
      saveFailed: 'Save failed',
      downloadFailed: 'Download failed',
      authorizationRequired: 'Authorization required',
      allowSaveVideoToAlbum: 'Please allow saving video to album',
      dreamAnalysisResult: 'Dream Analysis Result',
      publishToCommunity: 'Publish to Community',
      publishToCommunityContent: 'Are you sure you want to publish this dream analysis result to the community? Other users will be able to see your dream content.',
      publishing: 'Publishing...',
      shareToFriends: 'Share to Friends',
      saveToAlbum: 'Save to Album',
      copyLink: 'Copy Link',
      copied: 'Copied',
      dataErrorMissingAnalysisId: 'Data error, missing analysisId',
      publishSuccess: 'Published successfully',
      loginRequired: 'Login required',
      loginRequiredForPublish: 'Please log in before publishing to community',
      goToLogin: 'Go to Login',
      publishFailed: 'Publish failed, please try again',
      setToPrivateContent: 'Are you sure you want to set this dream analysis result to private? Other users will no longer be able to see your dream content.',
      confirm: 'Confirm',
      cancel: 'Cancel',
      setting: 'Setting...',
      setSuccess: 'Set successfully',
      loginRequiredForSetPrivate: 'Please log in before setting to private',
      gotIt: 'Got it',
      setFailed: 'Set failed, please try again',
      noKeywords: 'No keywords',
      noDreamDescription: 'No dream description',
      noDreamAnalysis: 'No dream analysis',
      appName: 'Dream Companion',
      aiDreamAnalysis: 'AI Dream Analysis',
      pleaseAnswerAtLeastOne: 'Please answer at least one question',
      pleaseSelectRatingOrFeedback: 'Please select rating or fill in feedback content',
      feedbackSubmitSuccess: 'Feedback submitted successfully',
      loginRequiredForFeedback: 'Please log in before submitting feedback'
    },
    
    // 结果页
    result: {
      dataError: 'Data error',
      videoNotGenerated: 'Video not generated yet',
      videoGenerationComplete: 'Video generation complete',
      videoGenerationFailed: 'Video generation failed',
      downloading: 'Downloading...',
      saveSuccess: 'Save successful',
      saveFailed: 'Save failed',
      needAuth: 'Authorization required',
      allowSaveVideo: 'Please allow saving video to album',
      goToSettings: 'Go to Settings',
      downloadFailed: 'Download failed',
      dreamAnalysisResult: 'Dream Analysis Result',
      dreamAnalysis: 'Dream Analysis',
      shareToFriends: 'Share to Friends',
      saveToAlbum: 'Save to Album',
      copyLink: 'Copy Link',
      copied: 'Copied',
      publishToCommunity: 'Publish to Community',
      confirmPublish: 'Are you sure you want to publish this dream analysis result to the community? Other users will be able to see your dream content.',
      publish: 'Publish',
      cancel: 'Cancel',
      dataErrorMissingId: 'Data error, missing analysisId',
      publishing: 'Publishing...',
      publishSuccess: 'Published successfully',
      publishFailed: 'Publish failed, please try again',
      loginRequired: 'Login required',
      loginRequiredForPublish: 'Please log in before publishing to community',
      goToLogin: 'Go to Login',
      noData: 'No data available',
      generatingPoster: 'Generating poster...',
      posterComponentNotFound: 'Poster component not found',
      generationFailed: 'Generation failed, please try again',
      noKeywords: 'No keywords',
      noDreamDescription: 'No dream description',
      noDreamAnalysis: 'No dream analysis',
      appName: 'Dream Companion',
      aiDreamAnalysis: 'AI Dream Analysis',
      dreamContent: 'Dream Content',
      keywords: 'Keywords',
      dreamAnalysis: 'Dream Analysis',
      scanForMore: 'Scan for more AI dream analysis',
      longPressToScan: 'Long press to scan QR code',
      aiGeneratedPoster: 'AI Generated Poster',
      needAuthForImage: 'Authorization required',
      allowSaveImage: 'Please allow saving image to album',
      networkFailed: 'Network connection failed, please check network and try again',
      serverConnectionFailed: 'Unable to connect to server, please check network settings',
      tempFileFailed: 'Temporary file processing failed, please try again',
      pleaseAnswerAtLeastOne: 'Please answer at least one question',
      thinkingSaved: 'Thinking saved',
      saveFailed: 'Save failed, please try again',
      loginRequiredForSave: 'Please log in before saving answers',
      pleaseSelectRatingOrFeedback: 'Please select rating or fill in feedback content',
      feedbackSubmitSuccess: 'Feedback submitted successfully',
      feedbackSubmitFailed: 'Feedback submission failed',
      loginRequiredForFeedback: 'Please log in before submitting feedback',
      submitFailed: 'Submit failed, please try again',
      myThinking: 'My Thinking',
      aiDreamVideo: 'AI Dream Video',
      clickToViewVideo: 'Click to view video',
      loading: 'Loading...',
      aiDisclaimer: 'AI generated for reference only',
      guidingQuestions: 'Emotional Guidance Questions',
      questionsIntro: '💭 The following questions can help you better understand the emotions and subconscious information behind your dreams',
      question1: '🤔 Question 1',
      question2: '💡 Question 2',
      answerPlaceholder: 'You can write your thoughts about this question here...',
      saveAnswers: '💾 Save My Thoughts',
      saving: 'Saving...',
      aiImage: 'AI Dream Image',
      videoGenerating: 'Video generating, please wait...',
      videoGeneratingTip: 'Video generation takes time, you can browse other content first',
      videoFailed: 'Video generation failed',
      videoFailedTip: 'Please try again later or choose text-to-image mode',
      downloadVideo: 'Download Video',
      generatePoster: 'Generate Poster',
      rateUs: 'Rate Us',
      ratingLabel: 'Please rate this analysis:',
      score: ' points',
      selectRating: 'Please select rating',
      feedbackLabel: 'Feedback (optional):',
      feedbackPlaceholder: 'Please tell us your thoughts and suggestions...',
      submitFeedback: 'Submit Feedback',
      submitting: 'Submitting...',
      thankYouTitle: 'Thank you for your feedback!',
      thankYouText: 'Your suggestions are very important to us, we will continue to improve our service quality.',
      noResult: 'No analysis result'
    },
    
    // HTTP服务
    http: {
      processing: 'Processing...',
      requestFailed: 'Request failed',
      unauthorized: 'Unauthorized, please log in first',
      networkFailed: 'Network connection failed',
      timeoutMessage: 'Analysis takes longer, please check dream diary later',
      uploading: 'Uploading...',
      uploadFailed: 'Upload failed',
      uploadTimeout: 'Upload timeout, please try again',
      uploadNetworkFailed: 'Upload failed, please check network',
      parseFailed: 'Upload response parsing failed'
    },
    
    // 梦境服务
    dream: {
      analyzingText: 'Analyzing, please check dream diary later',
      analyzingVideo: 'Analyzing, video generating...'
    },
    
    // 海报生成
    poster: {
      generating: 'Generating',
      generateFailed: 'Generation failed'
    },
    
    // 应用全局
    app: {
      name: 'Dream Companion Mini Program',
      shareTitle: 'Dream Companion Mini Program',
      timelineTitle: 'Dream Companion Mini Program - Explore Your Dream World',
      dreamAnalysisComplete: 'Dream Analysis Complete',
      analysisComplete: 'Analysis Complete',
      analysisCompleteContent: 'Your dream analysis is complete. Would you like to view the results now?',
      viewResult: 'View Results',
      viewLater: 'View Later'
    },
    
    // 通用
    common: {
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      share: 'Share',
      back: 'Back',
      close: 'Close'
    }
  },

  // 应用级别配置
  app: {
    name: '光爱梦伴小程序',
    shareTitle: '光爱梦伴小程序',
    timelineTitle: '光爱梦伴小程序 - 探索你的梦境世界',
    dreamAnalysisComplete: '梦境解析完成',
    analysisComplete: '解析完成',
    analysisCompleteContent: '您的梦境解析已完成，点击查看结果',
    viewResult: '查看结果',
    viewLater: '稍后查看'
  }
};

// 获取当前语言
function getCurrentLanguage() {
  return wx.getStorageSync('language') || 'zh';
}

// 设置语言
function setLanguage(lang) {
  wx.setStorageSync('language', lang);
}

// 获取翻译文本
function t(key, params = {}) {
  const lang = getCurrentLanguage();
  const keys = key.split('.');
  let value = i18n[lang];
  
  for (const k of keys) {
    if (value && value[k]) {
      value = value[k];
    } else {
      // 如果当前语言没有找到，回退到中文
      value = i18n.zh;
      for (const k2 of keys) {
        if (value && value[k2]) {
          value = value[k2];
        } else {
          return key; // 如果都找不到，返回key本身
        }
      }
      break;
    }
  }
  
  // 处理参数替换
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] || match);
  }
  
  return value;
}

// 获取当前语言
function getLang() {
  return getCurrentLanguage();
}

module.exports = {
  t,
  getLang,
  setLanguage,
  getCurrentLanguage
};
