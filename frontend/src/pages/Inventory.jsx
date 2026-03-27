import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { exportLowStock } from '../api/export'
import { getInventory, getInventoryMovements } from '../api/inventory'
import { getCategories } from '../api/categories'
import './Inventory.css'

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
})

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const movementLabels = {
  STOCK_IN: '入库',
  SALE_OUT: '销售出库',
  STOCKTAKE_ADJUSTMENT: '盘点调整',
}

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0))
}

function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : '-'
}

function getStockStatus(item) {
  const quantity = Number(item.quantity || 0)
  if (quantity <= 0) {
    return { label: '缺货', tone: 'danger' }
  }
  if (item.lowStock) {
    return { label: '低库存', tone: 'warning' }
  }
  return { label: '正常' }
}

function Inventory() {
  const { storeId } = useParams()
  const [inventory, setInventory] = useState([])
  const [movements, setMovements] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadData()
  }, [storeId, selectedCategory])

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const categoryId = selectedCategory ? parseInt(selectedCategory, 10) : null
      const [inventoryData, movementData] = await Promise.all([
        getInventory(storeId, categoryId),
        getInventoryMovements(storeId, 12),
      ])
      setInventory(inventoryData)
      setMovements(movementData)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || '加载库存失败')
    } finally {
      setLoading(false)
    }
  }

  const displayedInventory = inventory.filter((item) => {
    if (!search.trim()) return true
    const keyword = search.trim().toLowerCase()
    return (
      item.productName?.toLowerCase().includes(keyword) ||
      item.sku?.toLowerCase().includes(keyword)
    )
  })

  const totalQuantity = displayedInventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const lowStockCount = displayedInventory.filter((item) => item.lowStock).length
  const outOfStockCount = displayedInventory.filter((item) => Number(item.quantity || 0) <= 0).length

  return (
    <div className="inventory-page">
      <div className="inventory-page__header">
        <div>
          <Link to="/stores" className="inventory-page__back-link">← 返回门店列表</Link>
          <span className="inventory-page__eyebrow">库存总览</span>
          <h2>先看库存，再决定盘点或进出库</h2>
          <p className="inventory-page__subtitle">
            页面做了收敛，只保留高频操作；最近变动和低库存预警放在同一屏，手机上也能直接处理。
          </p>
        </div>
        <div className="inventory-page__actions">
          <Link to={`/stores/${storeId}/stocktake`} className="btn btn-secondary">
            开始盘点
          </Link>
          <Link to={`/stores/${storeId}/stock-in`} className="btn btn-primary">
            入库补货
          </Link>
          <Link to={`/stores/${storeId}/sales`} className="btn btn-secondary">
            销售出库
          </Link>
        </div>
      </div>

      <div className="inventory-page__summary">
        <article className="inventory-page__stat-card">
          <span className="inventory-page__stat-label">商品数</span>
          <strong>{displayedInventory.length}</strong>
          <small>当前筛选范围内的 SKU 数量</small>
        </article>
        <article className="inventory-page__stat-card">
          <span className="inventory-page__stat-label">库存总量</span>
          <strong>{formatNumber(totalQuantity)}</strong>
          <small>按当前搜索结果汇总</small>
        </article>
        <article className="inventory-page__stat-card inventory-page__stat-card--warning">
          <span className="inventory-page__stat-label">低库存</span>
          <strong>{lowStockCount}</strong>
          <small>低于预警阈值的商品</small>
          <button
            className="inventory-page__stat-link"
            onClick={async () => {
              try {
                await exportLowStock(storeId)
              } catch (err) {
                alert(err.response?.data?.message || '导出低库存失败')
              }
            }}
          >
            导出低库存
          </button>
        </article>
        <article className="inventory-page__stat-card inventory-page__stat-card--danger">
          <span className="inventory-page__stat-label">缺货</span>
          <strong>{outOfStockCount}</strong>
          <small>库存小于等于 0 的商品</small>
        </article>
      </div>

      <div className="inventory-page__toolbar">
        <label className="inventory-page__field">
          <span>类目</span>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">全部类目</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="inventory-page__field inventory-page__field--search">
          <span>搜索商品</span>
          <input
            type="text"
            placeholder="按商品名或 SKU 搜索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : error ? (
        <div className="error">错误：{error}</div>
      ) : (
        <div className="inventory-page__content">
          <section className="inventory-page__table-card">
            <div className="inventory-page__card-header">
              <h3>库存清单</h3>
              <span>{displayedInventory.length} 条记录</span>
            </div>
            {displayedInventory.length === 0 ? (
              <div className="inventory-page__empty">当前筛选条件下暂无库存数据。</div>
            ) : (
              <>
                <table className="inventory-page__table inventory-page__table--desktop">
                  <thead>
                    <tr>
                      <th>商品</th>
                      <th>库存</th>
                      <th>预警阈值</th>
                      <th>状态</th>
                      <th>最近更新时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedInventory.map((item) => {
                      const status = getStockStatus(item)
                      return (
                        <tr key={item.productId}>
                          <td>
                            <div className="inventory-page__product-cell">
                              <strong>{item.productName}</strong>
                              <span>{item.sku} · {item.categoryName || '未分类'} · {item.unit}</span>
                            </div>
                          </td>
                          <td className="inventory-page__qty">{formatNumber(item.quantity)}</td>
                          <td>{item.lowStockThreshold != null ? formatNumber(item.lowStockThreshold) : '-'}</td>
                          <td>
                            <span className={`inventory-page__status inventory-page__status--${status.tone || 'success'}`}>
                              {status.label}
                            </span>
                          </td>
                          <td>{formatDateTime(item.updatedAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="inventory-page__mobile-list">
                  {displayedInventory.map((item) => {
                    const status = getStockStatus(item)
                    return (
                      <article key={item.productId} className="inventory-page__mobile-card">
                        <div className="inventory-page__mobile-top">
                          <div>
                            <strong>{item.productName}</strong>
                            <span>{item.sku}</span>
                          </div>
                          <span className={`inventory-page__status inventory-page__status--${status.tone || 'success'}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="inventory-page__mobile-grid">
                          <div>
                            <label>当前库存</label>
                            <b>{formatNumber(item.quantity)}</b>
                          </div>
                          <div>
                            <label>预警阈值</label>
                            <b>{item.lowStockThreshold != null ? formatNumber(item.lowStockThreshold) : '-'}</b>
                          </div>
                          <div>
                            <label>类目</label>
                            <b>{item.categoryName || '未分类'}</b>
                          </div>
                          <div>
                            <label>单位</label>
                            <b>{item.unit}</b>
                          </div>
                        </div>
                        <p className="inventory-page__mobile-time">更新时间：{formatDateTime(item.updatedAt)}</p>
                      </article>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          <aside className="inventory-page__movement-card">
            <div className="inventory-page__card-header">
              <h3>最近库存变动</h3>
              <span>{movements.length} 条</span>
            </div>
            {movements.length === 0 ? (
              <div className="inventory-page__empty">最近还没有库存流转记录。</div>
            ) : (
              <div className="inventory-page__movement-list">
                {movements.map((movement) => (
                  <article key={movement.id} className="inventory-page__movement-item">
                    <div className="inventory-page__movement-top">
                      <div>
                        <strong>{movement.productName}</strong>
                        <p>{movementLabels[movement.movementType] || movement.movementType}</p>
                      </div>
                      <span
                        className={`inventory-page__movement-qty ${
                          Number(movement.quantityChange) >= 0
                            ? 'inventory-page__movement-qty--in'
                            : 'inventory-page__movement-qty--out'
                        }`}
                      >
                        {Number(movement.quantityChange) >= 0 ? '+' : ''}
                        {formatNumber(movement.quantityChange)}
                      </span>
                    </div>
                    <div className="inventory-page__movement-meta">
                      <span>{movement.referenceNo || movement.referenceType}</span>
                      <span>{movement.operatorName || '系统'}</span>
                    </div>
                    <div className="inventory-page__movement-stock">
                      <span>变动前 {formatNumber(movement.beforeQuantity)}</span>
                      <span>变动后 {formatNumber(movement.afterQuantity)}</span>
                    </div>
                    <div className="inventory-page__movement-time">{formatDateTime(movement.createdAt)}</div>
                    {movement.note && <p className="inventory-page__movement-note">{movement.note}</p>}
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="inventory-page__mobile-actions">
        <Link to={`/stores/${storeId}/stocktake`} className="btn btn-secondary">盘点</Link>
        <Link to={`/stores/${storeId}/stock-in`} className="btn btn-primary">入库</Link>
        <Link to={`/stores/${storeId}/sales`} className="btn btn-secondary">出库</Link>
      </div>
    </div>
  )
}

export default Inventory
