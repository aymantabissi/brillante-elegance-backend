import mongoose from 'mongoose'

const collectionSchema = new mongoose.Schema({
  key:      { type: String, required: true, unique: true },
  label:    { type: String, required: true },
  title:    { type: String, required: true },
  image:    { type: String, default: '' },
  category: { type: String, required: true },
  order:    { type: Number, default: 0 },
}, { timestamps: true })

const Collection = mongoose.model('Collection', collectionSchema)
export default Collection
