import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  /*
    Базовый путь. На GitHub Pages сайт лежит в подпапке домена —
    volgin.site/uplift/, и отсюда Vite подставляет её во все ссылки.
    Прикладной код берёт то же значение через import.meta.env.BASE_URL
    (см. src/base.ts), так что переезд правится только этой строкой.

    На Vercel тот же репозиторий разворачивается ради почтовой функции
    в api/, и сайт там оказывается в корне, а не в подпапке. С жёстко
    прописанным «/uplift/» вторая копия была бы битой: она искала бы
    свои файлы по адресу, которого на Vercel нет. Переменную VERCEL
    сборщик выставляет сам.
  */
  base: process.env.VERCEL ? '/' : '/uplift/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: { host: true, port: 5175 },
})
