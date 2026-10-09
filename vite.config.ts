import { defineConfig } from 'vite';

const serverPort = Number(process.env.API_PORT ?? 8787);

export default defineConfig({
  server: {
    proxy: {
      '/api': `http://localhost:${serverPort}`,
    },
  },
});
