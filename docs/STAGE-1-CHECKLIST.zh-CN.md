# 第一阶段（Stage 1）— 你需要做的设置清单

这份清单是给不熟悉技术的使用者看的。请按顺序做，做完后回我一句
**「Supabase 和 key 准备好了」**。**不要把任何 key 贴到聊天里。**

所有命令都要在项目的 `lore` 文件夹里运行。

---

## 1. 创建 Supabase 项目

1. 打开 <https://supabase.com>，注册一个免费账号。
2. 点 **New project**。
3. 名字可以叫 `lore`。
4. 地区选：
   - **Southeast Asia (Singapore)**：香港读者访问最快；
   - **Frankfurt**：如果你的合作方在欧洲。
5. 设置数据库密码，记在密码管理器里。这个 App 平时用不到它，但 Supabase 以后可能会问。
6. 等 1–2 分钟，项目就建好了。

> 免费项目连续 7 天没有活动会暂停。到时在 Supabase 后台点恢复即可。

---

## 2. 复制三个 Supabase 值

在 Supabase 后台：

1. 打开 **Project Settings**（齿轮图标）→ **API**（有些项目叫 **API Keys**）。
2. 复制这三个值：

| Supabase 里的名字 | 填到 `.env.local` 的变量 |
| --- | --- |
| **Project URL**（`https://xxxx.supabase.co`） | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** / **publishable** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** / **secret** key | `SUPABASE_SERVICE_ROLE_KEY` |

`service_role` 权限很大，可以绕过所有数据库安全规则。它只能放在服务器端，
**绝对不要**放进 `NEXT_PUBLIC_` 开头的变量，也不要截图或提交到 git。

---

## 3. 设置登录网址

在 Supabase：

1. **Authentication** → **URL Configuration**。
2. **Site URL** 填：`http://localhost:3000`
3. **Redirect URLs** 添加：`http://localhost:3000/auth/callback`
4. 保存。

以后部署到 Vercel 时，再补上正式网址，例如
`https://lore.vercel.app` 和 `https://lore.vercel.app/auth/callback`。

> 登录链接只能在申请它的同一个浏览器里打开。在电脑申请、用手机打开，
> 会显示链接无效——这是 Supabase 的安全设计，不是 bug。

---

## 4. 开启邮箱 magic link 登录

1. **Authentication** → **Sign In / Providers** → **Email**。
2. 确认 **Enable Email provider** 是开着的。
3. 这个 App 不用密码，只用邮箱登录链接，所以密码相关设置不用改。

### 把登录邮件改成繁体中文（可选，但建议）

1. **Authentication** → **Emails** → **Magic Link**。
2. 主题填：

   ```
   古問 LORE 登入連結
   ```

3. 正文填（`{{ .ConfirmationURL }}` 必须原样保留）：

   ```html
   <h2>古問 LORE</h2>
   <p>你好，</p>
   <p>請按下面的連結登入古問 LORE：</p>
   <p><a href="{{ .ConfirmationURL }}">登入古問 LORE</a></p>
   <p>連結會在 60 分鐘後失效。如果這不是你本人操作，可以忽略這封電郵。</p>
   <p>先讀，再思考，再對話。</p>
   ```

4. 保存。

> Supabase 自带的邮件发送器每小时只能发几封，测试够用。正式活动前，
> 建议在 **Authentication → Emails → SMTP Settings** 里接入 Resend 等免费 SMTP。

---

## 5. 创建 DeepSeek API key

1. 打开 <https://platform.deepseek.com>，注册。
2. 点 **API Keys** → **Create new API key**。
3. 复制 key（以 `sk-` 开头）。关掉页面后就看不到了。
4. 充值少量金额，测试用 US$5 足够。
5. 如果控制台有「每月消费上限」，建议设成 US$10。

我查过官方文档（2026 年 10 月）：

| 项目 | 值 |
| --- | --- |
| Base URL（OpenAI 兼容） | `https://api.deepseek.com` |
| 聊天模型 | `deepseek-flash` |
| 较强模型 | `deepseek-v4-pro` |
| JSON 输出 | `response_format: { "type": "json_object" }` |

`AI_BASE_URL` 只填到 `https://api.deepseek.com`，不要加 `/chat/completions`。

---

## 6. 创建 `.env.local`

在 `lore` 文件夹里运行：

```bash
cp .env.example .env.local
```

然后打开 `.env.local`，按下面填：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...你的-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...你的-service-role-key...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=sk-...你的-deepseek-key...
AI_MODEL_CHAT=deepseek-flash
AI_MODEL_INSIGHT=deepseek-v4-pro
AI_DAILY_LIMIT_PER_USER=20

ADMIN_EMAILS=你的邮箱@example.com
CRON_SECRET=一串很长的随机字符
```

注意事项：

- `ADMIN_EMAILS` 可以填多个邮箱，用逗号分隔。
- `CRON_SECRET` 随便一串长随机字符即可。Mac/Linux 可以用
  `openssl rand -hex 32`；Windows PowerShell 可以用
  `-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})`。
- 值不需要加引号。
- `.env.local` 已经在 `.gitignore` 里，`git status` 不应该看到它。

> AI 代码现在会读取上面的 DeepSeek 变量。如果 `AI_API_KEY` 留空，网站其余部分
> 仍然可用，AI 面板会显示「not configured」。

---

## 7. 运行数据库脚本（migration）

在 Supabase 打开 **SQL Editor** → **New query**。

**最简单的方法（推荐）**：打开

```
supabase/install/lore_all_in_one.sql
```

全选复制，粘贴到 SQL Editor，点 **Run**，等「Success」。这个文件已经把 6 个 migration
按顺序合在一起，适合全新项目，一次完成。

**如果你已经运行过部分编号文件**，就不要再运行 one-file 版本（会重复建表）。
请只按顺序补跑未运行的：

| 顺序 | 文件 | 作用 |
| --- | --- | --- |
| 1 | `supabase/migrations/0001_schema.sql` | 建表、索引 |
| 2 | `supabase/migrations/0002_rls.sql` | 用户资料触发器、解锁函数、权限规则 |
| 3 | `supabase/migrations/0003_admin_analytics.sql` | 反馈规则、后台统计函数 |
| 4 | `supabase/migrations/0004_rate_limits.sql` | 事件和举报的频率限制 |
| 5 | `supabase/migrations/0005_stage1_spec_gaps.sql` | `feedback` 事件、`response_count`、`ai_usage`、锁定人数、统计视图 |
| 6 | `supabase/migrations/0006_stage2_7.sql` | 首次昵称、反思分页、日期筛选统计、AI 洞察只由服务器写入 |

如果某个脚本报错，把**错误信息**（不要带 key）发给我。

---

## 8. 安装、导入初始内容、启动

在 `lore` 文件夹里：

```bash
npm install
npm run seed
npm run setup:check
npm run dev
```

`setup:check` 会检查 `.env.local`、Supabase 表、seed 内容和 DeepSeek key，
**不会印出任何 key**。如果全部显示 ✓，就可以启动网站。

`npm run seed` 会读取 `.env.local`，导入初始经典文本和问题，并把
`ADMIN_EMAILS` 里的邮箱登记为管理员。重复运行也没问题。

打开 <http://localhost:3000>。图书馆
<http://localhost:3000/zh-HK/library> 应该能看到初始内容。

> 现在是 **8 本经典、20 个问题**，每段节录都有公共领域来源链接。
> 其中亚里士多德《政治学》用的是 William Ellis 的公共领域译本，因为 Jowett
> 译本找不到可核实的公共领域全文。

---

## 9. 登录一次，然后把自己设为管理员

先在上一步的网站里用邮箱登录一次（数据库会在首次登录时自动创建个人资料），
然后回 Supabase **SQL Editor** 运行下面这段，把邮箱换成你的：

```sql
-- 1. 以后用这个邮箱注册的人自动成为管理员
insert into public.admin_emails (email)
values ('你的邮箱@example.com')
on conflict (email) do nothing;

-- 2. 把已经注册的账号提升为管理员
update public.profiles p
set is_admin = true
from auth.users u
where u.id = p.id
  and lower(u.email) = lower('你的邮箱@example.com');
```

检查是否成功：

```sql
select p.nickname, p.is_admin, u.email
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('你的邮箱@example.com');
```

`is_admin` 应该是 `true`。然后打开 <http://localhost:3000/zh-HK/admin>，
能看到后台就成功了。

同时把同一个邮箱填进 `.env.local` 的 `ADMIN_EMAILS`，以后运行
`npm run seed` 时会保持同步。

---

## 10. 暂停，回复我

当你确认下面每一项都完成后，回我一句 **「Supabase 和 key 准备好了」**。
**不要贴 key。**

- [ ] Supabase 项目已创建（Singapore 或 Frankfurt）
- [ ] Project URL、anon key、service_role key 已填进 `.env.local`
- [ ] Site URL 和 Redirect URL 已设置
- [ ] Email provider 已开启；需要的话已改中文邮件模板
- [ ] DeepSeek key 已创建、已充值、已填进 `AI_API_KEY`
- [ ] `ADMIN_EMAILS` 已填你的邮箱
- [ ] 已运行 `lore_all_in_one.sql`（或 `0001` → `0006` 六个脚本）
- [ ] 你的账号 `is_admin = true`
- [ ] `npm run seed` 成功，`npm run dev` 能打开网站
- [ ] 能用邮箱登录，并能打开 `/zh-HK/admin`

你确认后，我就开始 **第 2 阶段：连接 Supabase 登录和数据库**，让经典文本、
问题、个人资料和事件记录都从真实数据库读写。

---

## 常见问题

**收不到登录邮件**
先看 Supabase → Authentication → Logs。自带邮件发送器可能被限流，等一小时，
或接入 SMTP。也检查垃圾邮件。

**登录链接显示过期或无效**
在同一个浏览器、60 分钟内打开。

**`npm run seed` 报错说 `classics` 不存在**
数据库脚本还没运行，或顺序不对。回到第 7 步。

**`/admin` 显示 404**
你的账号还不是管理员。先登录，再运行第 9 步的 SQL，刷新页面；必要时退出再登录。

**网站显示「示範模式」（demo mode）**
`.env.local` 里的 `NEXT_PUBLIC_SUPABASE_URL` 或
`NEXT_PUBLIC_SUPABASE_ANON_KEY` 没填。改完要重启 `npm run dev`。

**AI 面板显示「not configured」**
检查 `.env.local` 的 `AI_API_KEY` 和 `AI_BASE_URL` 是否填好，然后重启
`npm run dev`。如果 key 留空，这是正常的；Supabase 登录、阅读、反思和讨论仍然可以用。
