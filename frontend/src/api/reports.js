import { apiClient } from './client'

export const getSalesReport = async (storeId, startDate, endDate) => {
  const response = await apiClient.get(`/stores/${storeId}/reports/sales`, {
    params: { startDate, endDate }
  })
  return response.data
}

export const getInventoryReport = async (storeId) => {
  const response = await apiClient.get(`/stores/${storeId}/reports/inventory`)
  return response.data
}
