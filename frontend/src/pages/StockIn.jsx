import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getStockIns, createStockIn, submitStockIn } from '../api/stockIn'
import { getProducts } from '../api/products'
import { getInventory } from '../api/inventory'
import './StockIn.css'

function StockIn() {
  const { storeId } = useParams()
  const [stockIns, setStockIns] = useState([])
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    supplier: '',
    note: '',
    items: []
  })

  useEffect(() => {
    loadData()
  }, [storeId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [stockInsData, productsData, inventoryData] = await Promise.all([
        getStockIns(storeId),
        getProducts(),
        getInventory(storeId)
      ])
      setStockIns(stockInsData)
      setProducts(productsData)
      setInventory(inventoryData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: '', unitPrice: '' }]
    })
  }

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, items: newItems })
  }

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.items.length === 0) {
      alert('请至少添加一个商品')
      return
    }
    try {
      const items = formData.items
        .filter(item => item.productId && item.quantity)
        .map(item => ({
          productId: parseInt(item.productId),
          quantity: parseFloat(item.quantity),
          unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null
        }))
      await createStockIn(storeId, {
        supplier: formData.supplier,
        note: formData.note,
        submit: false,
        items
      })
      setShowForm(false)
      setFormData({ supplier: '', note: '', items: [] })
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || '创建入库单失败')
    }
  }

  const handleSubmitStockIn = async (id) => {
    if (!confirm('确定要提交这个入库单吗？提交后将更新库存。')) return
    try {
      await submitStockIn(storeId, id)
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || '提交失败')
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="stock-in">
      <div className="page-header">
        <Link to="/stores" className="back-link">← 返回门店列表</Link>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          新建入库单
        </button>
      </div>

      <h2>入库单管理</h2>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>新建入库单</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>供应商</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>备注</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>入库商品</label>
                <button type="button" className="btn btn-small" onClick={addItem}>添加商品</button>
                <div className="items-list">
                  {formData.items.map((item, index) => (
                    <div key={index} className="item-row">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                        required
                      >
                        <option value="">选择商品</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="数量"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="单价（可选）"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                      />
                      <button type="button" className="btn btn-small btn-danger" onClick={() => removeItem(index)}>
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">保存</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="stock-in-table">
        <thead>
          <tr>
            <th>入库单号</th>
            <th>供应商</th>
            <th>状态</th>
            <th>商品数量</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {stockIns.map((si) => (
            <tr key={si.id}>
              <td>#{si.id}</td>
              <td>{si.supplier || '-'}</td>
              <td>
                <span className={`status status-${si.status.toLowerCase()}`}>
                  {si.status === 'DRAFT' ? '草稿' : '已提交'}
                </span>
              </td>
              <td>{si.items.length}</td>
              <td>{new Date(si.createdAt).toLocaleString('zh-CN')}</td>
              <td>
                {si.status === 'DRAFT' && (
                  <button
                    className="btn btn-small btn-primary"
                    onClick={() => handleSubmitStockIn(si.id)}
                  >
                    提交
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default StockIn
