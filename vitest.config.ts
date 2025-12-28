import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    reporter: ['verbose', 'html'],
    outputFile: {
      html: './test-results.html'
    },
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    globals: true,
  }
})
