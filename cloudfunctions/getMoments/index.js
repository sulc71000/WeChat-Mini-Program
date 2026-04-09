const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { coupleId } = event;

  if (!coupleId) {
    return {
      success: false,
      errMsg: '缺少情侣ID'
    };
  }

  try {
    const momentsCollection = db.collection('moments');
    const commentsCollection = db.collection('comments');
    const usersCollection = db.collection('users');

    const momentsRes = await momentsCollection.where({
      coupleId: coupleId
    }).orderBy('createTime', 'desc').get();

    const moments = momentsRes.data || [];

    for (const moment of moments) {
      const publisherRes = await usersCollection.where({
        _openid: moment.publisherId
      }).get();

      if (publisherRes.data && publisherRes.data.length > 0) {
        moment.publisherInfo = publisherRes.data[0];
      }

      const commentsRes = await commentsCollection.where({
        momentId: moment._id
      }).orderBy('createTime', 'asc').get();

      const comments = commentsRes.data || [];

      for (const comment of comments) {
        const commenterRes = await usersCollection.where({
          _openid: comment.fromId
        }).get();

        if (commenterRes.data && commenterRes.data.length > 0) {
          comment.commenterInfo = commenterRes.data[0];
        }
      }

      moment.comments = comments;
    }

    return {
      success: true,
      list: moments
    };
  } catch (err) {
    console.error('获取动态列表错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};