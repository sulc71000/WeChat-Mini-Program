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
  const { coupleId, name, date, calendarType, lunarMonth, lunarDay, repeatType } = event;

  if (!coupleId) {
    return {
      success: false,
      errMsg: '缺少情侣ID'
    };
  }

  if (!name) {
    return {
      success: false,
      errMsg: '请填写纪念日名称'
    };
  }

  if (calendarType !== 'lunar' && !date) {
    return {
      success: false,
      errMsg: '请选择日期'
    };
  }

  try {
    const anniversaryCollection = db.collection('anniversarys');

    const newData = {
      coupleId: coupleId,
      name: name,
      date: date || '2000-01-01',
      calendarType: calendarType || 'solar',
      lunarMonth: lunarMonth || '',
      lunarDay: lunarDay || '',
      repeatType: repeatType || 'none',
      isPinned: false,
      createdTime: db.serverDate()
    };

    const res = await anniversaryCollection.add({
      data: newData
    });

    return {
      success: true,
      id: res._id
    };
  } catch (err) {
    console.error('添加纪念日错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};
