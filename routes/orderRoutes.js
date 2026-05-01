import express from 'express'
import asyncHandler from 'express-async-handler'
import Order from '../models/Order.js'
import { protect } from '../middleware/authMiddleware.js'
import { adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// POST — create order (public — mn checkout)
router.post('/', asyncHandler(async (req, res) => {
  const { client, items, total, note } = req.body
  const order = await Order.create({ client, items, total, note })
  res.status(201).json(order)
}))

// GET all orders — admin only
router.get('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 })
  res.json(orders)
}))

// GET stats — admin only
router.get('/stats', protect, adminOnly, asyncHandler(async (req, res) => {
  const totalOrders   = await Order.countDocuments()
  const totalRevenue  = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }])
  const pending       = await Order.countDocuments({ status: 'pending' })
  const delivered     = await Order.countDocuments({ status: 'delivered' })

  res.json({
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    pending,
    delivered,
  })
}))

// PUT update status — admin only
router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
  res.json(order)
}))

export default router