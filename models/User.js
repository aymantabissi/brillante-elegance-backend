import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    // =====================================================
    // NAME
    // =====================================================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // =====================================================
    // EMAIL
    // =====================================================
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // =====================================================
    // PASSWORD
    // =====================================================
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // =====================================================
    // ROLE
    // =====================================================
    role: {
      type: String,
      enum: [
        'user',
        'employee',
        'manager',
        'admin',
        'creator',
      ],
      default: 'user',
    },

    // =====================================================
    // BALANCE — gains cumules (creators / affiliation)
    // =====================================================
    balance: {
      type: Number,
      default: 0,
    },

    // =====================================================
    // ACTIVE / INACTIVE
    // =====================================================
    isActive: {
      type: Boolean,
      default: true,
    },

    // =====================================================
    // AVATAR
    // =====================================================
    avatar: {
      type: String,
      default: '',
    },

    // =====================================================
    // BANK INFO — RIB (pour verser les commissions creator)
    // =====================================================
    bankInfo: {
      accountHolder: { type: String, default: '' },
      bankName:      { type: String, default: '' },
      rib:           { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
)

// =====================================================
// HASH PASSWORD BEFORE SAVE
// =====================================================

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  const salt = await bcrypt.genSalt(10)

  this.password = await bcrypt.hash(
    this.password,
    salt
  )
})

// =====================================================
// COMPARE PASSWORD
// =====================================================

userSchema.methods.matchPassword = async function (
  enteredPassword
) {
  return await bcrypt.compare(
    enteredPassword,
    this.password
  )
}

// =====================================================
// CHECK ADMIN DASHBOARD ACCESS
// =====================================================

userSchema.methods.canAccessDashboard = function () {
  return [
    'admin',
    'manager',
    'employee',
  ].includes(this.role)
}

// =====================================================
// CHECK ADMIN
// =====================================================

userSchema.methods.isAdmin = function () {
  return this.role === 'admin'
}

// =====================================================
// CHECK MANAGER OR ADMIN
// =====================================================

userSchema.methods.isManagerOrAdmin = function () {
  return [
    'admin',
    'manager',
  ].includes(this.role)
}

// =====================================================
// CHECK CREATOR
// =====================================================

userSchema.methods.isCreator = function () {
  return this.role === 'creator'
}

const User = mongoose.model('User', userSchema)

export default User

