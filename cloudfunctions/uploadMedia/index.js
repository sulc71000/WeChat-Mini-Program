const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { coupleId, mediaUrl, type, albumName, visibility } = event;

  if (!coupleId || !mediaUrl || !type) {
    return {
      success: false,
      errMsg: '缺少必要参数'
    };
  }

  try {
    const memoriesCollection = db.collection('memories');

    const res = await memoriesCollection.add({
      data: {
        coupleId: coupleId,
        publisherId: openId,
        mediaUrl: mediaUrl,
        type: type,
        albumName: albumName || '默认相册',
        visibility: visibility || 'public',
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      id: res._id
    };
  } catch (err) {
    console.error('上传媒体错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};