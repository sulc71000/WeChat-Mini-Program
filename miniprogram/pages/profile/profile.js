const backgroundManager = require('../../utils/backgroundManager');

Page({
  data: {
    userInfo: null,
    coupleInfo: null,
    partnerInfo: null,
    isBound: false,
    showJoinDialog: false,
    inviteCode: '',
    loading: false,

    // 背景设置相关
    showBackgroundDialog: false,
    presetBackgrounds: backgroundManager.presetBackgrounds,
    pageOptions: [
      { id: 'moments', name: '动态' },
      { id: 'home', name: '空间' },
      { id: 'anniversary', name: '纪念日' },
      { id: 'album', name: '相册' },
      { id: 'profile', name: '我的' }
    ],
    selectedPage: 'home',
    currentBgId: '',
    customImageUrl: '',
    pageBackground: null
  },

  onLoad: function() {
    // 初始化背景
    this.applyBackground();
  },

  onShow: function () {
    this.loadUserInfo();
    // 每次显示时刷新背景（以防其他页面修改了背景设置）
    this.applyBackground();
    // 更新自定义tabbar
    if (this.getTabBar) {
      this.getTabBar().updateActiveTab();
    }
  },

  // 应用背景
  applyBackground: function() {
    backgroundManager.applyBackgroundToPage('profile', this);
  },

  loadUserInfo: function (forceRefresh = false) {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    if (!userInfo || !userInfo._openid) {
      this.setData({ userInfo: null });
      return;
    }
    
    // 先使用缓存数据快速显示
    this.setData({ userInfo: userInfo });
    
    if (userInfo.coupleId) {
      this.getCoupleInfo(userInfo.coupleId);
    } else {
      this.setData({
        isBound: false,
        coupleInfo: null,
        partnerInfo: null
      });
    }
    
    // 只有在需要强制刷新时才从数据库获取最新数据
    if (forceRefresh) {
      this.refreshUserInfoFromDB(userInfo._openid);
    }
  },

  // 从数据库刷新用户信息
  refreshUserInfoFromDB: function (openId) {
    const app = getApp();
    const db = wx.cloud.database({
      env: app.globalData.env
    });
    db.collection('users').where({
      _openid: openId  // 微信云数据库自动生成的字段是小写 _openid
    }).get().then(res => {
      if (res.data && res.data.length > 0) {
        const latestUserInfo = res.data[0];
        // 更新全局数据
        app.globalData.userInfo = latestUserInfo;
        this.setData({ userInfo: latestUserInfo });
      }
    }).catch(err => {
      console.error('刷新用户信息失败', err);
    });
  },

  getCoupleInfo: function (coupleId) {
    wx.showLoading({ title: '加载中...' });
    
    wx.cloud.callFunction({
      name: 'getCoupleInfo',
      data: { coupleId: coupleId }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        this.setData({
          isBound: true,
          coupleInfo: res.result.coupleInfo,
          partnerInfo: res.result.partnerInfo
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('获取情侣信息失败', err);
    });
  },

  showCreateConfirm: function () {
    wx.showModal({
      title: '创建情侣空间',
      content: '确定要创建情侣空间吗？创建后将生成邀请码分享给另一半',
      success: (res) => {
        if (res.confirm) {
          this.createCouple();
        }
      }
    });
  },

  createCouple: function () {
    const app = getApp();
    if (!app.globalData.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '创建中...' });
    
    wx.cloud.callFunction({
      name: 'createCouple'
    }).then(res => {
      wx.hideLoading();
      this.setData({ loading: false });
      
      if (res.result && res.result.success) {
        app.globalData.userInfo.coupleId = res.result.coupleId;
        
        wx.showModal({
          title: '创建成功',
          content: '您的邀请码是：' + res.result.inviteCode + '\n请分享给您的另一半',
          showCancel: false,
          confirmText: '我知道了'
        });
        
        this.loadUserInfo();
      } else {
        wx.showToast({
          title: res.result?.errMsg || '创建失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('云函数调用失败', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  showJoinDialog: function () {
    this.setData({
      showJoinDialog: true,
      inviteCode: ''
    });
  },

  hideJoinDialog: function () {
    this.setData({
      showJoinDialog: false,
      inviteCode: ''
    });
  },

  onInviteCodeInput: function (e) {
    this.setData({
      inviteCode: e.detail.value
    });
  },

  confirmJoin: function () {
    const code = this.data.inviteCode.trim().toUpperCase();
    
    if (!code) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '加入中...' });
    
    wx.cloud.callFunction({
      name: 'joinCouple',
      data: { inviteCode: code }
    }).then(res => {
      wx.hideLoading();
      this.setData({ loading: false, showJoinDialog: false });
      
      if (res.result && res.result.success) {
        const app = getApp();
        app.globalData.userInfo.coupleId = res.result.coupleId;
        
        wx.showToast({
          title: '加入成功',
          icon: 'success'
        });
        
        this.loadUserInfo();
      } else {
        wx.showToast({
          title: res.result.errMsg || '加入失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  showUnbindConfirm: function () {
    wx.showModal({
      title: '解绑情侣',
      content: '确定要解绑情侣关系吗？解绑后双方将清除情侣关系',
      confirmText: '确定解绑',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.unbindCouple();
        }
      }
    });
  },

  unbindCouple: function () {
    this.setData({ loading: true });
    wx.showLoading({ title: '解绑中...' });
    
    wx.cloud.callFunction({
      name: 'unbindCouple'
    }).then(res => {
      wx.hideLoading();
      this.setData({ loading: false });
      
      if (res.result && res.result.success) {
        const app = getApp();
        app.globalData.userInfo.coupleId = '';
        
        wx.showToast({
          title: '已解绑',
          icon: 'success'
        });
        
        this.loadUserInfo();
      } else {
        wx.showToast({
          title: res.result.errMsg || '解绑失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  goToSettings: function () {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    });
  },

  // ==================== 兼容旧方法名 ====================

  // 背景设置（旧方法名兼容）
  showBackgroundSettings: function () {
    this.showBackgroundDialog();
  },

  showBgModal: function () {
    this.showBackgroundDialog();
  },

  hideBgModal: function () {
    this.closeBackgroundDialog();
  },

  selectBg: function (e) {
    const item = e.currentTarget.dataset.bg;
    if (item) {
      const pageId = this.data.selectedPage;
      backgroundManager.savePageBackground(pageId, {
        type: 'preset',
        presetId: item.id
      });
      this.setData({
        currentBgId: item.id,
        customImageUrl: ''
      });
      wx.showToast({ title: '背景已保存', icon: 'success' });
      this.updateTargetPageBackground(pageId);
    }
  },

  uploadCustomBg: function () {
    this.uploadCustomImage();
  },

  // 编辑资料
  editProfile: function () {
    this.setData({
      showEditModal: true,
      editData: {
        avatarUrl: this.data.userInfo?.avatarUrl || '',
        nickName: this.data.userInfo?.nickName || ''
      }
    });
  },

  hideEditModal: function () {
    this.setData({ showEditModal: false });
  },

  onNickNameInput: function (e) {
    this.setData({
      'editData.nickName': e.detail.value
    });
  },

  chooseAvatar: function () {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          'editData.avatarUrl': res.tempFilePaths[0]
        });
      }
    });
  },

  saveProfile: function () {
    const app = getApp();
    const editData = this.data.editData;

    if (!editData.nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '保存中...' });

    // 如果头像有变化，需要上传
    if (editData.avatarUrl && !editData.avatarUrl.startsWith('cloud://') && !editData.avatarUrl.startsWith('http')) {
      // 上传新头像
      wx.cloud.uploadFile({
        cloudPath: `avatars/${app.globalData.userInfo._openid}_${Date.now()}.jpg`,
        filePath: editData.avatarUrl,
        success: (uploadRes) => {
          this.updateUserProfile(app.globalData.userInfo._openid, editData.nickName, uploadRes.fileID);
        },
        fail: () => {
          wx.hideLoading();
          this.setData({ loading: false });
          wx.showToast({ title: '头像上传失败', icon: 'none' });
        }
      });
    } else {
      // 使用现有头像或无头像
      this.updateUserProfile(app.globalData.userInfo._openid, editData.nickName, editData.avatarUrl);
    }
  },

  updateUserProfile: function (openId, nickName, avatarUrl) {
    const app = getApp();
    const db = wx.cloud.database({
      env: app.globalData.env
    });
    db.collection('users').where({
      _openid: openId  // 微信云数据库自动生成的字段是小写 _openid
    }).update({
      data: {
        nickName: nickName,
        avatarUrl: avatarUrl || ''
      }
    }).then(() => {
      wx.hideLoading();
      this.setData({ loading: false, showEditModal: false });

      // 更新全局数据
      const app = getApp();
      if (app.globalData.userInfo) {
        app.globalData.userInfo.nickName = nickName;
        app.globalData.userInfo.avatarUrl = avatarUrl || '';
      }

      wx.showToast({ title: '保存成功', icon: 'success' });
      // 从数据库刷新最新数据
      this.refreshUserInfoFromDB(app.globalData.userInfo._openid);
    }).catch(() => {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  // 绑定相关
  showBindOptions: function () {
    this.setData({ showBindModal: true });
  },

  hideBindModal: function () {
    this.setData({ showBindModal: false });
  },

  joinCouple: function () {
    this.setData({ showBindModal: false });
    // 触发加入情侣流程
    wx.showModal({
      title: '加入心动日记',
      content: '请输入对方分享的邀请码',
      editable: true,
      placeholderText: '输入邀请码',
      success: (res) => {
        if (res.confirm && res.content) {
          this.confirmJoinWithCode(res.content.trim().toUpperCase());
        }
      }
    });
  },

  confirmJoinWithCode: function (code) {
    if (!code) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加入中...' });

    wx.cloud.callFunction({
      name: 'joinCouple',
      data: { inviteCode: code }
    }).then(res => {
      wx.hideLoading();
      this.setData({ loading: false });

      if (res.result && res.result.success) {
        const app = getApp();
        app.globalData.userInfo.coupleId = res.result.coupleId;
        wx.showToast({ title: '加入成功', icon: 'success' });
        this.loadUserInfo();
      } else {
        wx.showToast({ title: res.result?.errMsg || '邀请码无效', icon: 'none' });
      }
    }).catch(() => {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  // 关于
  showAbout: function () {
    wx.showModal({
      title: '关于心动日记',
      content: '心动日记 v1.0.0\n\n一款专为情侣打造的甜蜜记录小程序\n\n记录你们的每一个心动瞬间 💕',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 退出登录
  logout: function () {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.userInfo = null;
          wx.clearStorageSync();
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  },

  // 创建情侣弹窗相关
  showCreateModalFn: function () {
    this.setData({ showCreateModal: true });
  },

  hideCreateModal: function () {
    this.setData({ showCreateModal: false });
  },

  copyInviteCode: function () {
    const code = this.data.inviteCode;
    if (code) {
      wx.setClipboardData({
        data: code,
        success: () => {
          wx.showToast({ title: '已复制', icon: 'success' });
        }
      });
    }
  },

  // 加入情侣弹窗相关
  showJoinModalFn: function () {
    this.setData({ showJoinModal: true, inputCode: '' });
  },

  hideJoinModal: function () {
    this.setData({ showJoinModal: false });
  },

  onCodeInput: function (e) {
    this.setData({ inputCode: e.detail.value });
  },

  submitJoin: function () {
    const code = this.data.inputCode?.trim().toUpperCase();
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    this.confirmJoinWithCode(code);
  },

  // ==================== 背景设置相关方法 ====================

  // 显示背景设置弹窗
  showBackgroundDialog: function () {
    const pageId = this.data.selectedPage;
    const bg = backgroundManager.getPageBackground(pageId);
    
    this.setData({
      showBackgroundDialog: true,
      currentBgId: bg.type === 'preset' ? bg.id : '',
      customImageUrl: bg.type === 'custom' ? bg.imageUrl : ''
    });
  },

  // 关闭背景设置弹窗
  closeBackgroundDialog: function () {
    this.setData({
      showBackgroundDialog: false
    });
  },

  // 选择页面
  selectPage: function (e) {
    const pageId = e.currentTarget.dataset.page;
    const bg = backgroundManager.getPageBackground(pageId);
    
    this.setData({
      selectedPage: pageId,
      currentBgId: bg.type === 'preset' ? bg.id : '',
      customImageUrl: bg.type === 'custom' ? bg.imageUrl : ''
    });
  },

  // 选择预设颜色
  selectColor: function (e) {
    const colorId = e.currentTarget.dataset.id;
    const pageId = this.data.selectedPage;

    // 保存选择
    backgroundManager.savePageBackground(pageId, {
      type: 'preset',
      presetId: colorId
    });

    this.setData({
      currentBgId: colorId,
      customImageUrl: ''
    });

    wx.showToast({
      title: '背景已保存',
      icon: 'success'
    });

    // 尝试更新目标页面背景
    this.updateTargetPageBackground(pageId);
  },

  // 更新目标页面的背景
  updateTargetPageBackground: function (pageId) {
    const pages = getCurrentPages();

    // 查找目标页面
    const targetPage = pages.find(page => {
      // 获取页面路径
      const route = page.route || page.__route__;
      const pagePath = '/' + route;
      const targetPathMap = {
        'moments': '/pages/moments/moments',
        'home': '/pages/home/home',
        'anniversary': '/pages/anniversary/anniversary',
        'album': '/pages/album/album',
        'profile': '/pages/profile/profile'
      };
      return pagePath === targetPathMap[pageId];
    });

    if (targetPage && targetPage.applyBackground) {
      targetPage.applyBackground();
      wx.showToast({
        title: '背景已更新',
        icon: 'success'
      });
    } else {
      // 目标页面不在栈中，提示用户切换到该页面
      wx.showToast({
        title: '请切换到目标页面查看效果',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 上传自定义图片
  uploadCustomImage: function () {
    wx.showLoading({ title: '上传中...' });

    backgroundManager.uploadCustomBackgroundImage()
      .then(imageUrl => {
        wx.hideLoading();
        const pageId = this.data.selectedPage;

        // 保存选择
        backgroundManager.savePageBackground(pageId, {
          type: 'custom',
          imageUrl: imageUrl
        });

        this.setData({
          customImageUrl: imageUrl,
          currentBgId: ''
        });

        wx.showToast({
          title: '背景已保存',
          icon: 'success'
        });

        // 尝试更新目标页面背景
        this.updateTargetPageBackground(pageId);
      })
      .catch(err => {
        wx.hideLoading();
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        }
      });
  },

  // 移除自定义图片
  removeCustomImage: function () {
    const pageId = this.data.selectedPage;

    // 重置为默认
    backgroundManager.resetPageBackground(pageId);

    this.setData({
      customImageUrl: '',
      currentBgId: 'pink' // 默认粉色
    });

    wx.showToast({
      title: '已移除自定义背景',
      icon: 'success'
    });

    // 尝试更新目标页面背景
    this.updateTargetPageBackground(pageId);
  },

  // 重置背景为默认
  resetBackground: function () {
    const pageId = this.data.selectedPage;

    backgroundManager.resetPageBackground(pageId);

    this.setData({
      currentBgId: 'pink',
      customImageUrl: ''
    });

    wx.showToast({
      title: '已重置为默认',
      icon: 'success'
    });

    // 尝试更新目标页面背景
    this.updateTargetPageBackground(pageId);
  },

  // 更新当前页面的背景显示
  updateCurrentPageBackground: function () {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];

    if (currentPage && currentPage.applyBackground) {
      currentPage.applyBackground();
    }
  },

  // 设置指定页面的背景并刷新（需要用户切换到该页面才能看到效果）
  applyToPage: function (pageId) {
    const pageNameMap = {
      'moments': '/pages/moments/moments',
      'home': '/pages/home/home',
      'anniversary': '/pages/anniversary/anniversary',
      'album': '/pages/album/album',
      'profile': '/pages/profile/profile'
    };

    const pagePath = pageNameMap[pageId];
    if (pagePath) {
      // 如果是 tabBar 页面，使用 switchTab
      if (['/pages/moments/moments', '/pages/home/home', '/pages/anniversary/anniversary', '/pages/album/album', '/pages/profile/profile'].includes(pagePath)) {
        wx.switchTab({
          url: pagePath,
          success: () => {
            wx.showToast({
              title: '已切换到该页面查看效果',
              icon: 'none',
              duration: 1500
            });
          }
        });
      } else {
        wx.navigateTo({
          url: pagePath
        });
      }
    }
  }
});
