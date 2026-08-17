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

## Fix Round 1 — canonical, sitemap, and sharing metadata

- RED: expanded `tests/seo.test.ts`; the first run failed because `normalizeSiteUrl`, `publicMetadata`, and `articleMetadata` did not exist.
- GREEN: the SEO suite passes 6 tests, covering valid HTTP(S) URL normalization/fallback, absolute public/article canonicals, Open Graph share images, and sitemap revalidation/static timestamps.
- Added route-specific absolute canonicals and Open Graph data for `/`, `/posts`, `/moments`, `/album`, `/timeline`, `/guestbook`, `/about`, `/login`, `/account`, and articles. The shared local image is `/bg/qianli-bridge.jpg`.
- Removed the root-layout canonical to prevent static routes inheriting `/`; the home page now owns `/` explicitly.
- `app/sitemap.ts` exports `revalidate = 60`; static route entries no longer emit false `lastModified` dates.
- Production source inspection at `http://localhost:3007` confirmed unique canonicals and Open Graph URL/image tags for every route above plus `/posts/hello-world`; the article reports `og:type=article`.
- `.next/prerender-manifest.json` reports `/sitemap.xml` `initialRevalidateSeconds: 60`.
- Browser automation was unavailable in this follow-up; source inspection used the local production HTTP server instead.

## Fix Round 2 — subpath and article image URLs

- RED: added regression tests for a configured `/blog` site prefix and relative/data article image inputs. The SEO test run failed because leading-slash paths discarded the configured prefix and article Open Graph data retained a relative image.
- GREEN: `absoluteUrl` now composes app paths beneath the validated configured pathname prefix. The SEO suite passes 8 tests, including public metadata and Article JSON-LD coverage for a `/blog` deployment.
- Article image contract: HTTP(S) absolute image URLs are retained; relative image paths are normalized beneath the configured site prefix; absent, invalid, and `data:` images are omitted from JSON-LD and use the existing local bridge image as the Open Graph fallback.
- Full verification: 55 tests passed; typecheck and build passed; `git diff --check` passed. A production build with `NEXT_PUBLIC_SITE_URL=https://example.com/blog` emitted `https://example.com/blog/` for the home canonical/share image and `https://example.com/blog/posts/hello-world` for article canonical/JSON-LD.
