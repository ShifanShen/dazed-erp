# Dazed ERP

## 本地启动

### 1. 准备环境

- Java 17
- Node.js 18+
- Docker Desktop

### 2. 启动数据库

在项目根目录执行：

```powershell
docker compose up -d
```

默认数据库配置：

- 数据库：`mydatabase`
- 用户：`myuser`
- 密码：`secret`

### 3. 启动后端

```powershell
.\mvnw.cmd spring-boot:run
```

后端地址：

- `http://localhost:8080`
- Swagger：`http://localhost:8080/swagger-ui`

### 4. 启动前端

```powershell
cd frontend
npm install
npm run dev
```

前端地址：

- `http://localhost:5173`

## 当前已完成的前端优化

- 盘点数量改成整数录入，前后端都限制为整数字段，适合门店现场盘点。
- 进货和销售页面改成精简操作流，草稿操作集中到详情区，不再把编辑、提交、取消堆在列表里。
- 页面整体切换成蓝白风格，统一卡片、状态标签、弹层和按钮样式。
- 移动端优先适配：
  - 页面支持安全区 `safe-area`
  - 手机下自动切换成卡片列表
  - 弹窗表单改成分组字段布局，更适合触屏操作

## 小程序接入约定

当前前端已经提前做了两层适配，后续接小程序会更顺：

1. 认证存储已抽象

文件在 `frontend/src/utils/authStorage.js`。

默认使用浏览器 `localStorage`，如果小程序容器或 WebView 注入了：

```js
window.__DAZED_ERP_STORAGE__ = {
  getItem(key) {},
  setItem(key, value) {},
  removeItem(key) {},
}
```

前端会自动改用这套存储桥接。

2. 页面已经按移动端信息分组

- 列表页使用“桌面表格 + 手机卡片”的双布局
- 顶部和底部都考虑了手机安全区
- 这套 H5 页面可以直接作为微信小程序 `web-view` 的第一阶段方案

## 后续建议

如果下一步要真正接微信小程序，建议按这个顺序继续：

1. 增加 `web-view` 登录态桥接，把 token 从小程序侧同步给 H5
2. 新增图片上传、扫码录入、订阅消息这些小程序能力
3. 再决定是否把库存、盘点、入库、销售页面迁移成原生小程序页面
