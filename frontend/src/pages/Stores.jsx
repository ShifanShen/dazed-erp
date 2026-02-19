import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStores } from '../api/stores'
import './Stores.css'

function Stores() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      const data = await getStores()
      setStores(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || '加载门店失败')
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
    <div className="stores">
      <h2>门店列表</h2>
      {stores.length === 0 ? (
        <div className="empty">暂无门店</div>
      ) : (
        <div className="stores-grid">
          {stores.map((store) => (
            <div key={store.id} className="store-card">
              <h3>{store.name}</h3>
              <p className="store-address">{store.address || '暂无地址'}</p>
              <div className="store-actions">
                <Link
                  to={`/stores/${store.id}/inventory`}
                  className="btn btn-primary"
                >
                  查看库存
                </Link>
                <Link
                  to={`/stores/${store.id}/stocktake`}
                  className="btn btn-secondary"
                >
                  盘点
                </Link>
                <Link
                  to={`/stores/${store.id}/stock-in`}
                  className="btn btn-secondary"
                >
                  入库
                </Link>
                <Link
                  to={`/stores/${store.id}/sales`}
                  className="btn btn-secondary"
                >
                  销售/出库
                </Link>
                <Link
                  to={`/stores/${store.id}/stats`}
                  className="btn btn-secondary"
                >
                  数据统计
                </Link>
                <Link
                  to={`/stores/${store.id}/reports`}
                  className="btn btn-secondary"
                >
                  报表分析
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Stores
