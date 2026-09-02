import {
  AGENCY,
  AGENCY_FACTS,
  BRIDGE,
  CASES,
  CASES_NOTE,
  CONTACT,
  GUARANTEE,
  NAV_LINKS_FOOTER,
  PROCESS,
} from '@/content'

/**
 *Два языка сайта в одном месте.
 *
 * Русский не переписан заново — он собран из content.ts, где живёт
 * вместе с объяснениями, почему написано именно так. Здесь только
 * склейка и то, что раньше было зашито прямо в разметку компонентов.
 *
 * Английский описан типом Bundle, то есть «в точности как русский».
 * Забыть ключ нельзя: сборка не пройдёт. Это важнее, чем кажется —
 * пропущенная строка не падает, а тихо показывает пустоту.
 */

/** Ссылки в шапке. Первым пунктом — имя агентства, оно не переводится. */
const NAV_RU = [
  { label: AGENCY.name, href: '#top' },
  { label: 'КЕЙСЫ', href: '#cases' },
  { label: 'КАК РАБОТАЕМ', href: '#process' },
  { label: 'КОНТАКТЫ', href: '#contact' },
]

export const RU = {
  AGENCY,
  CASES,
  CASES_NOTE,
  PROCESS,
  GUARANTEE,
  BRIDGE,
  CONTACT,
  NAV_FOOTER: NAV_LINKS_FOOTER,
  FACTS: AGENCY_FACTS,
  NAV: NAV_RU,

  /** Строки интерфейса: раньше лежали прямо в компонентах. */
  UI: {
    menu: 'Меню',
    close: 'Закрыть',
    openMenu: 'Открыть меню',
    closeMenu: 'Закрыть меню',
    discuss: 'Обсудить проект',
    discussLines: ['Обсудить', 'проект'],
    seeCases: 'Смотреть кейсы',
    ownProject: 'Обсудить свой проект',
    title: 'Uplift — перформанс-маркетинг',
    sections: 'Разделы',
    contactCol: 'Связь',
    leaveRequest: 'Оставить заявку',
    otherSide: 'Другая сторона',
    privacy: 'Политика конфиденциальности',
    credit: 'Сделано',
    loader: ['Загружаем горы', 'Раскладываем кадры', 'Готово'],
    fieldName: 'Имя',
    fieldContact: 'Телефон, телеграм или почта',
    fieldProject: 'Сайт или ниша',
    fieldTask: 'Задача',
    fieldBudget: 'Бюджет в месяц',
    errName: 'Как к вам обращаться?',
    errContact: 'Без контакта мы не ответим',
    errContactBad: 'Телефон, @телеграм или почта',
    errConsent: 'Нужно согласие',
    botCta: 'Перейти в телеграм-бот',
    botNote: 'Откроем его сами через пару секунд',
  },
}

export type Bundle = typeof RU

export const EN: Bundle = {
  AGENCY: {
    name: AGENCY.name,
    tagline: 'Performance marketing for growing businesses',
    email: AGENCY.email,
  },

  CASES: [
    {
      name: 'Chain of fitness clubs',
      tags: 'PAID SOCIAL • SEARCH ADS',
      photo: CASES[0].photo,
      hero: { value: '3,180', unit: '', label: 'Trial-class sign-ups' },
      stats: [
        { label: 'Spend', value: '₽2.4M' },
        { label: 'Leads', value: '3,180' },
        { label: 'Cost per lead', value: '₽755' },
      ],
    },
    {
      name: 'Aesthetic medicine clinic',
      tags: 'SEARCH ADS • PAID SOCIAL',
      photo: CASES[1].photo,
      hero: { value: '18.2', unit: 'M ₽', label: 'Revenue from the paid channel' },
      stats: [
        { label: 'Spend', value: '₽1.9M' },
        { label: 'Leads', value: '412' },
        { label: 'Cost per lead', value: '₽4,610' },
      ],
    },
    {
      name: 'Online coding school',
      tags: 'SEARCH ADS • DISPLAY',
      photo: CASES[2].photo,
      hero: { value: '6.1', unit: 'M ₽', label: 'Payments over four months' },
      stats: [
        { label: 'Spend', value: '₽890,000' },
        { label: 'Leads', value: '1,240' },
        { label: 'Cost per lead', value: '₽718' },
      ],
    },
    {
      name: 'Countryside hotel',
      tags: 'PAID SOCIAL',
      photo: CASES[3].photo,
      hero: { value: '×2.8', unit: '', label: 'Weekday occupancy growth' },
      stats: [
        { label: 'Spend', value: '₽340,000' },
        { label: 'Bookings', value: '820' },
        { label: 'Cost per booking', value: '₽415' },
      ],
    },
    {
      name: 'Modular home manufacturer',
      tags: 'SEARCH ADS • PAID SOCIAL',
      photo: CASES[4].photo,
      hero: { value: '31.5', unit: 'M ₽', label: 'Value of closed deals' },
      stats: [
        { label: 'Spend', value: '₽1.1M' },
        { label: 'Leads', value: '268' },
        { label: 'Cost per lead', value: '₽4,105' },
      ],
    },
  ],

  CASES_NOTE: 'Healthcare, education, real estate and services',

  PROCESS: [
    {
      index: '01',
      title: 'Live in two weeks',
      text: 'The first leads arrive within the first two weeks of work, not a quarter later',
    },
    {
      index: '02',
      title: 'We run on hypotheses',
      text: 'Every month we test four to six hypotheses and keep only what paid for itself',
    },
    {
      index: '03',
      title: 'Numbers, not reports',
      text: 'A dashboard with spend, leads and cost per lead — open to you and updated daily',
    },
    {
      index: '04',
      title: 'We answer for payback',
      text: 'We count ROMI and target cost per lead, not impressions and clicks',
    },
  ],

  GUARANTEE: {
    label: 'clients renew',
    amount: '92%',
    period: 'after the first quarter',
    promise: ['Target cost per lead', 'is written into the contract'],
  },

  BRIDGE: {
    label: 'The other side',
    title: ['This work has', 'a warmer side'],
    text: 'We live in bids, hypotheses and cost per lead. That is the cold part, and it is ours. But it exists for something else — so that your place is full and no free slots are left in the calendar',
    coldNote: 'What we do',
    warmNote: 'What for',
    pairs: [
      { cold: 'Bids and auctions', warm: 'A full house' },
      { cold: 'Hypotheses and HADI cycles', warm: 'Every chair busy' },
      { cold: 'Cost per lead', warm: 'Booked a month ahead' },
      { cold: 'ROMI and payback', warm: 'Revenue, not impressions' },
    ],
    cta: 'Cross to the warm side',
    ctaNote: 'Same company, another page',
    href: BRIDGE.href,
  },

  CONTACT: {
    label: 'Enquiry',
    title: ['Tell us', 'about the project'],
    text: 'We answer within one business day. On the first call we look at your niche and show what your cost per lead is made of',
    after: [
      {
        step: '01',
        title: 'We reply within a day',
        text: 'During business hours — usually within a couple of hours',
      },
      {
        step: '02',
        title: 'We study the niche',
        text: 'Demand, competitors and whatever you are running today',
      },
      {
        step: '03',
        title: 'We name the numbers',
        text: 'A forecast of leads and cost per lead before any contract',
      },
    ],
    budgets: [
      'under ₽150,000',
      '₽150,000 — 300,000',
      '₽300,000 — 700,000',
      'over ₽700,000',
    ],
    lowBudget: 'under ₽150,000',
    lowBudgetNote:
      'We take projects from ₽150,000 a month — on a smaller budget we cannot answer for the result. Write anyway: we will tell you where to start on your own',
    submit: 'Send the enquiry',
    sending: 'Sending',
    done: 'Enquiry sent',
    doneText: 'Thank you. We will be in touch within one business day',
    consent: 'I agree to the processing of personal data',
  },

  NAV_FOOTER: [
    { label: 'Cases', href: '#cases' },
    { label: 'How we work', href: '#process' },
    { label: 'The other side', href: '#bridge' },
    { label: 'Enquiry', href: '#contact' },
  ],

  FACTS: [
    { value: '180+', label: 'completed projects' },
    { value: '14', label: 'people on the team' },
    { value: '6', label: 'years in the market' },
    { value: '11', label: 'industries we work in' },
  ],

  NAV: [
    { label: AGENCY.name, href: '#top' },
    { label: 'CASES', href: '#cases' },
    { label: 'HOW WE WORK', href: '#process' },
    { label: 'CONTACT', href: '#contact' },
  ],

  UI: {
    menu: 'Menu',
    close: 'Close',
    openMenu: 'Open the menu',
    closeMenu: 'Close the menu',
    discuss: 'Start a project',
    discussLines: ['Start a', 'project'],
    seeCases: 'See the cases',
    ownProject: 'Start your own project',
    title: 'Uplift — performance marketing',
    sections: 'Sections',
    contactCol: 'Contact',
    leaveRequest: 'Leave an enquiry',
    otherSide: 'The other side',
    privacy: 'Privacy policy',
    credit: 'Made by',
    loader: ['Loading the mountains', 'Laying out the frames', 'Ready'],
    fieldName: 'Name',
    fieldContact: 'Phone, Telegram or email',
    fieldProject: 'Website or niche',
    fieldTask: 'What you need',
    fieldBudget: 'Monthly budget',
    errName: 'What should we call you?',
    errContact: 'We cannot reply without a contact',
    errContactBad: 'Phone, @telegram or email',
    errConsent: 'Consent is required',
    botCta: 'Open the Telegram bot',
    botNote: 'We will open it for you in a couple of seconds',
  },
}

export const DICT = { ru: RU, en: EN }
export type Lang = keyof typeof DICT
