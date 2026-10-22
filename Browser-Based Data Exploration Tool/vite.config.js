import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mui/material/utils/createSvgIcon.js': path.resolve(__dirname, 'src/utils/muiIconShim.jsx'),
      '@mui/material/utils/createSvgIcon': path.resolve(__dirname, 'src/utils/muiIconShim.jsx'),
      '@mui/material/SvgIcon': path.resolve(__dirname, 'src/utils/muiIconShim.jsx'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
