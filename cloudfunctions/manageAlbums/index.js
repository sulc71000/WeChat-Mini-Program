const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { action, coupleId, oldName, newName } = event;

  if (!coupleId || !action) {
    return {
      success: false,
      errMsg: '缺少必要参数'
    };
  }

  try {
    const albumsCollection = db.collection('albums');

    if (action === 'create') {
      const existing = await albumsCollection.where({
        coupleId: coupleId,
        name: newName
      }).get();

      if (existing.data && existing.data.length > 0) {
        return {
          success: false,
          errMsg: '相册已存在'
        };
      }

      await albumsCollection.add({
        data: {
          coupleId: coupleId,
          name: newName,
          createdTime: db.serverDate()
        }
      });

      return {
        success: true
      };
    } else if (action === 'rename') {
      const albumRes = await albumsCollection.where({
        coupleId: coupleId,
        name: oldName
      }).get();

      if (!albumRes.data || albumRes.data.length === 0) {
        return {
          success: false,
          errMsg: '相册不存在'
        };
      }

      const memoriesCollection = db.collection('memories');
      const memoriesRes = await memoriesCollection.where({
        coupleId: coupleId,
        albumName: oldName
      }).get();

      if (memoriesRes.data && memoriesRes.data.length > 0) {
        for (const memory of memoriesRes.data) {
          await memoriesCollection.doc(memory._id).update({
            data: {
              albumName: newName
            }
          });
        }
      }

      await albumsCollection.doc(albumRes.data[0]._id).update({
        data: {
          name: newName
        }
      });

      return {
        success: true
      };
    } else if (action === 'delete') {
      const albumRes = await albumsCollection.where({
        coupleId: coupleId,
        name: oldName
      }).get();

      if (albumRes.data && albumRes.data.length > 0) {
        await albumsCollection.doc(albumRes.data[0]._id).remove();
      }

      return {
        success: true
      };
    } else if (action === 'list') {
      const listRes = await albumsCollection.where({
        coupleId: coupleId
      }).get();

      return {
        success: true,
        list: listRes.data || []
      };
    } else if (action === 'getAll') {
      const memoriesCollection = db.collection('memories');
      
      const allMemories = await memoriesCollection.where({
        coupleId: coupleId
      }).get();

      const albumNames = new Set(['默认相册']);
      
      if (allMemories.data && allMemories.data.length > 0) {
        allMemories.data.forEach(m => {
          if (m.albumName && m.albumName !== '默认相册') {
            albumNames.add(m.albumName);
          }
        });
      }

      return {
        success: true,
        list: Array.from(albumNames)
      };
    }

    return {
      success: false,
      errMsg: '未知操作'
    };
  } catch (err) {
    console.error('管理相册错误', err);
    return {
      success: false,
      errMsg: err.message
    };
  }
};