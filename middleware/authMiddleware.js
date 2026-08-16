import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import User from '../models/User.js'

// =====================================================
// PROTECT
// =====================================================
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization

  console.log('=================================')
  console.log('AUTH HEADER:', authHeader)
  console.log('JWT SECRET EXISTS:', !!process.env.JWT_SECRET)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401)
    throw new Error('Not authorized, no token')
  }

  const token = authHeader.split(' ')[1]

  console.log('TOKEN EXISTS:', !!token)
  console.log('TOKEN LENGTH:', token?.length)

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    )

    console.log('DECODED TOKEN:', decoded)

    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      console.log('USER NOT FOUND:', decoded.id)

      res.status(401)
      throw new Error('User not found')
    }

    console.log('USER FOUND:', {
      id: user._id,
      email: user.email,
      role: user.role,
    })

    req.user = user

    next()
  } catch (error) {
    console.error('JWT ERROR:', error.message)

    res.status(401)
    throw new Error('Not authorized, token failed')
  }
})

// =====================================================
// ADMIN ONLY
// Réservé aux actions sensibles (gestion des utilisateurs...)
// =====================================================
export const adminOnly = (req, res, next) => {
  console.log('ADMIN CHECK:', {
    user: req.user?._id,
    email: req.user?.email,
    role: req.user?.role,
  })

  if (req.user && req.user.role === 'admin') {
    next()
  } else {
    res.status(403)
    throw new Error('Not authorized as admin')
  }
}

// =====================================================
// CREATOR ONLY
// Reserve au dashboard d'affiliation
// =====================================================
export const creatorOnly = (req, res, next) => {
  if (req.user && req.user.role === 'creator') {
    next()
  } else {
    res.status(403)
    throw new Error('Not authorized as creator')
  }
}

// =====================================================
// MANAGER OR ADMIN
// Pour la gestion des produits et des commandes
// (le gestionnaire n'a pas accès à la gestion des utilisateurs)
// =====================================================
export const managerOrAdmin = (req, res, next) => {
  console.log('MANAGER CHECK:', {
    user: req.user?._id,
    email: req.user?.email,
    role: req.user?.role,
  })

  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next()
  } else {
    res.status(403)
    throw new Error('Not authorized as manager')
  }
}