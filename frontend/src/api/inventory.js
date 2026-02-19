import client from './client'

export const getInventory = async (storeId) => {
  const response = await client.get(`/stores/${storeId}/inventory`)
  return response.data
}
