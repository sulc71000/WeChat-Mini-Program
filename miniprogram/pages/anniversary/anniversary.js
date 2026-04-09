// anniversary.js - 增强版：详情弹层、编辑、置顶、农历
Page({
  data: {
    anniversaryList: [],
    featuredItem: null,     // 英雄卡片展示项（优先置顶项）
    loading: false,

    // 详情弹层
    showDetail: false,
    currentItem: null,
    currentItemId: null,

    // 添加/编辑弹窗
    showDialog: false,
    isEditing: false,
    editingId: null,
    repeatIndex: 0,
    repeatOptions: [
      { name: '不重复', value: 'none' },
      { name: '每年重复', value: 'yearly' }
    ],
    formData: {
      name: '',
      date: '',
      calendarType: 'solar',   // 'solar' | 'lunar'
      lunarMonth: '',          // 农历月（字符串，如"正月"）
      lunarDay: '',            // 农历日（字符串，如"十五"）
      lunarMonthIndex: 0,
      lunarDayIndex: 0,
      repeatType: 'none'
    },

    // 农历数据
    lunarMonths: [
      '正月','二月','三月','四月','五月','六月',
      '七月','八月','九月','十月','十一月','腊月'
    ],
    lunarDays: [
      '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
      '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
      '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'
    ]
  },

  onLoad: function () {},

  onShow: function () {
    this.loadAnniversaryList();
    if (this.getTabBar) {
      this.getTabBar().updateActiveTab();
    }
  },

  // =============================================
  // 加载列表
  // =============================================
  loadAnniversaryList: function () {
    const app = getApp();
    const userInfo = app.globalData.userInfo;

    if (!userInfo || !userInfo.coupleId) {
      this.setData({ anniversaryList: [], featuredItem: null });
      return;
    }

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getAnniversaryList',
      data: { coupleId: userInfo.coupleId }
    }).then(res => {
      this.setData({ loading: false });
      if (res.result && res.result.success) {
        const rawList = res.result.list || [];
        const processed = this.processAnniversaryList(rawList);

        // 优先显示置顶项（从列表中找到 isPinned=true 的）
        const pinnedItem = processed.find(i => i.isPinned) || null;
        // 如果置顶项已不在列表中（可能被删除），清空置顶状态
        if (pinnedItem && !rawList.find(r => r._id === pinnedItem._id)) {
          wx.removeStorageSync('pinnedAnniversaryId');
          this.setData({ anniversaryList: processed, featuredItem: this.pickFeaturedItem(processed) });
          return;
        }
        // 置顶项优先作为英雄卡片，否则用默认选择逻辑
        this.setData({
          anniversaryList: processed,
          featuredItem: pinnedItem || this.pickFeaturedItem(processed)
        });
      }
    }).catch(err => {
      this.setData({ loading: false });
      console.error('获取纪念日失败', err);
    });
  },

  // =============================================
  // 天数计算（区分未来/今天/过去）
  // =============================================
  processAnniversaryList: function (list) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return list.map(item => {
      const raw = new Date(item.date);
      let targetDate;

      if (item.repeatType === 'yearly') {
        targetDate = new Date(today.getFullYear(), raw.getMonth(), raw.getDate());
        if (targetDate < today) {
          targetDate = new Date(today.getFullYear() + 1, raw.getMonth(), raw.getDate());
        }
      } else {
        targetDate = new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
      }

      const diffMs = targetDate - today;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let type, daysLeft;
      if (diffDays > 0) {
        type = 'future';
        daysLeft = diffDays;
      } else if (diffDays === 0) {
        type = 'today';
        daysLeft = 0;
      } else {
        type = 'past';
        daysLeft = Math.abs(diffDays);
      }

      // 格式化日期
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const d = String(targetDate.getDate()).padStart(2, '0');
      const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
      const weekDay = weekDays[targetDate.getDay()];

      // 农历标签
      let dateStr = `${y}-${m}-${d} 星期${weekDay}`;
      if (item.calendarType === 'lunar') {
        dateStr = `${item.lunarMonth || ''}${item.lunarDay || ''} 星期${weekDay}`;
      }

      return { ...item, type, daysLeft, dateStr };
    });
  },

  // 置顶卡片选择（默认逻辑：today > 最近未来 > 最近过去）
  pickFeaturedItem: function (list) {
    if (!list || list.length === 0) return null;
    const todayItem = list.find(i => i.type === 'today');
    if (todayItem) return todayItem;
    const futureItems = list.filter(i => i.type === 'future').sort((a, b) => a.daysLeft - b.daysLeft);
    if (futureItems.length > 0) return futureItems[0];
    const pastItems = list.filter(i => i.type === 'past').sort((a, b) => a.daysLeft - b.daysLeft);
    if (pastItems.length > 0) return pastItems[0];
    return null;
  },

  // =============================================
  // 详情弹层
  // =============================================
  onItemTap: function (e) {
    const item = e.currentTarget.dataset.item;
    this.setData({ currentItem: item, currentItemId: item._id, showDetail: true });
  },

  hideDetail: function () {
    this.setData({ showDetail: false, currentItem: null, currentItemId: null });
  },

  // =============================================
  // 置顶 / 取消置顶
  // =============================================
  togglePin: function () {
    const item = this.data.currentItem;
    if (!item) return;

    const newPinned = !item.isPinned;
    const action = newPinned ? '置顶' : '取消置顶';

    wx.cloud.callFunction({
      name: 'updateAnniversary',
      data: {
        anniversaryId: item._id,
        isPinned: newPinned
      }
    }).then(res => {
      console.log('置顶结果', res);
      if (res.result && res.result.success) {
        wx.showToast({ title: '已' + action, icon: 'success' });

        // 更新本地数据中的 isPinned 状态
        const list = this.data.anniversaryList.map(i => {
          if (i._id === item._id) return { ...i, isPinned: newPinned };
          // 只有一个置顶位，新置顶会替换旧的
          if (newPinned && i.isPinned) return { ...i, isPinned: false };
          return i;
        });

        // 重新计算英雄卡片：置顶项优先
        const pinnedItem = list.find(i => i.isPinned) || null;
        const featured = pinnedItem || this.pickFeaturedItem(list);

        this.setData({
          currentItem: { ...item, isPinned: newPinned },
          anniversaryList: list,
          featuredItem: featured
        });
      } else {
        wx.showToast({ title: res.result?.errMsg || '操作失败', icon: 'none' });
      }
    }).catch((err) => {
      console.error('置顶失败', err);
      wx.showToast({ title: '网络错误，请检查云函数', icon: 'none' });
    });
  },

  // 点击编辑按钮
  startEdit: function () {
    const item = this.data.currentItem;
    if (!item) return;

    // 关闭详情，打开编辑弹窗并填充数据
    this.setData({ showDetail: false });

    // 设置重复选项
    const repeatIndex = this.data.repeatOptions.findIndex(o => o.value === (item.repeatType || 'none'));

    // 设置表单数据
    const formData = {
      name: item.name || '',
      date: item.date || '',
      calendarType: item.calendarType || 'solar',
      lunarMonth: item.lunarMonth || '正月',
      lunarDay: item.lunarDay || '初一',
      lunarMonthIndex: this.findLunarMonthIndex(item.lunarMonth),
      lunarDayIndex: this.findLunarDayIndex(item.lunarDay),
      repeatType: item.repeatType || 'none'
    };

    this.setData({
      showDialog: true,
      isEditing: true,
      editingId: item._id,
      repeatIndex: repeatIndex >= 0 ? repeatIndex : 0,
      formData: formData
    });
  },

  findLunarMonthIndex: function (month) {
    return this.data.lunarMonths.indexOf(month || '正月');
  },

  findLunarDayIndex: function (day) {
    return this.data.lunarDays.indexOf(day || '初一');
  },

  // 删除当前纪念日
  doDeleteCurrent: function () {
    const id = this.data.currentItemId;
    const name = this.data.currentItem ? this.data.currentItem.name : '';
    wx.showModal({
      title: '删除纪念日',
      content: `确定要删除「${name}」吗？`,
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'deleteAnniversary',
            data: { anniversaryId: id }
          }).then(res => {
            if (res.result && res.result.success) {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.setData({ showDetail: false, currentItem: null, currentItemId: null });
              this.loadAnniversaryList();
            }
          });
        }
      }
    });
  },

  // =============================================
  // 添加/编辑弹窗
  // =============================================
  showAddDialog: function () {
    const now = new Date();
    const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({
      showDialog: true,
      isEditing: false,
      editingId: null,
      repeatIndex: 0,
      formData: {
        name: '',
        date: defaultDate,
        calendarType: 'solar',
        lunarMonth: '正月',
        lunarDay: '初一',
        lunarMonthIndex: 0,
        lunarDayIndex: 0,
        repeatType: 'none'
      }
    });
  },

  hideDialog: function () {
    this.setData({ showDialog: false, isEditing: false, editingId: null });
  },

  onNameInput: function (e) {
    this.setData({ 'formData.name': e.detail.value });
  },

  onDateChange: function (e) {
    this.setData({ 'formData.date': e.detail.value });
  },

  // 日历类型切换
  setCalendarType: function (e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ 'formData.calendarType': type });
  },

  onLunarMonthChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      'formData.lunarMonthIndex': idx,
      'formData.lunarMonth': this.data.lunarMonths[idx]
    });
  },

  onLunarDayChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      'formData.lunarDayIndex': idx,
      'formData.lunarDay': this.data.lunarDays[idx]
    });
  },

  onRepeatChange: function (e) {
    const index = parseInt(e.detail.value);
    const options = this.data.repeatOptions;
    this.setData({
      repeatIndex: index,
      'formData.repeatType': options[index].value
    });
  },

  // 保存（添加 或 编辑）
  saveAnniversary: function () {
    const { name, date, calendarType, lunarMonth, lunarDay, repeatType } = this.data.formData;

    if (!name.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }

    // 公历必须选日期，农历月日有默认值可以不选
    if (calendarType === 'solar' && !date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }

    const app = getApp();
    const coupleId = app.globalData.userInfo && app.globalData.userInfo.coupleId;
    if (!coupleId) {
      wx.showToast({ title: '请先绑定情侣', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    const payload = {
      coupleId,
      name: name.trim(),
      date: calendarType === 'solar' ? date : '2000-01-01', // 农历日期用占位日期
      calendarType,
      lunarMonth: calendarType === 'lunar' ? lunarMonth : '',
      lunarDay: calendarType === 'lunar' ? lunarDay : '',
      repeatType
    };

    if (this.data.isEditing) {
      payload.anniversaryId = this.data.editingId;
    }

    wx.cloud.callFunction({
      name: this.data.isEditing ? 'updateAnniversary' : 'addAnniversary',
      data: payload
    }).then(res => {
      this.setData({ loading: false });
      if (res.result && res.result.success) {
        this.setData({ showDialog: false, isEditing: false, editingId: null });
        wx.showToast({
          title: this.data.isEditing ? '保存成功' : '添加成功',
          icon: 'success'
        });
        this.loadAnniversaryList();
      } else {
        wx.showToast({ title: res.result.errMsg || '操作失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  }
});
