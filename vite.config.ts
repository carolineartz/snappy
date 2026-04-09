import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

const root = path.resolve(__dirname, 'src/renderer');

export default defineConfig({
  root,
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: path.resolve(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'build'),
            lib: {
              entry: path.resolve(__dirname, 'src/main/index.ts'),
              formats: ['cjs'],
              fileName: () => 'main.js',
            },
            rollupOptions: {
              external: ['electron', 'better-sqlite3'],
            },
          },
        },
      },
      {
        entry: path.resolve(__dirname, 'src/preload/index.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, 'build'),
            lib: {
              entry: path.resolve(__dirname, 'src/preload/index.ts'),
              formats: ['cjs'],
              fileName: () => 'preload.js',
            },
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
        onstart(args) {
          args.reload();
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: path.resolve(__dirname, 'build'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(root, 'index.html'),
        snap: path.resolve(root, 'snap/index.html'),
        menu: path.resolve(root, 'menu/index.html'),
      },
    },
  },
});
