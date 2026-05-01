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

dotenv.config()
connectDB()

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

const app = express()
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://TONURL.vercel.app',
  ],
  credentials: true,
}))
app.use(express.json())

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth',     authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders',   orderRoutes)
app.use('/api/reviews',  reviewRoutes)

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  })
})

app.get('/', (req, res) => res.send('Brillante Elegance API'))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log('Server running on port ' + PORT))