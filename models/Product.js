import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  oldPrice: { type: Number, default: 0 },
  category: {
    type: String,
    enum: ['colliers', 'bracelets', 'bagues', 'lunettes', 'montres', 'autres', 'Sacas'],
    default: 'autres',
  },
  image: { type: String, default: '' },
  images: [{ type: String }],
  stock: { type: Number, default: 0 },
  hot: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  discount: { type: Number, default: 0 },

  // =====================================================
  // VARIANTES (couleur, taille, etc.)
  // =====================================================
  hasVariants: { type: Boolean, default: false },
  variants: [
    {
      label: { type: String, required: true },   // "Rouge", "Taille M"...
      price: { type: Number, default: 0 },        // 0 = utilise le prix de base
      stock: { type: Number, default: 0 },
      image: { type: String, default: '' },
    },
  ],
}, { timestamps: true })

const Product = mongoose.model('Product', productSchema)
export default Product