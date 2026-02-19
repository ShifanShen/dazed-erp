import { apiClient } from './client'

export const getDashboardStats = async (storeId) => {
  const response = await apiClient.get(`/stores/${storeId}/stats/dashboard`)
  return response.data
}

export const getSalesTrend = async (storeId, days = 7) => {
  const response = await apiClient.get(`/stores/${storeId}/stats/sales-trend`, {
    params: { days }
  })
  return response.data
}

export const getTopProducts = async (storeId, days = 7, limit = 10) => {
  const response = await apiClient.get(`/stores/${storeId}/stats/top-products`, {
    params: { days, limit }
  })
  return response.data
}
