const cloud = require('wx-server-sdk');
cloud.init({
  env: 'cloud1-0g6zs6zbbfe35404'
});

const db = cloud.database({
  env: 'cloud1-0g6zs6zbbfe35404'
});

exports.main = async (event, context) => {
  const { anniversaryId } = event;

  if (!anniversaryId) {
    return {
      success: false,
      errMsg: '缺少纪念日ID'
    };
  }

  try {
    const anniversaryCollection = db.collection('anniversarys');

    await anniversaryCollection.doc(anniversaryId).remove();

    return {
      success: true
    };
  } catch (err) {
    console.error('删除纪念日错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};
