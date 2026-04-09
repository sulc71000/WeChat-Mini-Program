const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { momentId } = event;

  if (!momentId) {
    return {
      success: false,
      errMsg: '缺少动态ID'
    };
  }

  try {
    const momentsCollection = db.collection('moments');
    const commentsCollection = db.collection('comments');

    const momentRes = await momentsCollection.doc(momentId).get();

    if (!momentRes.data) {
      return {
        success: false,
        errMsg: '动态不存在'
      };
    }

    if (momentRes.data.publisherId !== openId) {
      return {
        success: false,
        errMsg: '只能删除自己发布的动态'
      };
    }

    await momentsCollection.doc(momentId).remove();

    const commentsRes = await commentsCollection.where({
      momentId: momentId
    }).get();

    if (commentsRes.data && commentsRes.data.length > 0) {
      for (const comment of commentsRes.data) {
        await commentsCollection.doc(comment._id).remove();
      }
    }

    return {
      success: true
    };
  } catch (err) {
    console.error('删除动态错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};