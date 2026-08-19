import express from 'express'
import { getProductsFeed } from '../controllers/feedController.js'

const router = express.Router()

router.get('/products.xml', getProductsFeed)

export default router
