import { Fragment, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCategories } from '../api/categories'
import { getInventory } from '../api/inventory'
import { getProducts } from '../api/products'
import { createStockIn, getStockIns, submitStockIn, updateStockIn } from '../api/stockIn'
import './StockIn.css'

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
    supplier: '',
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

function StockIn() {
  const { storeId } = useParams()
  const [stockIns, setStockIns] = useState([])
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
      const [stockInsData, productsData, inventoryData, categoriesData] = await Promise.all([
        getStockIns(storeId),
        getProducts(),
        getInventory(storeId),
        getCategories(),
      ])
      setStockIns(stockInsData)
      setProducts(productsData)
      setInventory(inventoryData)
      setCategories(categoriesData)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || '加载入库数据失败')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentStock = (productId) => {
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

  const openEditForm = (document) => {
    setEditingId(document.id)
    setFormData({
      supplier: document.supplier || '',
      note: document.note || '',
      items:
        document.items.length > 0
          ? document.items.map((item) => ({
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
      throw new Error('请至少填写一条入库商品')
    }

    const duplicated = new Set()
    for (const item of normalizedItems) {
      if (duplicated.has(item.productId)) {
        throw new Error('同一个商品在入库单里只能出现一次')
      }
      duplicated.add(item.productId)
      if (item.quantity <= 0) {
        throw new Error('入库数量必须大于 0')
      }
      if (item.unitPrice != null && item.unitPrice < 0) {
        throw new Error('入库单价不能小于 0')
      }
    }

    return {
      supplier: formData.supplier.trim(),
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
        await updateStockIn(storeId, editingId, payload)
      } else {
        await createStockIn(storeId, payload)
      }

      await loadData()
      closeForm()
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || '保存入库单失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitDocument = async (id) => {
    if (!window.confirm('确定提交这张入库单吗？提交后会立即增加库存。')) {
      return
    }
    try {
      await submitStockIn(storeId, id)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.message || '提交入库单失败')
    }
  }

  const filteredStockIns = stockIns.filter((document) => {
    if (statusFilter && document.status !== statusFilter) {
      return false
    }
    if (!search.trim()) {
      return true
    }
    const keyword = search.trim().toLowerCase()
    return (
      String(document.id).includes(keyword) ||
      document.supplier?.toLowerCase().includes(keyword) ||
      document.note?.toLowerCase().includes(keyword)
    )
  })

  const draftCount = stockIns.filter((document) => document.status === 'DRAFT').length
  const submittedCount = stockIns.filter((document) => document.status === 'SUBMITTED').length
  const submittedAmount = stockIns
    .filter((document) => document.status === 'SUBMITTED')
    .reduce((sum, document) => sum + Number(document.totalAmount || 0), 0)

  const formTotalQuantity = formData.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const formTotalAmount = formData.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  )

  const renderDocumentDetail = (document, isMobile = false) => (
    <div className={`stock-in-page__detail-panel${isMobile ? ' stock-in-page__detail-panel--mobile' : ''}`}>
      <div className="stock-in-page__detail-meta">
        <span>供应商：{document.supplier || '未填写'}</span>
        <span>操作人：{document.createdBy || '-'}</span>
        <span>提交时间：{formatDateTime(document.submittedAt)}</span>
      </div>
      {document.note && <p className="stock-in-page__detail-note">备注：{document.note}</p>}
      <div className="stock-in-page__detail-items">
        {document.items.map((item) => (
          <div key={item.id || item.productId} className="stock-in-page__detail-item">
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
      {document.status === 'DRAFT' && (
        <div className="stock-in-page__detail-actions">
          <button className="btn btn-secondary" onClick={() => openEditForm(document)}>
            继续编辑
          </button>
          <button className="btn btn-primary" onClick={() => handleSubmitDocument(document.id)}>
            提交入库
          </button>
        </div>
      )}
    </div>
  )

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="stock-in-page">
      <div className="stock-in-page__header">
        <div>
          <Link to="/stores" className="stock-in-page__back-link">
            ← 返回门店列表
          </Link>
          <span className="stock-in-page__eyebrow">入库管理</span>
          <h2>补货页面更聚焦，手机和桌面都能顺手处理</h2>
          <p className="stock-in-page__subtitle">
            草稿、明细和提交操作收进同一层级，移动端直接查看卡片，不再需要横向来回找按钮。
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateForm}>
          新建入库单
        </button>
      </div>

      <div className="stock-in-page__summary">
        <article className="stock-in-page__stat-card">
          <span>草稿单</span>
          <strong>{draftCount}</strong>
          <small>还未影响库存</small>
        </article>
        <article className="stock-in-page__stat-card">
          <span>已提交</span>
          <strong>{submittedCount}</strong>
          <small>已经完成补货入账</small>
        </article>
        <article className="stock-in-page__stat-card">
          <span>累计金额</span>
          <strong>{formatCurrency(submittedAmount)}</strong>
          <small>按已提交单据统计</small>
        </article>
      </div>

      <div className="stock-in-page__toolbar">
        <label>
          <span>状态</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="SUBMITTED">已提交</option>
          </select>
        </label>
        <label className="stock-in-page__toolbar-search">
          <span>搜索</span>
          <input
            type="text"
            placeholder="按单号、供应商、备注搜索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {error ? (
        <div className="error">错误：{error}</div>
      ) : (
        <div className="stock-in-page__table-card">
          <div className="stock-in-page__card-header">
            <h3>入库单列表</h3>
            <span>{filteredStockIns.length} 条记录</span>
          </div>
          {filteredStockIns.length === 0 ? (
            <div className="stock-in-page__empty">当前筛选条件下暂无入库单。</div>
          ) : (
            <>
              <table className="stock-in-page__table stock-in-page__table--desktop">
                <thead>
                  <tr>
                    <th>单号</th>
                    <th>供应商</th>
                    <th>状态</th>
                    <th>入库总量</th>
                    <th>金额</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockIns.map((document) => (
                    <Fragment key={document.id}>
                      <tr>
                        <td className="stock-in-page__mono">IN-{document.id}</td>
                        <td>{document.supplier || '-'}</td>
                        <td>
                          <span className={`stock-in-page__status stock-in-page__status--${document.status.toLowerCase()}`}>
                            {document.status === 'DRAFT' ? '草稿' : '已提交'}
                          </span>
                        </td>
                        <td>{formatNumber(document.totalQuantity)}</td>
                        <td>{formatCurrency(document.totalAmount)}</td>
                        <td>{formatDateTime(document.createdAt)}</td>
                        <td>
                          <button
                            className="btn btn-small btn-secondary"
                            onClick={() => setExpandedId(expandedId === document.id ? null : document.id)}
                          >
                            {expandedId === document.id ? '收起' : '查看'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === document.id && (
                        <tr>
                          <td colSpan="7" className="stock-in-page__detail-cell">
                            {renderDocumentDetail(document)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              <div className="stock-in-page__mobile-list">
                {filteredStockIns.map((document) => (
                  <article key={document.id} className="stock-in-page__mobile-card">
                    <div className="stock-in-page__mobile-top">
                      <div>
                        <strong>IN-{document.id}</strong>
                        <span>{document.supplier || '未填写供应商'}</span>
                      </div>
                      <span className={`stock-in-page__status stock-in-page__status--${document.status.toLowerCase()}`}>
                        {document.status === 'DRAFT' ? '草稿' : '已提交'}
                      </span>
                    </div>
                    <div className="stock-in-page__mobile-grid">
                      <div>
                        <label>入库总量</label>
                        <b>{formatNumber(document.totalQuantity)}</b>
                      </div>
                      <div>
                        <label>金额</label>
                        <b>{formatCurrency(document.totalAmount)}</b>
                      </div>
                      <div>
                        <label>创建时间</label>
                        <b>{formatDateTime(document.createdAt)}</b>
                      </div>
                      <div>
                        <label>操作人</label>
                        <b>{document.createdBy || '-'}</b>
                      </div>
                    </div>
                    {document.note && <p className="stock-in-page__mobile-note">备注：{document.note}</p>}
                    <button
                      className="btn btn-secondary stock-in-page__mobile-expand"
                      onClick={() => setExpandedId(expandedId === document.id ? null : document.id)}
                    >
                      {expandedId === document.id ? '收起明细' : '查看明细'}
                    </button>
                    {expandedId === document.id && renderDocumentDetail(document, true)}
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showForm && (
        <div className="stock-in-page__modal" onClick={closeForm}>
          <div className="stock-in-page__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="stock-in-page__modal-header">
              <div>
                <h3>{editingId ? `编辑入库单 IN-${editingId}` : '新建入库单'}</h3>
                <p>先整理供应商和补货商品，再决定保存草稿还是直接入库。</p>
              </div>
              <button className="stock-in-page__close" onClick={closeForm}>
                ×
              </button>
            </div>

            <div className="stock-in-page__form-grid">
              <label>
                <span>供应商</span>
                <input
                  type="text"
                  placeholder="例如：华东酒水供应商"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </label>
              <label>
                <span>备注</span>
                <input
                  type="text"
                  placeholder="补货说明、批次信息等"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </label>
            </div>

            <div className="stock-in-page__picker-bar">
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

            {formError && <div className="stock-in-page__form-error">{formError}</div>}

            <div className="stock-in-page__line-items">
              {formData.items.map((item, index) => {
                const productId = item.productId ? Number(item.productId) : null
                const currentStock = productId ? getCurrentStock(productId) : 0
                const nextStock = currentStock + Number(item.quantity || 0)
                const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0)

                return (
                  <div key={index} className="stock-in-page__line-row">
                    <label className="stock-in-page__line-field stock-in-page__line-field--product">
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
                    <div className="stock-in-page__line-field">
                      <span>当前库存</span>
                      <strong>{productId ? formatNumber(currentStock) : '-'}</strong>
                    </div>
                    <label className="stock-in-page__line-field">
                      <span>入库数量</span>
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
                    <label className="stock-in-page__line-field">
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
                    <div className="stock-in-page__line-field">
                      <span>小计</span>
                      <strong>{lineTotal > 0 ? formatCurrency(lineTotal) : '-'}</strong>
                    </div>
                    <div className="stock-in-page__line-field">
                      <span>入库后</span>
                      <strong>{productId ? formatNumber(nextStock) : '-'}</strong>
                    </div>
                    <button
                      type="button"
                      className="btn btn-small btn-danger stock-in-page__remove-btn"
                      onClick={() => removeItem(index)}
                    >
                      删除
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="stock-in-page__form-summary">
              <span>商品行数 {formData.items.filter((item) => item.productId).length}</span>
              <span>入库总量 {formatNumber(formTotalQuantity)}</span>
              <span>金额合计 {formatCurrency(formTotalAmount)}</span>
            </div>

            <div className="stock-in-page__form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeForm}>
                取消
              </button>
              <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => handleSave(false)}>
                {submitting ? '保存中...' : editingId ? '更新草稿' : '保存草稿'}
              </button>
              <button type="button" className="btn btn-primary" disabled={submitting} onClick={() => handleSave(true)}>
                {submitting ? '提交中...' : editingId ? '更新并提交' : '直接提交入库'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StockIn
