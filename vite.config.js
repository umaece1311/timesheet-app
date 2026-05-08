import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/timesheet-app/',
  plugins: [react()],
  server: {
    host: true,        // expose on LAN so phone can connect during dev
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
