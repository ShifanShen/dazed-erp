import client from './client'

export const getStockIns = async (storeId) => {
  const response = await client.get(`/stores/${storeId}/stock-in`)
  return response.data
}

export const getStockIn = async (storeId, id) => {
  const response = await client.get(`/stores/${storeId}/stock-in/${id}`)
  return response.data
}

export const createStockIn = async (storeId, data) => {
  const response = await client.post(`/stores/${storeId}/stock-in`, data)
  return response.data
}

export const submitStockIn = async (storeId, id) => {
  const response = await client.post(`/stores/${storeId}/stock-in/${id}/submit`)
  return response.data
}
