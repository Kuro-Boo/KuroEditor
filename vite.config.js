import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// ローカルサーバーのポートを 5177 に統一
// - npm run dev     → http://localhost:5177  (Vite 開発サーバー / HMR)
// - npm run preview → http://localhost:5177  (build 後の dist/ を配信)
const LOCAL_PORT = 5177

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: LOCAL_PORT,
    strictPort: true,
  },
  preview: {
    port: LOCAL_PORT,
    strictPort: true,
  },
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
