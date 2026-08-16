import express from 'express'

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from '../controllers/userController.js'

import {
  protect,
  adminOnly,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, adminOnly, getUsers)

router.get('/:id', protect, adminOnly, getUserById)

router.post('/', protect, adminOnly, createUser)

router.put('/:id', protect, adminOnly, updateUser)

router.patch('/:id/role', protect, adminOnly, updateUserRole)

router.patch('/:id/status', protect, adminOnly, updateUserStatus)

router.delete('/:id', protect, adminOnly, deleteUser)

export default router