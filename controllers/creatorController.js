import asyncHandler from 'express-async-handler'
import Order from '../models/Order.js'
import PromoCode from '../models/PromoCode.js'
import User from '../models/User.js'

// =====================================================
// GET /api/creator/stats
// CREATOR ONLY — donnees du dashboard d'affiliation
// =====================================================
export const getCreatorStats = asyncHandler(async (req, res) => {
  const creatorId = req.user._id

  const [promoCode, orders, user] = await Promise.all([
    PromoCode.findOne({ owner: creatorId }),
    Order.find({ creator: creatorId }).sort({ createdAt: -1 }),
    User.findById(creatorId),
  ])

  const pendingOrders = orders.filter((o) => !o.commissionCredited && o.paymentStatus !== 'cancelled')
  const creditedOrders = orders.filter((o) => o.commissionCredited)
  const cancelledOrders = orders.filter((o) => !o.commissionCredited && o.paymentStatus === 'cancelled')

  const pendingCommission = pendingOrders.reduce((sum, o) => sum + o.commissionAmount, 0)

  res.json({
    promoCode,
    balance: user.balance,
    totalOrders: orders.length,
    pendingCommission: Number(pendingCommission.toFixed(2)),
    pendingOrders,
    creditedOrders,
    cancelledOrders,
  })
})
