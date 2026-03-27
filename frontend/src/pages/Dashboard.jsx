import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

const quickLinks = [
  {
    title: '门店库存',
    description: '从门店入口直接查看库存、补货、销售和报表。',
    to: '/stores',
    tone: 'primary',
    eyebrow: '高频入口',
  },
  {
    title: '商品管理',
    description: '维护 SKU、单位、图片和低库存阈值。',
    to: '/products',
    tone: 'neutral',
    eyebrow: '资料维护',
  },
  {
    title: '类目结构',
    description: '整理龙舌兰、威士忌、耗材等商品类目。',
    to: '/categories',
    tone: 'neutral',
    eyebrow: '基础数据',
  },
]

const workflowCards = [
  {
    title: '先看库存',
    description: '从库存总览先锁定低库存、缺货和最近变动，再决定是否盘点或补货。',
  },
  {
    title: '补货入库',
    description: '新建或继续编辑草稿入库单，确认后直接入账，库存变化自动留痕。',
  },
  {
    title: '销售出库',
    description: '销售单提交前先校验库存，避免超卖，出库记录可追溯到具体单据。',
  },
]

function Dashboard() {
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero__main">
          <span className="dashboard-hero__eyebrow">运营总览</span>
          <h2>欢迎回来，{user?.displayName}</h2>
          <p>
            这一版工作台更聚焦库存流转，把门店、补货、销售出库和盘点入口串成一条更顺手的操作路径。
          </p>
          <div className="dashboard-hero__chips">
            <span>角色：{user?.role}</span>
            <span>{canManage ? '可维护商品与类目' : '门店范围按授权访问'}</span>
            <span>建议从门店列表进入具体业务</span>
          </div>
        </div>

        <aside className="dashboard-hero__panel">
          <h3>推荐工作顺序</h3>
          <ol>
            <li>进入门店，先看库存总览和最近变动。</li>
            <li>需要补货就开入库单，需要出货就走销售单。</li>
            <li>库存异常时再补盘点，避免反复修正。</li>
          </ol>
        </aside>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h3>常用入口</h3>
            <p>把最常进入的页面放前面，减少来回寻找。</p>
          </div>
        </div>
        <div className="dashboard-cards">
          {quickLinks.map((item) => (
            <Link key={item.title} to={item.to} className={`dashboard-card dashboard-card--${item.tone}`}>
              <span className="dashboard-card__eyebrow">{item.eyebrow}</span>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              <span className="dashboard-card__action">进入页面</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h3>库存工作流</h3>
            <p>聚焦日常最常见的三段动作，让操作顺序更清晰。</p>
          </div>
          <Link to="/stores" className="btn btn-secondary">选择门店开始</Link>
        </div>
        <div className="dashboard-flow">
          {workflowCards.map((item, index) => (
            <article key={item.title} className="dashboard-flow__card">
              <span className="dashboard-flow__index">0{index + 1}</span>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-info-card">
        <div>
          <h3>当前权限说明</h3>
          <p>当前角色：<strong>{user?.role}</strong></p>
        </div>
        <div className="dashboard-info-card__notes">
          {user?.role !== 'ADMIN' && (
            <p>您只能查看和处理被授权的门店。</p>
          )}
          {canManage && (
            <p>您可以维护商品、类目和补货相关资料。</p>
          )}
          <p>如果要进入进出库操作，建议先从门店列表选择具体门店。</p>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
