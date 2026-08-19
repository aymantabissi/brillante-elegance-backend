import asyncHandler from 'express-async-handler'
import SiteSettings from '../models/SiteSettings.js'

const DEFAULT_SETTINGS = {
  heroSlides: [
    { image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&q=80', title: 'Nouvelle Collection',  subtitle: 'Été 2026' },
    { image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=80', title: 'Bijoux Exclusifs',     subtitle: 'Élégance Intemporelle' },
    { image: 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=1600&q=80', title: 'Accessoires Premium',  subtitle: 'Raffinement & Style' },
  ],
  stripImages: [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
    'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&q=80',
    'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&q=80',
    'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=600&q=80',
    'https://images.unsplash.com/photo-1601121141461-9d6647bef0a1?w=600&q=80',
    'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=600&q=80',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80',
  ],
  instagramImages: [
    'https://images.unsplash.com/photo-1601121141461-9d6647bef0a1?w=400&q=80',
    'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=400&q=80',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80',
    'https://images.unsplash.com/photo-1573408301185-9519f94816b5?w=400&q=80',
    'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=400&q=80',
  ],
  promoBar: {
    enabled: true,
    text: "SOLDES D'ÉTÉ — -15% sur tous les produits.",
    code: 'foryou50',
  },
}

// @desc    Get site settings (hero slider, bandes d'images, bandeau promo)
// @route   GET /api/settings
// @access  Public
export const getSiteSettings = asyncHandler(async (req, res) => {
  let settings = await SiteSettings.findOne()

  if (!settings) {
    settings = await SiteSettings.create(DEFAULT_SETTINGS)
  }

  res.json(settings)
})

// @desc    Update site settings
// @route   PUT /api/settings
// @access  Manager/Admin
export const updateSiteSettings = asyncHandler(async (req, res) => {
  const { heroSlides, stripImages, instagramImages, promoBar } = req.body

  let settings = await SiteSettings.findOne()
  if (!settings) {
    settings = await SiteSettings.create(DEFAULT_SETTINGS)
  }

  if (heroSlides !== undefined)      settings.heroSlides = heroSlides
  if (stripImages !== undefined)     settings.stripImages = stripImages
  if (instagramImages !== undefined) settings.instagramImages = instagramImages
  if (promoBar !== undefined)        settings.promoBar = { ...settings.promoBar.toObject(), ...promoBar }

  const updated = await settings.save()
  res.json(updated)
})
