const cloud = require('wx-server-sdk');
cloud.init({
  env: 'cloud1-0g6zs6zbbfe35404'
});

const db = cloud.database({
  env: 'cloud1-0g6zs6zbbfe35404'
});
const usersCollection = db.collection('users');

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { userInfo } = event;

  try {
    // 使用正确的字段名 _openid（云数据库自动生成的字段是小写）
    const existingUser = await usersCollection.where({
      _openid: openId
    }).get();

    if (existingUser.data && existingUser.data.length > 0) {
      const user = existingUser.data[0];
      
      if (userInfo && (userInfo.nickName || userInfo.avatarUrl)) {
        await usersCollection.doc(user._id).update({
          data: {
            nickName: userInfo.nickName || user.nickName,
            avatarUrl: userInfo.avatarUrl || user.avatarUrl,
            lastLoginTime: db.serverDate()
          }
        });
        
        const updatedUser = await usersCollection.doc(user._id).get();
        return {
          success: true,
          isNewUser: false,
          userInfo: {
            _id: updatedUser.data._id,
            _openid: openId,
            nickName: updatedUser.data.nickName,
            avatarUrl: updatedUser.data.avatarUrl,
            coupleId: updatedUser.data.coupleId || '',
            points: updatedUser.data.points || 0
          }
        };
      }

      return {
        success: true,
        isNewUser: false,
        userInfo: {
          _id: user._id,
          _openid: openId,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          coupleId: user.coupleId || '',
          points: user.points || 0
        }
      };
    } else {
      // 新用户 - 必须手动添加 _openid 字段，云函数创建记录时不会自动添加
      const newUser = {
        _openid: openId,  // 重要：手动添加 _openid
        nickName: userInfo && userInfo.nickName ? userInfo.nickName : '未设置昵称',
        avatarUrl: userInfo && userInfo.avatarUrl ? userInfo.avatarUrl : '',
        coupleId: '',
        points: 0,
        createdTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      };

      const result = await usersCollection.add({
        data: newUser
      });

      return {
        success: true,
        isNewUser: true,
        userInfo: {
          _id: result._id,
          _openid: openId,
          nickName: newUser.nickName,
          avatarUrl: newUser.avatarUrl,
          coupleId: '',
          points: 0
        }
      };
    }
  } catch (err) {
    console.error('登录云函数错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};
