import client from './client'

export const getCategories = async () => {
  const response = await client.get('/categories')
  return response.data
}

export const createCategory = async (data) => {
  const response = await client.post('/categories', data)
  return response.data
}

export const updateCategory = async (id, data) => {
  const response = await client.put(`/categories/${id}`, data)
  return response.data
}

export const deleteCategory = async (id) => {
  const response = await client.delete(`/categories/${id}`)
  return response.data
}
