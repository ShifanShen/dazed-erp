import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getInventory } from '../api/inventory'
import { getCategories } from '../api/categories'
import { exportLowStock } from '../api/export'
import './Inventory.css'

function Inventory() {
  const { storeId } = useParams()
  const [inventory, setInventory] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadInventory()
  }, [storeId, selectedCategory])

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }

  const loadInventory = async () => {
    try {
      setLoading(true)
      const categoryId = selectedCategory ? parseInt(selectedCategory) : null
      const data = await getInventory(storeId, categoryId)
      setInventory(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || '加载库存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value)
  }

  return (
    <div className="inventory">
      <div className="inventory-header">
        <Link to="/stores" className="back-link">← 返回门店列表</Link>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={async () => {
              try {
                await exportLowStock(storeId)
              } catch (err) {
                alert('导出失败：' + err.message)
              }
            }}
          >
            导出低库存
          </button>
          <Link
            to={`/stores/${storeId}/stocktake`}
            className="btn btn-primary"
          >
            开始盘点
          </Link>
          <Link
            to={`/stores/${storeId}/stock-in`}
            className="btn btn-secondary"
          >
            入库
          </Link>
        </div>
      </div>
      <h2>库存列表</h2>
      
      <div className="filter-bar">
        <label>
          按类目筛选：
          <select value={selectedCategory} onChange={handleCategoryChange}>
            <option value="">全部类目</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </label>
        <span className="inventory-count">共 {inventory.length} 条记录</span>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : error ? (
        <div className="error">错误：{error}</div>
      ) : inventory.length === 0 ? (
        <div className="empty">
          {selectedCategory ? '该类目下暂无库存数据' : '暂无库存数据'}
        </div>
      ) : (
        <table className="inventory-table">
          <thead>
            <tr>
              <th>商品名称</th>
              <th>单位</th>
              <th>当前库存</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.productId}>
                <td>{item.productName}</td>
                <td>{item.unit}</td>
                <td className="quantity">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Inventory
