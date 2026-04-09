const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { coupleId, albumName, pageSize = 50, skip = 0 } = event;

  if (!coupleId) {
    return {
      success: false,
      errMsg: '缺少情侣ID'
    };
  }

  try {
    const memoriesCollection = db.collection('memories');
    const usersCollection = db.collection('users');

    let query = {
      coupleId: coupleId
    };

    if (albumName && albumName !== '全部') {
      query.albumName = albumName;
    }

    const totalRes = await memoriesCollection.where(query).count();
    
    const listRes = await memoriesCollection.where(query)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    const memories = listRes.data || [];

    for (const memory of memories) {
      const publisherRes = await usersCollection.where({
        _openid: memory.publisherId
      }).get();

      if (publisherRes.data && publisherRes.data.length > 0) {
        memory.publisherInfo = publisherRes.data[0];
      }
    }

    return {
      success: true,
      list: memories,
      total: totalRes.total
    };
  } catch (err) {
    console.error('获取媒体列表错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};