import express from 'express'
import { getCreatorStats } from '../controllers/creatorController.js'
import { protect, creatorOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/stats', protect, creatorOnly, getCreatorStats)

export default router
