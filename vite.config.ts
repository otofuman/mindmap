import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@tanstack/react-table'],
  },
  build: {
    commonjsOptions: {
      include: [/@tanstack\/react-table/, /node_modules/],
    },
  },
});