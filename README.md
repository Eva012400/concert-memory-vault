# Concert Memory Vault

一个部署在 GitHub Pages 上的静态前端，使用 Supabase Auth + Database 实现账户登录和每个账户独立保存演唱会记录。

## 本地运行

```bash
python3 -m http.server 5180
```

打开：

```text
http://127.0.0.1:5180
```

## GitHub Pages 部署

这个仓库已经包含 GitHub Pages Actions 工作流：

```text
.github/workflows/pages.yml
```

部署步骤：

1. 在 GitHub 新建一个仓库，例如 `concert-memory-vault`。
2. 把本地文件推到该仓库的 `main` 分支。
3. 进入仓库 `Settings -> Pages`。
4. 在 `Build and deployment` 里选择 `GitHub Actions`。
5. 等待 `Deploy static site to GitHub Pages` workflow 完成。

发布地址通常是：

```text
https://<你的 GitHub 用户名>.github.io/concert-memory-vault/
```

本项目对应的 GitHub Pages 地址会是：

```text
https://eva012400.github.io/concert-memory-vault/
```

## Supabase 配置

1. 在 Supabase 新建项目。
2. 进入 `Project Settings -> API`，复制 Project URL 和 anon/public key。
3. 填入 `supabase-config.js`：

```js
window.CONCERT_SUPABASE = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_ANON_KEY"
};
```

4. 在 Supabase SQL Editor 执行下面的建表和权限策略。

```sql
create table if not exists public.concerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist text not null,
  tour text,
  date date not null,
  venue text not null,
  city text not null,
  country text not null,
  price numeric default 0,
  currency text default 'KRW',
  rating int default 5 check (rating between 1 and 5),
  memory text,
  poster text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.concerts enable row level security;

create policy "Users can read their concerts"
on public.concerts
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their concerts"
on public.concerts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their concerts"
on public.concerts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their concerts"
on public.concerts
for delete
to authenticated
using (auth.uid() = user_id);
```

5. 进入 `Authentication -> URL Configuration`：

```text
Site URL: https://eva012400.github.io/concert-memory-vault/
Redirect URLs: https://eva012400.github.io/concert-memory-vault/**
```

## 文件结构

```text
index.html
styles.css
app.js
supabase-config.js
.nojekyll
.github/workflows/pages.yml
```

## 数据说明

演唱会记录保存在 Supabase 的 `concerts` 表中。Row Level Security 会确保用户只能读写自己的记录。
# concert-memory-vault
