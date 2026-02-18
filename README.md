# Dazed ERP（酒吧多门店盘点 + 权限分级）- Spring Boot 前后端分离系统

一个功能完整的酒吧 ERP 系统，采用前后端分离架构。

## ✨ 核心功能

### 基础功能
- ✅ **多门店管理**：支持多门店独立管理
- ✅ **权限分级**：ADMIN / MANAGER / CLERK 三级权限 + 门店范围授权
- ✅ **库存管理**：实时查看各门店商品库存
- ✅ **库存盘点**：创建盘点单，提交后自动更新库存

### 商品管理
- ✅ **商品类目**：自定义商品类目（龙舌兰、威士忌、利口酒、耗材等）
- ✅ **SKU 自动生成**：根据类目自动生成 SKU（格式：类目代码-编号，如 `TEQ-001`）
- ✅ **商品图片**：支持图片上传和显示
- ✅ **低库存预警**：设置低库存阈值，自动预警

### 入库管理
- ✅ **入库单**：与盘点分离的入库管理
- ✅ **补货功能**：对已有商品进行补货
- ✅ **供应商信息**：记录供应商和备注

### 数据导出
- ✅ **低库存导出**：一键导出低于阈值的商品（CSV）
- ✅ **短缺商品导出**：盘点后导出短缺商品列表（CSV）

---

## 🛠️ 技术栈

### 后端
- **Spring Boot 4**：核心框架
- **Spring Security**：安全认证和授权
- **Spring Data JPA**：数据访问层
- **PostgreSQL**：关系型数据库
- **Flyway**：数据库版本管理
- **JWT**：Token 认证
- **OpenAPI (Swagger)**：API 文档

### 前端
- **React 18**：UI 框架
- **Vite**：构建工具
- **React Router**：路由管理
- **Axios**：HTTP 客户端
- **Context API**：状态管理

---

## 📋 环境准备

### 必需
- **JDK 17** 或更高版本
- **Docker Desktop**（用于启动 PostgreSQL）
- **Node.js 18+**（用于运行前端）

### 可选
- Maven（项目自带 `mvnw.cmd`）

---

## 🚀 快速开始

### 1. 启动数据库（PostgreSQL）

在项目根目录打开 PowerShell：

```powershell
docker compose -f .\compose.yaml up -d
```

> **说明**：本项目使用以下默认配置：
> - 端口：`5432:5432`
> - 数据库：`mydatabase`
> - 用户：`myuser`
> - 密码：`secret`

### 2. 启动后端

```powershell
.\mvnw.cmd spring-boot:run
```

后端启动后访问：
- **Swagger UI**：`http://localhost:8080/swagger-ui`
- **API 文档**：`http://localhost:8080/v3/api-docs`

### 3. 启动前端

打开新的 PowerShell 窗口：

```powershell
cd frontend
npm install
npm run dev
```

前端启动后访问：`http://localhost:5173`

---

## 🔐 默认账号

这些账号由 Flyway 在第一次启动时自动创建：

| 用户名 | 密码 | 角色 | 权限说明 |
|--------|------|------|----------|
| `admin` | `admin123` | ADMIN | 可操作所有门店 |
| `manager1` | `manager123` | MANAGER | 仅门店 S001 |
| `clerk1` | `clerk123` | CLERK | 仅门店 S001 |

> ⚠️ **注意**：演示账号使用明文密码格式 `{noop}`，生产环境请使用 BCrypt。

---

## 📖 使用指南

### 商品管理流程

1. **创建商品类目**
   - 进入"类目管理"
   - 点击"新增类目"
   - 填写类目代码和名称（例如：`TEQ` / `龙舌兰`）

2. **创建商品**
   - 进入"商品管理"
   - 点击"新增商品"
   - **选择类目**（必选，用于自动生成 SKU）
   - 填写商品名称、单位等信息
   - **SKU 会自动生成**（格式：类目代码-编号，如 `TEQ-001`）
   - 可选：上传商品图片、设置低库存阈值

3. **查看商品**
   - 支持按类目筛选
   - 支持搜索商品名称或 SKU
   - 商品卡片显示图片、SKU、类目等信息

### 库存管理流程

1. **查看库存**
   - 进入"门店列表"
   - 选择门店
   - 点击"查看库存"
   - 可查看该门店所有商品的当前库存

2. **库存盘点**
   - 在库存页面点击"开始盘点"
   - 填写实际盘点数量
   - 提交后自动更新库存
   - 可查看历史盘点记录

3. **商品入库**
   - 在库存页面点击"入库"
   - 选择已有商品
   - 填写入库数量和单价
   - 提交后更新库存

### 数据导出

1. **导出低库存商品**
   - 在库存页面点击"导出低库存"
   - 自动下载 CSV 文件
   - 包含低于阈值的商品列表

2. **导出短缺商品**
   - 在盘点历史中
   - 点击"导出短缺商品"
   - 下载该次盘点的短缺商品列表

---

## 🔧 配置说明

### 数据库连接

配置文件：`src/main/resources/application.properties`

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/mydatabase
spring.datasource.username=myuser
spring.datasource.password=secret
```

### JWT 配置

```properties
dazed.erp.jwt.secret=CHANGE_ME_TO_A_LONG_RANDOM_SECRET_AT_LEAST_32_CHARS
dazed.erp.jwt.issuer=dazed-erp
dazed.erp.jwt.expiration-minutes=720
```

> ⚠️ **重要**：生产环境必须修改 JWT secret，长度至少 32 字符。

### 文件上传配置

```properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
dazed.erp.upload.dir=uploads
dazed.erp.upload.url-prefix=/uploads
```

### 前端 API 配置

前端配置文件：`frontend/.env` 或 `frontend/.env.local`

```env
VITE_API_BASE=http://localhost:8080/api
```

---

## 📁 项目结构

```
dazed-erp/
├── src/main/java/com/example/dazederp/
│   ├── api/                    # REST API 控制器
│   │   ├── AuthController.java
│   │   ├── StoreController.java
│   │   ├── ProductController.java
│   │   ├── ProductCategoryController.java
│   │   ├── InventoryController.java
│   │   ├── StocktakeController.java
│   │   ├── StockInController.java
│   │   ├── FileUploadController.java
│   │   └── ExportController.java
│   ├── domain/                 # JPA 实体类
│   │   ├── AppUser.java
│   │   ├── Store.java
│   │   ├── Product.java
│   │   ├── ProductCategory.java
│   │   ├── InventoryStock.java
│   │   ├── Stocktake.java
│   │   └── StockIn.java
│   ├── repo/                   # Repository 接口
│   ├── security/               # 安全配置
│   │   ├── SecurityConfig.java
│   │   ├── JwtAuthFilter.java
│   │   └── StoreAccessService.java
│   └── service/                # 业务服务
│       └── FileStorageService.java
├── src/main/resources/
│   ├── db/migration/           # Flyway 数据库迁移脚本
│   │   ├── V1__init.sql
│   │   └── V2__add_categories_stockin_export.sql
│   └── application.properties # 应用配置
├── frontend/                   # React 前端项目
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Stores.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Categories.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── Stocktake.jsx
│   │   │   └── StockIn.jsx
│   │   ├── components/        # 公共组件
│   │   ├── api/                # API 客户端
│   │   └── contexts/           # Context 状态管理
│   ├── package.json
│   └── vite.config.js
├── compose.yaml                # Docker Compose 配置
└── README.md
```

---

## 🔍 API 文档

### 认证

所有受保护的 API 需要在请求头中携带 JWT Token：

```
Authorization: Bearer <token>
```

### 主要 API 端点

#### 认证
- `POST /api/auth/login` - 用户登录

#### 门店
- `GET /api/stores` - 获取门店列表（根据权限过滤）

#### 商品类目
- `GET /api/categories` - 获取类目列表
- `POST /api/categories` - 创建类目（ADMIN/MANAGER）
- `PUT /api/categories/{id}` - 更新类目（ADMIN/MANAGER）
- `DELETE /api/categories/{id}` - 删除类目（ADMIN）

#### 商品
- `GET /api/products` - 获取商品列表（支持类目筛选和搜索）
- `GET /api/products/{id}` - 获取商品详情
- `POST /api/products` - 创建商品（ADMIN/MANAGER，SKU 自动生成）
- `PUT /api/products/{id}` - 更新商品（ADMIN/MANAGER）
- `DELETE /api/products/{id}` - 删除商品（ADMIN）

#### 库存
- `GET /api/stores/{storeId}/inventory` - 获取门店库存

#### 盘点
- `GET /api/stores/{storeId}/stocktakes` - 获取盘点记录
- `POST /api/stores/{storeId}/stocktakes` - 创建盘点单

#### 入库
- `GET /api/stores/{storeId}/stock-in` - 获取入库单列表
- `POST /api/stores/{storeId}/stock-in` - 创建入库单
- `PUT /api/stores/{storeId}/stock-in/{id}` - 更新入库单
- `POST /api/stores/{storeId}/stock-in/{id}/submit` - 提交入库单

#### 文件上传
- `POST /api/upload/image` - 上传图片
- `GET /api/upload/{filename}` - 获取图片

#### 数据导出
- `GET /api/stores/{storeId}/export/low-stock` - 导出低库存商品（CSV）
- `GET /api/stores/{storeId}/export/stocktake-shortage/{stocktakeId}` - 导出短缺商品（CSV）

详细 API 文档请访问：`http://localhost:8080/swagger-ui`

---

## 🐛 常见问题

### Docker 命令无法识别

**错误**：`docker : 无法将"docker"项识别为 cmdlet...`

**解决方案**：
1. 安装 Docker Desktop for Windows
2. 重启 PowerShell
3. 验证安装：`docker --version`

如果不想安装 Docker，可以：
1. 在本机安装 PostgreSQL（端口 5432）
2. 创建数据库和用户（与配置一致）
3. 直接启动后端

### 端口被占用

**错误**：`Port 8080 is already in use`

**解决方案**：
1. 查找占用端口的进程：`netstat -ano | findstr :8080`
2. 结束进程或修改 `application.properties` 中的端口

### 前端无法连接后端

**检查项**：
1. 后端是否已启动（访问 `http://localhost:8080/swagger-ui`）
2. 前端 API 配置是否正确（`frontend/.env`）
3. 浏览器控制台是否有 CORS 错误

### 图片无法显示

**检查项**：
1. 上传目录是否存在（`uploads/`）
2. 文件权限是否正确
3. SecurityConfig 是否允许 `/api/upload/**` 访问

### SKU 自动生成失败

**原因**：
- 创建商品时未选择类目
- 类目代码格式不正确

**解决方案**：
- 确保创建商品时选择了类目
- SKU 格式：`类目代码-编号`（如 `TEQ-001`）

---

## 🚀 部署

### 后端部署

1. **构建 JAR**
   ```powershell
   .\mvnw.cmd clean package
   ```

2. **运行 JAR**
   ```powershell
   java -jar target/dazed-erp-0.0.1-SNAPSHOT.jar
   ```

### 前端部署

1. **构建前端**
   ```powershell
   cd frontend
   npm run build
   ```

2. **部署选项**
   - **静态托管**：Vercel、Netlify、阿里云 OSS、腾讯云 COS
   - **与后端一起**：将 `dist/` 内容复制到 `src/main/resources/static/`

### 微信小程序部署

当前后端已支持微信小程序对接，无需修改后端代码。

**详细指南**：请查看 [`WECHAT_MINIPROGRAM.md`](./WECHAT_MINIPROGRAM.md)

**快速要点**：
- 小程序使用 `wx.request` 调用后端 API
- 登录后存储 token：`wx.setStorageSync('token', ...)`
- 请求头携带：`Authorization: Bearer {token}`
- 后端已配置 CORS 允许小程序域名

**技术选型建议**：
- **原生小程序**：只做微信，最简单
- **uni-app**：一套代码可编译成小程序 + H5 + App（推荐）
- **Taro**：熟悉 React 的团队

---

## 📚 相关文档

- [`frontend/README.md`](./frontend/README.md) - 前端项目说明
- [`WECHAT_MINIPROGRAM.md`](./WECHAT_MINIPROGRAM.md) - 微信小程序对接指南
- [`DEPLOYMENT_COST.md`](./DEPLOYMENT_COST.md) - 部署成本估算
- [`NEW_FEATURES.md`](./NEW_FEATURES.md) - 新功能说明

---

## 🎯 权限设计

### 角色说明

| 角色 | 权限 |
|------|------|
| **ADMIN** | 全局管理员，可操作所有门店 |
| **MANAGER** | 门店管理员，可管理商品和类目 |
| **CLERK** | 门店店员，只能查看和盘点 |

### 门店范围

- **ADMIN**：默认可访问所有门店
- **其他角色**：只能访问 `user_store` 表中分配的门店

对应代码：`com.example.dazederp.security.StoreAccessService`

---

## 🔄 更新日志

### v2.0（最新）
- ✅ SKU 自动生成功能（根据类目前缀 + 自增编号）
- ✅ 商品图片上传和显示
- ✅ 商品类目管理
- ✅ 入库管理（与盘点分离）
- ✅ 数据导出功能（低库存、短缺商品）
- ✅ React 前端完整实现
- ✅ 库存预警功能

### v1.0
- ✅ 基础多门店管理
- ✅ 库存盘点
- ✅ 权限分级
- ✅ JWT 认证

---

## 📝 开发计划

- [ ] 数据分析和报表
- [ ] 移动端优化
- [ ] 批量导入商品
- [ ] 库存调拨
- [ ] 供应商管理
- [ ] 采购订单

---

## 📄 许可证

本项目仅供学习和演示使用。

---

## 💡 贡献

欢迎提交 Issue 和 Pull Request！

---

**祝你使用愉快！** 🎉
