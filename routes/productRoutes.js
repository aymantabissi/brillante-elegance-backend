import express from 'express'
import {
  getProducts, getProductById,
  createProduct, updateProduct, deleteProduct,
} from '../controllers/productController.js'
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js'
import upload from '../middleware/uploadMiddleware.js'
import asyncHandler from 'express-async-handler'

const router = express.Router()

// Upload image route
router.post('/upload', protect, managerOrAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Aucun fichier uploade')
  }
  res.json({ imageUrl: req.file.path })
}))

router.get('/',       getProducts)
router.get('/:id',    getProductById)
router.post('/',      protect, managerOrAdmin, createProduct)
router.put('/:id',    protect, managerOrAdmin, updateProduct)
router.delete('/:id', protect, managerOrAdmin, deleteProduct)

export default router