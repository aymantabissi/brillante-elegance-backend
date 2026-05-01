import asyncHandler from 'express-async-handler'
import User from '../models/User.js'
import generateToken from '../utils/generateToken.js'

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
  : []

// @route POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Tous les champs sont requis')
  }

  const userExists = await User.findOne({ email: email.toLowerCase() })
  if (userExists) {
    res.status(400)
    throw new Error('Email already exists')
  }

  const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user'

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role,
  })

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
  })
})

// @route POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400)
    throw new Error('Email et mot de passe requis')
  }

  const user = await User.findOne({ email: email.toLowerCase() })

  if (user && (await user.matchPassword(password))) {
    if (ADMIN_EMAILS.includes(email.toLowerCase()) && user.role !== 'admin') {
      user.role = 'admin'
      await user.save()
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    })
  } else {
    res.status(401)
    throw new Error('Invalid email or password')
  }
})

// @route GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password')
  res.json(user)
})