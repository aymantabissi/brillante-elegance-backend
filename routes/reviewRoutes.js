import express from 'express'
import { getProductReviews, createReview } from '../controllers/reviewController.js'

const router = express.Router()

router.get('/:productId',  getProductReviews)
router.post('/',           createReview)

export default router