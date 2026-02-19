import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getInventory } from '../api/inventory'
import { exportLowStock } from '../api/export'
import './Inventory.css'

function Inventory() {
  const { storeId } = useParams()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadInventory()
  }, [storeId])

  const loadInventory = async () => {
    try {
      setLoading(true)
      const data = await getInventory(storeId)
      setInventory(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || '加载库存失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (error) {
    return <div className="error">错误：{error}</div>
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
      {inventory.length === 0 ? (
        <div className="empty">暂无库存数据</div>
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
