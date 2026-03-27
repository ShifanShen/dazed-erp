import { apiClient } from './client'

export const getSales = async (storeId, status = null) => {
  const params = status ? { status } : {}
  const response = await apiClient.get(`/stores/${storeId}/sales`, { params })
  return response.data
}

export const getSale = async (storeId, id) => {
  const response = await apiClient.get(`/stores/${storeId}/sales/${id}`)
  return response.data
}

export const createSale = async (storeId, data) => {
  const response = await apiClient.post(`/stores/${storeId}/sales`, data)
  return response.data
}

export const updateSale = async (storeId, id, data) => {
  const response = await apiClient.put(`/stores/${storeId}/sales/${id}`, data)
  return response.data
}

export const submitSale = async (storeId, id) => {
  const response = await apiClient.post(`/stores/${storeId}/sales/${id}/submit`)
  return response.data
}

export const cancelSale = async (storeId, id) => {
  const response = await apiClient.post(`/stores/${storeId}/sales/${id}/cancel`)
  return response.data
}
