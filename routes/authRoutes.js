import express from 'express'
import asyncHandler from 'express-async-handler'
import { register, login, getMe } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import User from '../models/User.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', protect, getMe)

// Temporary — delete men ba3d
router.post('/make-admin', asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { email: req.body.email },
    { role: 'admin' },
    { new: true }
  )
  if (!user) {
    return res.status(404).json({ message: 'User not found — register awwel' })
  }
  res.json({ message: 'Done', role: user.role })
}))

export default router