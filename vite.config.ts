import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  /*
    Сайт лежит в подпапке домена — домен/uplift/. Отсюда Vite
    подставляет путь во все свои ссылки, а прикладной код берёт то же
    значение через import.meta.env.BASE_URL (см. src/base.ts).
    Переезд на другой адрес правится только здесь.
  */
  base: '/uplift/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: { host: true, port: 5175 },
})
