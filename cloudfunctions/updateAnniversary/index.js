const cloud = require('wx-server-sdk');
cloud.init({
  env: 'cloud1-0g6zs6zbbfe35404'
});

const db = cloud.database({
  env: 'cloud1-0g6zs6zbbfe35404'
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const {
    anniversaryId,
    name,
    date,
    calendarType,
    lunarMonth,
    lunarDay,
    repeatType,
    isPinned
  } = event;

  if (!anniversaryId) {
    return {
      success: false,
      errMsg: '缺少纪念日ID'
    };
  }

  // 仅置顶操作（不校验名称和日期）
  const isOnlyPinToggle = name === undefined && date === undefined && isPinned !== undefined;

  if (!isOnlyPinToggle) {
    if (!name) {
      return { success: false, errMsg: '请填写纪念日名称' };
    }
    if (calendarType !== 'lunar' && !date) {
      return { success: false, errMsg: '请选择日期' };
    }
  }

  try {
    const anniversaryCollection = db.collection('anniversarys');

    // 构建更新数据（只更新传入的字段）
    const updateData = { updatedTime: db.serverDate() };

    if (name !== undefined) updateData.name = name;
    if (date !== undefined) updateData.date = date || '2000-01-01';
    if (calendarType !== undefined) updateData.calendarType = calendarType || 'solar';
    if (lunarMonth !== undefined) updateData.lunarMonth = lunarMonth || '';
    if (lunarDay !== undefined) updateData.lunarDay = lunarDay || '';
    if (repeatType !== undefined) updateData.repeatType = repeatType || 'none';
    if (isPinned !== undefined) updateData.isPinned = isPinned;

    await anniversaryCollection.doc(anniversaryId).update({
      data: updateData
    });

    return { success: true };
  } catch (err) {
    console.error('更新纪念日错误', err);
    return { success: false, errMsg: err.message };
  }
};
