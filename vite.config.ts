/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the site from /TrialFlow/; override with VITE_BASE for other hosts.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/TrialFlow/',
  plugins: [react()],
  worker: { format: 'es' },
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
  },
})
