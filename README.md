# 墨痕 · 个人博客

一个基于 Next.js + Supabase 的个人博客：前台展示文章，自带后台控制台（`/admin`），免费部署到 Vercel。无需公网 IP、无需服务器、无需备案。

## 功能

- 博客首页：文章列表（编号、日期、标题、摘要）
- 文章页：Markdown 渲染，支持代码块、表格、引用、图片
- 后台控制台 `/admin`：密码登录、新建 / 编辑 / 删除文章、草稿与发布
- 数据存在 Supabase（PostgreSQL），在后台改文章立即生效，无需重新部署

## 本地运行

1. 安装依赖：`npm install`
2. 配置环境变量：把 `.env.example` 复制为 `.env.local` 并填写
3. 建表：在 [Supabase 控制台](https://supabase.com/dashboard) 打开 SQL Editor，粘贴 `supabase/schema.sql` 全部内容运行
4. 启动：`npm run dev`，访问 http://localhost:3000
5. 打开 http://localhost:3000/admin 登录后台（密码为 `.env.local` 里的 `ADMIN_PASSWORD`）

## 部署到 Vercel（免费）

1. 把项目推送到 GitHub：

   ```bash
   git init
   git add .
   git commit -m "init blog"
   git branch -M main
   git remote add origin https://github.com/你的用户名/你的仓库.git
   git push -u origin main
   ```

2. 打开 vercel.com → 用 GitHub 登录 → New Project → Import 你的仓库。
3. 框架会自动识别 Next.js，无需修改构建命令，直接 Deploy。
4. 部署完成后在 Vercel 项目 Settings → Environment Variables 添加四个变量（与 `.env.local` 相同）：

   | 变量 | 说明 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公开 anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端密钥（仅服务器使用，注意保密） |
   | `ADMIN_PASSWORD` | 后台登录密码（换成强密码） |

5. 重新 Deploy 后，打开 `https://你的项目.vercel.app` 即可访问，后台在 `/admin`。

## 日常更新文章

1. 打开 `https://你的项目.vercel.app/admin`，输入管理密码。
2. 点「写新文章」，填写标题、slug、摘要，正文用 Markdown 写作（可实时预览）。
3. 保存并发布后，前台立即可见；取消勾选「立即发布」可存为草稿。

## 常见问题

- **部署后打不开 `/admin`？** 检查 Vercel 环境变量是否齐全，尤其 `ADMIN_PASSWORD`。
- **首页提示数据库未配置？** 说明 `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 没填对，或还没运行 `supabase/schema.sql`。
- **文章 404？** 确认 slug 唯一，且文章已勾选发布。
- **想改站名和简介？** 编辑 `lib/site.ts` 后重新部署即可。
