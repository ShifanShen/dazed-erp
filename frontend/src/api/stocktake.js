import client from './client'

export const getStocktakes = async (storeId) => {
  const response = await client.get(`/stores/${storeId}/stocktakes`)
  return response.data
}

export const createStocktake = async (storeId, data) => {
  const response = await client.post(`/stores/${storeId}/stocktakes`, data)
  return response.data
}

export const submitStocktake = async (storeId, stocktakeId) => {
  const response = await client.post(
    `/stores/${storeId}/stocktakes/${stocktakeId}/submit`
  )
  return response.data
}
