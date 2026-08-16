import asyncHandler from 'express-async-handler'
import Product from '../models/Product.js'

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const { category, search, hot, featured } = req.query
  let query = {}
  if (category && category !== 'all') query.category = category
  if (search) query.name = { $regex: search, $options: 'i' }
  if (hot === 'true') query.hot = true
  if (featured === 'true') query.featured = true
  const products = await Product.find(query).sort({ createdAt: -1 })
  res.json(products)
})

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) {
    res.status(404)
    throw new Error('Produit non trouve')
  }
  res.json(product)
})

// @desc    Create product
// @route   POST /api/products
// @access  Admin
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name, price, oldPrice, category,
    description, image, images, stock, hot, discount,
    variants, hasVariants,
  } = req.body

  if (!name || !price) {
    res.status(400)
    throw new Error('Nom et prix sont requis')
  }

  const product = await Product.create({
    name, price, oldPrice, category,
    description, image, images: images || [], stock, hot, discount,
    variants: variants || [],
    hasVariants: hasVariants || false,
  })

  res.status(201).json(product)
})

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) {
    res.status(404)
    throw new Error('Produit non trouve')
  }
  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    { ...req.body },
    { new: true, runValidators: true }
  )
  res.json(updated)
})

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) {
    res.status(404)
    throw new Error('Produit non trouve')
  }
  await Product.findByIdAndDelete(req.params.id)
  res.json({ message: 'Produit supprime avec succes' })
})