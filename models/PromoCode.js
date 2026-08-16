import mongoose from 'mongoose'

const promoCodeSchema = new mongoose.Schema({
  code:       { type: String, required: true, unique: true, uppercase: true },
  discount:   { type: Number, required: true }, // pourcentage ex: 15
  maxUses:    { type: Number, default: 100 },
  usedCount:  { type: Number, default: 0 },
  active:     { type: Boolean, default: true },
  expiresAt:  { type: Date, default: null },
    products:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // ← khawya = tous

  // Creator (affiliation) — proprietaire du code, null = code admin classique
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

}, { timestamps: true })

export default mongoose.model('PromoCode', promoCodeSchema)