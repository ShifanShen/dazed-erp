import client from './client'

export const getInventory = async (storeId, categoryId = null) => {
  const params = categoryId ? { categoryId } : {}
  const response = await client.get(`/stores/${storeId}/inventory`, { params })
  return response.data
}
