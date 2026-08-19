import mongoose from 'mongoose'

const siteSettingsSchema = new mongoose.Schema({
  heroSlides: [
    {
      image:    { type: String, default: '' },
      title:    { type: String, default: '' },
      subtitle: { type: String, default: '' },
    },
  ],
  stripImages:     [{ type: String }],
  instagramImages: [{ type: String }],
  promoBar: {
    enabled: { type: Boolean, default: true },
    text:    { type: String, default: '' },
    code:    { type: String, default: '' },
  },
}, { timestamps: true })

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema)
export default SiteSettings
