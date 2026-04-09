const backgroundManager = require('../../utils/backgroundManager');

Page({
  data: {
    coupleId: '',
    currentUserOpenId: '',
    
    // 新的数据结构
    albums: [],           // 相册列表 [{name, count}]
    currentAlbumIndex: 0, // 当前选中的相册索引
    currentPhotos: [],    // 当前显示的照片
    allPhotos: [],        // 全部照片（用于切换相册时过滤）
    
    // 弹窗相关
    showCreateAlbum: false,
    newAlbumName: '',
    
    // 图片预览
    previewIndex: -1,
    
    // 状态
    loading: false,
    
    // 背景相关
    pageBackground: null
  },

  onLoad: function (options) {
    this.applyBackground();
    
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    if (userInfo && userInfo.coupleId) {
      this.setData({
        coupleId: userInfo.coupleId,
        currentUserOpenId: userInfo._openid
      });
      this.loadAllData();
    }
  },

  onShow: function () {
    const app = getApp();
    const userInfo = app.globalData.userInfo;

    this.applyBackground();

    if (userInfo && userInfo.coupleId) {
      if (!this.data.coupleId) {
        this.setData({
          coupleId: userInfo.coupleId,
          currentUserOpenId: userInfo._openid
        });
        this.loadAllData();
      } else {
        this.loadAllData();
      }
    }
    
    if (this.getTabBar) {
      this.getTabBar().updateActiveTab();
    }
  },

  applyBackground: function() {
    backgroundManager.applyBackgroundToPage('album', this);
  },

  // 加载所有数据
  loadAllData: function () {
    this.loadAlbums();
    this.loadPhotos();
  },

  // 加载相册列表
  loadAlbums: function () {
    wx.cloud.callFunction({
      name: 'manageAlbums',
      data: {
        action: 'getAll',
        coupleId: this.data.coupleId
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const list = res.result.list || ['默认相册'];
        // 转换为 [{name, count}] 格式
        const albums = list.map(name => ({ name, count: 0 }));
        this.setData({ albums });
      }
    }).catch(err => {
      console.error('获取相册列表失败', err);
    });
  },

  // 加载照片列表
  loadPhotos: function () {
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getMediaList',
      data: {
        coupleId: this.data.coupleId,
        albumName: '',
        pageSize: 100,
        skip: 0
      }
    }).then(res => {
      this.setData({ loading: false });
      
      if (res.result && res.result.success) {
        const allPhotos = res.result.list || [];
        
        // 更新相册数量
        const albumCountMap = {};
        allPhotos.forEach(photo => {
          const albumName = photo.albumName || '默认相册';
          albumCountMap[albumName] = (albumCountMap[albumName] || 0) + 1;
        });
        
        const albums = this.data.albums.map(album => ({
          ...album,
          count: albumCountMap[album.name] || 0
        }));
        
        this.setData({
          allPhotos: allPhotos,
          albums: albums
        });
        
        // 根据当前选中的相册过滤照片
        this.filterPhotosByAlbum();
      }
    }).catch(err => {
      this.setData({ loading: false });
      console.error('获取照片列表失败', err);
    });
  },

  // 根据相册过滤照片
  filterPhotosByAlbum: function () {
    const albums = this.data.albums;
    const currentIndex = this.data.currentAlbumIndex;
    
    if (albums.length === 0) {
      this.setData({ currentPhotos: [] });
      return;
    }
    
    const selectedAlbum = albums[currentIndex]?.name || '默认相册';
    
    let photos = this.data.allPhotos;
    
    // 如果不是"全部"，则过滤
    if (selectedAlbum !== '全部') {
      photos = photos.filter(p => (p.albumName || '默认相册') === selectedAlbum);
    }
    
    this.setData({ currentPhotos: photos });
  },

  // 选择相册
  selectAlbum: function (e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentAlbumIndex: index });
    this.filterPhotosByAlbum();
  },

  // 打开上传
  chooseImage: function () {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const images = res.tempFiles.map(item => item.tempFilePath);
        this.uploadImages(images);
      }
    });
  },

  // 上传图片
  uploadImages: function (images) {
    if (images.length === 0) return;

    wx.showLoading({ title: '上传中...' });

    const coupleId = this.data.coupleId;
    const currentAlbum = this.data.albums[this.data.currentAlbumIndex]?.name || '默认相册';
    
    const promises = images.map((img, i) => {
      const cloudPath = 'memories/' + coupleId + '/' + Date.now() + '_' + i + '.png';
      
      return wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: img
      }).then(res => {
        return wx.cloud.callFunction({
          name: 'uploadMedia',
          data: {
            coupleId: coupleId,
            mediaUrl: res.fileID,
            type: 'image',
            albumName: currentAlbum,
            visibility: 'public'
          }
        });
      });
    });

    Promise.all(promises).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
      this.loadAllData();
    }).catch(err => {
      wx.hideLoading();
      console.error('上传失败', err);
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    });
  },

  // 预览照片
  previewPhoto: function (e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ previewIndex: index });
  },

  // 关闭预览
  closePreview: function () {
    this.setData({ previewIndex: -1 });
  },

  // 预览切换
  onPreviewChange: function (e) {
    this.setData({ previewIndex: e.detail.current });
  },

  // 下载照片
  downloadPhoto: function () {
    const photos = this.data.currentPhotos;
    const index = this.data.previewIndex;
    
    if (photos[index]) {
      wx.showLoading({ title: '保存中...' });
      
      wx.cloud.downloadFile({
        fileID: photos[index].mediaUrl
      }).then(res => {
        return wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath
        });
      }).then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }).catch(err => {
        wx.hideLoading();
        console.error('保存失败', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      });
    }
  },

  // 删除照片
  deletePhoto: function (e) {
    const index = e.currentTarget.dataset.index;
    const photo = this.data.currentPhotos[index];
    
    if (!photo) return;

    wx.showModal({
      title: '删除照片',
      content: '确定要删除这张照片吗？',
      confirmText: '删除',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'deleteMedia',
            data: {
              memoryId: photo._id,
              mediaUrl: photo.mediaUrl
            }
          }).then(res => {
            if (res.result && res.result.success) {
              wx.showToast({
                title: '已删除',
                icon: 'success'
              });
              this.setData({ previewIndex: -1 });
              this.loadAllData();
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
        }
      }
    });
  },

  // 创建相册
  showCreateAlbum: function () {
    this.setData({ showCreateAlbum: true, newAlbumName: '' });
  },

  hideCreateAlbum: function () {
    this.setData({ showCreateAlbum: false, newAlbumName: '' });
  },

  onAlbumNameInput: function (e) {
    this.setData({ newAlbumName: e.detail.value });
  },

  createAlbum: function () {
    const name = this.data.newAlbumName.trim();
    if (!name) {
      wx.showToast({ title: '请输入相册名称', icon: 'none' });
      return;
    }

    wx.cloud.callFunction({
      name: 'manageAlbums',
      data: {
        action: 'create',
        coupleId: this.data.coupleId,
        newName: name
      }
    }).then(res => {
      if (res.result && res.result.success) {
        wx.showToast({ title: '创建成功', icon: 'success' });
        this.hideCreateAlbum();
        this.loadAlbums();
      } else {
        wx.showToast({
          title: res.result.errMsg || '创建失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  }
});
