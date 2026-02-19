import client from './client'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'

export const exportLowStock = async (storeId) => {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_BASE}/stores/${storeId}/export/low-stock`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Export failed')
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `low_stock_${storeId}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export const exportStocktakeShortage = async (storeId, stocktakeId) => {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_BASE}/stores/${storeId}/export/stocktake/${stocktakeId}/shortage`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Export failed')
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shortage_${stocktakeId}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
