Page({
  data: {
    isAuthorized: false
  },

  onLoad: function (options) {
    this.checkLoginStatus();
  },

  checkLoginStatus: function () {
    const app = getApp();
    // 优先从 Storage 读取已保存的登录信息
    const savedUserInfo = wx.getStorageSync('userInfo');
    const savedIsLoggedIn = wx.getStorageSync('isLoggedIn');

    if (savedIsLoggedIn && savedUserInfo) {
      // 恢复 globalData
      app.globalData.userInfo = savedUserInfo;
      app.globalData.isLoggedIn = true;
      // 只要已登录就跳转到首页，不管是否已绑定情侣
      wx.switchTab({
        url: '/pages/home/home'
      });
    }
  },

  handleGetUserProfile: function () {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.login(res.userInfo);
      },
      fail: (err) => {
        wx.showModal({
          title: '授权提示',
          content: '需要您授权头像昵称才能继续使用',
          showCancel: false
        });
      }
    });
  },

  login: function (userInfo) {
    wx.showLoading({
      title: '登录中...'
    });

    wx.cloud.callFunction({
      name: 'login',
      data: {
        userInfo: userInfo
      }
    }).then(res => {
      wx.hideLoading();

      if (res.result && res.result.success) {
        const app = getApp();

        // 先用登录结果更新 globalData 和 Storage
        app.globalData.userInfo = res.result.userInfo;
        app.globalData.isLoggedIn = true;
        wx.setStorageSync('userInfo', res.result.userInfo);
        wx.setStorageSync('isLoggedIn', true);

        // 然后从数据库获取最新完整用户信息
        this.refreshUserInfoFromDB(app, res.result.userInfo);

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/home'
          });
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.errMsg || '登录失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  // 从数据库刷新用户信息
  refreshUserInfoFromDB: function (app, loginResultUserInfo) {
    const appInstance = getApp();
    const db = wx.cloud.database({
      env: appInstance.globalData.env
    });
    db.collection('users').where({
      _openid: loginResultUserInfo._openid
    }).get().then(res => {
      if (res.data && res.data.length > 0) {
        const latestUserInfo = res.data[0];

        // 更新 globalData
        app.globalData.userInfo = latestUserInfo;
        app.globalData.isLoggedIn = true;

        // 持久化保存登录信息
        wx.setStorageSync('userInfo', latestUserInfo);
        wx.setStorageSync('isLoggedIn', true);

        console.log('已从数据库刷新用户信息', latestUserInfo);
      }
    }).catch(err => {
      console.error('刷新用户信息失败', err);
    });
  }
});