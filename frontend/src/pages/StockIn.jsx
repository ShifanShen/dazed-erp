import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getStockIns, createStockIn, submitStockIn } from '../api/stockIn'
import { getProducts } from '../api/products'
import { getInventory } from '../api/inventory'
import { getCategories } from '../api/categories'
import './StockIn.css'

function StockIn() {
  const { storeId } = useParams()
  const [stockIns, setStockIns] = useState([])
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
      const [stockInsData, productsData, inventoryData, categoriesData] = await Promise.all([
        getStockIns(storeId),
        getProducts(),
        getInventory(storeId),
        getCategories()
      ])
      setStockIns(stockInsData)
      setProducts(productsData)
      setInventory(inventoryData)
      setCategories(categoriesData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentStock = (productId) => {
    const item = inventory.find(i => i.productId === productId)
    return item ? item.quantity : 0
  }

  const getFilteredProducts = () => {
    if (!selectedCategory) return products
    return products.filter(p => p.categoryId === parseInt(selectedCategory))
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

  const resetForm = () => {
    setFormData({ supplier: '', note: '', items: [] })
    setSelectedCategory('')
    setShowForm(false)
  }

  const handleSubmit = async (e, submitImmediately = false) => {
    e.preventDefault()
    if (formData.items.length === 0) {
      alert('请至少添加一个商品')
      return
    }
    const validItems = formData.items.filter(item => item.productId && item.quantity)
    if (validItems.length === 0) {
      alert('请填写商品数量')
      return
    }
    setSubmitting(true)
    try {
      const items = validItems.map(item => ({
        productId: parseInt(item.productId),
        quantity: parseFloat(item.quantity),
        unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null
      }))
      await createStockIn(storeId, {
        supplier: formData.supplier,
        note: formData.note,
        submit: submitImmediately,
        items
      })
      resetForm()
      loadData()
      alert(submitImmediately ? '入库成功，库存已更新！' : '入库单已保存为草稿')
    } catch (err) {
      alert(err.response?.data?.message || '创建入库单失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitStockIn = async (id) => {
    if (!confirm('确定要提交这个入库单吗？提交后将更新库存。')) return
    try {
      await submitStockIn(storeId, id)
      loadData()
      alert('入库成功，库存已更新！')
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
          + 新建入库单
        </button>
      </div>

      <h2>入库单管理</h2>

      {stockIns.length === 0 ? (
        <div className="empty-state">
          <p>暂无入库记录</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            创建第一个入库单
          </button>
        </div>
      ) : (
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
                      提交入库
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建入库单</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={(e) => handleSubmit(e, false)}>
              <div className="form-row">
                <div className="form-group">
                  <label>供应商</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="请输入供应商名称"
                  />
                </div>
                <div className="form-group">
                  <label>备注（可选）</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="备注信息"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>快速筛选商品</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-filter"
                >
                  <option value="">全部商品</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <div className="items-header">
                  <label>入库商品</label>
                  <button type="button" className="btn btn-small btn-secondary" onClick={addItem}>
                    + 添加商品
                  </button>
                </div>
                {formData.items.length === 0 ? (
                  <div className="empty-items">
                    <p>点击"添加商品"开始添加入库商品</p>
                  </div>
                ) : (
                  <div className="items-list">
                    <div className="item-header-row">
                      <span>商品</span>
                      <span>当前库存</span>
                      <span>入库数量</span>
                      <span>单价</span>
                      <span></span>
                    </div>
                    {formData.items.map((item, index) => (
                      <div key={index} className="item-row">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(index, 'productId', e.target.value)}
                          required
                        >
                          <option value="">选择商品</option>
                          {getFilteredProducts().map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                        <span className="current-stock">
                          {item.productId ? getCurrentStock(parseInt(item.productId)) : '-'}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="数量"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          required
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="单价"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                        />
                        <button type="button" className="btn btn-small btn-danger" onClick={() => removeItem(index)}>
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  取消
                </button>
                <button type="submit" className="btn btn-secondary" disabled={submitting}>
                  保存草稿
                </button>
                <button type="button" className="btn btn-primary" disabled={submitting} onClick={(e) => handleSubmit(e, true)}>
                  {submitting ? '提交中...' : '直接提交入库'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default StockIn
