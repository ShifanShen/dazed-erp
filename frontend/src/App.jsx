import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Stores from './pages/Stores'
import Inventory from './pages/Inventory'
import Stocktake from './pages/Stocktake'
import Categories from './pages/Categories'
import Products from './pages/Products'
import StockIn from './pages/StockIn'
import Sales from './pages/Sales'
import Stats from './pages/Stats'
import Reports from './pages/Reports'
import Layout from './components/Layout'
import './App.css'

// 保护路由：需要登录才能访问
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="stores" element={<Stores />} />
          <Route path="stores/:storeId/inventory" element={<Inventory />} />
          <Route path="stores/:storeId/stocktake" element={<Stocktake />} />
          <Route path="stores/:storeId/stock-in" element={<StockIn />} />
          <Route path="stores/:storeId/sales" element={<Sales />} />
          <Route path="stores/:storeId/stats" element={<Stats />} />
          <Route path="stores/:storeId/reports" element={<Reports />} />
          <Route path="categories" element={<Categories />} />
          <Route path="products" element={<Products />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
