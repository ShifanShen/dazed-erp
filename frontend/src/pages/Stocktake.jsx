import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getInventory } from '../api/inventory'
import { createStocktake, getStocktakes } from '../api/stocktake'
import { exportStocktakeShortage } from '../api/export'
import './Stocktake.css'

function Stocktake() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const [inventory, setInventory] = useState([])
  const [items, setItems] = useState([])
  const [stocktakes, setStocktakes] = useState([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('create') // 'create' or 'history'

  useEffect(() => {
    loadInventory()
    loadStocktakes()
  }, [storeId])

  const loadInventory = async () => {
    try {
      setLoading(true)
      const data = await getInventory(storeId)
      setInventory(data)
      // 初始化盘点项：默认盘点数量 = 当前库存
      setItems(
        data.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          currentQty: item.quantity,
          countedQty: item.quantity,
        }))
      )
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || '加载库存失败')
    } finally {
      setLoading(false)
    }
  }

  const updateCountedQty = (productId, value) => {
    const numValue = parseFloat(value) || 0
    setItems(
      items.map((item) =>
        item.productId === productId
          ? { ...item, countedQty: numValue }
          : item
      )
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // 验证：至少有一个商品有盘点数量
    const hasCountedItems = items.some((item) => item.countedQty > 0)
    if (!hasCountedItems) {
      setError('请至少盘点一个商品')
      return
    }

    try {
      setSubmitting(true)
      const stocktakeItems = items
        .filter((item) => item.countedQty > 0)
        .map((item) => ({
          productId: item.productId,
          countedQty: item.countedQty,
        }))

      await createStocktake(storeId, {
        note: note || '盘点',
        submit: true,
        items: stocktakeItems,
      })

      // 成功，刷新数据
      loadInventory()
      loadStocktakes()
      setNote('')
      setItems(inventory.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        currentQty: item.quantity,
        countedQty: item.quantity,
      })))
      alert('盘点提交成功！')
    } catch (err) {
      setError(
        err.response?.data?.message || '提交盘点失败，请重试'
      )
    } finally {
      setSubmitting(false)
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
    <div className="stocktake">
      <div className="stocktake-header">
        <Link to={`/stores/${storeId}/inventory`} className="back-link">
          ← 返回库存列表
        </Link>
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
      <h2>库存盘点</h2>

      {viewMode === 'history' ? (
        <div className="stocktake-history">
          <table className="stocktake-table">
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
              {stocktakes.map((st) => {
                const shortageItems = st.items.filter(item => item.diffQty < 0)
                return (
                  <tr key={st.id}>
                    <td>#{st.id}</td>
                    <td>{st.note || '-'}</td>
                    <td>
                      <span className={`status status-${st.status.toLowerCase()}`}>
                        {st.status === 'DRAFT' ? '草稿' : '已提交'}
                      </span>
                    </td>
                    <td>{new Date(st.createdAt).toLocaleString('zh-CN')}</td>
                    <td>{st.submittedAt ? new Date(st.submittedAt).toLocaleString('zh-CN') : '-'}</td>
                    <td>
                      {st.status === 'SUBMITTED' && shortageItems.length > 0 && (
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => handleExportShortage(st.id)}
                        >
                          导出短缺商品
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>备注</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：晚班盘点"
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="stocktake-items">
          <table className="stocktake-table">
            <thead>
              <tr>
                <th>商品名称</th>
                <th>单位</th>
                <th>当前库存</th>
                <th>盘点数量</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.productName}</td>
                  <td>{item.unit}</td>
                  <td className="current-qty">{item.currentQty}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.countedQty}
                      onChange={(e) =>
                        updateCountedQty(item.productId, e.target.value)
                      }
                      className="qty-input"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="form-actions">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? '提交中...' : '提交盘点'}
          </button>
          <Link
            to={`/stores/${storeId}/inventory`}
            className="btn btn-secondary"
          >
            取消
          </Link>
        </div>
      </form>
      )}
    </div>
  )
}

export default Stocktake
