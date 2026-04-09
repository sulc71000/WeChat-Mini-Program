// 自定义TabBar组件
Component({
  data: {
    active: 'moments',
    list: [
      {
        pagePath: "/pages/moments/moments",
        text: "动态",
        key: "moments"
      },
      {
        pagePath: "/pages/home/home",
        text: "空间",
        key: "home"
      },
      {
        pagePath: "/pages/anniversary/anniversary",
        text: "纪念日",
        key: "anniversary"
      },
      {
        pagePath: "/pages/album/album",
        text: "相册",
        key: "album"
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        key: "profile"
      }
    ]
  },

  lifetimes: {
    attached() {
      this.updateActiveTab()
    }
  },

  methods: {
    // 切换Tab
    switchTab(e) {
      const tabKey = e.currentTarget.dataset.tab

      // 找到对应的tab配置
      const tab = this.data.list.find(item => item.key === tabKey)
      if (!tab) return

      // 如果点击的是当前tab，不处理
      if (this.data.active === tabKey) return

      // 更新当前选中状态
      this.setData({ active: tabKey })

      // 跳转到对应页面
      wx.switchTab({
        url: tab.pagePath
      })
    },

    // 更新当前活跃Tab (通过页面调用)
    updateActiveTab() {
      const pages = getCurrentPages()
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1]
        const route = '/' + currentPage.route

        // 根据pagePath找到对应的key
        const tab = this.data.list.find(item => item.pagePath === route)
        if (tab) {
          this.setData({ active: tab.key })
        }
      }
    }
  }
})
