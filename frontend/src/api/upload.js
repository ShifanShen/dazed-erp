import client from './client'

export const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await client.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}
