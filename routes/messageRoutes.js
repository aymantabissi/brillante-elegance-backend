import express from 'express'
import asyncHandler from 'express-async-handler'
import Message from '../models/Message.js'
import User from '../models/User.js'
import ChatRead from '../models/ChatRead.js'
import { protect } from '../middleware/authMiddleware.js'
import chatUpload from '../middleware/chatUploadMiddleware.js'

const router = express.Router()

// =====================================================
// Verifie qu'un role a le droit de lire/ecrire dans un room
// 'team'     = admin + manager
// 'creators' = admin + creator
// =====================================================
const canAccessRoom = (role, room) => {
  if (room === 'team') return role === 'admin' || role === 'manager'
  if (room === 'creators') return role === 'admin' || role === 'creator'
  return false
}

const roomRoles = {
  team: ['admin', 'manager'],
  creators: ['admin', 'creator'],
}

// =====================================================
// GET — HISTORIQUE DU CHAT (derniers 100 messages)
// GET /api/messages?room=team|creators
// =====================================================

router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const room = req.query.room === 'creators' ? 'creators' : 'team'

    if (!canAccessRoom(req.user.role, room)) {
      res.status(403)
      throw new Error('Acces non autorise a cette discussion')
    }

    const messages = await Message.find({ room })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', 'name email role avatar')

    res.json(messages.reverse())
  })
)

// =====================================================
// GET — MEMBRES DU ROOM (pour affichage en ligne/hors ligne)
// GET /api/messages/members?room=team|creators
// =====================================================

router.get(
  '/members',
  protect,
  asyncHandler(async (req, res) => {
    const room = req.query.room === 'creators' ? 'creators' : 'team'

    if (!canAccessRoom(req.user.role, room)) {
      res.status(403)
      throw new Error('Acces non autorise a cette discussion')
    }

    const members = await User.find({ role: { $in: roomRoles[room] } })
      .select('name email role avatar')
      .sort({ name: 1 })

    res.json(members)
  })
)

// =====================================================
// GET — NOMBRE DE MESSAGES NON LUS PAR ROOM
// GET /api/messages/unread
// =====================================================

router.get(
  '/unread',
  protect,
  asyncHandler(async (req, res) => {
    const rooms = Object.keys(roomRoles).filter(function(room) {
      return canAccessRoom(req.user.role, room)
    })

    const reads = await ChatRead.find({ user: req.user._id, room: { $in: rooms } })
    const lastReadByRoom = {}
    reads.forEach(function(r) { lastReadByRoom[r.room] = r.lastReadAt })

    const counts = {}

    for (const room of rooms) {
      counts[room] = await Message.countDocuments({
        room,
        sender: { $ne: req.user._id },
        createdAt: { $gt: lastReadByRoom[room] || new Date(0) },
      })
    }

    res.json(counts)
  })
)

// =====================================================
// POST — UPLOAD D'UNE PIECE JOINTE (image ou pdf)
// POST /api/messages/upload
// =====================================================

router.post(
  '/upload',
  protect,
  chatUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400)
      throw new Error('Aucun fichier uploade')
    }

    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image'

    res.json({
      fileUrl: req.file.path,
      fileType,
      fileName: req.file.originalname,
    })
  })
)

export default router
