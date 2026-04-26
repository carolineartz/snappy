import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

const buildDir = path.resolve(__dirname, 'build');
const rendererRoot = path.resolve(__dirname, 'src/renderer');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: buildDir,
      emptyOutDir: false,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/main/index.ts'),
        output: {
          format: 'cjs',
          entryFileNames: 'main.js',
        },
        external: ['electron', 'better-sqlite3'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: buildDir,
      emptyOutDir: false,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/preload/index.ts'),
        output: {
          format: 'cjs',
          entryFileNames: 'preload.js',
          inlineDynamicImports: true,
        },
        external: ['electron'],
      },
    },
  },
  renderer: {
    root: rendererRoot,
    plugins: [react(), tailwindcss()],
    build: {
      outDir: buildDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          main: path.resolve(rendererRoot, 'index.html'),
          snap: path.resolve(rendererRoot, 'snap/index.html'),
          menu: path.resolve(rendererRoot, 'menu/index.html'),
          library: path.resolve(rendererRoot, 'library/index.html'),
        },
      },
    },
  },
});
