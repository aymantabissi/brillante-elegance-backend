import express from 'express'
import {
  getProducts, getProductById,
  createProduct, updateProduct, deleteProduct,
} from '../controllers/productController.js'
import { protect } from '../middleware/authMiddleware.js'
import { adminOnly } from '../middleware/authMiddleware.js'
import upload from '../middleware/uploadMiddleware.js'
import asyncHandler from 'express-async-handler'

const router = express.Router()

// Upload image route
router.post('/upload', protect, adminOnly, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Aucun fichier uploade')
  }
  const imageUrl = '/uploads/' + req.file.filename
  res.json({ imageUrl })
}))

router.get('/',       getProducts)
router.get('/:id',    getProductById)
router.post('/',      protect, adminOnly, createProduct)
router.put('/:id',    protect, adminOnly, updateProduct)
router.delete('/:id', protect, adminOnly, deleteProduct)

export default router