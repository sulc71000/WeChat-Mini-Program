Page({
  data: {
    content: '',
    images: [],
    loading: false
  },

  onLoad: function (options) {},

  onContentInput: function (e) {
    this.setData({
      content: e.detail.value
    });
  },

  chooseImage: function () {
    const that = this;
    const remaining = 9 - this.data.images.length;
    
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(item => item.tempFilePath);
        that.setData({
          images: that.data.images.concat(newImages)
        });
      }
    });
  },

  deleteImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images: images });
  },

  uploadImages: function (images) {
    return new Promise((resolve, reject) => {
      if (images.length === 0) {
        resolve([]);
        return;
      }

      const uploadedUrls = [];
      let completed = 0;

      for (let i = 0; i < images.length; i++) {
        const cloudPath = 'moments/' + Date.now() + '_' + i + '.png';
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: images[i],
          success: (res) => {
            uploadedUrls.push(res.fileID);
            completed++;
            if (completed === images.length) {
              resolve(uploadedUrls);
            }
          },
          fail: (err) => {
            reject(err);
          }
        });
      }
    });
  },

  publish: function () {
    const { content, images } = this.data;

    if (!content && images.length === 0) {
      wx.showToast({
        title: '请输入内容或添加图片',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    if (images.length > 0) {
      this.uploadImages(images).then((urls) => {
        this.doPublish(content, urls);
      }).catch(err => {
        this.setData({ loading: false });
        wx.showToast({
          title: '图片上传失败',
          icon: 'none'
        });
      });
    } else {
      this.doPublish(content, []);
    }
  },

  doPublish: function (content, images) {
    const app = getApp();
    const coupleId = app.globalData.userInfo ? app.globalData.userInfo.coupleId : '';

    if (!coupleId) {
      this.setData({ loading: false });
      wx.showToast({
        title: '请先绑定情侣',
        icon: 'none'
      });
      return;
    }

    console.log('发布动态, coupleId:', coupleId, 'content:', content, 'images:', images.length);
    
    wx.cloud.callFunction({
      name: 'addMoment',
      data: {
        coupleId: coupleId,
        content: content,
        images: images
      }
    }).then(res => {
      console.log('addMoment返回:', res);
      this.setData({ loading: false });
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.errMsg || '发布失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('addMoment错误:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  }
});