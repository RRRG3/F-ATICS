import { defineConfig, loadEnv } from 'vite';


/* ── Emit the classic scripts ─────────────────────────────────────
   Almost every script on this site is a classic <script>, not an ES
   module — they talk to each other through globals and depend on
   execution order. Vite only bundles modules, so it left 36 of the
   39 referenced scripts out of dist entirely and the built site was
   dead on arrival: index.html asked for script.js, room.js and the
   rest, and none of them were there.

   Rather than convert them all to modules (a refactor that would
   break the global wiring), they are emitted as-is and minified with
   esbuild, which Vite already ships. Also copied are the files the
   runtime asks for by string — the service worker, icons, manifest
   and SEO files — none of which Vite can see from the markup.       */
function emitClassicScripts() {
  const ROOT_FILES = ['sw.js', 'manifest.json', 'robots.txt', 'sitemap.xml'];
  const ROOT_DIRS  = ['icons', 'assets'];

  return {
    name: 'emit-classic-scripts',
    apply: 'build',
    async closeBundle() {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const esbuild = await import('esbuild');

      const outDir = path.resolve('dist');
      const html = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');

      // Every local script the built page still points at.
      const refs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
        .map((m) => m[1].split('?')[0])
        .filter((s) => !/^(https?:)?\/\//.test(s) && !s.startsWith('data:'))
        .map((s) => s.replace(/^\//, ''));

      let copied = 0, minified = 0, bytes = 0;
      for (const rel of [...new Set(refs)]) {
        const dest = path.join(outDir, rel);
        try { await fs.access(dest); continue; } catch (_) {}   // already emitted
        let code;
        try { code = await fs.readFile(path.resolve(rel), 'utf8'); }
        catch (_) { this.warn('classic script not found on disk: ' + rel); continue; }

        try {
          const out = await esbuild.transform(code, { minify: true, target: 'es2019' });
          code = out.code; minified++;
        } catch (e) {
          this.warn('could not minify ' + rel + ' — emitting as written (' + e.message + ')');
        }
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, code);
        copied++; bytes += Buffer.byteLength(code);
      }

      // Files the runtime requests by string, invisible to the bundler.
      const copyIfPresent = async (rel) => {
        try {
          const stat = await fs.stat(path.resolve(rel));
          const dest = path.join(outDir, rel);
          if (stat.isDirectory()) await fs.cp(path.resolve(rel), dest, { recursive: true });
          else { await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.copyFile(path.resolve(rel), dest); }
          return true;
        } catch (_) { return false; }
      };
      let extras = 0;
      for (const f of [...ROOT_FILES, ...ROOT_DIRS]) if (await copyIfPresent(f)) extras++;

      console.log('  emitted ' + copied + ' classic scripts (' + minified + ' minified, ' +
                  Math.round(bytes / 1024) + ' kB) and ' + extras + ' runtime assets');
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mlApiUrl = env.VITE_ML_API_URL || 'http://localhost:8000';

  return {
    root: '.',
    publicDir: 'public',

    plugins: [
      emitClassicScripts(),
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
      // esbuild is Vite's default minifier and needs no extra dependency;
      // 'terser' was configured but never installed, so every build failed.
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
    },

    server: {
      port: 3000,
      open: true,
      cors: true,
    },
  };
});
