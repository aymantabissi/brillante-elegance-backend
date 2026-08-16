import axios from 'axios'

const COLISSPEED_API =
  process.env.COLISSPEED_API ||
  'https://app.colisspeed.com/seller/api-parcels'

const COLISSPEED_TOKEN = process.env.COLISSPEED_TOKEN

export const createColisSpeedOrder = async (order) => {
  if (!COLISSPEED_TOKEN) {
    throw new Error('COLISSPEED_TOKEN is not configured')
  }

  const firstItem = order.items?.[0]

  const marchandise =
    order.items
      ?.map((item) => `${item.name} x${item.qty}`)
      .join(', ') || 'Commande Brillante Elegance'

  const marchandiseQty =
    order.items?.reduce((total, item) => total + Number(item.qty || 0), 0) || 1

  const formData = new URLSearchParams()

  formData.append('action', 'add')
  formData.append('token', COLISSPEED_TOKEN)

  formData.append('name', order.client.name)
  formData.append('phone', order.client.phone)
  formData.append('marchandise', marchandise)
  formData.append('marchandise_qty', String(marchandiseQty))
  formData.append('ville', order.client.city)
  formData.append('adresse', order.client.address)
  formData.append('note', order.note || '')

  // 0 = colis normal / sans stock
  formData.append('stock', '0')

  // On utilise productId comme SKU
  formData.append(
    'products[0][sku]',
    firstItem?.productId || 'BRILLANTE-COMMANDE'
  )

  formData.append(
    'products[0][qty]',
    String(firstItem?.qty || 1)
  )

  formData.append('price', String(order.total))

  const response = await axios.post(
    COLISSPEED_API,
    formData.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  return response.data
}