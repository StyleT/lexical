/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import {resolve} from 'path';
import {defineConfig, PluginOption} from 'vite';
import bundledEntryPlugin from 'vite-plugin-bundled-entry';

import viteModuleResolution from '../shared/viteModuleResolution';

const root = resolve(__dirname, 'src');

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const moduleResolution = [
  {
    find: 'shared',
    replacement: path.resolve('../shared/src'),
  },
  {
    find: '@lexical/react/LexicalTreeView',
    replacement: path.resolve('../lexical-react/src/LexicalTreeView'),
  },
  ...viteModuleResolution,
];

function bundleEntrypoint(id: string): PluginOption {
  return bundledEntryPlugin({
    entryPoint: resolve(root, id, 'index.ts'),
    // (optional) esbuild options to use for bundling
    esbuildOptions: {
      format: 'iife', // default "esm"
      // (optional) esbuild options to use for bundling
      minify: !IS_DEVELOPMENT,
    },
    id,
    outFile: `/src/${id}/index.bundle.js`,
  }) as unknown as PluginOption;
}

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    cssMinify: !IS_DEVELOPMENT,
    minify: !IS_DEVELOPMENT,
    outDir: 'build',
    rollupOptions: {
      input: {
        background: resolve(root, 'background', 'index.ts'),
        content: resolve(root, 'content', 'index.ts'),
        inject: resolve(root, 'inject', 'index.ts'),
        main: resolve(root, 'devtools', 'index.html'),
        panel: resolve(root, 'devtools_panel', 'index.html'),
      },
      output: {
        entryFileNames: (chunk) => `src/${chunk.name}/index.js`,
      },
      plugins: [
        replace({
          __DEV__: IS_DEVELOPMENT ? 'true' : 'false',
        }),
      ],
    },
  },
  plugins: [
    react(),
    bundleEntrypoint('background'),
    bundleEntrypoint('content'),
    bundleEntrypoint('inject'),
  ],
  resolve: {
    alias: moduleResolution,
  },
});
