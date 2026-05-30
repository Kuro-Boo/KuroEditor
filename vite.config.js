import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    // Single file output for easy embedding
    rollupOptions: {
      input: 'src/index.html',
      output: {
        entryFileNames: 'kuro-editor.js',
        assetFileNames: 'kuro-editor.[ext]',
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/main.js'],
    },
    setupFiles: ['./tests/setup.js'],
  },
})
