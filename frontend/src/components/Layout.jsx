import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

const navItems = [
  { to: '/', label: '首页', description: '工作台' },
  { to: '/stores', label: '门店', description: '库存流转' },
  { to: '/categories', label: '类目', description: '基础数据' },
  { to: '/products', label: '商品', description: 'SKU 资料' },
]

function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="brand-panel">
            <span className="brand-chip">DAZED ERP</span>
            <div>
              <h1>库存与门店运营中心</h1>
              <p>更适合桌面和移动端的蓝白工作台，围绕库存、盘点、入库和销售出库做简化操作。</p>
            </div>
          </div>

          <div className="header-right">
            <div className="user-panel">
              <span className="user-panel__label">当前登录</span>
              <strong>{user?.displayName}</strong>
              <span className="user-role">{user?.role}</span>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary logout-button">
              退出登录
            </button>
          </div>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-inner">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>

      <nav className="mobile-tabbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `mobile-tabbar__link${isActive ? ' active' : ''}`}
          >
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default Layout
