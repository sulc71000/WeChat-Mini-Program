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

    if (!user.coupleId) {
      return {
        success: false,
        errMsg: '您未绑定情侣'
      };
    }

    const coupleId = user.coupleId;

    const coupleRes = await couplesCollection.doc(coupleId).get();

    if (!coupleRes.data) {
      await usersCollection.doc(user._id).update({
        data: {
          coupleId: ''
        }
      });
      return {
        success: false,
        errMsg: '情侣空间不存在，已解除绑定'
      };
    }

    const couple = coupleRes.data;

    let otherOpenId = '';
    if (couple.user1 === openId) {
      otherOpenId = couple.user2;
    } else if (couple.user2 === openId) {
      otherOpenId = couple.user1;
    }

    await usersCollection.doc(user._id).update({
      data: {
        coupleId: ''
      }
    });

    if (otherOpenId) {
      const otherUserRes = await usersCollection.where({
        _openid: otherOpenId
      }).get();

      if (otherUserRes.data && otherUserRes.data.length > 0) {
        await usersCollection.doc(otherUserRes.data[0]._id).update({
          data: {
            coupleId: ''
          }
        });
      }
    }

    await couplesCollection.doc(coupleId).remove();

    return {
      success: true
    };
  } catch (err) {
    console.error('解绑情侣错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};