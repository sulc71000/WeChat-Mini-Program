const cloud = require('wx-server-sdk');
cloud.init({
  env: 'cloud1-0g6zs6zbbfe35404'
});

const db = cloud.database({
  env: 'cloud1-0g6zs6zbbfe35404'
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { inviteCode } = event;

  if (!inviteCode) {
    return {
      success: false,
      errMsg: '请输入邀请码'
    };
  }

  try {
    const usersCollection = db.collection('users');
    const couplesCollection = db.collection('couples');

    const userRes = await usersCollection.where({
      _openid: openId
    }).get();

    if (!userRes.data || userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const user = userRes.data[0];

    if (user.coupleId) {
      return {
        success: false,
        errMsg: '您已绑定情侣，无法加入'
      };
    }

    const coupleRes = await couplesCollection.doc(inviteCode).get();

    if (!coupleRes.data) {
      return {
        success: false,
        errMsg: '邀请码不存在'
      };
    }

    const couple = coupleRes.data;

    if (couple.user2 && couple.user2 !== '') {
      return {
        success: false,
        errMsg: '该情侣空间已满'
      };
    }

    await couplesCollection.doc(inviteCode).update({
      data: {
        user2: openId
      }
    });

    await usersCollection.doc(user._id).update({
      data: {
        coupleId: inviteCode
      }
    });

    return {
      success: true,
      coupleId: inviteCode
    };
  } catch (err) {
    console.error('加入情侣空间错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};