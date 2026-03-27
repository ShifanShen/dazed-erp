import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStores } from '../api/stores'
import './Stores.css'

const quickActions = [
  { label: '盘点', path: 'stocktake' },
  { label: '入库', path: 'stock-in' },
  { label: '出库', path: 'sales' },
  { label: '数据', path: 'stats' },
  { label: '报表', path: 'reports' },
]

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
    <div className="stores-page">
      <div className="stores-page__header">
        <div>
          <span className="stores-page__eyebrow">门店入口</span>
          <h2>选择门店开始处理库存</h2>
          <p>入口做了收敛，先进入库存总览，再从门店卡片快速跳到盘点、入库、出库和数据页。</p>
        </div>
        <div className="stores-page__summary">
          <strong>{stores.length}</strong>
          <span>当前可访问门店</span>
        </div>
      </div>

      {stores.length === 0 ? (
        <div className="empty">暂无门店</div>
      ) : (
        <div className="stores-grid">
          {stores.map((store) => (
            <article key={store.id} className="store-card">
              <div className="store-card__top">
                <div>
                  <span className="store-card__id">门店 #{store.id}</span>
                  <h3>{store.name}</h3>
                </div>
                <span className="store-card__status">在线可操作</span>
              </div>

              <p className="store-address">{store.address || '暂无地址信息'}</p>

              <Link to={`/stores/${store.id}/inventory`} className="store-card__primary-action">
                <div>
                  <strong>进入库存总览</strong>
                  <span>先看库存状态和最近流转，再决定盘点或补货</span>
                </div>
                <em>立即进入</em>
              </Link>

              <div className="store-card__quick-title">
                <h4>快捷操作</h4>
                <span>适合移动端和小程序入口</span>
              </div>
              <div className="store-card__quick-actions">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    to={`/stores/${store.id}/${action.path}`}
                    className="store-card__quick-link"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default Stores
