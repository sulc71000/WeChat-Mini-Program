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
  const { coupleId } = event;

  if (!coupleId) {
    return {
      success: false,
      errMsg: '缺少情侣ID'
    };
  }

  try {
    const anniversaryCollection = db.collection('anniversarys');

    const res = await anniversaryCollection.where({
      coupleId: coupleId
    }).orderBy('date', 'asc').get();

    return {
      success: true,
      list: res.data || []
    };
  } catch (err) {
    console.error('获取纪念日列表错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};
