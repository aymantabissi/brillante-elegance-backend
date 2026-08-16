import axios from 'axios'

const GRAPH_API_VERSION = 'v20.0'

// =====================================================
// Normalise un numero marocain vers le format E.164
// sans "+" attendu par l'API (ex: 0612345678 -> 212612345678)
// =====================================================
const normalizeMoroccanPhone = (phone) => {
  const digits = String(phone).replace(/\D/g, '')
  if (digits.startsWith('212')) return digits
  if (digits.startsWith('0')) return '212' + digits.slice(1)
  return digits
}

// =====================================================
// Helper generique — envoie un message template via
// WhatsApp Cloud API. N'echoue jamais bruyamment — la
// creation/mise a jour de commande ne doit jamais
// dependre de WhatsApp.
// =====================================================
const sendTemplateMessage = async ({ to, templateName, languageCode, parameters, label }) => {
  const token         = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    console.log('WhatsApp Cloud API non configuree —', label, 'non envoye')
    return
  }

  try {
    await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: 'body',
              parameters: parameters.map((text) => ({ type: 'text', text })),
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('WhatsApp —', label, 'envoye a', to)
  } catch (error) {
    console.error('WhatsApp send error (' + label + '):', error.response?.data || error.message)
  }
}

// =====================================================
// Envoie le message template de confirmation au client
// juste apres la creation de la commande.
// =====================================================
export const sendOrderConfirmation = async (order) => {
  const orderCode = order._id.toString().slice(-6).toUpperCase()

  const deliveryText = order.deliveryMethod === 'safi_10dh'
    ? 'Safi — 10 MAD'
    : 'Hors Safi — 35 MAD'

  await sendTemplateMessage({
    to: normalizeMoroccanPhone(order.client.phone),
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'order_confirmation',
    languageCode: process.env.WHATSAPP_TEMPLATE_LANG || 'fr',
    parameters: [
      order.client.name,
      orderCode,
      String(order.total),
      deliveryText,
    ],
    label: 'confirmation client',
  })
}

// =====================================================
// Notifie l'admin (proprietaire de la boutique) sur son
// propre WhatsApp qu'une nouvelle commande vient d'arriver.
// =====================================================
export const sendAdminOrderNotification = async (order) => {
  const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER

  if (!adminNumber) {
    console.log('WHATSAPP_ADMIN_NUMBER non configure — notification admin non envoyee')
    return
  }

  const orderCode = order._id.toString().slice(-6).toUpperCase()

  const deliveryText = order.deliveryMethod === 'safi_10dh'
    ? 'Safi — 10 MAD'
    : 'Hors Safi — 35 MAD'

  const itemsText = order.items
    .map((item) => `• ${item.name} x${item.qty} — ${(item.price * item.qty).toFixed(2)} MAD`)
    .join('\n')

  await sendTemplateMessage({
    to: normalizeMoroccanPhone(adminNumber),
    templateName: process.env.WHATSAPP_ADMIN_TEMPLATE_NAME || 'new_order_admin',
    languageCode: process.env.WHATSAPP_TEMPLATE_LANG || 'fr',
    parameters: [
      orderCode,
      order.client.name,
      order.client.phone,
      order.client.address,
      itemsText,
      String(order.total),
      deliveryText,
    ],
    label: 'notification admin',
  })
}
