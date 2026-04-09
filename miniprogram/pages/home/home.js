const backgroundManager = require('../../utils/backgroundManager');

Page({
  data: {
    coupleInfo: null,
    loveDays: 0,
    nextAnniversary: null,
    showAnniversaryDialog: false,
    anniversaryList: [],
    newAnniversary: {
      name: '',
      date: '',
      repeatType: 'none'
    },
    loading: false,
    repeatTypeOptions: [
      { name: '不重复', value: 'none' },
      { name: '每年重复', value: 'yearly' }
    ],
    repeatTypeLabels: {
      'none': '不重复',
      'yearly': '每年重复'
    },
    moments: [],
    currentUserOpenId: '',
    recentPhotos: [],
    
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
    this.loadRecentPhotos();
    // 刷新背景
    this.applyBackground();
    // 更新自定义tabbar
    if (this.getTabBar) {
      this.getTabBar().updateActiveTab();
    }
  },

  onUnload: function () {},

  // 应用背景
  applyBackground: function() {
    backgroundManager.applyBackgroundToPage('home', this);
  },

  loadCoupleInfo: function () {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    this.setData({ currentUserOpenId: userInfo._openid });
    
    if (!userInfo || !userInfo.coupleId) {
      this.setData({
        coupleInfo: null,
        loveDays: 0
      });
      return;
    }

    wx.cloud.callFunction({
      name: 'getCoupleInfo',
      data: { coupleId: userInfo.coupleId }
    }).then(res => {
      if (res.result && res.result.success && res.result.coupleInfo) {
        const coupleInfo = res.result.coupleInfo;
        const loveDays = this.calculateLoveDays(coupleInfo.loveDate);
        
        this.setData({
          coupleInfo: coupleInfo,
          loveDays: loveDays
        });
        
        this.loadAnniversaryList(userInfo.coupleId);
      }
    }).catch(err => {
      console.error('获取情侣信息失败', err);
    });
  },

  calculateLoveDays: function (loveDate) {
    if (!loveDate) return 0;
    
    let date;
    if (loveDate instanceof Date) {
      date = loveDate;
    } else if (typeof loveDate === 'string') {
      date = new Date(loveDate);
    } else if (loveDate.$date) {
      date = new Date(loveDate.$date);
    } else {
      return 0;
    }
    
    const now = new Date();
    const diffTime = now - date;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  },

  calculateNextAnniversary: function (anniversaryList) {
    if (!anniversaryList || anniversaryList.length === 0) {
      return null;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    let nearest = null;
    let nearestDays = Infinity;

    for (const item of anniversaryList) {
      let anniversaryDate;
      
      if (item.repeatType === 'yearly') {
        anniversaryDate = new Date(currentYear, new Date(item.date).getMonth(), new Date(item.date).getDate());
        
        if (anniversaryDate < now) {
          anniversaryDate = new Date(currentYear + 1, new Date(item.date).getMonth(), new Date(item.date).getDate());
        }
      } else {
        anniversaryDate = new Date(item.date);
        
        if (anniversaryDate < now) {
          continue;
        }
      }

      const days = Math.ceil((anniversaryDate - now) / (1000 * 60 * 60 * 24));
      
      if (days < nearestDays) {
        nearestDays = days;
        nearest = {
          name: item.name,
          days: days,
          isToday: days === 0,
          date: item.date
        };
      }
    }

    return nearest;
  },

  loadAnniversaryList: function (coupleId) {
    wx.cloud.callFunction({
      name: 'getAnniversaryList',
      data: { coupleId: coupleId }
    }).then(res => {
      if (res.result && res.result.success) {
        const list = res.result.list || [];
        const nextAnniversary = this.calculateNextAnniversary(list);
        
        this.setData({
          anniversaryList: list,
          nextAnniversary: nextAnniversary
        });
      }
    }).catch(err => {
      console.error('获取纪念日列表失败', err);
    });
  },

  openAnniversaryDialog: function () {
    this.setData({ showAnniversaryDialog: true });
  },

  closeAnniversaryDialog: function () {
    this.setData({
      showAnniversaryDialog: false,
      newAnniversary: { name: '', date: '', repeatType: 'none' }
    });
  },

  onNameInput: function (e) {
    this.setData({
      'newAnniversary.name': e.detail.value
    });
  },

  onDateChange: function (e) {
    this.setData({
      'newAnniversary.date': e.detail.value
    });
  },

  onRepeatTypeChange: function (e) {
    const index = e.detail.value;
    const options = this.data.repeatTypeOptions;
    this.setData({
      'newAnniversary.repeatType': options[index].value
    });
  },

  addAnniversary: function () {
    const { name, date, repeatType } = this.data.newAnniversary;
    
    if (!name || !date) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    const app = getApp();
    const coupleId = app.globalData.userInfo.coupleId;

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'addAnniversary',
      data: {
        coupleId: coupleId,
        name: name,
        date: date,
        repeatType: repeatType
      }
    }).then(res => {
      this.setData({ loading: false });
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
        
        this.setData({
          newAnniversary: { name: '', date: '', repeatType: 'none' }
        });
        
        this.loadAnniversaryList(coupleId);
      } else {
        wx.showToast({
          title: res.result.errMsg || '添加失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ loading: false });
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  deleteAnniversary: function (e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;

    wx.showModal({
      title: '删除纪念日',
      content: '确定要删除「' + name + '」吗？',
      confirmText: '删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteAnniversary(id);
        }
      }
    });
  },

  onLongPressTip: function () {
    wx.showToast({
      title: '长按可删除',
      icon: 'none',
      duration: 1500
    });
  },

  doDeleteAnniversary: function (id) {
    const app = getApp();
    const coupleId = app.globalData.userInfo.coupleId;

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'deleteAnniversary',
      data: { anniversaryId: id }
    }).then(res => {
      this.setData({ loading: false });
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '已删除',
          icon: 'success'
        });
        
        this.loadAnniversaryList(coupleId);
      } else {
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ loading: false });
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  loadMoments: function () {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    if (!userInfo || !userInfo.coupleId) {
      return;
    }

    wx.cloud.callFunction({
      name: 'getMoments',
      data: { coupleId: userInfo.coupleId }
    }).then(res => {
      if (res.result && res.result.success) {
        const moments = res.result.list || [];
        moments.forEach(m => {
          m.createTime = this.formatTime(m.createTime);
        });
        this.setData({
          moments: moments
        });
      }
    }).catch(err => {
      console.error('获取动态列表失败', err);
    });
  },

  goToPublish: function () {
    wx.navigateTo({
      url: '/pages/publishMoment/publishMoment'
    });
  },

  loadRecentPhotos: function () {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    if (!userInfo || !userInfo.coupleId) {
      return;
    }

    wx.cloud.callFunction({
      name: 'getMediaList',
      data: {
        coupleId: userInfo.coupleId,
        albumName: '',
        pageSize: 3,
        skip: 0
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const photos = res.result.list || [];
        const urls = photos.map(p => p.mediaUrl).slice(0, 3);
        this.setData({
          recentPhotos: urls
        });
      }
    }).catch(err => {
      console.error('获取最近照片失败', err);
    });
  },

  goToAlbum: function () {
    wx.switchTab({
      url: '/pages/album/album'
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

  goToMoments: function () {
    wx.switchTab({ url: '/pages/moments/moments' });
  },

  goToAnniversary: function () {
    wx.switchTab({ url: '/pages/anniversary/anniversary' });
  },

  goToProfile: function () {
    wx.switchTab({ url: '/pages/profile/profile' });
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
