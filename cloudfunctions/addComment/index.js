const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { momentId, content } = event;

  if (!momentId) {
    return {
      success: false,
      errMsg: '缺少动态ID'
    };
  }

  if (!content) {
    return {
      success: false,
      errMsg: '评论内容不能为空'
    };
  }

  try {
    const commentsCollection = db.collection('comments');

    const res = await commentsCollection.add({
      data: {
        momentId: momentId,
        fromId: openId,
        content: content,
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      id: res._id
    };
  } catch (err) {
    console.error('添加评论错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};