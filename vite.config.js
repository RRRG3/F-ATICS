import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mlApiUrl = env.VITE_ML_API_URL || 'http://localhost:8000';

  return {
    root: '.',
    publicDir: 'public',

    plugins: [
      {
        name: 'inject-ml-api-url',
        transformIndexHtml(html) {
          // Replace the hardcoded localhost so production builds point to
          // the deployed backend without touching the inline script logic.
          return html.replace(
            "const ML_API = 'http://localhost:8000';",
            `const ML_API = '${mlApiUrl}';`
          );
        },
      },
    ],

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three'],
            gsap: ['gsap'],
            vendor: ['@studio-freight/lenis'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },

    server: {
      port: 3000,
      open: true,
      cors: true,
    },

    optimizeDeps: {
      include: ['three', 'gsap', '@studio-freight/lenis'],
    },
  };
});
