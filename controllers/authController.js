import asyncHandler from 'express-async-handler'
import User from '../models/User.js'
import generateToken from '../utils/generateToken.js'

// =====================================================
// ADMIN EMAILS
// Optional: emails الموجودة هنا تصبح admin
// =====================================================

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  : []

// =====================================================
// POST /api/auth/register
// PUBLIC
//
// التسجيل العادي = user
// لا يمكن للـ client اختيار role
// =====================================================

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body

  // ---------------------------------------------------
  // Validation
  // ---------------------------------------------------

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Tous les champs sont requis')
  }

  if (password.length < 6) {
    res.status(400)
    throw new Error(
      'Le mot de passe doit contenir au moins 6 caractères'
    )
  }

  const normalizedEmail = email
    .toLowerCase()
    .trim()

  // ---------------------------------------------------
  // Check existing user
  // ---------------------------------------------------

  const userExists = await User.findOne({
    email: normalizedEmail,
  })

  if (userExists) {
    res.status(400)
    throw new Error('Email already exists')
  }

  // ---------------------------------------------------
  // Role
  //
  // ADMIN_EMAILS => admin
  // req.body.role === 'creator' => creator (seul role public autorise)
  // Otherwise => user
  //
  // IMPORTANT:
  // Aucun autre role (admin/manager/employee) ne peut etre
  // choisi via l'inscription publique.
  // ---------------------------------------------------

  const finalRole = ADMIN_EMAILS.includes(normalizedEmail)
    ? 'admin'
    : role === 'creator'
      ? 'creator'
      : 'user'

  // ---------------------------------------------------
  // Create user
  // ---------------------------------------------------

  // Les comptes createur doivent etre valides par un admin
  // avant de pouvoir se connecter (dashboard > Users)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: finalRole,
    isActive: finalRole !== 'creator',
  })

  // ---------------------------------------------------
  // Response
  // ---------------------------------------------------

  if (!user.isActive) {
    return res.status(201).json({
      pending: true,
      message: 'Votre compte a bien ete cree. Un administrateur doit valider votre compte createur avant que vous puissiez vous connecter.',
    })
  }

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    avatar: user.avatar,
    token: generateToken(user._id),
  })
})

// =====================================================
// POST /api/auth/login
// PUBLIC
// =====================================================

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // ---------------------------------------------------
  // Validation
  // ---------------------------------------------------

  if (!email || !password) {
    res.status(400)
    throw new Error('Email et mot de passe requis')
  }

  const normalizedEmail = email
    .toLowerCase()
    .trim()

  // ---------------------------------------------------
  // Find user
  // ---------------------------------------------------

  const user = await User.findOne({
    email: normalizedEmail,
  })

  // ---------------------------------------------------
  // Check credentials
  // ---------------------------------------------------

  if (
    !user ||
    !(await user.matchPassword(password))
  ) {
    res.status(401)
    throw new Error(
      'Email ou mot de passe incorrect'
    )
  }

  // ---------------------------------------------------
  // Check account status
  // ---------------------------------------------------

  if (!user.isActive) {
    res.status(403)
    throw new Error(
      user.role === 'creator'
        ? 'Votre compte créateur est en attente de validation par l’administrateur.'
        : 'Votre compte est désactivé. Contactez l’administrateur.'
    )
  }

  // ---------------------------------------------------
  // Force admin for emails in ADMIN_EMAILS
  // ---------------------------------------------------

  if (
    ADMIN_EMAILS.includes(normalizedEmail) &&
    user.role !== 'admin'
  ) {
    user.role = 'admin'
    await user.save()
  }

  // ---------------------------------------------------
  // Response
  // ---------------------------------------------------

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    avatar: user.avatar,
    token: generateToken(user._id),
  })
})

// =====================================================
// GET /api/auth/me
// PROTECTED
// =====================================================

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(
    req.user._id
  ).select('-password')

  if (!user) {
    res.status(404)
    throw new Error('Utilisateur introuvable')
  }

  res.json(user)
})

// =====================================================
// PUT /api/auth/me
// PROTECTED — mettre a jour son propre profil (nom)
// =====================================================

export const updateMe = asyncHandler(async (req, res) => {
  const { name, bankInfo } = req.body

  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('Utilisateur introuvable')
  }

  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400)
      throw new Error('Le nom ne peut pas etre vide')
    }
    user.name = name.trim()
  }

  if (bankInfo !== undefined) {
    const accountHolder = (bankInfo.accountHolder || '').trim()
    const bankName      = (bankInfo.bankName || '').trim()
    const rib           = (bankInfo.rib || '').replace(/\s/g, '')

    if (!accountHolder || !bankName || !rib) {
      res.status(400)
      throw new Error('Nom complet, banque et RIB sont requis')
    }

    if (!/^\d{24}$/.test(rib)) {
      res.status(400)
      throw new Error('Le RIB doit contenir exactement 24 chiffres')
    }

    user.bankInfo = { accountHolder, bankName, rib }
  }

  const updatedUser = await user.save()

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    isActive: updatedUser.isActive,
    avatar: updatedUser.avatar,
    bankInfo: updatedUser.bankInfo,
  })
})

// =====================================================
// PUT /api/auth/me/password
// PROTECTED — changer son propre mot de passe
// =====================================================

export const updateMyPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    res.status(400)
    throw new Error('Mot de passe actuel et nouveau mot de passe requis')
  }

  if (newPassword.length < 6) {
    res.status(400)
    throw new Error('Le nouveau mot de passe doit contenir au moins 6 caracteres')
  }

  const user = await User.findById(req.user._id)

  if (!user || !(await user.matchPassword(currentPassword))) {
    res.status(401)
    throw new Error('Mot de passe actuel incorrect')
  }

  user.password = newPassword
  await user.save()

  res.json({ message: 'Mot de passe mis a jour' })
})

