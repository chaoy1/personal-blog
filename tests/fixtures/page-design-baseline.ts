export const BASELINE_VIEWPORTS = [
  { id: 'wide', width: 1440, height: 900 },
  { id: 'compact-desktop', width: 1024, height: 768 },
  { id: 'tablet', width: 768, height: 1024 },
  { id: 'mobile-reference', width: 390, height: 844 },
  { id: 'mobile-target', width: 375, height: 812 },
  { id: 'mobile-small', width: 360, height: 800 },
  { id: 'desktop-reference', width: 1280, height: 720 },
] as const

export const BASELINE_THEMES = ['light', 'dark'] as const

export const BASELINE_STATES = [
  'normal',
  'loading',
  'empty',
  'error',
  'success',
  'permission',
] as const

export const PAGE_DESIGN_ENTRIES = [
  { id: 'P01', route: '/', specFile: 'home-page-design.md', sourceFile: 'app/page.tsx', area: 'public', template: 'Immersive + 分段式内容长卷' },
  { id: 'P02', route: '/posts', specFile: 'posts-index-page-design.md', sourceFile: 'app/posts/page.tsx', area: 'public', template: 'Open Collection' },
  { id: 'P03', route: '/posts/[slug]', specFile: 'article-detail-page-design.md', sourceFile: 'app/posts/[slug]/page.tsx', area: 'public', template: 'Reading' },
  { id: 'P04', route: '/moments', specFile: 'moments-page-design.md', sourceFile: 'app/moments/page.tsx', area: 'public', template: 'Paper Collection' },
  { id: 'P05', route: '/album', specFile: 'album-page-design.md', sourceFile: 'app/album/page.tsx', area: 'public', template: 'Paper Collection / Gallery Detail' },
  { id: 'P06', route: '/timeline', specFile: 'timeline-page-design.md', sourceFile: 'app/timeline/page.tsx', area: 'public', template: 'Chronicle' },
  { id: 'P07', route: '/guestbook', specFile: 'guestbook-page-design.md', sourceFile: 'app/guestbook/page.tsx', area: 'public', template: 'Wide Correspondence Paper' },
  { id: 'P08', route: '/about', specFile: 'about-page-design.md', sourceFile: 'app/about/page.tsx', area: 'public', template: 'Readable Profile Scroll' },
  { id: 'A01', route: '/login', specFile: 'login-page-design.md', sourceFile: 'app/login/page.tsx', area: 'auth', template: 'Focused Auth' },
  { id: 'A02', route: '/account', specFile: 'account-page-design.md', sourceFile: 'app/account/page.tsx', area: 'auth', template: 'Account Settings' },
  { id: 'M01', route: '/admin/login', specFile: 'admin-login-page-design.md', sourceFile: 'app/admin/login/page.tsx', area: 'admin', template: 'Focused Admin Auth' },
  { id: 'M02', route: '/admin', specFile: 'admin-dashboard-page-design.md', sourceFile: 'app/admin/page.tsx', area: 'admin', template: 'Admin Collection' },
  { id: 'M03', route: '/admin/editor', specFile: 'admin-editor-page-design.md', sourceFile: 'app/admin/editor/page.tsx', area: 'admin', template: 'Writing Workspace' },
  { id: 'M04', route: '/admin/moments', specFile: 'admin-moments-page-design.md', sourceFile: 'app/admin/moments/page.tsx', area: 'admin', template: 'Composer + Admin Collection' },
  { id: 'M05', route: '/admin/photos', specFile: 'admin-photos-page-design.md', sourceFile: 'app/admin/photos/page.tsx', area: 'admin', template: 'Asset Workspace' },
  { id: 'M06', route: '/admin/profile', specFile: 'admin-profile-page-design.md', sourceFile: 'app/admin/profile/page.tsx', area: 'admin', template: 'Owner Profile Settings' },
  { id: 'M07', route: '/admin/preview/[id]', specFile: 'admin-preview-page-design.md', sourceFile: 'app/admin/preview/[id]/page.tsx', area: 'admin', template: 'Public-Fidelity Preview' },
] as const

export const PAGE_SPEC_SECTIONS = [
  '页面任务',
  '必须保留',
  '信息层级',
  '版式设计',
  '组件边界',
  '状态',
  '响应式',
  '不在本页处理',
  '验收',
] as const
