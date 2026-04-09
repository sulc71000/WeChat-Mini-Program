const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { memoryId, mediaUrl } = event;

  if (!memoryId) {
    return {
      success: false,
      errMsg: '缺少媒体ID'
    };
  }

  try {
    const memoriesCollection = db.collection('memories');
    const couplesCollection = db.collection('couples');

    const memoryRes = await memoriesCollection.doc(memoryId).get();

    if (!memoryRes.data) {
      return {
        success: false,
        errMsg: '媒体不存在'
      };
    }

    const memory = memoryRes.data;

    const coupleRes = await couplesCollection.where({
      _id: memory.coupleId
    }).get();

    let canDelete = false;

    if (memory.publisherId === openId) {
      canDelete = true;
    } else if (coupleRes.data && coupleRes.data.length > 0) {
      const couple = coupleRes.data[0];
      if (couple.user1 === openId || couple.user2 === openId) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return {
        success: false,
        errMsg: '无权删除此媒体'
      };
    }

    await memoriesCollection.doc(memoryId).remove();

    if (mediaUrl) {
      try {
        await cloud.deleteFile({
          fileList: [mediaUrl]
        });
      } catch (e) {
        console.error('删除云存储文件失败', e);
      }
    }

    return {
      success: true
    };
  } catch (err) {
    console.error('删除媒体错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};