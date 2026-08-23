import asyncHandler from 'express-async-handler'
import Product from '../models/Product.js'

const CATEGORY_LABELS = {
  colliers:  'Bijoux > Colliers',
  bracelets: 'Bijoux > Bracelets',
  bagues:    'Bijoux > Bagues',
  lunettes:  'Accessoires > Lunettes',
  montres:   'Accessoires > Montres',
  Sacas:     'Accessoires > Sacs',
  autres:    'Bijoux > Autres',
}

// Echappe les caracteres XML speciaux (&, <, >) — indispensable,
// les noms/descriptions produits peuvent contenir ces caracteres
// et casseraient le XML sinon.
const escapeXml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// @desc    Flux produits RSS/XML pour Meta Catalog (Commerce Manager)
// @route   GET /api/feed/products.xml
// @access  Public
export const getProductsFeed = asyncHandler(async (req, res) => {
  const siteUrl = (process.env.FRONTEND_URL || 'https://brillanteelegance.ma').replace(/\/$/, '')

  const products = await Product.find()

  const items = products.map((p) => {
    const price = Number(p.price) || 0
    const availability = p.stock > 0 ? 'in stock' : 'out of stock'
    const productType = CATEGORY_LABELS[p.category] || 'Bijoux'
    const image = p.image && p.image.startsWith('http') ? p.image : ''

    const isWatch = p.category === 'montres'
    const description = isWatch
      ? (p.description || p.name) + ' — Mouvement : Quartz'
      : (p.description || p.name)

    return `
    <item>
      <g:id>${escapeXml(p._id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(siteUrl + '/product/' + p._id)}</g:link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} MAD</g:price>
      <g:brand>brillante_elegance</g:brand>
      <g:product_type>${escapeXml(productType)}</g:product_type>
      <g:google_product_category>Apparel &amp; Accessories &gt; Jewelry</g:google_product_category>${isWatch ? `
      <g:product_detail>
        <g:section_name>Caractéristiques</g:section_name>
        <g:attribute_name>Mouvement</g:attribute_name>
        <g:attribute_value>Quartz</g:attribute_value>
      </g:product_detail>` : ''}
    </item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Brillante Élégance — Catalogue produits</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Flux produits pour Meta Catalog / Commerce Manager</description>${items}
  </channel>
</rss>`

  res.set('Content-Type', 'application/xml; charset=utf-8')
  res.send(xml)
})
