import { useState, useEffect } from 'react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/categories'
import { useAuth } from '../contexts/AuthContext'
import './Categories.css'

function Categories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({ code: '', name: '', description: '' })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await updateCategory(editing.id, formData)
      } else {
        await createCategory(formData)
      }
      setShowForm(false)
      setEditing(null)
      setFormData({ code: '', name: '', description: '' })
      loadCategories()
    } catch (err) {
      alert(err.response?.data?.message || '操作失败')
    }
  }

  const handleEdit = (cat) => {
    setEditing(cat)
    setFormData({ code: cat.code, name: cat.name, description: cat.description || '' })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个类目吗？')) return
    try {
      await deleteCategory(id)
      loadCategories()
    } catch (err) {
      alert(err.response?.data?.message || '删除失败')
    }
  }

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="categories">
      <div className="page-header">
        <h2>商品类目管理</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => {
            setShowForm(true)
            setEditing(null)
            setFormData({ code: '', name: '', description: '' })
          }}>
            新增类目
          </button>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => {
          setShowForm(false)
          setEditing(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? '编辑类目' : '新增类目'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>类目代码</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  disabled={!!editing}
                />
              </div>
              <div className="form-group">
                <label>类目名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">保存</button>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowForm(false)
                  setEditing(null)
                }}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="categories-grid">
        {categories.map((cat) => (
          <div key={cat.id} className="category-card">
            <h3>{cat.name}</h3>
            <p className="category-code">代码：{cat.code}</p>
            {cat.description && <p className="category-desc">{cat.description}</p>}
            {canEdit && (
              <div className="category-actions">
                <button className="btn btn-small" onClick={() => handleEdit(cat)}>编辑</button>
                {user?.role === 'ADMIN' && (
                  <button className="btn btn-small btn-danger" onClick={() => handleDelete(cat.id)}>删除</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Categories
