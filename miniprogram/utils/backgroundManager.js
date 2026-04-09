/**
 * 背景管理系统
 * 管理页面背景颜色和自定义图片
 */

// 预设背景颜色列表 - 微信简洁风格
const presetBackgrounds = [
  {
    id: 'pink',
    name: '浪漫粉',
    color: '#FFF5F5',
    gradient: 'linear-gradient(180deg, #FFF5F5 0%, #FFFFFF 100%)'
  },
  {
    id: 'blue',
    name: '天空蓝',
    color: '#F0F9FF',
    gradient: 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)'
  },
  {
    id: 'purple',
    name: '梦幻紫',
    color: '#FAF5FF',
    gradient: 'linear-gradient(180deg, #FAF5FF 0%, #FFFFFF 100%)'
  },
  {
    id: 'green',
    name: '清新绿',
    color: '#F0FDF4',
    gradient: 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)'
  },
  {
    id: 'orange',
    name: '活力橙',
    color: '#FFF7ED',
    gradient: 'linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)'
  },
  {
    id: 'white',
    name: '纯净白',
    color: '#FFFFFF',
    gradient: 'linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)'
  }
];

// 存储键名
const STORAGE_KEY = 'page_backgrounds';
const CUSTOM_IMAGE_KEY = 'custom_background_images';

/**
 * 获取页面背景配置 - 统一返回格式
 * @param {string} pageId - 页面标识
 * @returns {Object} 背景配置 { type: 'preset'|'custom', ...presetData }
 */
function getPageBackground(pageId) {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (stored && stored[pageId]) {
      const bg = stored[pageId];
      if (bg.type === 'custom' && bg.imageUrl) {
        // 自定义图片背景
        return {
          type: 'custom',
          imageUrl: bg.imageUrl
        };
      }
      if (bg.type === 'preset' && bg.presetId) {
        // 预设颜色背景
        const preset = presetBackgrounds.find(p => p.id === bg.presetId) || presetBackgrounds[0];
        return {
          type: 'preset',
          id: preset.id,
          name: preset.name,
          color: preset.color,
          gradient: preset.gradient,
          headerColor: preset.headerColor,
          headerGradient: preset.headerGradient
        };
      }
    }
  } catch (e) {
    console.error('获取页面背景失败', e);
  }
  // 返回默认背景
  return {
    type: 'preset',
    ...presetBackgrounds[0]
  };
}

/**
 * 保存页面背景配置
 * @param {string} pageId - 页面标识
 * @param {Object} bgConfig - 背景配置 { type: 'preset'|'custom', presetId?: string, imageUrl?: string }
 */
function savePageBackground(pageId, bgConfig) {
  try {
    let stored = wx.getStorageSync(STORAGE_KEY) || {};
    stored[pageId] = bgConfig;
    wx.setStorageSync(STORAGE_KEY, stored);
    return true;
  } catch (e) {
    console.error('保存页面背景失败', e);
    return false;
  }
}

/**
 * 上传自定义背景图片
 * @returns {Promise<string>} 云存储中的图片URL（HTTP格式）
 */
function uploadCustomBackgroundImage() {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res.tempFilePaths[0];
        // 上传到云存储
        const timestamp = Date.now();
        const cloudPath = `backgrounds/bg_${timestamp}.${filePath.split('.').pop()}`;

        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: filePath,
          success: (uploadRes) => {
            const fileID = uploadRes.fileID;
            // 将 cloud:// URL 转换为 HTTPS URL
            wx.cloud.getTempFileURL({
              fileList: [fileID],
              success: (urlRes) => {
                if (urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL) {
                  resolve(urlRes.fileList[0].tempFileURL);
                } else {
                  // 降级：直接使用 cloud:// URL（部分场景可能不支持）
                  resolve(fileID);
                }
              },
              fail: (err) => {
                console.error('获取临时文件URL失败', err);
                // 降级：使用原始 cloud:// URL
                resolve(fileID);
              }
            });
          },
          fail: (err) => {
            console.error('上传背景图片失败', err);
            reject(err);
          }
        });
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 获取所有页面的背景配置
 * @returns {Object} 所有页面的背景配置
 */
function getAllPageBackgrounds() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {};
  } catch (e) {
    return {};
  }
}

/**
 * 重置页面背景为默认
 * @param {string} pageId - 页面标识
 */
function resetPageBackground(pageId) {
  try {
    let stored = wx.getStorageSync(STORAGE_KEY) || {};
    if (stored[pageId]) {
      delete stored[pageId];
      wx.setStorageSync(STORAGE_KEY, stored);
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 批量应用背景样式到页面
 * @param {string} pageId - 页面标识
 * @param {Object} pageInstance - 页面实例 (this)
 */
function applyBackgroundToPage(pageId, pageInstance) {
  const bg = getPageBackground(pageId);

  if (bg.type === 'custom') {
    // 自定义图片背景
    // 检查是否是 cloud:// 格式，如果是则需要转换为 HTTPS URL
    if (bg.imageUrl && bg.imageUrl.startsWith('cloud://')) {
      wx.cloud.getTempFileURL({
        fileList: [bg.imageUrl],
        success: (res) => {
          if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
            const httpsUrl = res.fileList[0].tempFileURL;
            pageInstance.setData({
              pageBackground: {
                type: 'custom',
                imageUrl: httpsUrl
              },
              containerStyle: `background-image: url('${httpsUrl}'); background-size: cover; background-position: center;`
            });
          } else {
            pageInstance.setData({
              pageBackground: {
                type: 'custom',
                imageUrl: bg.imageUrl
              },
              containerStyle: `background-image: url('${bg.imageUrl}'); background-size: cover; background-position: center;`
            });
          }
        },
        fail: () => {
          pageInstance.setData({
            pageBackground: {
              type: 'custom',
              imageUrl: bg.imageUrl
            },
            containerStyle: `background-image: url('${bg.imageUrl}'); background-size: cover; background-position: center;`
          });
        }
      });
    } else {
      // 已经是 HTTPS URL
      pageInstance.setData({
        pageBackground: {
          type: 'custom',
          imageUrl: bg.imageUrl
        },
        containerStyle: `background-image: url('${bg.imageUrl}'); background-size: cover; background-position: center;`
      });
    }
  } else {
    // 预设颜色背景
    pageInstance.setData({
      pageBackground: {
        type: 'preset',
        id: bg.id,
        name: bg.name,
        color: bg.color,
        gradient: bg.gradient
      },
      containerStyle: `background-color: ${bg.color}; background: ${bg.gradient};`
    });
  }
}

module.exports = {
  presetBackgrounds,
  getPageBackground,
  savePageBackground,
  uploadCustomBackgroundImage,
  getAllPageBackgrounds,
  resetPageBackground,
  applyBackgroundToPage
};
