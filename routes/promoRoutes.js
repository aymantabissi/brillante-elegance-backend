import express from 'express'
import {
  getPromoCodes, createPromoCode, createMyPromoCode, deletePromoCode,
  togglePromoCode, validatePromoCode, usePromoCode
} from '../controllers/promoController.js'
import { protect, managerOrAdmin, creatorOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/',           protect, managerOrAdmin, getPromoCodes)
router.post('/',          protect, managerOrAdmin, createPromoCode)
router.post('/mine',      protect, creatorOnly, createMyPromoCode)
router.delete('/:id',     protect, managerOrAdmin, deletePromoCode)
router.put('/:id/toggle', protect, managerOrAdmin, togglePromoCode)
router.post('/validate',  validatePromoCode)
router.post('/use',       usePromoCode)

export default router