const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { coupleId, content, images } = event;

  if (!coupleId) {
    return {
      success: false,
      errMsg: '缺少情侣ID'
    };
  }

  if (!content && (!images || images.length === 0)) {
    return {
      success: false,
      errMsg: '内容不能为空'
    };
  }

  if (images && images.length > 9) {
    return {
      success: false,
      errMsg: '最多9张图片'
    };
  }

  try {
    const momentsCollection = db.collection('moments');

    const res = await momentsCollection.add({
      data: {
        coupleId: coupleId,
        publisherId: openId,
        content: content || '',
        images: images || [],
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      id: res._id
    };
  } catch (err) {
    console.error('发布动态错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};