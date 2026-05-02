import PromoCode from '../models/PromoCode.js'
import asyncHandler from 'express-async-handler'

// GET all — admin
export const getPromoCodes = asyncHandler(async (req, res) => {
  const codes = await PromoCode.find().sort({ createdAt: -1 })
  res.json(codes)
})

// POST create — admin
export const createPromoCode = asyncHandler(async (req, res) => {
  const { code, discount, maxUses, expiresAt } = req.body
  const exists = await PromoCode.findOne({ code: code.toUpperCase() })
  if (exists) {
    res.status(400)
    throw new Error('Code existe deja')
  }
  const promo = await PromoCode.create({ code, discount, maxUses, expiresAt })
  res.status(201).json(promo)
})

// DELETE — admin
export const deletePromoCode = asyncHandler(async (req, res) => {
  await PromoCode.findByIdAndDelete(req.params.id)
  res.json({ message: 'Code supprime' })
})

// TOGGLE active — admin
export const togglePromoCode = asyncHandler(async (req, res) => {
  const promo = await PromoCode.findById(req.params.id)
  if (!promo) { res.status(404); throw new Error('Code introuvable') }
  promo.active = !promo.active
  await promo.save()
  res.json(promo)
})

// POST validate — client
export const validatePromoCode = asyncHandler(async (req, res) => {
  const { code } = req.body
  const promo = await PromoCode.findOne({ code: code.toUpperCase() })

  if (!promo) { res.status(404); throw new Error('Code invalide') }
  if (!promo.active) { res.status(400); throw new Error('Code desactive') }
  if (promo.usedCount >= promo.maxUses) { res.status(400); throw new Error('Code epuise') }
  if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
    res.status(400)
    throw new Error('Code expire')
  }

  res.json({ discount: promo.discount, code: promo.code })
})

// POST use — katkhdm 3nd checkout
export const usePromoCode = asyncHandler(async (req, res) => {
  const { code } = req.body
  const promo = await PromoCode.findOne({ code: code.toUpperCase() })
  if (promo) {
    promo.usedCount += 1
    await promo.save()
  }
  res.json({ message: 'OK' })
})