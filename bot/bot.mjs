/**
 * Телеграм-бот, который благодарит за заявку.
 *
 * Человек оставляет заявку на сайте, сайт уводит его сюда по ссылке
 * вида t.me/имя_бота?start=zayavka. Телеграм показывает кнопку
 * «Начать», и по нажатию сюда прилетает «/start zayavka» — на это
 * бот и отвечает благодарностью.
 *
 * Зависимостей нет намеренно: нужен только Node 18 или новее, где
 * fetch уже встроен. Ставить ничего не надо, запуск — одной строкой:
 *
 *     BOT_TOKEN=сюда-токен-от-BotFather node bot/bot.mjs
 *
 * Работает на длинных запросах (long polling): бот сам спрашивает
 * телеграм о новых сообщениях. Это значит, что отвечать он будет,
 * только пока запущен, — зато не нужен ни домен, ни сертификат,
 * ни внешний хостинг.
 */

const TOKEN = process.env.BOT_TOKEN

if (!TOKEN) {
  console.error(
    'Не задан BOT_TOKEN.\n' +
      'Токен даёт @BotFather в телеграме: /newbot → имя → адрес.\n' +
      'Запуск:  BOT_TOKEN=1234:AA... node bot/bot.mjs',
  )
  process.exit(1)
}

const API = `https://api.telegram.org/bot${TOKEN}`

/** Ответ на «Начать». Одно сообщение, без кнопок и лишних слов. */
const WELCOME = [
  'Спасибо за заявку!',
  '',
  'Мы её получили и вернёмся в течение рабочего дня.',
  'На первом созвоне разберём нишу и покажем, из чего сложится',
  'ваша стоимость заявки.',
  '',
  'Если что-то срочное — пишите прямо сюда.',
].join('\n')

/** Ответ на всё остальное: бот не должен выглядеть сломанным. */
const FALLBACK = 'Заявка уже у нас — ответим в течение рабочего дня. Если хотите что-то добавить, пишите сюда.'

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

async function send(chatId, text) {
  await call('sendMessage', { chat_id: chatId, text })
}

async function main() {
  const me = await call('getMe', {})
  console.log(`Бот @${me.username} запущен. Ссылка для сайта:`)
  console.log(`https://t.me/${me.username}?start=zayavka\n`)

  let offset = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      /*
        timeout: 30 — телеграм держит запрос открытым до полуминуты и
        отвечает сразу, как появится сообщение. Так бот не долбит
        сервер опросами и реагирует без задержки.
      */
      const updates = await call('getUpdates', { offset, timeout: 30 })

      for (const u of updates) {
        offset = u.update_id + 1
        const msg = u.message
        if (!msg?.chat?.id) continue

        const text = (msg.text || '').trim()
        const name = msg.from?.first_name ? `, ${msg.from.first_name}` : ''

        if (text.startsWith('/start')) {
          await send(msg.chat.id, WELCOME.replace('Спасибо за заявку!', `Спасибо за заявку${name}!`))
          console.log(`/start от ${msg.from?.username || msg.chat.id}`)
        } else {
          await send(msg.chat.id, FALLBACK)
        }
      }
    } catch (e) {
      // Сеть моргнула или телеграм ответил ошибкой — ждём и пробуем снова
      console.error('Сбой опроса:', e.message)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

main().catch((e) => {
  console.error('Бот не запустился:', e.message)
  process.exit(1)
})
