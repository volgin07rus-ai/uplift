import nodemailer from 'nodemailer'

/**
 * Приёмник заявок.
 *
 * Сайт лежит на GitHub Pages — тот отдаёт файлы и не умеет выполнять
 * код, а письмо кто-то должен физически отправить. Эта функция и есть
 * недостающий кусок: принимает заявку, складывает письмо и шлёт его
 * с почты владельца сайта.
 *
 * Важно, почему именно так, а не через сервис форм: чтобы отправить
 * письмо, разрешение получателя не нужно — это обычная почта. Оно
 * нужно, только чтобы получать за него. Сервисы форм принимают почту
 * от вашего имени, поэтому и требуют подтвердить ящик; здесь письмо
 * уходит с вашего адреса, и подтверждать нечего.
 *
 * Что задать в переменных окружения хостинга:
 *   SMTP_USER     ваш ящик на Яндексе, с него уходит письмо
 *   SMTP_PASS     пароль приложения (не пароль от почты!)
 *   NOTIFY_EMAIL  куда слать заявки — обязательна
 *   SITE_URL      адрес сайта, идёт первой строкой письма
 *   AUTHOR        ФИО, идёт второй строкой
 *   ALLOW_ORIGIN  откуда принимаем заявки, через запятую
 */

/*
  Адрес получателя только из окружения, без запасного значения в коде.
  Репозиторий открытый: вписанный сюда ящик собрали бы спам-роботы, а
  он к тому же чужой. Если переменная не задана — лучше честная ошибка,
  чем письма, молча уходящие не туда.
*/
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL
const SITE_URL = process.env.SITE_URL || 'сайт не указан'
const AUTHOR = process.env.AUTHOR || 'автор не указан'

/**
 * Откуда принимаем. Без этого списка функция стала бы открытым
 * ретранслятором: кто угодно слал бы письма с вашего адреса.
 */
const ALLOWED = (process.env.ALLOW_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

/** Потолки длин. Заявка — не место для романа, а поле ввода — не труба. */
const LIMITS = { name: 100, contact: 100, project: 200, task: 2000, budget: 60 }

const clip = (v, max) => String(v ?? '').trim().slice(0, max)

/** Телефон, телеграм или почта — принимаем любой из трёх. */
function contactLooksValid(v) {
  if (/^@[\w\d_]{4,}$/.test(v)) return true
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return true
  return (v.match(/\d/g) || []).length >= 10
}

/**
 * Письмо складывает функция, а не браузер. Если бы текст приходил
 * готовым, любой мог бы отправить с вашего адреса что угодно.
 */
function buildMessage(f) {
  const lines = [
    `Новая заявка с сайта ${SITE_URL}`,
    '',
    `Автор: ${AUTHOR}`,
    '',
    '— — —',
    '',
    `Имя: ${f.name}`,
    `Связь: ${f.contact}`,
  ]
  if (f.project) lines.push(`Сайт или ниша: ${f.project}`)
  if (f.budget) lines.push(`Бюджет: ${f.budget}`)
  if (f.task) lines.push('', 'Задача:', f.task)
  return lines.join('\n')
}

export default async function handler(req, res) {
  const origin = req.headers.origin || ''
  const allowed = ALLOWED.includes(origin)

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Браузер сначала спрашивает разрешение и только потом шлёт саму заявку
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Только POST' })

  if (ALLOWED.length && !allowed) {
    return res.status(403).json({ error: 'Запрос с чужого адреса' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}

  const fields = {
    name: clip(body.name, LIMITS.name),
    contact: clip(body.contact, LIMITS.contact),
    project: clip(body.project, LIMITS.project),
    budget: clip(body.budget, LIMITS.budget),
    task: clip(body.task, LIMITS.task),
  }

  // Те же проверки, что и в браузере. Тем нельзя доверять: их обходят
  if (fields.name.length < 2 || !contactLooksValid(fields.contact)) {
    return res.status(400).json({ error: 'Не хватает имени или контакта' })
  }

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass || !NOTIFY_EMAIL) {
    console.error('Не заданы SMTP_USER, SMTP_PASS или NOTIFY_EMAIL')
    return res.status(500).json({ error: 'Отправка не настроена' })
  }

  try {
    const mail = nodemailer.createTransport({
      host: 'smtp.yandex.ru',
      port: 465,
      secure: true,
      auth: { user, pass },
    })

    await mail.sendMail({
      from: `Сайт UPLIFT <${user}>`,
      to: NOTIFY_EMAIL,
      subject: `Новая заявка с сайта ${SITE_URL}`,
      // Отвечать удобнее сразу человеку, а не себе
      replyTo: fields.contact.includes('@') ? fields.contact : undefined,
      text: buildMessage(fields),
    })

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('Письмо не ушло:', e.message)
    return res.status(502).json({ error: 'Письмо не ушло' })
  }
}
