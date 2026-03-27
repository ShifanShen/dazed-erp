import client from './client'

export const getInventory = async (storeId, categoryId = null) => {
  const params = categoryId ? { categoryId } : {}
  const response = await client.get(`/stores/${storeId}/inventory`, { params })
  return response.data
}

export const getInventoryMovements = async (storeId, limit = 20) => {
  const response = await client.get(`/stores/${storeId}/inventory/movements`, {
    params: { limit },
  })
  return response.data
}
