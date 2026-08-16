import Order from '../models/Order.js'
import PromoCode from '../models/PromoCode.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { addParcel, trackParcel } from '../services/colisSpeedService.js'

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
// CREATE ORDER
// POST /api/orders
// =====================================================
export const createOrder = async (req, res) => {
  try {
    const {
      client,
      items,
      total,
      paymentStatus,
      orderStatus,
      deliveryMethod,
      note,
      promoCode,
    } = req.body

    // =====================================================
    // VALIDATION
    // =====================================================

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
        message: 'Le total de la commande est obligatoire',
      })
    }

    // Vérifier le mode de livraison
    const allowedDeliveryMethods = [
      'safi_10dh',
      'outside_safi_35dh',
    ]

    if (
      deliveryMethod &&
      !allowedDeliveryMethods.includes(deliveryMethod)
    ) {
      return res.status(400).json({
        message: 'Mode de livraison invalide',
        allowedDeliveryMethods,
      })
    }

    // =====================================================
    // AFFILIATION — resoudre le creator + calculer la commission
    // =====================================================

    let creator = null
    let commissionAmount = 0

    if (promoCode) {
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase() })

      if (promo && promo.owner) {
        creator = promo.owner

        const productIds = items.map((item) => item.productId)
        const products = await Product.find({ _id: { $in: productIds } })
        const commissionByProductId = new Map(
          products.map((p) => [p._id.toString(), p.commissionPercent || 0])
        )

        commissionAmount = items.reduce((sum, item) => {
          const percent = commissionByProductId.get(item.productId?.toString()) || 0
          return sum + (item.price * item.qty * percent) / 100
        }, 0)
      }
    }

    // =====================================================
    // CREATE ORDER IN MONGODB
    // =====================================================

    const order = await Order.create({
      client,
      items,
      total,

      paymentStatus: paymentStatus || 'pending',

      orderStatus: orderStatus || 'not_processed',

      deliveryMethod:
        deliveryMethod || 'safi_10dh',

      note: note || '',

      promoCode: promoCode || '',
      creator,
      commissionAmount: Number(commissionAmount.toFixed(2)),

      colisSpeed: {
        tracking: '',
        status: '',
        paymentStatus: '',
        deliveryPerson: {
          name: '',
          phone: '',
        },
        lastUpdate: null,
      },
    })

    // =====================================================
    // SEND ORDER TO COLISSPEED
    // =====================================================

    try {
      console.log('📦 Envoi de la commande à ColisSpeed...')

      const colisSpeedResponse = await addParcel(order)

      console.log(
        '📦 Réponse ColisSpeed:',
        colisSpeedResponse
      )

      // ColisSpeed retourne normalement:
      //
      // {
      //   status: 200,
      //   msg: "Commande ajoutée avec succès",
      //   tracking: "DZ-DEMO-000123"
      // }

      if (
        colisSpeedResponse &&
        colisSpeedResponse.status === 200 &&
        colisSpeedResponse.tracking
      ) {
        order.colisSpeed.tracking =
          colisSpeedResponse.tracking

        order.colisSpeed.status =
          'Commande créée'

        order.colisSpeed.paymentStatus =
          'pending'

        order.colisSpeed.lastUpdate = new Date()

        await order.save()

        console.log(
          '✅ Commande ColisSpeed créée:',
          colisSpeedResponse.tracking
        )
      } else {
        console.log(
          '⚠️ ColisSpeed n’a pas retourné de tracking'
        )
      }
    } catch (colisSpeedError) {
      // مهم:
      // ما نحذفوش commande من MongoDB إلا ColisSpeed فشل.
      // كنخليوها موجودة باش تقدر تعاود تبعثها من Admin.

      console.error(
        '❌ ColisSpeed error:',
        colisSpeedError.message
      )
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    const finalOrder = await Order.findById(order._id)

    res.status(201).json(finalOrder)

  } catch (error) {
    console.error(
      'Create order error:',
      error
    )

    res.status(500).json({
      message:
        'Erreur lors de la création de la commande',
      error: error.message,
    })
  }
}


// =====================================================
// GET ALL ORDERS
// GET /api/orders
// =====================================================
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })

    res.status(200).json(orders)

  } catch (error) {
    console.error(
      'Get orders error:',
      error
    )

    res.status(500).json({
      message:
        'Erreur lors de la récupération des commandes',
      error: error.message,
    })
  }
}


// =====================================================
// GET ONE ORDER
// GET /api/orders/:id
// =====================================================
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(
      req.params.id
    )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    res.status(200).json(order)

  } catch (error) {
    console.error(
      'Get order error:',
      error
    )

    res.status(500).json({
      message:
        'Erreur lors de la récupération de la commande',
      error: error.message,
    })
  }
}


// =====================================================
// UPDATE ORDER
// PUT /api/orders/:id
// =====================================================
export const updateOrder = async (req, res) => {
  try {
    const {
      client,
      items,
      total,
      paymentStatus,
      orderStatus,
      deliveryMethod,
      note,
    } = req.body

    const order = await Order.findById(
      req.params.id
    )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    if (client !== undefined) {
      order.client = client
    }

    if (items !== undefined) {
      order.items = items
    }

    if (total !== undefined) {
      order.total = total
    }

    if (paymentStatus !== undefined) {
      order.paymentStatus = paymentStatus
    }

    if (orderStatus !== undefined) {
      order.orderStatus = orderStatus
    }

    if (deliveryMethod !== undefined) {
      const allowedMethods = [
        'safi_10dh',
        'outside_safi_35dh',
      ]

      if (!allowedMethods.includes(deliveryMethod)) {
        return res.status(400).json({
          message: 'Mode de livraison invalide',
          allowedMethods,
        })
      }

      order.deliveryMethod = deliveryMethod
    }

    if (note !== undefined) {
      order.note = note
    }

    const updatedOrder = await order.save()

    await creditCommissionIfEligible(updatedOrder)

    res.status(200).json(updatedOrder)

  } catch (error) {
    console.error(
      'Update order error:',
      error
    )

    res.status(500).json({
      message:
        'Erreur lors de la modification de la commande',
      error: error.message,
    })
  }
}


// =====================================================
// UPDATE PAYMENT STATUS
// PATCH /api/orders/:id/payment
// =====================================================
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body

    const allowedStatuses = [
      'pending',
      'paid',
      'cancelled',
    ]

    if (!allowedStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        message: 'Statut de paiement invalide',
        allowedStatuses,
      })
    }

    const order = await Order.findById(
      req.params.id
    )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    order.paymentStatus = paymentStatus

    const updatedOrder = await order.save()

    await creditCommissionIfEligible(updatedOrder)

    res.status(200).json({
      message:
        'Statut de paiement mis à jour',
      order: updatedOrder,
    })

  } catch (error) {
    console.error(
      'Update payment status error:',
      error
    )

    res.status(500).json({
      message:
        'Erreur lors de la modification du paiement',
      error: error.message,
    })
  }
}


// =====================================================
// UPDATE ORDER STATUS
// PATCH /api/orders/:id/status
// =====================================================
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body

    const allowedStatuses = [
      'not_processed',
      'not_required',
      'shipping',
      'delivered',
    ]

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        message:
          'Statut de traitement invalide',
        allowedStatuses,
      })
    }

    const order = await Order.findById(
      req.params.id
    )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    order.orderStatus = orderStatus

    const updatedOrder = await order.save()

    await creditCommissionIfEligible(updatedOrder)

    res.status(200).json({
      message:
        'Statut de la commande mis à jour',
      order: updatedOrder,
    })

  } catch (error) {
    console.error(
      'Update order status error:',
      error
    )

    res.status(500).json({
      message:
        'Erreur lors de la modification du statut',
      error: error.message,
    })
  }
}


// =====================================================
// UPDATE DELIVERY METHOD
// PATCH /api/orders/:id/delivery
// =====================================================
export const updateDeliveryMethod = async (req, res) => {
  try {
    const { deliveryMethod } = req.body

    const allowedMethods = [
      'safi_10dh',
      'outside_safi_35dh',
    ]

    if (!allowedMethods.includes(deliveryMethod)) {
      return res.status(400).json({
        message:
          'Mode de livraison invalide',
        allowedMethods,
      })
    }

    const order = await Order.findById(
      req.params.id
    )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    order.deliveryMethod = deliveryMethod

    const updatedOrder = await order.save()

    res.status(200).json({
      message:
        'Mode de livraison mis à jour',
      order: updatedOrder,
    })

  } catch (error) {
    console.error(
      'Update delivery method error:',
      error
    )

    res.status(500).json({
      message:
        'Erreur lors de la modification du mode de livraison',
      error: error.message,
    })
  }
}


// =====================================================
// TRACK COLISSPEED ORDER
// PATCH /api/orders/:id/track
// =====================================================
export const trackOrder = async (req, res) => {
  try {
    const order = await Order.findById(
      req.params.id
    )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    if (!order.colisSpeed?.tracking) {
      return res.status(400).json({
        message:
          'Cette commande ne possède pas encore de numéro de suivi ColisSpeed',
      })
    }

    const result = await trackParcel(
      order.colisSpeed.tracking
    )

    // ColisSpeed retourne:
    //
    // {
    //   status: true,
    //   msg: [
    //     {
    //       code: "...",
    //       etat: "Payé",
    //       status: "En cours de livraison",
    //       time: "..."
    //     }
    //   ],
    //   tracking: "...",
    //   delivery: {
    //     phone: "...",
    //     name: "..."
    //   }
    // }

    if (
      !result ||
      result.status !== true ||
      !Array.isArray(result.msg) ||
      result.msg.length === 0
    ) {
      return res.status(404).json({
        message:
          result?.msg ||
          'Aucune information de suivi trouvée',
      })
    }

    // آخر status
    const lastStatus =
      result.msg[result.msg.length - 1]

    order.colisSpeed.status =
      lastStatus.status || ''

    order.colisSpeed.paymentStatus =
      lastStatus.etat || ''

    order.colisSpeed.lastUpdate =
      lastStatus.time
        ? new Date(lastStatus.time)
        : new Date()

    // معلومات livreur
    if (result.delivery) {
      order.colisSpeed.deliveryPerson = {
        name:
          result.delivery.name || '',
        phone:
          result.delivery.phone || '',
      }
    }

    // Synchronisation avec notre statut
    const statusText =
      (lastStatus.status || '').toLowerCase()

    if (statusText.includes('livr')) {
      order.orderStatus = 'delivered'
    } else if (
      statusText.includes('cours') ||
      statusText.includes('livraison')
    ) {
      order.orderStatus = 'shipping'
    }

    // Synchronisation paiement
    const paymentText =
      (lastStatus.etat || '').toLowerCase()

    if (paymentText.includes('pay')) {
      order.paymentStatus = 'paid'
    }

    await order.save()

    await creditCommissionIfEligible(order)

    res.status(200).json({
      message:
        'Suivi ColisSpeed mis à jour',
      order,
      tracking: result,
    })

  } catch (error) {
    console.error(
      'Track order error:',
      error
    )

    res.status(500).json({
      message:
        'Erreur lors du suivi ColisSpeed',
      error: error.message,
    })
  }
}


// =====================================================
// DELETE ORDER
// DELETE /api/orders/:id
// =====================================================
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(
      req.params.id
    )

    if (!order) {
      return res.status(404).json({
        message: 'Commande introuvable',
      })
    }

    await order.deleteOne()

    res.status(200).json({
      message:
        'Commande supprimée avec succès',
    })

  } catch (error) {
    console.error(
      'Delete order error:',
      error
    )

    res.status(500).json({
      message:
        'Erreur lors de la suppression de la commande',
      error: error.message,
    })
  }
}