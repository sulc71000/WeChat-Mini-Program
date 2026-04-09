const backgroundManager = require('../../utils/backgroundManager');

Page({
  data: {
    coupleInfo: null,
    moments: [],
    currentUserOpenId: '',
    loadingMore: false,
    hasMore: true,
    pageSize: 10,
    skip: 0,
    
    // 背景相关
    pageBackground: null
  },

  onLoad: function() {
    // 初始化背景
    this.applyBackground();
  },

  onShow: function () {
    this.loadCoupleInfo();
    this.loadMoments();
    // 刷新背景
    this.applyBackground();
    // 更新自定义tabbar
    if (this.getTabBar) {
      this.getTabBar().updateActiveTab();
    }
  },

  // 应用背景
  applyBackground: function() {
    backgroundManager.applyBackgroundToPage('moments', this);
  },

  loadCoupleInfo: function () {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    this.setData({ currentUserOpenId: userInfo._openid });
    
    if (!userInfo || !userInfo.coupleId) {
      this.setData({ coupleInfo: null });
      return;
    }

    wx.cloud.callFunction({
      name: 'getCoupleInfo',
      data: { coupleId: userInfo.coupleId }
    }).then(res => {
      if (res.result && res.result.success && res.result.coupleInfo) {
        this.setData({ coupleInfo: res.result.coupleInfo });
      }
    }).catch(err => {
      console.error('获取情侣信息失败', err);
    });
  },

  loadMoments: function () {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    if (!userInfo || !userInfo.coupleId) {
      return;
    }

    this.setData({ skip: 0 });

    wx.cloud.callFunction({
      name: 'getMoments',
      data: { 
        coupleId: userInfo.coupleId,
        pageSize: this.data.pageSize,
        skip: 0
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const moments = res.result.list || [];
        moments.forEach(m => {
          m.createTime = this.formatTime(m.createTime);
        });
        this.setData({
          moments: moments,
          hasMore: moments.length >= this.data.pageSize
        });
      }
    }).catch(err => {
      console.error('获取动态列表失败', err);
    });
  },

  loadMore: function () {
    if (this.data.loadingMore || !this.data.hasMore) return;

    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    if (!userInfo || !userInfo.coupleId) {
      return;
    }

    this.setData({ loadingMore: true });

    const newSkip = this.data.skip + this.data.pageSize;

    wx.cloud.callFunction({
      name: 'getMoments',
      data: { 
        coupleId: userInfo.coupleId,
        pageSize: this.data.pageSize,
        skip: newSkip
      }
    }).then(res => {
      this.setData({ loadingMore: false });
      
      if (res.result && res.result.success) {
        const moments = res.result.list || [];
        moments.forEach(m => {
          m.createTime = this.formatTime(m.createTime);
        });
        
        this.setData({
          moments: this.data.moments.concat(moments),
          skip: newSkip,
          hasMore: moments.length >= this.data.pageSize
        });
      }
    }).catch(err => {
      this.setData({ loadingMore: false });
      console.error('加载更多动态失败', err);
    });
  },

  goToPublish: function () {
    wx.navigateTo({
      url: '/pages/publishMoment/publishMoment'
    });
  },

  submitComment: function (e) {
    const momentId = e.currentTarget.dataset.momentId;
    const content = e.detail.value;

    if (!content) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }

    wx.cloud.callFunction({
      name: 'addComment',
      data: {
        momentId: momentId,
        content: content
      }
    }).then(res => {
      if (res.result && res.result.success) {
        wx.showToast({
          title: '评论成功',
          icon: 'success'
        });
        
        this.loadMoments();
      } else {
        wx.showToast({
          title: '评论失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  deleteMoment: function (e) {
    const momentId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '删除动态',
      content: '确定要删除这条动态吗？',
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteMoment(momentId);
        }
      }
    });
  },

  doDeleteMoment: function (momentId) {
    wx.cloud.callFunction({
      name: 'deleteMoment',
      data: { momentId: momentId }
    }).then(res => {
      if (res.result && res.result.success) {
        wx.showToast({
          title: '已删除',
          icon: 'success'
        });
        
        this.loadMoments();
      } else {
        wx.showToast({
          title: res.result.errMsg || '删除失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  previewImage: function (e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: [url]
    });
  },

  formatTime: function (createTime) {
    if (!createTime) return '';
    
    let date;
    if (createTime.$date) {
      date = new Date(createTime.$date);
    } else {
      date = new Date(createTime);
    }
    
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return minutes + '分钟前';
    if (hours < 24) return hours + '小时前';
    if (days < 7) return days + '天前';
    
    return (date.getMonth() + 1) + '-' + date.getDate();
  }
});
