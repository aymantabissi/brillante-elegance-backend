import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
  client: {
    name: String,
    phone: String,
    city: String,
    address: String,
    email: String,
  },
  items: [
    {
      productId: String,
      name: String,
      price: Number,
      qty: Number,
      image: String,
    }
  ],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  note: { type: String, default: '' },
}, { timestamps: true })

const Order = mongoose.model('Order', orderSchema)
export default Order