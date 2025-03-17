import { defineConfig } from 'vite';
import path from 'path';
import viteCompression from 'vite-plugin-compression';
import { createHash } from 'crypto';

export default defineConfig({
  build: {
    outDir: 'diststyle', // 设置构建输出的根目录
    assetsDir: 'static/fonts',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        style: path.resolve(__dirname, 'src/styles/index.js')
      },
      output: {
        // 配置 CSS 文件的输出路径，不使用哈希值
        assetFileNames: (assetInfo) => {
          // console.log(assetInfo)
          if (assetInfo.names[0] === 'style.css') {
            return 'style.css';
          }
          const hash = createHash('md5').update(assetInfo.source).digest('hex').toLowerCase();
          return `static/fonts/[name].${hash.slice(0, 7)}.[ext]`; // 默认的静态资源命名规则，不使用哈希值
        },
      }
    }
  },
  plugins: [
    viteCompression({
      deleteOriginFile: false,
      algorithm: "gzip",
      ext: '.gz',
    }),
  ],
});