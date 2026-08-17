import 'dotenv/config'

import http from 'http'
import jwt from 'jsonwebtoken'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server as SocketIOServer } from 'socket.io'
import { connectDB } from './config/db.js'
import authRoutes    from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes   from './routes/orderRoutes.js'
import reviewRoutes  from './routes/reviewRoutes.js'
import promoRoutes   from './routes/promoRoutes.js'
import userRoutes from './routes/userRoutes.js'
import creatorRoutes from './routes/creatorRoutes.js'
import messageRoutes from './routes/messageRoutes.js'
import User from './models/User.js'
import Message from './models/Message.js'
import ChatRead from './models/ChatRead.js'

connectDB()

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app = express()

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://brillanteelegance.ma",
  "https://www.brillanteelegance.ma",
]

// Chaque deployment Vercel (preview ou production) genere une URL du type
// https://brillante-elegance-frontend-<hash>-aymantabissis-projects.vercel.app
// — on les autorise toutes via un pattern plutot que de les lister une par une.
const VERCEL_PREVIEW_PATTERN = /^https:\/\/brillante-elegance-frontend(-[a-z0-9-]+)?-aymantabissis-projects\.vercel\.app$/

const isAllowedOrigin = (origin) => {
  if (!origin) return true // requetes sans Origin (curl, server-to-server, healthchecks)
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (VERCEL_PREVIEW_PATTERN.test(origin)) return true
  return false
}

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS: ' + origin))
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}))

app.options(/.*/, cors())

// ── MIDDLEWARES ────────────────────────────────────────────────────────────
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/promos', promoRoutes)
app.use('/api/creator', creatorRoutes)
app.use('/api/messages', messageRoutes)

app.get('/', (req, res) => res.send('Brillante Elegance API running ✅'))

// ── ERROR HANDLER ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔴 ERROR:', err)

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  })
})

// ── SOCKET.IO — chat interne (team = admin+managers, creators = admin+creators) ──

const httpServer = http.createServer(app)

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS: ' + origin))
      }
    },
    credentials: true,
  },
})

const ALL_ROOMS = ['team', 'creators']

// 'team' = admin + manager, 'creators' = admin + creator
const canAccessRoom = (role, room) => {
  if (room === 'team') return role === 'admin' || role === 'manager'
  if (room === 'creators') return role === 'admin' || role === 'creator'
  return false
}

// ── PRESENCE — sockets connectes par room (plusieurs onglets geres) ────────
// { team: Map<socketId, user>, creators: Map<socketId, user> }
const roomSockets = { team: new Map(), creators: new Map() }

const getOnlineUsers = (room) => {
  const seen = new Map()
  for (const user of roomSockets[room].values()) {
    seen.set(user._id.toString(), user)
  }
  return Array.from(seen.values())
}

const broadcastPresence = (room) => {
  io.to(room).emit('presence', {
    room,
    users: getOnlineUsers(room).map((u) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
    })),
  })
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token

    if (!token) return next(new Error('Not authorized, no token'))

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')

    if (!user) return next(new Error('User not found'))

    if (!['admin', 'manager', 'creator'].includes(user.role)) {
      return next(new Error('Not authorized'))
    }

    socket.user = user
    next()
  } catch (error) {
    next(new Error('Not authorized, token failed'))
  }
})

io.on('connection', (socket) => {
  // Rejoint automatiquement tous les rooms auxquels son role a acces
  // (necessaire pour recevoir les notifications de non-lus partout,
  // pas seulement sur la page de chat active)
  socket.joinedRooms = ALL_ROOMS.filter((room) => canAccessRoom(socket.user.role, room))

  socket.joinedRooms.forEach((room) => {
    socket.join(room)
    roomSockets[room].set(socket.id, socket.user)
  })

  socket.joinedRooms.forEach(broadcastPresence)

  socket.on('markRead', async ({ room } = {}) => {
    try {
      if (!canAccessRoom(socket.user.role, room)) return

      await ChatRead.findOneAndUpdate(
        { user: socket.user._id, room },
        { lastReadAt: new Date() },
        { upsert: true }
      )
    } catch (error) {
      console.error('🔴 SOCKET markRead ERROR:', error)
    }
  })

  socket.on('sendMessage', async (payload) => {
    try {
      const room = payload?.room
      const text = (payload?.text || '').trim()
      const fileUrl  = payload?.fileUrl  || ''
      const fileType = payload?.fileType || ''
      const fileName = payload?.fileName || ''

      if (!text && !fileUrl) return
      if (!canAccessRoom(socket.user.role, room)) return

      const message = await Message.create({
        sender: socket.user._id,
        text,
        room,
        fileUrl,
        fileType,
        fileName,
      })

      const populated = await message.populate('sender', 'name email role avatar')

      io.to(room).emit('newMessage', populated)
    } catch (error) {
      console.error('🔴 SOCKET sendMessage ERROR:', error)
    }
  })

  socket.on('deleteMessage', async ({ messageId } = {}) => {
    try {
      const message = await Message.findById(messageId)

      if (!message) return
      if (message.sender.toString() !== socket.user._id.toString()) return

      const room = message.room
      await message.deleteOne()

      io.to(room).emit('messageDeleted', { messageId, room })
    } catch (error) {
      console.error('🔴 SOCKET deleteMessage ERROR:', error)
    }
  })

  socket.on('clearRoom', async ({ room } = {}) => {
    try {
      if (socket.user.role !== 'admin' || !canAccessRoom(socket.user.role, room)) return

      await Message.deleteMany({ room })

      io.to(room).emit('roomCleared', { room })
    } catch (error) {
      console.error('🔴 SOCKET clearRoom ERROR:', error)
    }
  })

  socket.on('disconnect', () => {
    socket.joinedRooms.forEach((room) => {
      roomSockets[room].delete(socket.id)
      broadcastPresence(room)
    })
  })
})

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => console.log('🚀 Server running on port ' + PORT))