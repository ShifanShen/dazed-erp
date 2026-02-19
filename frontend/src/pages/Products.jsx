import { useState, useEffect } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/products'
import { getCategories } from '../api/categories'
import { uploadImage } from '../api/upload'
import { useAuth } from '../contexts/AuthContext'
import './Products.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'

// 获取图片URL的辅助函数
function getImageUrl(imageUrl) {
  if (!imageUrl) return ''
  // 如果imageUrl已经是完整URL，直接返回
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  // 如果imageUrl是/uploads/filename格式，提取filename并使用/api/upload访问
  if (imageUrl.startsWith('/uploads/')) {
    const filename = imageUrl.replace('/uploads/', '')
    return `${API_BASE}/upload/${filename}`
  }
  // 如果imageUrl只是filename，直接使用
  return `${API_BASE}/upload/${imageUrl}`
}

function Products() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    unit: 'bottle',
    categoryId: null,
    imageUrl: '',
    lowStockThreshold: ''
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  useEffect(() => {
    loadProducts()
  }, [selectedCategory, searchKeyword])

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories', err)
    }
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await getProducts(selectedCategory, searchKeyword || null)
      setProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load products', err)
      alert('加载商品列表失败：' + (err.response?.data?.message || err.message))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      setUploading(true)
      const result = await uploadImage(file)
      setFormData({ ...formData, imageUrl: result.url })
    } catch (err) {
      alert('图片上传失败：' + (err.response?.data?.message || err.message))
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // 构建提交数据，确保categoryId为null时不发送
      const data = {
        // 编辑时保留SKU，新建时不传SKU（后端自动生成）
        ...(editing && formData.sku ? { sku: formData.sku.trim() } : {}),
        name: formData.name.trim(),
        unit: formData.unit,
        categoryId: formData.categoryId || null,
        imageUrl: formData.imageUrl || null,
        lowStockThreshold: formData.lowStockThreshold ? parseFloat(formData.lowStockThreshold) : null
      }
      
      // 新建商品时，如果没有选择类目，提示用户
      if (!editing && !formData.categoryId) {
        alert('请先选择商品类目，系统将自动生成SKU')
        return
      }
      
      if (editing) {
        await updateProduct(editing.id, data)
        alert('商品更新成功！')
      } else {
        await createProduct(data)
        alert('商品创建成功！')
      }
      setShowForm(false)
      setEditing(null)
      setFormData({ sku: '', name: '', unit: 'bottle', categoryId: null, imageUrl: '', lowStockThreshold: '' })
      loadProducts()
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || '操作失败，请重试'
      alert('错误：' + errorMsg)
      console.error('Product operation error:', err)
    }
  }

  const handleEdit = (product) => {
    setEditing(product)
    setFormData({
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl || '',
      lowStockThreshold: product.lowStockThreshold || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个商品吗？')) return
    try {
      await deleteProduct(id)
      loadProducts()
    } catch (err) {
      alert(err.response?.data?.message || '删除失败')
    }
  }

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="products">
      <div className="page-header">
        <h2>商品管理</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => {
            setShowForm(true)
            setEditing(null)
            setFormData({ sku: '', name: '', unit: 'bottle', categoryId: null, imageUrl: '', lowStockThreshold: '' })
          }}>
            新增商品
          </button>
        )}
      </div>

      <div className="filters">
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
          className="filter-select"
        >
          <option value="">所有类目</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="搜索商品名称或SKU..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="search-input"
        />
        {searchKeyword && (
          <button 
            className="btn btn-small btn-secondary"
            onClick={() => setSearchKeyword('')}
          >
            清除搜索
          </button>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => {
          setShowForm(false)
          setEditing(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? '编辑商品' : '新增商品'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>SKU</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.sku}
                    disabled
                    className="readonly-input"
                  />
                ) : (
                  <div className="sku-auto-generate">
                    <input
                      type="text"
                      value={formData.sku || '（将根据类目自动生成）'}
                      disabled
                      className="readonly-input"
                      style={{ fontStyle: 'italic', color: '#999' }}
                    />
                    <small className="form-hint">选择类目后，SKU将自动生成</small>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>商品名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>单位</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                >
                  <option value="bottle">瓶</option>
                  <option value="can">罐</option>
                  <option value="box">箱</option>
                  <option value="piece">件</option>
                </select>
              </div>
              <div className="form-group">
                <label>类目</label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">无类目</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>商品图片（可选）</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <p className="upload-status">上传中...</p>}
                {formData.imageUrl && (
                  <div className="image-preview">
                    <img src={getImageUrl(formData.imageUrl)} alt="Preview" onError={(e) => {
                      e.target.style.display = 'none'
                    }} />
                    <button 
                      type="button" 
                      className="btn btn-small btn-danger"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    >
                      删除图片
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>低库存阈值（可选）</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  placeholder="低于此数量时预警，例如：10"
                />
                <small className="form-hint">当库存低于此数量时，系统会提醒您补货</small>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={uploading}>保存</button>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowForm(false)
                  setEditing(null)
                }}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="empty-state">
          <p>暂无商品</p>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => {
              setShowForm(true)
              setEditing(null)
              setFormData({ sku: '', name: '', unit: 'bottle', categoryId: null, imageUrl: '', lowStockThreshold: '' })
            }}>
              立即添加商品
            </button>
          )}
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              {product.imageUrl ? (
                <div className="product-image">
                  <img src={getImageUrl(product.imageUrl)} alt={product.name} onError={(e) => {
                    e.target.style.display = 'none'
                  }} />
                </div>
              ) : (
                <div className="product-image-placeholder">
                  <span>暂无图片</span>
                </div>
              )}
              <h3>{product.name}</h3>
              <p className="product-sku">SKU: {product.sku}</p>
              <div className="product-info">
                {product.categoryName && <p className="product-category">类目：{product.categoryName}</p>}
                <p className="product-unit">单位：{product.unit}</p>
              </div>
              {product.lowStockThreshold && (
                <p className="product-threshold">⚠️ 低库存阈值：{product.lowStockThreshold}</p>
              )}
              {canEdit && (
                <div className="product-actions">
                  <button className="btn btn-small" onClick={() => handleEdit(product)}>编辑</button>
                  {user?.role === 'ADMIN' && (
                    <button className="btn btn-small btn-danger" onClick={() => handleDelete(product.id)}>删除</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Products
