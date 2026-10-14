import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function fixHashPathPlugin(): Plugin {
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
  return {
    name: 'fix-hash-path-plugin',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return null;

      const [cleanSource, ...queryParts] = source.split('?');
      const query = queryParts.length > 0 ? '?' + queryParts.join('?') : '';

      let target: string | null = null;
      if (cleanSource.startsWith('.')) {
        target = path.resolve(path.dirname(importer), cleanSource);
      } else if (cleanSource.startsWith('@/')) {
        target = path.resolve(__dirname, cleanSource.slice(2));
      }
      if (!target) return null;

      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return target + query;
      }
      for (const ext of extensions) {
        if (fs.existsSync(target + ext)) {
          return target + ext + query;
        }
      }
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        for (const ext of extensions) {
          const indexFile = path.join(target, 'index' + ext);
          if (fs.existsSync(indexFile)) {
            return indexFile + query;
          }
        }
      }
      return null;
    },
    load(id) {
      if (id.endsWith('?raw')) {
        const filePath = id.replace(/\?raw$/, '');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          return `export default ${JSON.stringify(content)};`;
        }
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [fixHashPathPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
