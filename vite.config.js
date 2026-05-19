import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';
import { createHash } from 'crypto';
import vitePluginFaviconsInject from 'vite-plugin-favicons-inject';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'fs';

const staticSourceDir = resolve(__dirname, 'static');
const faviconSource = resolve(__dirname, 'src/assets/favicon.png');

const stackeditStaticBundle = () => ({
  name: 'stackedit-static-bundle',
  closeBundle: {
    sequential: true,
    order: 'pre',
    handler() {
      const staticOutputDir = resolve(__dirname, 'dist/static');
      const targets = ['landing', 'oauth2', 'themes', 'sitemap.xml'];

      targets.forEach((target) => {
        rmSync(resolve(staticOutputDir, target), { recursive: true, force: true });
        cpSync(resolve(staticSourceDir, target), resolve(staticOutputDir, target), {
          recursive: true,
          force: true,
        });
      });

      mkdirSync(staticOutputDir, { recursive: true });
      cpSync(faviconSource, resolve(staticOutputDir, 'favicon.png'), { force: true });
    },
  },
});

const revisionForFile = (filePath) =>
  createHash('md5').update(readFileSync(filePath)).digest('hex');

const appShellEntries = () => ({
  manifestTransforms: [
    (entries) => ({
      manifest: [
        ...entries,
        {
          url: '/',
          revision: revisionForFile(resolve(__dirname, 'dist/static/landing/index.html')),
        },
        {
          url: '/app',
          revision: revisionForFile(resolve(__dirname, 'dist/index.html')),
        },
        {
          url: '/oauth2/callback',
          revision: revisionForFile(resolve(__dirname, 'dist/static/oauth2/callback.html')),
        },
        {
          url: '/share.html',
          revision: revisionForFile(resolve(__dirname, 'dist/static/landing/share.html')),
        },
        {
          url: '/gistshare.html',
          revision: revisionForFile(resolve(__dirname, 'dist/static/landing/gistshare.html')),
        },
      ],
    }),
  ],
});

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    proxy: {
      // 匹配 OAuth2 请求
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      // 匹配其他后端请求
      '/conf': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/pdfExport': {
        target: 'http://localhost:8080', 
        changeOrigin: true
      },
      '/pandocExport': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/themes': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/prism-components': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
    }
  },
  plugins: [
    vue(),
    visualizer(),
    viteCompression({
      deleteOriginFile: false,
      algorithm: "gzip",
      ext: '.gz',
    }),
    vitePluginFaviconsInject('src/assets/favicon.png', {
      appName: 'StackEdit中文版', // 应用名称
      appDescription: '笔记利器，在线Markdown编辑器。', // 应用描述
    }),
    stackeditStaticBundle(),
    VitePWA({
      manifest: {
        name: 'StackEdit中文版', // 应用名称
        short_name: 'StackEdit',
        description: '笔记利器，在线Markdown编辑器。', // 应用描述
        display: 'standalone', // 显示模式
        orientation: 'any', // 屏幕方向
        start_url: '/app', // 应用启动 URL
        scope: '/',
        background_color: '#ffffff', // 背景颜色
        theme_color: '#ffffff',
        crossorigin: 'use-credentials', // 跨域策略
        icons: [
          {
            src: '/static/favicon.png', // 图标路径
            sizes: '96x96 128x128 192x192 256x256 384x384 512x512', // 图标尺寸
            type: 'image/png', // 图标类型
            purpose: 'any maskable' // 图标用途
          }
        ]
      },
      registerType: 'prompt',
      useCredentials: true,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,gif,json,webmanifest,woff,woff2,ttf}'],
        globIgnores: [
          '**/.*',
          '**/*.map',
          'index.html',
          'static/oauth2/callback.html',
          'static/landing/share.html',
          'static/landing/gistshare.html',
          'static/fonts/KaTeX_*',
          'static/apple-touch-*.png',
          'static/mstile-*.png',
          'static/yandex-browser-*.png',
        ],
        navigateFallback: '/app',
        navigateFallbackDenylist: [/^\/oauth2\/callback/],
        ignoreURLParametersMatching: [
          /^id$/,
          /^code$/,
          /^state$/,
          /^scope$/,
          /^authuser$/,
          /^prompt$/,
          /^hd$/,
          /^error$/,
          /^error_description$/,
          /^utm_/,
          /^fbclid$/,
        ],
        ...appShellEntries(),
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 // 设置为 3 MiB
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.js', '.vue', '.json'],
  },
  build: {
    outDir: 'dist', // 设置构建输出的根目录
    assetsDir: 'static',
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4 * 1024,
    minify: 'terser',
    cssCodeSplit: true, // 如果设置为false，整个项目中的所有 CSS 将被提取到一个 CSS 文件中
    terserOptions: {
      compress: {
        // warnings: false,
        drop_console: true, // 打包时删除console
        drop_debugger: true, // 打包时删除 debugger
        pure_funcs: ['console.log']
      },
      output: {
        // 去掉注释内容
        comments: true
      }
    },
    rollupOptions: {
      output: {
        // 配置 CSS 文件的输出路径，不使用哈希值
        assetFileNames: (assetInfo) => {
          console.log(`------------name:${assetInfo.names[0]}------------ext:${assetInfo.names[0].split('.').pop()}`)
          const hash = createHash('md5').update(assetInfo.source).digest('hex').toLowerCase();
          const ext = assetInfo.names[0].split('.').pop();
          if (assetInfo.names[0] === 'index.css') {
            return `static/css/app.${hash.slice(0,7)}.css`;
          } if (ext === 'png') {
            return `[name].${hash}.[ext]`;
          } else if (ext === 'js') {
            return `static/css/[name].${hash.slice(0,20)}.[ext]`;
          } else if (ext === 'ttf' || ext === 'woff' || ext === 'woff2') {
            return `static/fonts/[name].${hash.slice(0,7)}.[ext]`;
          }
          return `static/[name].${hash.slice(0,7)}.[ext]`;
        },
        chunkFileNames: 'static/js/[name].[hash].js'
      },
    },
    // rollupOptions: {
    //  external: ['lodash']
    // output: {
    //   manualChunks: {
    //     // 拆分代码，这个就是分包，配置完后自动按需加载，现在还比不上webpack的splitchunk，不过也能用了。
    //     // vue: ['vue', 'vue-router', 'vuex'],
    //     // vue: ['vue', 'vue-router']
    //     // vant: ['vant'],
    //     // echarts: ['echarts']
    //   }
    // }
    // },
    // brotliSize: false
  },
  base: './',
  css: {
    file: true,
    preprocessorOptions: {
      scss: {
        javascriptEnabled: true,
      },
    },
  },
})
