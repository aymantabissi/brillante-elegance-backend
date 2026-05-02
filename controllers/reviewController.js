import Review from '../models/Review.js'
import Product from '../models/Product.js'
import asyncHandler from 'express-async-handler'

// GET reviews dyal product
export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).sort({ createdAt: -1 })
  res.json(reviews)
})

// POST zid review
export const createReview = asyncHandler(async (req, res) => {
  const { name, rating, comment, productId } = req.body

  const review = await Review.create({
    product: productId,
    user:    req.user?._id || null,
    name,
    rating,
    comment,
  })

  // Update product rating
  const reviews = await Review.find({ product: productId })
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  await Product.findByIdAndUpdate(productId, {
    rating:      Math.round(avg * 10) / 10,
    numReviews:  reviews.length,
  })

  res.status(201).json(review)
})