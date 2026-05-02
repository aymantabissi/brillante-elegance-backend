import express from 'express'
import {
  getPromoCodes, createPromoCode, deletePromoCode,
  togglePromoCode, validatePromoCode, usePromoCode
} from '../controllers/promoController.js'
import { protect, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/',           protect, adminOnly, getPromoCodes)
router.post('/',          protect, adminOnly, createPromoCode)
router.delete('/:id',     protect, adminOnly, deletePromoCode)
router.put('/:id/toggle', protect, adminOnly, togglePromoCode)
router.post('/validate',  validatePromoCode)
router.post('/use',       usePromoCode)

export default router