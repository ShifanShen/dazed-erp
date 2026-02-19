import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

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
          <h1>Dazed ERP 系统</h1>
          <div className="header-right">
            <span className="user-info">
              {user?.displayName} ({user?.role})
            </span>
            <button onClick={handleLogout} className="logout-button">
              退出
            </button>
          </div>
        </div>
      </header>
      <nav className="nav">
        <Link to="/">首页</Link>
        <Link to="/stores">门店管理</Link>
        <Link to="/categories">类目管理</Link>
        <Link to="/products">商品管理</Link>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
