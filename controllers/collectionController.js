import asyncHandler from 'express-async-handler'
import Collection from '../models/Collection.js'

const DEFAULT_COLLECTIONS = [
  { key: 'colliers',  label: 'Colliers',  title: 'Colliers\nRaffinés',  category: 'colliers',  order: 0, image: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=400&q=80' },
  { key: 'bracelets', label: 'Bracelets', title: 'Bracelets\nÉlégants', category: 'bracelets', order: 1, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80' },
  { key: 'bagues',    label: 'Bagues',    title: 'Bagues\nPrecieuses',  category: 'bagues',    order: 2, image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80' },
  { key: 'lunettes',  label: 'Lunettes',  title: 'Lunettes\nPremium',   category: 'lunettes',  order: 3, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80' },
]

// @desc    Get collection cards ("Nos Collections" — page d'accueil)
// @route   GET /api/collections
// @access  Public
export const getCollections = asyncHandler(async (req, res) => {
  let collections = await Collection.find().sort({ order: 1 })

  if (collections.length === 0) {
    collections = await Collection.insertMany(DEFAULT_COLLECTIONS)
  }

  res.json(collections)
})

// @desc    Update a collection card's image/title
// @route   PUT /api/collections/:id
// @access  Manager/Admin
export const updateCollection = asyncHandler(async (req, res) => {
  const { image, title, label, category } = req.body

  const collection = await Collection.findById(req.params.id)
  if (!collection) {
    res.status(404)
    throw new Error('Collection introuvable')
  }

  if (image !== undefined)    collection.image = image
  if (title !== undefined)    collection.title = title
  if (label !== undefined)    collection.label = label
  if (category !== undefined) collection.category = category

  const updated = await collection.save()
  res.json(updated)
})
