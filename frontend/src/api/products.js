import client from './client'

export const getProducts = async (categoryId = null, search = null) => {
  const params = new URLSearchParams()
  if (categoryId) params.append('categoryId', categoryId)
  if (search) params.append('search', search)
  const response = await client.get(`/products?${params.toString()}`)
  return response.data
}

export const getProduct = async (id) => {
  const response = await client.get(`/products/${id}`)
  return response.data
}

export const createProduct = async (data) => {
  const response = await client.post('/products', data)
  return response.data
}

export const updateProduct = async (id, data) => {
  const response = await client.put(`/products/${id}`, data)
  return response.data
}

export const deleteProduct = async (id) => {
  const response = await client.delete(`/products/${id}`)
  return response.data
}
