# 心动日记小程序 - 记忆

## 项目概述
- **项目名称**: LoversSpace (情侣空间)
- **技术栈**: 微信小程序 + 云开发
- **AppID**: wx99854ff626dc7d31

## 页面结构
1. 登录页 (login)
2. 动态页 (moments) - 朋友圈式动态
3. 首页 (home) - 展示在一起天数、纪念日、最近照片
4. 纪念日 (anniversary) - 纪念日管理
5. 相册 (album) - 照片瀑布流展示和上传
6. 个人中心 (profile) - 用户信息和情侣绑定

## 设计风格
- **主题色**: 浪漫红色系 (#FF6B6B / #FF8E8E)
- **背景色**: 浅粉色 (#FFF5F5)
- **设计语言**: 渐变、圆角卡片、阴影、柔和动画

## UI优化记录
### 2026-04-09 (第三次优化)
**重做底部TabBar图标**：
- 创建自定义 tabbar 组件 (custom-tab-bar/)
- 生成精致的程序图标（动态、空间、纪念日、相册、我的）
- 选中图标添加渐变色和光晕效果
- TabBar样式优化：渐变顶部线、选中指示器、脉冲光晕动画
- 每个tab页面添加 getTabBar().updateActiveTab() 更新选中状态

### 2026-04-09 (第二次优化)
**统一顶部风格**：
- 为5个页面设计统一的 `.page-header` 组件
- 统一的头部包含：渐变背景、装饰圆形、标题和副标题
- 部分页面添加了右上角操作按钮（如发布、管理）
- 装饰圆形使用浮动动画效果

### 2026-04-09 (第一次优化)
完成了全面的UI优化，包括：
- 全局样式增强 (app.wxss)
- 首页UI优化 (home.wxss)
- 动态页UI优化 (moments.wxss)
- 纪念日页UI优化 (anniversary.wxss)
- 相册页UI优化 (album.wxss)
- 个人中心页UI优化 (profile.wxss)

### 优化内容
1. 视觉层次增强 - 添加渐变背景、光影效果、卡片边框
2. 组件精致化 - 按钮、卡片、输入框样式优化
3. 动效添加 - 心跳动画、浮动动画、触摸反馈
4. 弹窗美化 - 现代对话框样式、模糊背景
5. 装饰元素 - 圆形装饰、分割线样式

## 技术特点
- 使用CSS变量管理主题色
- 瀑布流布局实现相册
- 模态对话框交互
- 触摸反馈动画
- 支持动态背景切换功能

## 背景切换系统 (2026-04-09 新增)
### 功能说明
- 用户可在「我的」页面设置各页面背景
- 支持5种预设颜色：浪漫粉、天空蓝、梦幻紫、清新绿、活力橙
- 支持自定义图片上传作为背景
- 可为5个页面独立设置背景：动态、空间、纪念日、相册、我的

### 实现方式
- 背景管理模块: `utils/backgroundManager.js`
- 预设颜色存储在 `presetBackgrounds` 数组
- 背景配置使用 `wx.setStorageSync` 本地存储
- 自定义图片上传至云存储

### 预设背景颜色
| 颜色ID | 名称 | 背景色 | 头部色 |
|--------|------|--------|--------|
| pink | 浪漫粉 | #FFF5F5 | #FF6B6B |
| blue | 天空蓝 | #F0F9FF | #3B82F6 |
| purple | 梦幻紫 | #FAF5FF | #8B5CF6 |
| green | 清新绿 | #F0FDF4 | #22C55E |
| orange | 活力橙 | #FFF7ED | #F97316 |

### CSS变量说明
页面通过CSS变量 `var(--primary)`, `var(--primary-light)`, `var(--background)` 等实现动态主题切换，各页面WXSS使用这些变量实现自适应。

## Bug修复记录 (2026-04-09)
### 问题：「创建情侣空间」显示"用户不存在"

**根本原因**：
1. 云函数使用 `cloud.DYNAMIC_CURRENT_ENV` 导致环境不一致
2. `login` 云函数创建用户时未手动添加 `_openid` 字段
3. 云函数查询时 `_openid` 字段为空导致匹配失败

**修复方案**：
1. 所有云函数统一使用明确环境：`env: 'cloud1-0g6zs6zbbfe35404'`
2. `login` 云函数创建用户时手动添加 `_openid: openId` 字段
3. 修复的云函数：login, createCouple, joinCouple, unbindCouple, getCoupleInfo

**关键代码修复**：
```javascript
// login/index.js - 创建用户时必须手动添加 _openid
const newUser = {
  _openid: openId,  // 重要：手动添加
  nickName: userInfo && userInfo.nickName ? userInfo.nickName : '未设置昵称',
  // ...
};
```

**状态**：✅ 已修复并验证成功

## 纪念日置顶功能 (2026-04-09)
### 功能说明
- 点击纪念日详情弹层的「📌 置顶」按钮，可将纪念日置顶
- 置顶后该纪念日在顶部英雄卡片展示，带金色边框和📌角标
- 多个置顶只保留最新一个，列表保持不变

### 修改文件
- `anniversary.js` - togglePin() 置顶/取消置顶逻辑
- `anniversary.wxml` - 详情弹层加置顶按钮，英雄卡片加置顶标识
- `anniversary.wxss` - 置顶卡片金色边框、角标、置顶按钮样式

### 云函数更新
- `updateAnniversary` - 支持 isPinned 字段（需上传云端）
- `addAnniversary` - 新建时默认 isPinned: false（需上传云端）
- `updateAnniversary/package.json` - 新增，声明 wx-server-sdk 依赖

### 纪念日页面UI优化 (2026-04-09)
- 顶部导航栏改为白色标准样式（白色背景 + 居中标题 + 右侧胶囊按钮）
- 解决刘海屏遮挡：padding-top: calc(env(safe-area-inset-top) + 80rpx)
- 英雄卡片保持渐变红色背景
- 页面背景色：#FFF5F5（浅粉色）
