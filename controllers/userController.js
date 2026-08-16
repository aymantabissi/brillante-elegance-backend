import asyncHandler from 'express-async-handler'
import User from '../models/User.js'

// =====================================================
// GET ALL USERS
// GET /api/users
// ADMIN ONLY
// =====================================================

export const getUsers = asyncHandler(
  async (req, res) => {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })

    res.json(users)
  }
)

// =====================================================
// GET ONE USER
// GET /api/users/:id
// ADMIN ONLY
// =====================================================

export const getUserById = asyncHandler(
  async (req, res) => {
    const user = await User.findById(
      req.params.id
    ).select('-password')

    if (!user) {
      res.status(404)
      throw new Error(
        'Utilisateur introuvable'
      )
    }

    res.json(user)
  }
)

// =====================================================
// CREATE USER
// POST /api/users
// ADMIN ONLY
// =====================================================

export const createUser = asyncHandler(
  async (req, res) => {
    const {
      name,
      email,
      password,
      role,
    } = req.body

    // -------------------------------------------------
    // Validation
    // -------------------------------------------------

    if (
      !name ||
      !email ||
      !password
    ) {
      res.status(400)
      throw new Error(
        'Nom, email et mot de passe sont obligatoires'
      )
    }

    if (password.length < 6) {
      res.status(400)
      throw new Error(
        'Le mot de passe doit contenir au moins 6 caractères'
      )
    }

    // -------------------------------------------------
    // Normalize email
    // -------------------------------------------------

    const normalizedEmail =
      email.toLowerCase().trim()

    // -------------------------------------------------
    // Check existing email
    // -------------------------------------------------

    const userExists =
      await User.findOne({
        email: normalizedEmail,
      })

    if (userExists) {
      res.status(400)
      throw new Error(
        'Cet email existe déjà'
      )
    }

    // -------------------------------------------------
    // Allowed roles
    // -------------------------------------------------

    const allowedRoles = [
      'user',
      'employee',
      'manager',
      'admin',
      'creator',
    ]

    const selectedRole =
      role || 'employee'

    if (
      !allowedRoles.includes(
        selectedRole
      )
    ) {
      res.status(400)
      throw new Error(
        'Role invalide'
      )
    }

    // -------------------------------------------------
    // Create
    // -------------------------------------------------

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: selectedRole,
      isActive: true,
    })

    // -------------------------------------------------
    // Response
    // -------------------------------------------------

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avatar: user.avatar,
      createdAt: user.createdAt,
    })
  }
)

// =====================================================
// UPDATE USER
// PUT /api/users/:id
// ADMIN ONLY
// =====================================================

export const updateUser = asyncHandler(
  async (req, res) => {
    const {
      name,
      email,
      password,
      role,
      isActive,
    } = req.body

    const user =
      await User.findById(
        req.params.id
      )

    if (!user) {
      res.status(404)
      throw new Error(
        'Utilisateur introuvable'
      )
    }

    // -------------------------------------------------
    // Prevent admin from removing own admin role
    // -------------------------------------------------

    if (
      user._id.toString() ===
        req.user._id.toString() &&
      role &&
      role !== 'admin'
    ) {
      res.status(400)
      throw new Error(
        'Vous ne pouvez pas retirer votre propre rôle admin'
      )
    }

    // -------------------------------------------------
    // Name
    // -------------------------------------------------

    if (name !== undefined) {
      user.name = name.trim()
    }

    // -------------------------------------------------
    // Email
    // -------------------------------------------------

    if (email !== undefined) {
      const normalizedEmail =
        email.toLowerCase().trim()

      const emailExists =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: user._id,
          },
        })

      if (emailExists) {
        res.status(400)
        throw new Error(
          'Cet email existe déjà'
        )
      }

      user.email =
        normalizedEmail
    }

    // -------------------------------------------------
    // Password
    //
    // Le pre-save du User model
    // va automatiquement hasher le password
    // -------------------------------------------------

    if (
      password !== undefined &&
      password !== ''
    ) {
      if (password.length < 6) {
        res.status(400)
        throw new Error(
          'Le mot de passe doit contenir au moins 6 caractères'
        )
      }

      user.password = password
    }

    // -------------------------------------------------
    // Role
    // -------------------------------------------------

    if (role !== undefined) {
      const allowedRoles = [
        'user',
        'employee',
        'manager',
        'admin',
        'creator',
      ]

      if (
        !allowedRoles.includes(
          role
        )
      ) {
        res.status(400)
        throw new Error(
          'Role invalide'
        )
      }

      user.role = role
    }

    // -------------------------------------------------
    // Active status
    // -------------------------------------------------

    if (isActive !== undefined) {
      // Prevent disabling yourself
      if (
        user._id.toString() ===
          req.user._id.toString() &&
        isActive === false
      ) {
        res.status(400)
        throw new Error(
          'Vous ne pouvez pas désactiver votre propre compte'
        )
      }

      user.isActive =
        isActive
    }

    // -------------------------------------------------
    // Save
    // -------------------------------------------------

    const updatedUser =
      await user.save()

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive:
        updatedUser.isActive,
      avatar: updatedUser.avatar,
      createdAt:
        updatedUser.createdAt,
      updatedAt:
        updatedUser.updatedAt,
    })
  }
)

// =====================================================
// UPDATE USER ROLE
// PATCH /api/users/:id/role
// ADMIN ONLY
// =====================================================

export const updateUserRole =
  asyncHandler(
    async (req, res) => {
      const { role } =
        req.body

      const allowedRoles = [
        'user',
        'employee',
        'manager',
        'admin',
        'creator',
      ]

      if (
        !allowedRoles.includes(
          role
        )
      ) {
        res.status(400)
        throw new Error(
          'Role invalide'
        )
      }

      const user =
        await User.findById(
          req.params.id
        )

      if (!user) {
        res.status(404)
        throw new Error(
          'Utilisateur introuvable'
        )
      }

      // Prevent self-demotion
      if (
        user._id.toString() ===
          req.user._id.toString() &&
        role !== 'admin'
      ) {
        res.status(400)
        throw new Error(
          'Vous ne pouvez pas retirer votre propre rôle admin'
        )
      }

      user.role = role

      const updatedUser =
        await user.save()

      res.json({
        message:
          'Rôle mis à jour',
        user: {
          _id:
            updatedUser._id,
          name:
            updatedUser.name,
          email:
            updatedUser.email,
          role:
            updatedUser.role,
          isActive:
            updatedUser.isActive,
        },
      })
    }
  )

// =====================================================
// ACTIVATE / DEACTIVATE USER
// PATCH /api/users/:id/status
// ADMIN ONLY
// =====================================================

export const updateUserStatus =
  asyncHandler(
    async (req, res) => {
      const {
        isActive,
      } = req.body

      if (
        typeof isActive !==
        'boolean'
      ) {
        res.status(400)
        throw new Error(
          'isActive doit être true ou false'
        )
      }

      const user =
        await User.findById(
          req.params.id
        )

      if (!user) {
        res.status(404)
        throw new Error(
          'Utilisateur introuvable'
        )
      }

      // Prevent disabling yourself
      if (
        user._id.toString() ===
          req.user._id.toString() &&
        isActive === false
      ) {
        res.status(400)
        throw new Error(
          'Vous ne pouvez pas désactiver votre propre compte'
        )
      }

      user.isActive =
        isActive

      const updatedUser =
        await user.save()

      res.json({
        message: isActive
          ? 'Utilisateur activé'
          : 'Utilisateur désactivé',
        user: {
          _id:
            updatedUser._id,
          name:
            updatedUser.name,
          email:
            updatedUser.email,
          role:
            updatedUser.role,
          isActive:
            updatedUser.isActive,
        },
      })
    }
  )

// =====================================================
// DELETE USER
// DELETE /api/users/:id
// ADMIN ONLY
// =====================================================

export const deleteUser =
  asyncHandler(
    async (req, res) => {
      const user =
        await User.findById(
          req.params.id
        )

      if (!user) {
        res.status(404)
        throw new Error(
          'Utilisateur introuvable'
        )
      }

      // Prevent deleting yourself
      if (
        user._id.toString() ===
        req.user._id.toString()
      ) {
        res.status(400)
        throw new Error(
          'Vous ne pouvez pas supprimer votre propre compte'
        )
      }

      await user.deleteOne()

      res.json({
        message:
          'Utilisateur supprimé avec succès',
      })
    }
  )
