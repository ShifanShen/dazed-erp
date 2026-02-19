import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

function Dashboard() {
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  return (
    <div className="dashboard">
      <h2>欢迎，{user?.displayName}！</h2>
      <div className="dashboard-cards">
        <Link to="/stores" className="dashboard-card">
          <h3>门店管理</h3>
          <p>查看和管理所有门店</p>
        </Link>
        <Link to="/categories" className="dashboard-card">
          <h3>类目管理</h3>
          <p>管理商品类目（龙舌兰、威士忌等）</p>
        </Link>
        <Link to="/products" className="dashboard-card">
          <h3>商品管理</h3>
          <p>管理商品信息，上传商品图片</p>
        </Link>
        <Link to="/stores" className="dashboard-card">
          <h3>库存盘点</h3>
          <p>进行库存盘点操作</p>
        </Link>
        <Link to="/stores" className="dashboard-card">
          <h3>入库管理</h3>
          <p>商品入库补货</p>
        </Link>
        <Link to="/stores" className="dashboard-card">
          <h3>数据导出</h3>
          <p>导出低库存和短缺商品</p>
        </Link>
      </div>
      <div className="dashboard-info">
        <p>当前角色：<strong>{user?.role}</strong></p>
        {user?.role !== 'ADMIN' && (
          <p className="info-note">
            您只能查看和管理被分配的门店
          </p>
        )}
        {canManage && (
          <p className="info-note">
            您可以管理类目和商品
          </p>
        )}
      </div>
    </div>
  )
}

export default Dashboard
