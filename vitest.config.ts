import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // .compare / .design 是本地视觉验证工作区：
    // 无头浏览器的用户目录里会带一堆扩展自带的 *.test.js，
    // 不排掉就会被当成项目测试扫进来（曾一次性报出 100+ 个失败套件）。
    exclude: [
      'node_modules',
      '.worktrees',
      'dist',
      '.next',
      '.compare/**',
      '.design/**',
      'effect-preview/**',
      'style-preview/**',
    ],
  },
})
