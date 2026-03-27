import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { exportStocktakeShortage } from '../api/export'
import { getInventory } from '../api/inventory'
import { createStocktake, getStocktakes } from '../api/stocktake'
import './Stocktake.css'

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function toWholeNumber(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
}

function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : '-'
}

function Stocktake() {
  const { storeId } = useParams()
  const [inventory, setInventory] = useState([])
  const [items, setItems] = useState([])
  const [stocktakes, setStocktakes] = useState([])
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('create')

  useEffect(() => {
    loadInventory()
    loadStocktakes()
  }, [storeId])

  const initializeItems = (data) => (
    data.map((item) => {
      const currentQty = toWholeNumber(item.quantity)
      return {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        unit: item.unit,
        currentQty,
        countedQty: currentQty,
      }
    })
  )

  const loadInventory = async () => {
    try {
      setLoading(true)
      const data = await getInventory(storeId)
      setInventory(data)
      setItems(initializeItems(data))
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || '加载库存失败')
    } finally {
      setLoading(false)
    }
  }

  const loadStocktakes = async () => {
    try {
      const data = await getStocktakes(storeId)
      setStocktakes(data)
    } catch (err) {
      console.error('Failed to load stocktakes', err)
    }
  }

  const updateCountedQty = (productId, value) => {
    const nextQty = toWholeNumber(value)
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? { ...item, countedQty: nextQty }
          : item
      )
    )
  }

  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      return items
    }
    const keyword = search.trim().toLowerCase()
    return items.filter((item) =>
      item.productName?.toLowerCase().includes(keyword) ||
      item.sku?.toLowerCase().includes(keyword)
    )
  }, [items, search])

  const changedCount = items.filter((item) => item.countedQty !== item.currentQty).length
  const shortageCount = items.filter((item) => item.countedQty < item.currentQty).length

  const resetStocktake = () => {
    setNote('')
    setSearch('')
    setItems(initializeItems(inventory))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (items.length === 0) {
      setError('暂无可盘点商品')
      return
    }

    try {
      setSubmitting(true)
      const stocktakeItems = items.map((item) => ({
        productId: item.productId,
        countedQty: item.countedQty,
      }))

      await createStocktake(storeId, {
        note: note || '盘点',
        submit: true,
        items: stocktakeItems,
      })

      await Promise.all([loadInventory(), loadStocktakes()])
      resetStocktake()
      alert('盘点提交成功！')
    } catch (err) {
      setError(err.response?.data?.message || '提交盘点失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportShortage = async (stocktakeId) => {
    try {
      await exportStocktakeShortage(storeId, stocktakeId)
    } catch (err) {
      alert('导出失败：' + err.message)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="stocktake-page">
      <div className="stocktake-header">
        <div>
          <Link to={`/stores/${storeId}/inventory`} className="stocktake-page__back-link">
            ← 返回库存总览
          </Link>
          <span className="stocktake-page__eyebrow">库存盘点</span>
          <h2>盘点数量统一按整数录入</h2>
          <p className="stocktake-page__subtitle">录入更接近现场操作，手机端直接改数字，提交后库存会自动调整。</p>
        </div>
        <div className="view-tabs">
          <button
            className={`tab ${viewMode === 'create' ? 'active' : ''}`}
            onClick={() => setViewMode('create')}
          >
            新建盘点
          </button>
          <button
            className={`tab ${viewMode === 'history' ? 'active' : ''}`}
            onClick={() => setViewMode('history')}
          >
            盘点记录
          </button>
        </div>
      </div>

      <div className="stocktake-page__summary">
        <article className="stocktake-page__stat-card">
          <span>盘点商品</span>
          <strong>{items.length}</strong>
          <small>当前门店库存项</small>
        </article>
        <article className="stocktake-page__stat-card">
          <span>有差异</span>
          <strong>{changedCount}</strong>
          <small>盘点数和系统数不同</small>
        </article>
        <article className="stocktake-page__stat-card stocktake-page__stat-card--warning">
          <span>短缺项</span>
          <strong>{shortageCount}</strong>
          <small>盘点数低于系统数</small>
        </article>
      </div>

      {viewMode === 'history' ? (
        <div className="stocktake-history">
          <div className="stocktake-page__card-header">
            <h3>盘点记录</h3>
            <span>{stocktakes.length} 条</span>
          </div>

          <table className="stocktake-table stocktake-table--desktop">
            <thead>
              <tr>
                <th>盘点单号</th>
                <th>备注</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>提交时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {stocktakes.map((stocktake) => {
                const shortageItems = stocktake.items.filter((item) => item.diffQty < 0)
                return (
                  <tr key={stocktake.id}>
                    <td>#{stocktake.id}</td>
                    <td>{stocktake.note || '-'}</td>
                    <td>
                      <span className={`stocktake-page__status stocktake-page__status--${stocktake.status.toLowerCase()}`}>
                        {stocktake.status === 'DRAFT' ? '草稿' : '已提交'}
                      </span>
                    </td>
                    <td>{formatDateTime(stocktake.createdAt)}</td>
                    <td>{formatDateTime(stocktake.submittedAt)}</td>
                    <td>
                      {stocktake.status === 'SUBMITTED' && shortageItems.length > 0 && (
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={() => handleExportShortage(stocktake.id)}
                        >
                          导出短缺
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="stocktake-page__mobile-list">
            {stocktakes.map((stocktake) => {
              const shortageItems = stocktake.items.filter((item) => item.diffQty < 0)
              return (
                <article key={stocktake.id} className="stocktake-page__mobile-card">
                  <div className="stocktake-page__mobile-top">
                    <strong>盘点单 #{stocktake.id}</strong>
                    <span className={`stocktake-page__status stocktake-page__status--${stocktake.status.toLowerCase()}`}>
                      {stocktake.status === 'DRAFT' ? '草稿' : '已提交'}
                    </span>
                  </div>
                  <p>{stocktake.note || '无备注'}</p>
                  <div className="stocktake-page__mobile-meta">
                    <span>创建：{formatDateTime(stocktake.createdAt)}</span>
                    <span>提交：{formatDateTime(stocktake.submittedAt)}</span>
                  </div>
                  {stocktake.status === 'SUBMITTED' && shortageItems.length > 0 && (
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleExportShortage(stocktake.id)}
                    >
                      导出短缺商品
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="stocktake-page__form">
          <div className="stocktake-page__toolbar">
            <label className="form-group">
              <span>备注</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：晚班盘点"
              />
            </label>
            <label className="form-group">
              <span>搜索商品</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="按商品名或 SKU 搜索"
              />
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="stocktake-items">
            <table className="stocktake-table stocktake-table--desktop">
              <thead>
                <tr>
                  <th>商品名称</th>
                  <th>SKU</th>
                  <th>当前库存</th>
                  <th>盘点数量</th>
                  <th>差异</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const diff = item.countedQty - item.currentQty
                  return (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td>{item.sku}</td>
                      <td className="current-qty">{item.currentQty}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={item.countedQty}
                          onChange={(e) => updateCountedQty(item.productId, e.target.value)}
                          className="qty-input"
                        />
                      </td>
                      <td className={diff === 0 ? '' : diff > 0 ? 'stocktake-page__diff--up' : 'stocktake-page__diff--down'}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="stocktake-page__mobile-list">
              {filteredItems.map((item) => {
                const diff = item.countedQty - item.currentQty
                return (
                  <article key={item.productId} className="stocktake-page__mobile-card">
                    <div className="stocktake-page__mobile-top">
                      <div>
                        <strong>{item.productName}</strong>
                        <span>{item.sku}</span>
                      </div>
                      <span className={`stocktake-page__diff-badge ${diff > 0 ? 'stocktake-page__diff-badge--up' : diff < 0 ? 'stocktake-page__diff-badge--down' : ''}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </div>
                    <div className="stocktake-page__mobile-grid">
                      <div>
                        <label>当前库存</label>
                        <b>{item.currentQty}</b>
                      </div>
                      <div>
                        <label>盘点数量</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={item.countedQty}
                          onChange={(e) => updateCountedQty(item.productId, e.target.value)}
                          className="qty-input"
                        />
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="stocktake-page__submit-bar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetStocktake}
            >
              恢复默认
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? '提交中...' : '提交盘点'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default Stocktake
