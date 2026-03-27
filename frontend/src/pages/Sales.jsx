import { Fragment, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCategories } from '../api/categories'
import { getInventory } from '../api/inventory'
import { getProducts } from '../api/products'
import { cancelSale, createSale, getSales, submitSale, updateSale } from '../api/sales'
import './Sales.css'

const numberFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
})

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
})

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function createEmptyItem() {
  return { productId: '', quantity: '', unitPrice: '' }
}

function createEmptyForm() {
  return {
    customerName: '',
    note: '',
    items: [createEmptyItem()],
  }
}

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0))
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0))
}

function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : '-'
}

function getOrderStatusLabel(status) {
  if (status === 'DRAFT') {
    return '草稿'
  }
  if (status === 'SUBMITTED') {
    return '已提交'
  }
  return '已取消'
}

function Sales() {
  const { storeId } = useParams()
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('')
  const [formData, setFormData] = useState(createEmptyForm())

  useEffect(() => {
    loadData()
  }, [storeId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [salesData, productsData, inventoryData, categoriesData] = await Promise.all([
        getSales(storeId),
        getProducts(),
        getInventory(storeId),
        getCategories(),
      ])
      setSales(salesData)
      setProducts(productsData)
      setInventory(inventoryData)
      setCategories(categoriesData)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || '加载销售数据失败')
    } finally {
      setLoading(false)
    }
  }

  const getStockQuantity = (productId) => {
    const target = inventory.find((item) => item.productId === productId)
    return Number(target?.quantity || 0)
  }

  const openCreateForm = () => {
    setEditingId(null)
    setFormData(createEmptyForm())
    setProductCategoryFilter('')
    setFormError('')
    setShowForm(true)
  }

  const openEditForm = (order) => {
    setEditingId(order.id)
    setFormData({
      customerName: order.customerName || '',
      note: order.note || '',
      items:
        order.items.length > 0
          ? order.items.map((item) => ({
              productId: String(item.productId),
              quantity: String(item.quantity ?? ''),
              unitPrice: item.unitPrice != null ? String(item.unitPrice) : '',
            }))
          : [createEmptyItem()],
    })
    setProductCategoryFilter('')
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(createEmptyForm())
    setProductCategoryFilter('')
    setFormError('')
  }

  const updateItem = (index, field, value) => {
    const nextItems = [...formData.items]
    nextItems[index] = { ...nextItems[index], [field]: value }
    setFormData({ ...formData, items: nextItems })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, createEmptyItem()],
    })
  }

  const removeItem = (index) => {
    const nextItems = formData.items.filter((_, itemIndex) => itemIndex !== index)
    setFormData({
      ...formData,
      items: nextItems.length > 0 ? nextItems : [createEmptyItem()],
    })
  }

  const getSelectableProducts = (currentIndex) => {
    const selectedIds = formData.items
      .map((item, index) => (index === currentIndex ? null : item.productId))
      .filter(Boolean)

    return products.filter((product) => {
      if (productCategoryFilter && product.categoryId !== Number(productCategoryFilter)) {
        return false
      }
      return !selectedIds.includes(String(product.id))
    })
  }

  const buildPayload = () => {
    const normalizedItems = formData.items
      .filter((item) => item.productId && item.quantity !== '')
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice === '' ? null : Number(item.unitPrice),
      }))

    if (normalizedItems.length === 0) {
      throw new Error('请至少填写一条出库商品')
    }

    const duplicated = new Set()
    for (const item of normalizedItems) {
      if (duplicated.has(item.productId)) {
        throw new Error('同一个商品在销售单里只能出现一次')
      }
      duplicated.add(item.productId)
      if (item.quantity <= 0) {
        throw new Error('出库数量必须大于 0')
      }
      if (item.unitPrice != null && item.unitPrice < 0) {
        throw new Error('销售单价不能小于 0')
      }

      const available = getStockQuantity(item.productId)
      if (item.quantity > available) {
        const product = products.find((target) => target.id === item.productId)
        throw new Error(`商品 ${product?.name || item.productId} 库存不足，当前库存为 ${formatNumber(available)}`)
      }
    }

    return {
      customerName: formData.customerName.trim(),
      note: formData.note.trim(),
      items: normalizedItems,
    }
  }

  const handleSave = async (submitDirectly) => {
    try {
      setSubmitting(true)
      setFormError('')
      const payload = {
        ...buildPayload(),
        submit: submitDirectly,
      }

      if (editingId) {
        await updateSale(storeId, editingId, payload)
      } else {
        await createSale(storeId, payload)
      }

      await loadData()
      closeForm()
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || '保存销售单失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitOrder = async (id) => {
    if (!window.confirm('确定提交这张销售单吗？提交后会立即扣减库存。')) {
      return
    }
    try {
      await submitSale(storeId, id)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || '提交销售单失败')
    }
  }

  const handleCancelOrder = async (id) => {
    if (!window.confirm('确定取消这张销售单吗？')) {
      return
    }
    try {
      await cancelSale(storeId, id)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || '取消销售单失败')
    }
  }

  const filteredSales = sales.filter((order) => {
    if (statusFilter && order.status !== statusFilter) {
      return false
    }
    if (!search.trim()) {
      return true
    }
    const keyword = search.trim().toLowerCase()
    return (
      order.orderNo?.toLowerCase().includes(keyword) ||
      order.customerName?.toLowerCase().includes(keyword) ||
      order.note?.toLowerCase().includes(keyword)
    )
  })

  const draftCount = sales.filter((order) => order.status === 'DRAFT').length
  const submittedCount = sales.filter((order) => order.status === 'SUBMITTED').length
  const submittedAmount = sales
    .filter((order) => order.status === 'SUBMITTED')
    .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)

  const formTotalQuantity = formData.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const formTotalAmount = formData.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  )

  const renderOrderDetail = (order, isMobile = false) => (
    <div className={`sales-page__detail-panel${isMobile ? ' sales-page__detail-panel--mobile' : ''}`}>
      <div className="sales-page__detail-meta">
        <span>客户：{order.customerName || '未填写'}</span>
        <span>操作人：{order.createdBy || '-'}</span>
        <span>提交时间：{formatDateTime(order.submittedAt)}</span>
      </div>
      {order.note && <p className="sales-page__detail-note">备注：{order.note}</p>}
      <div className="sales-page__detail-items">
        {order.items.map((item) => (
          <div key={item.id || item.productId} className="sales-page__detail-item">
            <div>
              <strong>{item.productName}</strong>
              <span>{item.productSku}</span>
            </div>
            <span>数量 {formatNumber(item.quantity)}</span>
            <span>单价 {item.unitPrice != null ? formatCurrency(item.unitPrice) : '-'}</span>
            <span>小计 {item.totalPrice != null ? formatCurrency(item.totalPrice) : '-'}</span>
          </div>
        ))}
      </div>
      {order.status === 'DRAFT' && (
        <div className="sales-page__detail-actions">
          <button className="btn btn-secondary" onClick={() => openEditForm(order)}>
            继续编辑
          </button>
          <button className="btn btn-primary" onClick={() => handleSubmitOrder(order.id)}>
            提交出库
          </button>
          <button className="btn btn-danger" onClick={() => handleCancelOrder(order.id)}>
            取消草稿
          </button>
        </div>
      )}
    </div>
  )

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="sales-page">
      <div className="sales-page__header">
        <div>
          <Link to="/stores" className="sales-page__back-link">
            ← 返回门店列表
          </Link>
          <span className="sales-page__eyebrow">销售出库</span>
          <h2>销售流程更清爽，重点操作全部收进详情</h2>
          <p className="sales-page__subtitle">
            桌面端继续看列表，手机端切换成卡片；草稿只保留查看、继续编辑、提交和取消四个动作。
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateForm}>
          新建销售单
        </button>
      </div>

      <div className="sales-page__summary">
        <article className="sales-page__stat-card">
          <span>草稿单</span>
          <strong>{draftCount}</strong>
          <small>还未扣减库存</small>
        </article>
        <article className="sales-page__stat-card">
          <span>已提交</span>
          <strong>{submittedCount}</strong>
          <small>已经完成出库</small>
        </article>
        <article className="sales-page__stat-card sales-page__stat-card--accent">
          <span>累计销售额</span>
          <strong>{formatCurrency(submittedAmount)}</strong>
          <small>按已提交单据统计</small>
        </article>
      </div>

      <div className="sales-page__toolbar">
        <label>
          <span>状态</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="SUBMITTED">已提交</option>
            <option value="CANCELLED">已取消</option>
          </select>
        </label>
        <label className="sales-page__toolbar-search">
          <span>搜索</span>
          <input
            type="text"
            placeholder="按订单号、客户、备注搜索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {error ? (
        <div className="error">错误：{error}</div>
      ) : (
        <div className="sales-page__table-card">
          <div className="sales-page__card-header">
            <h3>销售单列表</h3>
            <span>{filteredSales.length} 条记录</span>
          </div>
          {filteredSales.length === 0 ? (
            <div className="sales-page__empty">当前筛选条件下暂无销售单。</div>
          ) : (
            <>
              <table className="sales-page__table sales-page__table--desktop">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>客户</th>
                    <th>状态</th>
                    <th>出库总量</th>
                    <th>总金额</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((order) => (
                    <Fragment key={order.id}>
                      <tr>
                        <td className="sales-page__mono">{order.orderNo}</td>
                        <td>{order.customerName || '-'}</td>
                        <td>
                          <span className={`sales-page__status sales-page__status--${order.status.toLowerCase()}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td>{formatNumber(order.totalQuantity)}</td>
                        <td>{formatCurrency(order.totalAmount)}</td>
                        <td>{formatDateTime(order.createdAt)}</td>
                        <td>
                          <button
                            className="btn btn-small btn-secondary"
                            onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                          >
                            {expandedId === order.id ? '收起' : '查看'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === order.id && (
                        <tr>
                          <td colSpan="7" className="sales-page__detail-cell">
                            {renderOrderDetail(order)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              <div className="sales-page__mobile-list">
                {filteredSales.map((order) => (
                  <article key={order.id} className="sales-page__mobile-card">
                    <div className="sales-page__mobile-top">
                      <div>
                        <strong>{order.orderNo}</strong>
                        <span>{order.customerName || '未填写客户'}</span>
                      </div>
                      <span className={`sales-page__status sales-page__status--${order.status.toLowerCase()}`}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="sales-page__mobile-grid">
                      <div>
                        <label>出库总量</label>
                        <b>{formatNumber(order.totalQuantity)}</b>
                      </div>
                      <div>
                        <label>总金额</label>
                        <b>{formatCurrency(order.totalAmount)}</b>
                      </div>
                      <div>
                        <label>创建时间</label>
                        <b>{formatDateTime(order.createdAt)}</b>
                      </div>
                      <div>
                        <label>操作人</label>
                        <b>{order.createdBy || '-'}</b>
                      </div>
                    </div>
                    {order.note && <p className="sales-page__mobile-note">备注：{order.note}</p>}
                    <button
                      className="btn btn-secondary sales-page__mobile-expand"
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    >
                      {expandedId === order.id ? '收起明细' : '查看明细'}
                    </button>
                    {expandedId === order.id && renderOrderDetail(order, true)}
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showForm && (
        <div className="sales-page__modal" onClick={closeForm}>
          <div className="sales-page__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sales-page__modal-header">
              <div>
                <h3>{editingId ? `编辑销售单 ${sales.find((item) => item.id === editingId)?.orderNo || ''}` : '新建销售单'}</h3>
                <p>先整理客户和商品，再决定保存草稿还是直接提交出库。</p>
              </div>
              <button className="sales-page__close" onClick={closeForm}>
                ×
              </button>
            </div>

            <div className="sales-page__form-grid">
              <label>
                <span>客户名称</span>
                <input
                  type="text"
                  placeholder="例如：零售散客 / 会员客户"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </label>
              <label>
                <span>备注</span>
                <input
                  type="text"
                  placeholder="桌台、渠道、特殊说明等"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </label>
            </div>

            <div className="sales-page__picker-bar">
              <label>
                <span>商品类目</span>
                <select value={productCategoryFilter} onChange={(e) => setProductCategoryFilter(e.target.value)}>
                  <option value="">全部商品</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-secondary" onClick={addItem}>
                添加商品
              </button>
            </div>

            {formError && <div className="sales-page__form-error">{formError}</div>}

            <div className="sales-page__line-items">
              {formData.items.map((item, index) => {
                const productId = item.productId ? Number(item.productId) : null
                const currentStock = productId ? getStockQuantity(productId) : 0
                const nextStock = currentStock - Number(item.quantity || 0)
                const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)
                const hasRisk = productId && nextStock < 0

                return (
                  <div key={index} className="sales-page__line-row">
                    <label className="sales-page__line-field sales-page__line-field--product">
                      <span>商品</span>
                      <select value={item.productId} onChange={(e) => updateItem(index, 'productId', e.target.value)}>
                        <option value="">选择商品</option>
                        {getSelectableProducts(index).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="sales-page__line-field">
                      <span>当前库存</span>
                      <strong>{productId ? formatNumber(currentStock) : '-'}</strong>
                    </div>
                    <label className="sales-page__line-field">
                      <span>出库数量</span>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        inputMode="decimal"
                        placeholder="数量"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      />
                    </label>
                    <label className="sales-page__line-field">
                      <span>单价</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="单价"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                      />
                    </label>
                    <div className="sales-page__line-field">
                      <span>小计</span>
                      <strong>{lineTotal > 0 ? formatCurrency(lineTotal) : '-'}</strong>
                    </div>
                    <div className="sales-page__line-field">
                      <span>出库后</span>
                      <strong className={hasRisk ? 'sales-page__danger-text' : ''}>
                        {productId ? formatNumber(nextStock) : '-'}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="btn btn-small btn-danger sales-page__remove-btn"
                      onClick={() => removeItem(index)}
                    >
                      删除
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="sales-page__form-summary">
              <span>商品行数 {formData.items.filter((item) => item.productId).length}</span>
              <span>出库总量 {formatNumber(formTotalQuantity)}</span>
              <span>金额合计 {formatCurrency(formTotalAmount)}</span>
            </div>

            <div className="sales-page__form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeForm}>
                取消
              </button>
              <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => handleSave(false)}>
                {submitting ? '保存中...' : editingId ? '更新草稿' : '保存草稿'}
              </button>
              <button type="button" className="btn btn-primary" disabled={submitting} onClick={() => handleSave(true)}>
                {submitting ? '提交中...' : editingId ? '更新并提交' : '直接提交出库'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sales
