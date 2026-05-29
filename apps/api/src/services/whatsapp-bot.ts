// Machine à états conversationnelle WhatsApp — sessions Redis (TTL 30min)

import redis from '@/lib/redis'
import prisma from '@/lib/prisma'
import { broadcast } from '@/lib/ws'
import {
  sendText, sendButtons, sendList,
  getReplyId, getTextBody, type WaMessage,
} from './whatsapp'

const SESSION_TTL = 30 * 60 // 30 minutes

type Step =
  | 'WELCOME'
  | 'ASK_SERVICE'
  | 'ASK_COMMUNE'
  | 'ASK_DESCRIPTION'
  | 'CONFIRM'
  | 'ASK_TICKET_REF'

type Session = {
  step: Step
  categorieId?: string
  categorieNom?: string
  commune?: string
  description?: string
  citizenId?: string
}

const SESSION_KEY = (phone: string) => `wa:session:${phone}`

async function getSession(phone: string): Promise<Session> {
  const raw = await redis.get(SESSION_KEY(phone))
  return raw ? (JSON.parse(raw) as Session) : { step: 'WELCOME' }
}

async function setSession(phone: string, session: Session): Promise<void> {
  await redis.setex(SESSION_KEY(phone), SESSION_TTL, JSON.stringify(session))
}

async function clearSession(phone: string): Promise<void> {
  await redis.del(SESSION_KEY(phone))
}

// ── Données statiques ─────────────────────────────────────────────────────────

const SERVICES = [
  { id: 'plomberie',    nom: 'Plomberie' },
  { id: 'electricite', nom: 'Électricité' },
  { id: 'menage',      nom: 'Ménage' },
  { id: 'transport',   nom: 'Transport' },
  { id: 'informatique',nom: 'Informatique' },
  { id: 'jardinage',   nom: 'Jardinage' },
  { id: 'demenagement',nom: 'Déménagement' },
  { id: 'autre',       nom: 'Autre' },
]

const COMMUNES = ['Ratoma', 'Matoto', 'Matam', 'Kaloum', 'Dixinn']

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleWhatsAppMessage(phone: string, msg: WaMessage): Promise<void> {
  const session = await getSession(phone)
  const replyId  = getReplyId(msg)
  const textBody = getTextBody(msg)

  // Commandes globales (toujours disponibles)
  const lower = textBody.toLowerCase()
  if (lower === 'annuler' || lower === 'cancel' || lower === 'stop') {
    await clearSession(phone)
    await sendText(phone, '✅ Conversation annulée. Tapez *Bonjour* pour recommencer.\n\nUrgences : SAMU 442 · Police 117 · Pompiers 18')
    return
  }
  if (lower === 'aide' || lower === 'help') {
    await sendText(phone, '💡 *Aide Allô Joy*\n\n• Tapez *1* pour signaler un problème\n• Tapez *2* pour suivre un ticket\n• Tapez *urgence* pour les contacts d\'urgence\n• Tapez *annuler* pour recommencer')
    return
  }
  if (lower === 'urgence' || lower === 'urgences') {
    await sendText(phone, '🚨 *Contacts d\'urgence*\n\n🏥 SAMU : 442\n👮 Police : 117\n🚒 Pompiers : 18\n📞 AlloJoy : 3030')
    return
  }

  switch (session.step) {
    case 'WELCOME':
      await stepWelcome(phone, session, replyId, textBody)
      break
    case 'ASK_SERVICE':
      await stepAskService(phone, session, replyId)
      break
    case 'ASK_COMMUNE':
      await stepAskCommune(phone, session, replyId)
      break
    case 'ASK_DESCRIPTION':
      await stepAskDescription(phone, session, textBody)
      break
    case 'CONFIRM':
      await stepConfirm(phone, session, replyId)
      break
    case 'ASK_TICKET_REF':
      await stepAskTicketRef(phone, session, textBody)
      break
  }
}

// ── Étapes ────────────────────────────────────────────────────────────────────

async function stepWelcome(phone: string, _session: Session, replyId: string | null, text: string) {
  const action = replyId ?? text

  if (action === '1' || action === 'signaler') {
    await setSession(phone, { step: 'ASK_SERVICE' })
    await sendList(
      phone,
      '🔧 *Quel type de service vous faut-il ?*\nChoisissez dans la liste :',
      'Voir les services',
      [{
        title: 'Services disponibles',
        rows: SERVICES.map(s => ({ id: s.id, title: s.nom })),
      }]
    )
    return
  }

  if (action === '2' || action === 'ticket' || action === 'suivre') {
    await setSession(phone, { step: 'ASK_TICKET_REF' })
    await sendText(phone, '🔍 Entrez votre *numéro de ticket* (ex: TK-12345) ou répondez *auto* pour voir vos derniers tickets.')
    return
  }

  // Message d'accueil par défaut
  await sendButtons(
    phone,
    `👋 Bienvenue sur *Allô Joy* — Services citoyens de Conakry !\n\nQue souhaitez-vous faire ?`,
    [
      { id: '1', title: '🔧 Signaler un problème' },
      { id: '2', title: '📋 Suivre un ticket' },
      { id: 'urgences', title: '🚨 Urgences' },
    ]
  )
  await setSession(phone, { step: 'WELCOME' })
}

async function stepAskService(phone: string, session: Session, replyId: string | null) {
  if (!replyId) {
    await sendList(
      phone,
      '🔧 *Quel type de service vous faut-il ?*',
      'Voir les services',
      [{ title: 'Services disponibles', rows: SERVICES.map(s => ({ id: s.id, title: s.nom })) }]
    )
    return
  }

  const service = SERVICES.find(s => s.id === replyId)
  if (!service) {
    await sendText(phone, '❌ Service non reconnu. Veuillez choisir dans la liste.')
    return
  }

  await setSession(phone, { ...session, step: 'ASK_COMMUNE', categorieId: service.id, categorieNom: service.nom })
  await sendButtons(
    phone,
    `*${service.nom}* — Dans quelle commune vous trouvez-vous ?`,
    COMMUNES.slice(0, 3).map(c => ({ id: c, title: c }))
  )
  // WhatsApp buttons max 3 — envoyer les 2 restants séparément
  await sendButtons(
    phone,
    'Suite des communes :',
    [
      ...COMMUNES.slice(3).map(c => ({ id: c, title: c })),
      { id: 'autre_commune', title: '📍 Autre commune' },
    ]
  )
}

async function stepAskCommune(phone: string, session: Session, replyId: string | null) {
  const commune = replyId && replyId !== 'autre_commune' ? replyId : null

  if (!commune) {
    await sendText(phone, '📍 Tapez le nom de votre commune (ex: Ratoma, Matoto, Kaloum…)')
    return
  }

  await setSession(phone, { ...session, step: 'ASK_DESCRIPTION', commune })
  await sendText(phone, `📍 *${commune}* — parfait.\n\n✏️ Décrivez maintenant votre problème en quelques mots :\n_(ex: "Fuite d'eau sous l'évier depuis ce matin")_`)
}

async function stepAskDescription(phone: string, session: Session, text: string) {
  if (text.length < 10) {
    await sendText(phone, '✏️ Merci de donner plus de détails (au moins 10 caractères).')
    return
  }
  if (text.length > 500) {
    await sendText(phone, '✏️ Description trop longue (max 500 caractères). Veuillez résumer.')
    return
  }

  const desc = text.slice(0, 500)
  await setSession(phone, { ...session, step: 'CONFIRM', description: desc })

  await sendButtons(
    phone,
    `📋 *Récapitulatif de votre demande :*\n\n🔧 Service : ${session.categorieNom}\n📍 Commune : ${session.commune}\n📝 Description : ${desc}\n\n*Confirmez-vous l'envoi ?*`,
    [
      { id: 'confirm', title: '✅ Confirmer' },
      { id: 'edit',    title: '✏️ Modifier' },
      { id: 'cancel',  title: '❌ Annuler' },
    ]
  )
}

async function stepConfirm(phone: string, session: Session, replyId: string | null) {
  if (replyId === 'edit') {
    await setSession(phone, { ...session, step: 'ASK_DESCRIPTION' })
    await sendText(phone, '✏️ Réécrivez votre description :')
    return
  }

  if (replyId === 'cancel' || replyId === 'annuler') {
    await clearSession(phone)
    await sendText(phone, '❌ Demande annulée. Tapez *Bonjour* pour recommencer.')
    return
  }

  if (replyId !== 'confirm') {
    await sendButtons(phone, 'Confirmez-vous l\'envoi ?', [
      { id: 'confirm', title: '✅ Confirmer' },
      { id: 'cancel',  title: '❌ Annuler' },
    ])
    return
  }

  // Créer ou récupérer le citoyen
  const normalizedPhone = `+${phone}`
  let citizen = await prisma.citizen.findUnique({ where: { telephone: normalizedPhone } })
  if (!citizen) {
    citizen = await prisma.citizen.create({
      data: { telephone: normalizedPhone, canalOrigine: 'WHATSAPP' },
    })
  }

  // Créer le ticket
  const ticket = await prisma.ticket.create({
    data: {
      categorieService: session.categorieId!,
      commune:          session.commune! as any,
      descriptionBesoin: session.description!,
      statut:           'OUVERT',
      canalOrigine:     'WHATSAPP',
      citizenId:        citizen.id,
    },
  })

  const ref = ticket.id.slice(0, 8).toUpperCase()
  await clearSession(phone)

  await sendText(
    phone,
    `✅ *Ticket créé avec succès !*\n\n📋 Référence : *${ref}*\n🔧 Service : ${session.categorieNom}\n📍 Commune : ${session.commune}\n\nUn agent va traiter votre demande. Vous serez notifié ici de l'avancement.\n\nMerci de faire confiance à *Allô Joy* 🙏`
  )

  // Notifier les superviseurs
  broadcast('ticket:created', {
    ticketId: ticket.id,
    ref,
    canal: 'WHATSAPP',
    categorie: session.categorieId,
    commune: session.commune,
  }, 'superviseur')
}

async function stepAskTicketRef(phone: string, _session: Session, text: string) {
  const normalizedPhone = `+${phone}`

  if (text.toLowerCase() === 'auto') {
    const tickets = await prisma.ticket.findMany({
      where: { citizen: { telephone: normalizedPhone } },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, categorieService: true, statut: true, createdAt: true },
    })

    if (tickets.length === 0) {
      await sendText(phone, 'Aucun ticket trouvé pour votre numéro. Tapez *1* pour en créer un.')
      await clearSession(phone)
      return
    }

    const STATUS: Record<string, string> = {
      OUVERT: '🟡 En attente', EN_COURS: '🔵 En cours',
      MISE_EN_RELATION: '🟣 Prestataire trouvé', RESOLU: '🟢 Résolu',
      FERME: '⚫ Fermé', ANNULE: '🔴 Annulé',
    }

    type TicketRow = { id: string; categorieService: string; statut: string; createdAt: Date }
    const lines = tickets.map((t: TicketRow) => {
      const date = new Date(t.createdAt).toLocaleDateString('fr-GN', { day: 'numeric', month: 'short' })
      return `• *${t.id.slice(0, 8).toUpperCase()}* — ${t.categorieService} — ${STATUS[t.statut] ?? t.statut} (${date})`
    })

    await sendText(phone, `📋 *Vos derniers tickets :*\n\n${lines.join('\n')}\n\nRépondez *menu* pour revenir à l'accueil.`)
    await clearSession(phone)
    return
  }

  // Cherche par référence (premiers 8 chars de l'UUID)
  const allTickets = await prisma.ticket.findMany({
    where: { citizen: { telephone: normalizedPhone } },
    select: { id: true, categorieService: true, statut: true, commune: true, createdAt: true },
    take: 50,
  })

  type AllTicketRow = { id: string; categorieService: string; statut: string; commune: string; createdAt: Date }
  const found = (allTickets as AllTicketRow[]).find(t => t.id.slice(0, 8).toUpperCase() === text.trim().toUpperCase().replace('TK-', ''))

  if (!found) {
    await sendText(phone, `❌ Ticket introuvable. Vérifiez la référence ou tapez *auto* pour voir vos derniers tickets.`)
    return
  }

  const STATUS_FR: Record<string, string> = {
    OUVERT: 'En attente d\'un agent',
    EN_COURS: 'En cours de traitement',
    MISE_EN_RELATION: 'Prestataire assigné',
    RESOLU: 'Résolu ✅',
    FERME: 'Fermé',
    ANNULE: 'Annulé',
  }

  const date = new Date(found.createdAt).toLocaleDateString('fr-GN', { day: 'numeric', month: 'long' })
  await sendText(
    phone,
    `📋 *Ticket ${found.id.slice(0, 8).toUpperCase()}*\n\n🔧 Service : ${found.categorieService}\n📍 Commune : ${found.commune}\n📅 Créé le : ${date}\n📊 Statut : ${STATUS_FR[found.statut] ?? found.statut}\n\nRépondez *menu* pour revenir à l'accueil.`
  )
  await clearSession(phone)
}
