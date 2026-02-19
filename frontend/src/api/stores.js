import client from './client'

export const getStores = async () => {
  const response = await client.get('/stores')
  return response.data
}

export const getStore = async (storeId) => {
  const response = await client.get(`/stores/${storeId}`)
  return response.data
}
