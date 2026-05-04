import PromoCode from '../models/PromoCode.js'
import asyncHandler from 'express-async-handler'

// GET all — admin
export const getPromoCodes = asyncHandler(async (req, res) => {
  const codes = await PromoCode.find().sort({ createdAt: -1 })
  res.json(codes)
})

// POST create — admin
export const createPromoCode = asyncHandler(async (req, res) => {
  const { code, discount, maxUses, expiresAt, products } = req.body
  const exists = await PromoCode.findOne({ code: code.toUpperCase() })
  if (exists) { res.status(400); throw new Error('Code existe deja') }
  const promo = await PromoCode.create({
    code, discount, maxUses, expiresAt,
    products: products || [], // ← khawya = tous les produits
  })
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
  const { code, productIds } = req.body // ← zid productIds
  const promo = await PromoCode.findOne({ code: code.toUpperCase() })

  if (!promo)  { res.status(404); throw new Error('Code invalide') }
  if (!promo.active) { res.status(400); throw new Error('Code désactivé') }
  if (promo.usedCount >= promo.maxUses) { res.status(400); throw new Error('Code épuisé') }
  if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
    res.status(400); throw new Error('Code expiré')
  }

  // Ila kayna products spécifiques — tchek
  if (promo.products && promo.products.length > 0 && productIds && productIds.length > 0) {
    const promoProductIds = promo.products.map(function(id) { return id.toString() })
    const hasMatch = productIds.some(function(id) { return promoProductIds.includes(id) })
    if (!hasMatch) {
      res.status(400)
      throw new Error('Ce code n\'est pas valable pour ces produits')
    }
  }

  res.json({
    discount: promo.discount,
    code: promo.code,
    products: promo.products, // ← return bach client y3rf
  })
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