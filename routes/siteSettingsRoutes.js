import express from 'express'
import { getSiteSettings, updateSiteSettings } from '../controllers/siteSettingsController.js'
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/',    getSiteSettings)
router.put('/',    protect, managerOrAdmin, updateSiteSettings)

export default router
