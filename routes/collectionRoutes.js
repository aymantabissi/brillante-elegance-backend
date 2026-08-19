import express from 'express'
import { getCollections, updateCollection } from '../controllers/collectionController.js'
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/',     getCollections)
router.put('/:id',  protect, managerOrAdmin, updateCollection)

export default router
