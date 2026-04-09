const cloud = require('wx-server-sdk');
cloud.init({
  env: 'cloud1-0g6zs6zbbfe35404'
});

const db = cloud.database({
  env: 'cloud1-0g6zs6zbbfe35404'
});

function getLoveDays(loveDate) {
  if (!loveDate) return 0;
  const start = new Date(loveDate);
  const now = new Date();
  const diffTime = now - start;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

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
    const couplesCollection = db.collection('couples');
    const usersCollection = db.collection('users');

    const coupleRes = await couplesCollection.doc(coupleId).get();

    if (!coupleRes.data) {
      return {
        success: false,
        errMsg: '情侣空间不存在'
      };
    }

    const couple = coupleRes.data;
    let partnerOpenId = '';

    if (couple.user1 === openId) {
      partnerOpenId = couple.user2;
    } else if (couple.user2 === openId) {
      partnerOpenId = couple.user1;
    }

    let partnerInfo = null;

    if (partnerOpenId) {
      const partnerRes = await usersCollection.where({
        _openid: partnerOpenId
      }).get();

      if (partnerRes.data && partnerRes.data.length > 0) {
        partnerInfo = partnerRes.data[0];
      }
    }

    const loveDays = couple.loveDate ? getLoveDays(couple.loveDate) : 0;

    return {
      success: true,
      coupleInfo: {
        ...couple,
        loveDays: loveDays
      },
      partnerInfo: partnerInfo
    };
  } catch (err) {
    console.error('获取情侣信息错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};