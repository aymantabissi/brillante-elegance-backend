import express from 'express'
import asyncHandler from 'express-async-handler'
import { register, login, getMe, updateMe, updateMyPassword } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import upload from '../middleware/uploadMiddleware.js'
import User from '../models/User.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', protect, getMe)
router.put('/me', protect, updateMe)
router.put('/me/password', protect, updateMyPassword)

router.post('/me/avatar', protect, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Aucun fichier uploade')
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: req.file.path },
    { new: true }
  ).select('-password')

  res.json(user)
}))

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