import { createHash } from 'node:crypto'

/**
 * Телеграм-бот, который благодарит за заявку.
 *
 * Человек оставляет заявку на сайте, сайт уводит его сюда по ссылке
 * вида t.me/имя_бота?start=zayavka. Телеграм показывает кнопку
 * «Начать», и по нажатию сюда прилетает «/start zayavka» — на это
 * бот и отвечает благодарностью.
 *
 * ── Почему вебхук, а не опрос ──────────────────────────────────────
 *
 * Раньше бот жил отдельной программой и сам спрашивал телеграм о новых
 * сообщениях. Это работает, но только пока программа запущена: стоило
 * выключить компьютер, и человек, оставивший заявку ночью, не получал
 * ничего.
 *
 * Здесь наоборот: телеграм сам стучится сюда при каждом сообщении.
 * Функция просыпается, отвечает и засыпает. Запускать нечего, работает
 * круглосуточно.
 *
 * ── Что задать в переменных окружения ──────────────────────────────
 *
 *   BOT_TOKEN   токен от @BotFather
 *
 * Больше ничего. Секрет, которым подписаны запросы телеграма, выводится
 * из самого токена (см. ниже) — отдельно хранить его не нужно.
 */

const TOKEN = process.env.BOT_TOKEN
const API = `https://api.telegram.org/bot${TOKEN}`

/** Ответ на «Начать». Одно сообщение, без кнопок и лишних слов. */
const WELCOME = [
  'Мы её получили и вернёмся в течение рабочего дня.',
  'На первом созвоне разберём нишу и покажем, из чего сложится',
  'ваша стоимость заявки.',
  '',
  'Если что-то срочное — пишите прямо сюда.',
].join('\n')

/** Ответ на всё остальное: бот не должен выглядеть сломанным. */
const FALLBACK =
  'Заявка уже у нас — ответим в течение рабочего дня. Если хотите что-то добавить, пишите сюда.'

/*
  Секрет для проверки, что запрос действительно от телеграма.

  Адрес функции публичный, и постучаться в него может кто угодно.
  Телеграм умеет присылать условленную строку в заголовке — сверяя её,
  мы отличаем настоящие сообщения от подделок.

  Строку не храним отдельно, а выводим из токена односторонним хешем:
  из хеша токен не восстановить, а значение всегда одно и то же по обе
  стороны. Одной переменной окружения меньше — одним местом, где можно
  ошибиться, меньше.
*/
const secret = () => createHash('sha256').update(TOKEN).digest('hex').slice(0, 32)

async function call(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`${method}: ${data.description}`)
  return data.result
}

export default async function handler(req, res) {
  if (!TOKEN) {
    console.error('Не задан BOT_TOKEN')
    return res.status(500).json({ error: 'Бот не настроен' })
  }

  /*
    Разовая настройка: GET с ?setup=1 говорит телеграму, куда присылать
    сообщения. Адрес берём из самого запроса — так функция может
    указать только на себя, и подсунуть ей чужой адрес нельзя.

    Вызов безобиден и его можно повторять: он каждый раз записывает
    один и тот же адрес.
  */
  if (req.method === 'GET') {
    if (!req.query?.setup) {
      return res.status(200).json({ ok: true, hint: 'Настройка: добавьте ?setup=1' })
    }
    try {
      const url = `https://${req.headers.host}/api/telegram`
      await call('setWebhook', {
        url,
        secret_token: secret(),
        allowed_updates: ['message'],
        drop_pending_updates: true,
      })
      const me = await call('getMe', {})
      return res.status(200).json({
        ok: true,
        bot: me.username,
        webhook: url,
        link: `https://t.me/${me.username}?start=zayavka`,
      })
    } catch (e) {
      console.error('Не удалось настроить вебхук:', e.message)
      return res.status(500).json({ error: 'Настройка не удалась' })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' })
  }

  if (req.headers['x-telegram-bot-api-secret-token'] !== secret()) {
    return res.status(401).json({ error: 'Чужой запрос' })
  }

  /*
    Дальше отвечаем телеграму «принято» при любом исходе. Если вернуть
    ошибку, он будет слать это же сообщение снова и снова, и человек
    получит благодарность десять раз подряд.
  */
  try {
    const msg = req.body?.message
    if (msg?.chat?.id) {
      const text = (msg.text || '').trim()
      const name = msg.from?.first_name ? `, ${msg.from.first_name}` : ''
      await call('sendMessage', {
        chat_id: msg.chat.id,
        text: text.startsWith('/start') ? `Спасибо за заявку${name}!\n\n${WELCOME}` : FALLBACK,
      })
    }
  } catch (e) {
    console.error('Не удалось ответить:', e.message)
  }

  return res.status(200).json({ ok: true })
}
