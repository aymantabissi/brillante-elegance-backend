import express from 'express'
import asyncHandler from 'express-async-handler'
import Order from '../models/Order.js'
import PromoCode from '../models/PromoCode.js'
import User from '../models/User.js'
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

// =====================================================
// AFFILIATION — credite la commission d'un creator
// une fois la commande livree ET payee (une seule fois)
// =====================================================
const creditCommissionIfEligible = async (order) => {
  if (
    !order.creator ||
    order.commissionCredited ||
    order.orderStatus !== 'delivered' ||
    order.paymentStatus !== 'paid' ||
    !(order.commissionAmount > 0)
  ) {
    return
  }

  await User.findByIdAndUpdate(order.creator, {
    $inc: { balance: order.commissionAmount },
  })

  order.commissionCredited = true
  await order.save()
}

// =====================================================
// AFFILIATION — commission du creator = 10% du sous-total
// des produits (hors frais de livraison)
// =====================================================
const CREATOR_COMMISSION_PERCENT = 10

const resolveCommission = async (promoCode, items) => {
  if (!promoCode) return { creator: null, commissionAmount: 0 }

  const promo = await PromoCode.findOne({ code: promoCode.toUpperCase() })
  if (!promo || !promo.owner) return { creator: null, commissionAmount: 0 }

  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const commissionAmount = Number((itemsSubtotal * CREATOR_COMMISSION_PERCENT / 100).toFixed(2))

  return { creator: promo.owner, commissionAmount }
}

// =====================================================
// COLISSPEED CONFIG
// =====================================================

const COLISSPEED_URL = 'https://app.colisspeed.com/seller/api-parcels'

// =====================================================
// HELPER — Send order to ColisSpeed
// =====================================================

const sendToColisSpeed = async (order) => {
  const token = process.env.COLISSPEED_TOKEN

  console.log('Token exists:', !!token)
  console.log('Token length:', token?.length)

  if (!token) {
    throw new Error('COLISSPEED_TOKEN manquant dans .env')
  }

  const formData = new URLSearchParams()

  formData.append('action', 'add')
  formData.append('token', token)

  formData.append('name', order.client.name)
  formData.append('phone', order.client.phone)
  formData.append('ville', order.client.city)
  formData.append('adresse', order.client.address)

  formData.append('note', order.note || '')

  const merchandise = order.items
    .map(item => `${item.name} x${item.qty}`)
    .join(', ')

  formData.append('marchandise', merchandise)

  const totalQty = order.items.reduce(
    (sum, item) => sum + Number(item.qty),
    0
  )

  formData.append('marchandise_qty', String(totalQty))

  formData.append('stock', '0')
  formData.append('price', String(order.total))

  order.items.forEach((item, index) => {
    formData.append(
      `products[${index}][sku]`,
      item.productId || `PRODUCT-${index + 1}`
    )

    formData.append(
      `products[${index}][qty]`,
      String(item.qty)
    )
  })

  const response = await fetch(
    'https://app.colisspeed.com/seller/api-parcels',
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }
  )

  const text = await response.text()

  console.log('ColisSpeed HTTP:', response.status)
  console.log('ColisSpeed RAW:', text)

  let data

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(
      `Réponse ColisSpeed invalide: ${text}`
    )
  }

  if (data.status !== 200) {
    throw new Error(
      data.msg || 'Erreur ColisSpeed'
    )
  }

  return data
}

// =====================================================
// HELPER — Track order on ColisSpeed
// =====================================================

const trackColisSpeed = async (tracking) => {
  const token = process.env.COLISSPEED_TOKEN

  if (!token) {
    throw new Error('COLISSPEED_TOKEN manquant dans .env')
  }

  const formData = new URLSearchParams()

  formData.append('action', 'track')
  formData.append('token', token)
  formData.append('tracking', tracking)

  const response = await fetch(COLISSPEED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  const data = await response.json()

  console.log('ColisSpeed tracking response:', data)

  if (!data.status) {
    throw new Error(
      data.msg || 'Aucune information trouvée'
    )
  }

  return data
}

// =====================================================
// POST — Send order to ColisSpeed
// Manager / Admin
// POST /api/orders/:id/colisspeed
// =====================================================
router.post(
  '/:id/colisspeed',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    console.log('Token exists:', !!process.env.COLISSPEED_TOKEN)
    console.log('Token length:', process.env.COLISSPEED_TOKEN?.length)

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    // Déjà envoyée
    if (order.colisSpeed?.tracking) {
      return res.status(400).json({
        message: 'Cette commande a déjà été envoyée à ColisSpeed',
        tracking: order.colisSpeed.tracking,
      })
    }

    const response = await fetch(
      'https://app.colisspeed.com/seller/api-parcels',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'add',
          token: process.env.COLISSPEED_TOKEN,

          name: order.client.name,
          phone: order.client.phone,
          marchandise: order.items
            .map(item => `${item.name} x${item.qty}`)
            .join(', '),

          marchandise_qty: String(
            order.items.reduce((sum, item) => sum + item.qty, 0)
          ),

          ville: order.client.city,
          adresse: order.client.address,
          note: order.note || '',

          stock: '0',

          price: String(order.total),
        }),
      }
    )

    const data = await response.json()

    console.log('ColisSpeed response:', data)

    if (data.status !== 200) {
      return res.status(400).json({
        message: data.msg || 'Erreur ColisSpeed',
        colisspeed: data,
      })
    }

    order.colisSpeed = {
      tracking: data.tracking,
      status: 'En attente',
      paymentStatus: 'Non payé',
      lastUpdate: new Date(),
    }

    await order.save()

    res.json({
      message: 'Commande envoyée à ColisSpeed',
      tracking: data.tracking,
      order,
    })
  })
)

// =====================================================
// POST — CREATE ORDER
// POST /api/orders
// PUBLIC
// =====================================================
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      client,
      items,
      total,
      note,
      paymentStatus,
      orderStatus,
      deliveryMethod,
      promoCode,
    } = req.body

    // -----------------------------------------
    // Validation
    // -----------------------------------------

    if (
      !client ||
      !client.name ||
      !client.phone ||
      !client.city ||
      !client.address
    ) {
      return res.status(400).json({
        message: 'Les informations du client sont obligatoires',
      })
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: 'La commande doit contenir au moins un article',
      })
    }

    if (total === undefined || total === null) {
      return res.status(400).json({
        message: 'Le total est obligatoire',
      })
    }

    // -----------------------------------------
    // Affiliation — resoudre le creator + la commission
    // -----------------------------------------

    const { creator, commissionAmount } = await resolveCommission(promoCode, items)

    // -----------------------------------------
    // Create local order
    // -----------------------------------------

    const order = await Order.create({
      client,
      items,
      total,
      note: note || '',

      paymentStatus:
        paymentStatus || 'pending',

      orderStatus:
        orderStatus || 'not_processed',

      deliveryMethod:
        deliveryMethod || 'outside_safi_35dh',

      promoCode: promoCode || '',
      creator,
      commissionAmount,

      colisSpeed: {},
    })

    // -----------------------------------------
    // Send to ColisSpeed
    // -----------------------------------------

    try {
      const colisSpeedData =
        await sendToColisSpeed(order)

      order.colisSpeed = {
        tracking: colisSpeedData.tracking || '',
        status: 'Commande créée',
        paymentStatus: 'En attente',
        lastUpdate: new Date(),
      }

      await order.save()

    } catch (error) {
      console.error(
        'ColisSpeed error:',
        error.message
      )

      // La commande reste enregistrée
      // même si ColisSpeed échoue

      order.colisSpeed = {
        tracking: '',
        status: 'Erreur envoi ColisSpeed',
        paymentStatus: '',
        lastUpdate: new Date(),
      }

      await order.save()

      return res.status(201).json({
        message:
          'Commande créée mais impossible de l\'envoyer à ColisSpeed',
        order,
        colisSpeedError: error.message,
      })
    }

    // -----------------------------------------
    // Success
    // -----------------------------------------

    res.status(201).json({
      message: 'Commande créée avec succès',
      order,
      tracking: order.colisSpeed.tracking,
    })
  })
)

// =====================================================
// GET — ALL ORDERS
// GET /api/orders
// MANAGER / ADMIN
// =====================================================

router.get(
  '/',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    const orders = await Order.find()
      .sort({ createdAt: -1 })

    res.json(orders)
  })
)

// =====================================================
// GET — STATS
// GET /api/orders/stats
// MANAGER / ADMIN
// =====================================================

router.get(
  '/stats',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    const totalOrders =
      await Order.countDocuments()

    const totalRevenue =
      await Order.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$total',
            },
          },
        },
      ])

    const pending =
      await Order.countDocuments({
        paymentStatus: 'pending',
      })

    const paid =
      await Order.countDocuments({
        paymentStatus: 'paid',
      })

    const cancelled =
      await Order.countDocuments({
        paymentStatus: 'cancelled',
      })

    const notProcessed =
      await Order.countDocuments({
        orderStatus: 'not_processed',
      })

    const shipping =
      await Order.countDocuments({
        orderStatus: 'shipping',
      })

    const delivered =
      await Order.countDocuments({
        orderStatus: 'delivered',
      })

    res.json({
      totalOrders,

      totalRevenue:
        totalRevenue[0]?.total || 0,

      payment: {
        pending,
        paid,
        cancelled,
      },

      processing: {
        notProcessed,
        shipping,
        delivered,
      },
    })
  })
)

// =====================================================
// GET — SINGLE ORDER
// GET /api/orders/:id
// MANAGER / ADMIN
// =====================================================

router.get(
  '/:id',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    const order =
      await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    res.json(order)
  })
)

// =====================================================
// GET — TRACK COLISSPEED
// GET /api/orders/:id/tracking
// MANAGER / ADMIN
// =====================================================

router.get(
  '/:id/tracking',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    const order =
      await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    if (!order.colisSpeed?.tracking) {
      return res.status(400).json({
        message:
          'Cette commande n\'a pas encore de numéro de tracking ColisSpeed',
      })
    }

    try {
      const trackingData =
        await trackColisSpeed(
          order.colisSpeed.tracking
        )

      // -----------------------------------------
      // Get last status
      // -----------------------------------------

      if (
        trackingData.msg &&
        trackingData.msg.length > 0
      ) {
        const last =
          trackingData.msg[
            trackingData.msg.length - 1
          ]

        order.colisSpeed.status =
          last.status || ''

        order.colisSpeed.paymentStatus =
          last.etat || ''

        order.colisSpeed.lastUpdate =
          new Date()

        if (
          last.status === 'Livré'
        ) {
          order.orderStatus =
            'delivered'
        }

        await order.save()

        await creditCommissionIfEligible(order)
      }

      res.json({
        success: true,
        tracking: trackingData.tracking,
        history: trackingData.msg,
        delivery: trackingData.delivery,
        order,
      })

    } catch (error) {
      return res.status(400).json({
        message:
          'Impossible de récupérer le tracking ColisSpeed',
        error: error.message,
      })
    }
  })
)

// =====================================================
// PUT — UPDATE ORDER
// PUT /api/orders/:id
// MANAGER / ADMIN
// =====================================================

router.put(
  '/:id',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    const {
      client,
      items,
      total,
      note,
      paymentStatus,
      orderStatus,
      deliveryMethod,
    } = req.body

    const order =
      await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    if (client !== undefined)
      order.client = client

    if (items !== undefined)
      order.items = items

    if (total !== undefined)
      order.total = total

    if (note !== undefined)
      order.note = note

    if (paymentStatus !== undefined)
      order.paymentStatus = paymentStatus

    if (orderStatus !== undefined)
      order.orderStatus = orderStatus

    if (deliveryMethod !== undefined)
      order.deliveryMethod = deliveryMethod

    const updatedOrder =
      await order.save()

    await creditCommissionIfEligible(updatedOrder)

    res.json(updatedOrder)
  })
)

// =====================================================
// PATCH — PAYMENT STATUS
// PATCH /api/orders/:id/payment
// MANAGER / ADMIN
// =====================================================

router.patch(
  '/:id/payment',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    const { paymentStatus } = req.body

    const allowedStatuses = [
      'pending',
      'paid',
      'cancelled',
    ]

    if (
      !allowedStatuses.includes(
        paymentStatus
      )
    ) {
      return res.status(400).json({
        message:
          'Statut de paiement invalide',
      })
    }

    const order =
      await Order.findByIdAndUpdate(
        req.params.id,
        { paymentStatus },
        {
          new: true,
          runValidators: true,
        }
      )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    await creditCommissionIfEligible(order)

    res.json(order)
  })
)

// =====================================================
// PATCH — ORDER STATUS
// PATCH /api/orders/:id/status
// MANAGER / ADMIN
// =====================================================

router.patch(
  '/:id/status',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    const { orderStatus } = req.body

    const allowedStatuses = [
      'not_processed',
      'not_required',
      'shipping',
      'delivered',
    ]

    if (
      !allowedStatuses.includes(
        orderStatus
      )
    ) {
      return res.status(400).json({
        message:
          'Statut de traitement invalide',
      })
    }

    const order =
      await Order.findByIdAndUpdate(
        req.params.id,
        { orderStatus },
        {
          new: true,
          runValidators: true,
        }
      )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    await creditCommissionIfEligible(order)

    res.json(order)
  })
)

// =====================================================
// PATCH — DELIVERY METHOD
// PATCH /api/orders/:id/delivery
// MANAGER / ADMIN
// =====================================================

router.patch(
  '/:id/delivery',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    const { deliveryMethod } = req.body

    const allowedMethods = [
      'safi_10dh',
      'outside_safi_35dh',
    ]

    if (
      !allowedMethods.includes(
        deliveryMethod
      )
    ) {
      return res.status(400).json({
        message:
          'Mode de livraison invalide',
      })
    }

    const order =
      await Order.findByIdAndUpdate(
        req.params.id,
        { deliveryMethod },
        {
          new: true,
          runValidators: true,
        }
      )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    res.json(order)
  })
)

// =====================================================
// DELETE — ORDER
// DELETE /api/orders/:id
// MANAGER / ADMIN
// =====================================================

router.delete(
  '/:id',
  protect,
  managerOrAdmin,
  asyncHandler(async (req, res) => {
    const order =
      await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    await order.deleteOne()

    res.json({
      message:
        'Commande supprimée avec succès',
    })
  })
)

export default router