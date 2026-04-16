import { defineConfig } from '@tanstack/react-start/config'

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
})
