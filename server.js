import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './config/db.js'
import authRoutes    from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes   from './routes/orderRoutes.js'
import reviewRoutes  from './routes/reviewRoutes.js'
import promoRoutes   from './routes/promoRoutes.js'

dotenv.config()
connectDB()

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app = express()

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://brillanteelegance.ma",
    "https://www.brillanteelegance.ma",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}))

app.options(/.*/, cors())

// Preflight — important
app.options(/.*/, cors())
// ── MIDDLEWARES ────────────────────────────────────────────────────────────
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/promos', promoRoutes)

app.get('/', (req, res) => res.send('Brillante Elegance API running ✅'))

// ── ERROR HANDLER ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log('🚀 Server running on port ' + PORT))