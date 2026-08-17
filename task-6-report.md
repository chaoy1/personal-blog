# Task 6 — SEO, structured data, and public verification

Implementation commit: `7841d67cfc1b511b126edb3ce883a135c1cb461b` (`feat: complete public SEO and accessibility refinement`)

## RED

- Added `tests/seo.test.ts` before `lib/seo.ts` existed.
- `npm test -- tests/seo.test.ts` failed as intended: Vite could not resolve `@/lib/seo`.

## GREEN

- Added `articleJsonLd` with a canonical URL, article type/headline/dates, and conditional image inclusion.
- `npm test -- tests/seo.test.ts` passed: 2 tests, 0 failures.
- Full suite: `npm test` passed: 8 files, 49 tests, 0 failures.
- `npm run typecheck` exited 0.

## Build

- `npm run build` exited 0 and generated `/robots.txt` and `/sitemap.xml`.
- The only output warning was Next.js's known multiple-lockfile workspace-root warning.

## Browser and endpoint evidence

- Production build tested at `390×844`. `/`, `/posts`, `/posts/hello-world`, `/moments`, `/album`, `/timeline`, `/guestbook`, `/about`, `/login`, and `/account` all had `document.body.scrollWidth <= window.innerWidth`.
- The dark mobile timeline initially reproduced at `398px > 390px`; the dark header decorative pseudo-element was the cause. After its scoped containment fix, both light and dark checks were `380px <= 390px`.
- Mobile navigation focused `01 首页` after opening and returned focus to the `展开导航` toggle after Escape.
- Article source exposed the expected title, description, canonical URL, and Article JSON-LD with published/modified dates and no image key when no image is supplied.
- Local `/robots.txt` includes `Disallow: /admin` and `Disallow: /api/admin`; `/sitemap.xml` includes the content routes and `/posts/hello-world`.
- Browser automation could not emulate `prefers-reduced-motion`; reduced-motion behavior remains covered by the existing automated motion suites.

## Files

- Added: `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`, client-route metadata layouts, and `tests/seo.test.ts`.
- Updated: root/article metadata, descriptions for articles/timeline/about, and the dark mobile timeline decoration containment rule.

## Self-review

- Client pages keep their `use client` directives; metadata is provided by route-level layouts as required by the App Router.
- Task 2's `/bg/qianli-bridge.jpg` preload remains intact.
- No external runtime dependencies were added.
- Authentication routes are explicitly `noindex` and intentionally excluded from the content sitemap.
