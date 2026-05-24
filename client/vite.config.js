import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Caspian Tandoori',
        short_name: 'Caspian',
        description: 'Restaurant Ordering System',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/admin-login',
        scope: '/',
        icons: [
          {
            src: '/caspian_logo.jpg',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/caspian_logo.jpg',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})