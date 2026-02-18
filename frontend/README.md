# 酒吧 ERP 前端（React + Vite）

## 🚀 快速开始

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

前端会在 `http://localhost:5173` 启动

### 3. 确保后端已启动

后端需要在 `http://localhost:8080` 运行：

```bash
# 在项目根目录
.\mvnw.cmd spring-boot:run
```

---

## 📁 项目结构

```
frontend/
├── src/
│   ├── api/              # API 调用封装
│   │   ├── client.js     # axios 客户端（含拦截器）
│   │   ├── auth.js       # 登录 API
│   │   ├── stores.js     # 门店 API
│   │   ├── inventory.js # 库存 API
│   │   └── stocktake.js  # 盘点 API
│   ├── components/       # React 组件
│   │   └── Layout.jsx    # 布局组件
│   ├── contexts/         # React Context
│   │   └── AuthContext.jsx # 认证上下文
│   ├── pages/            # 页面组件
│   │   ├── Login.jsx     # 登录页
│   │   ├── Dashboard.jsx # 首页
│   │   ├── Stores.jsx    # 门店列表
│   │   ├── Inventory.jsx # 库存列表
│   │   └── Stocktake.jsx # 盘点页面
│   ├── App.jsx           # 主应用组件
│   ├── main.jsx          # 入口文件
│   └── index.css         # 全局样式
├── package.json
├── vite.config.js
└── .env                  # 环境变量（API 地址）
```

---

## 🔧 配置

### 环境变量

在 `frontend/.env` 中配置后端 API 地址：

```env
VITE_API_BASE=http://localhost:8080/api
```

生产环境可以创建 `.env.production`：

```env
VITE_API_BASE=https://your-api-domain.com/api
```

---

## 📦 构建

### 开发环境

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

构建产物在 `dist/` 目录

### 预览构建结果

```bash
npm run preview
```

---

## 🎨 功能特性

- ✅ 用户登录（JWT 认证）
- ✅ 门店列表（根据权限显示）
- ✅ 库存查看
- ✅ 库存盘点
- ✅ 路由保护（需要登录）
- ✅ Token 自动刷新
- ✅ 响应式设计

---

## 🔐 认证流程

1. 用户输入用户名密码登录
2. 后端返回 JWT token
3. Token 存储在 localStorage
4. 后续请求自动在 header 中带上 token
5. Token 过期时自动跳转登录页

---

## 📝 演示账号

- **管理员**：`admin` / `admin123`
- **店长**：`manager1` / `manager123`
- **店员**：`clerk1` / `clerk123`

---

## 🛠️ 技术栈

- **React 18**：UI 框架
- **Vite**：构建工具
- **React Router**：路由
- **Axios**：HTTP 客户端
- **CSS**：原生 CSS（无 UI 框架）

---

## 🚀 部署

### 方案一：静态托管（推荐）

构建后部署到：
- **Vercel**：免费，自动 HTTPS
- **Netlify**：免费，自动 HTTPS
- **阿里云 OSS** + CDN
- **腾讯云 COS** + CDN

### 方案二：与后端一起部署

构建后，把 `dist/` 目录内容复制到 `src/main/resources/static/`

---

## 📚 下一步

- [ ] 添加 UI 组件库（Ant Design / shadcn/ui）
- [ ] 添加状态管理（Zustand / Redux）
- [ ] 添加数据表格（分页、搜索、排序）
- [ ] 添加图表（库存趋势、盘点统计）
- [ ] 添加消息通知（Toast）
- [ ] 优化移动端体验
