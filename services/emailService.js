import nodemailer from 'nodemailer'

let transporter = null

const getTransporter = () => {
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (!user || !pass) return null

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
  }

  return transporter
}

// =====================================================
// Notifie le createur que son compte a ete valide par
// l'administrateur et qu'il peut desormais se connecter.
// N'echoue jamais bruyamment — l'activation du compte ne
// doit jamais dependre de l'envoi de l'email.
// =====================================================
export const sendCreatorApprovedEmail = async (user) => {
  const t = getTransporter()

  if (!t) {
    console.log('Email non configure — notification approbation non envoyee a', user.email)
    return
  }

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: 'Votre compte createur a ete valide — Brillante Elegance',
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1c1917;">
          <p style="letter-spacing: 0.3em; text-transform: uppercase; font-size: 11px; color: #a1a1aa;">Brillante Elegance</p>
          <h1 style="font-weight: 400; font-size: 22px; margin: 16px 0;">Bonjour ${user.name},</h1>
          <p style="font-size: 14px; line-height: 1.7; color: #44403c;">
            Bonne nouvelle — votre demande de compte createur vient d'etre <strong>validee</strong> par notre equipe.
          </p>
          <p style="font-size: 14px; line-height: 1.7; color: #44403c;">
            Vous pouvez des maintenant vous connecter a votre espace createur, generer votre code promo personnel et commencer a toucher une commission sur chaque vente.
          </p>
          <a href="${process.env.FRONTEND_URL || 'https://brillanteelegance.ma'}/login"
             style="display:inline-block; margin-top:24px; background:#1c1917; color:#fff; text-decoration:none; padding:12px 28px; border-radius:999px; font-size:12px; letter-spacing:0.15em; text-transform:uppercase;">
            Se connecter
          </a>
        </div>
      `,
    })
    console.log('Email — approbation createur envoye a', user.email)
  } catch (error) {
    console.error('Email send error (approbation createur):', error.message)
  }
}
