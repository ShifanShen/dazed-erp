import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSales, createSale, submitSale, cancelSale } from '../api/sales'
import { getProducts } from '../api/products'
import { getInventory } from '../api/inventory'
import './Sales.css'

function Sales() {
  const { storeId } = useParams()
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    customerName: '',
    note: '',
    items: []
  })

  useEffect(() => {
    loadData()
  }, [storeId, statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [salesData, productsData, inventoryData] = await Promise.all([
        getSales(storeId, statusFilter || null),
        getProducts(),
        getInventory(storeId)
      ])
      setSales(salesData)
      setProducts(productsData)
      setInventory(inventoryData)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  const getStockQuantity = (productId) => {
    const stock = inventory.find(s => s.productId === productId)
    return stock ? stock.quantity : 0
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
    
    // Validate stock
    for (const item of formData.items) {
      if (item.productId && item.quantity) {
        const stockQty = getStockQuantity(parseInt(item.productId))
        if (parseFloat(item.quantity) > stockQty) {
          const product = products.find(p => p.id === parseInt(item.productId))
          alert(`商品 ${product?.name} 库存不足。当前库存：${stockQty}`)
          return
        }
      }
    }

    try {
      const items = formData.items
        .filter(item => item.productId && item.quantity)
        .map(item => ({
          productId: parseInt(item.productId),
          quantity: parseFloat(item.quantity),
          unitPrice: item.unitPrice ? parseFloat(item.unitPrice) : null
        }))
      await createSale(storeId, {
        customerName: formData.customerName,
        note: formData.note,
        submit: false,
        items
      })
      setShowForm(false)
      setFormData({ customerName: '', note: '', items: [] })
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || '创建销售单失败')
    }
  }

  const handleSubmitSale = async (id) => {
    if (!confirm('确定要提交这个销售单吗？提交后将减少库存。')) return
    try {
      await submitSale(storeId, id)
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || '提交失败')
    }
  }

  const handleCancelSale = async (id) => {
    if (!confirm('确定要取消这个销售单吗？')) return
    try {
      await cancelSale(storeId, id)
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || '取消失败')
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="sales">
      <div className="page-header">
        <Link to="/stores" className="back-link">← 返回门店列表</Link>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          新建销售单
        </button>
      </div>

      <h2>销售/出库管理</h2>

      <div className="filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">全部状态</option>
          <option value="DRAFT">草稿</option>
          <option value="SUBMITTED">已提交</option>
          <option value="CANCELLED">已取消</option>
        </select>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h3>新建销售单</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>客户名称</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
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
                <label>销售商品</label>
                <button type="button" className="btn btn-small" onClick={addItem}>添加商品</button>
                <div className="items-list">
                  {formData.items.map((item, index) => {
                    const stockQty = item.productId ? getStockQuantity(parseInt(item.productId)) : 0
                    return (
                      <div key={index} className="item-row">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(index, 'productId', e.target.value)}
                          required
                        >
                          <option value="">选择商品</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) - 库存: {getStockQuantity(p.id)}
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
                          max={stockQty}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="单价（可选）"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                        />
                        {item.productId && (
                          <span className="stock-info">
                            库存: {stockQty}
                          </span>
                        )}
                        <button type="button" className="btn btn-small btn-danger" onClick={() => removeItem(index)}>
                          删除
                        </button>
                      </div>
                    )
                  })}
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

      <table className="sales-table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>客户</th>
            <th>状态</th>
            <th>总金额</th>
            <th>商品数量</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td>{sale.orderNo}</td>
              <td>{sale.customerName || '-'}</td>
              <td>
                <span className={`status status-${sale.status.toLowerCase()}`}>
                  {sale.status === 'DRAFT' ? '草稿' : 
                   sale.status === 'SUBMITTED' ? '已提交' : '已取消'}
                </span>
              </td>
              <td>¥{sale.totalAmount?.toFixed(2) || '0.00'}</td>
              <td>{sale.items.length}</td>
              <td>{new Date(sale.createdAt).toLocaleString('zh-CN')}</td>
              <td>
                {sale.status === 'DRAFT' && (
                  <>
                    <button
                      className="btn btn-small btn-primary"
                      onClick={() => handleSubmitSale(sale.id)}
                    >
                      提交
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => handleCancelSale(sale.id)}
                    >
                      取消
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Sales
