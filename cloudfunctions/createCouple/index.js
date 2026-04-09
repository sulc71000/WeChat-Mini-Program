const cloud = require('wx-server-sdk');
cloud.init({
  env: 'cloud1-0g6zs6zbbfe35404'
});

const db = cloud.database({
  env: 'cloud1-0g6zs6zbbfe35404'
});
const _ = db.command;

function generateInviteCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = 'LOVE';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  console.log('=== createCouple 调试信息 ===');
  console.log('openId:', openId);

  try {
    const usersCollection = db.collection('users');
    const couplesCollection = db.collection('couples');

    // 查询条件
    const query = { _openid: openId };
    console.log('查询条件:', JSON.stringify(query));

    const userRes = await usersCollection.where(query).get();
    console.log('查询结果:', JSON.stringify(userRes));

    if (!userRes.data || userRes.data.length === 0) {
      console.log('用户不存在，尝试查询所有用户...');
      // 调试：列出所有用户
      const allUsers = await usersCollection.limit(10).get();
      console.log('数据库中的用户列表:', JSON.stringify(allUsers));
      
      return {
        success: false,
        errMsg: '用户不存在',
        debug: {
          openId: openId,
          query: query,
          allUsersCount: allUsers.data ? allUsers.data.length : 0
        }
      };
    }

    const user = userRes.data[0];

    if (user.coupleId) {
      return {
        success: false,
        errMsg: '您已绑定情侣，无法创建'
      };
    }

    let inviteCode = generateInviteCode();
    let existing = await couplesCollection.where({
      _id: inviteCode
    }).count();
    while (existing.total > 0) {
      inviteCode = generateInviteCode();
      existing = await couplesCollection.where({
        _id: inviteCode
      }).count();
    }

    const coupleData = {
      _id: inviteCode,
      user1: openId,
      user2: '',
      loveDate: db.serverDate(),
      theme: {
        color: '#FF6B6B',
        name: '默认主题'
      },
      createdTime: db.serverDate()
    };

    await couplesCollection.add({
      data: coupleData
    });

    await usersCollection.doc(user._id).update({
      data: {
        coupleId: inviteCode
      }
    });

    return {
      success: true,
      inviteCode: inviteCode,
      coupleId: inviteCode
    };
  } catch (err) {
    console.error('创建情侣空间错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};
