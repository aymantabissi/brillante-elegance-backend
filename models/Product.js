import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  oldPrice: { type: Number, default: 0 },
  category: {
    type: String,
    enum: ['colliers', 'bracelets', 'bagues', 'lunettes', 'montres', 'autres','Sacas'],
    default: 'autres',
  },
  image: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  hot: { type: Boolean, default: false },
  featured: { type: Boolean, default: false }, // ← zid hadi

  discount: { type: Number, default: 0 },
}, { timestamps: true })

const Product = mongoose.model('Product', productSchema)
export default Product