# 古問 LORE — 交付與驗收指南（給同事）

更新日期：2026 年 10 月 18 日

> **本次已部署的正式網址：** <https://lore-eight-omega.vercel.app/zh-HK>
>
> Vercel 專案：`gpad2/lore`。資料庫仍是同一個 Supabase 專案，已匯入 8 本經典、20 個問題。
> 部署後仍需在 Supabase → Authentication → URL Configuration 把 Site URL 和 Redirect URL 改成這個網址（見第 1 節第 5 步）。

這份文件是給「驗收同事」看的。你可以把這個檔案、GitHub repo（或 ZIP）和網站網址一起交給他。

---

## 1. 最快的方式：給同事一個網址

### 方案 A：部署到 Vercel（推薦，正式驗收用）

目前網站在你的電腦上跑 `http://localhost:3000`，同事的電腦打不開這個地址。要讓同事直接開，最乾淨的方法是部署到 Vercel。

1. 把程式推到 GitHub（private repo 也可以）：
   ```bash
   git push origin main
   ```
   如果這是你自己的 repo，先確認 `git remote -v` 指向你的 repo。
2. 到 <https://vercel.com> 用 GitHub 登入，按 **Add New → Project**，選這個 repo。
3. 在 **Environment Variables** 加入 `.env.local` 裡的**全部**變數（見第 4 節）。`NEXT_PUBLIC_SITE_URL` 先填 `https://你的專案.vercel.app`，部署後如果網址不同再改。
4. 按 **Deploy**。
5. 到 Supabase → **Authentication → URL Configuration**：
   - **Site URL**：`https://你的專案.vercel.app`
   - **Redirect URLs**：加入 `https://你的專案.vercel.app/auth/callback`
   - 保留 `http://localhost:3000/auth/callback`，本機仍可用。
6. 回到 Vercel，**Redeploy** 一次（讓新的 `NEXT_PUBLIC_SITE_URL` 生效）。
7. 把 `https://你的專案.vercel.app/zh-HK` 傳給同事。

> 部署後，資料庫和內容不需要重新跑：你現在用的 Supabase 已經有 8 本經典、20 條問題和你的帳號。

### 方案 B：同事和你坐在同一間辦公室

如果同事的電腦和你的電腦在同一個 Wi-Fi／內網，可以暫時開：

```
http://你的內網 IP:3000/zh-HK
```

你的 dev server 啟動時會顯示 `Network: http://192.168.x.x:3000`。但**登入會有問題**，因為 magic link 的 redirect 目前是 `localhost`；而且你的電腦必須一直開著。只適合「快速看一眼」，不適合正式驗收。

### 方案 C：只給程式碼，同事自己跑

把 GitHub repo（或下面的 ZIP）給同事，照第 3 節在自己的電腦跑。這樣他需要自己準備 Supabase 和 DeepSeek key，或者由你用密碼管理器把 key 傳給他。

---

## 2. 交付資料包裡應該有甚麼

建議一次過給同事：

1. **網站網址**（Vercel 或本機）
2. **GitHub repo 邀請**（Settings → Collaborators → Add people，給 Read 權限就夠）
3. **這個資料夾的 ZIP**：`lore-handover-2026-10-18.zip`（已排除 `.env.local`、`node_modules`、`.next`）
4. **本文件**：`docs/HANDOVER.zh-CN.md`
5. **驗收清單**：第 5 節，直接複製給同事
6. **測試帳號說明**：第 6 節

**不要**把 `.env.local`、`service_role` key、DeepSeek key 放在 ZIP、GitHub、WhatsApp 或電郵裡。要給同事跑本機，用 1Password / Bitwarden 等密碼管理器分享，或請他自己建一份。

---

## 3. 同事如何在自己的電腦跑（可選）

需要：Node.js 20+、一個 Supabase 項目、一個 DeepSeek key。

```bash
git clone <你的 repo 網址>
cd lore
npm install
cp .env.example .env.local
# 填入 Supabase URL、anon key、service_role key、DeepSeek key、ADMIN_EMAILS、CRON_SECRET
```

到 Supabase SQL Editor 跑 **`supabase/install/lore_all_in_one.sql`**（一次貼上），然後：

```bash
npm run seed
npm run setup:check
npm run dev
```

打開 <http://localhost:3000/zh-HK>。第一次用 email 登入後，會要求選昵稱；`ADMIN_EMAILS` 裡的 email 會自動成為管理員。

---

## 4. 環境變數清單（只給需要跑本機的人）

| 變數 | 值從哪裡來 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → service_role / secret key（**只放伺服器**） |
| `NEXT_PUBLIC_SITE_URL` | 本機 `http://localhost:3000`；正式 `https://你的網域` |
| `AI_BASE_URL` | `https://api.deepseek.com` |
| `AI_API_KEY` | DeepSeek → API Keys |
| `AI_MODEL_CHAT` | `deepseek-flash` |
| `AI_MODEL_INSIGHT` | `deepseek-v4-pro`（或 `deepseek-flash` 省錢） |
| `AI_DAILY_LIMIT_PER_USER` | `20` |
| `ADMIN_EMAILS` | 管理員 email，逗號分隔 |
| `CRON_SECRET` | 任意長隨機字串 |

---

## 5. 驗收清單（給同事逐項打勾）

### A. 登入與帳號

- [ ] 打開網站，按「登入」，輸入自己的 email，收到 magic link
- [ ] 在**同一個瀏覽器**點連結，成功登入
- [ ] 第一次登入被要求選昵稱；選完可以進入網站
- [ ] 登出後再登入，昵稱仍然保留

### B. 內容

- [ ] 圖書館看到 **8 本經典**
- [ ] 圖書館看到 **20 條問題**
- [ ] 每條問題都有一段原文，不是「原文準備中」
- [ ] 每段原文底部有**出處和譯者**，以及公共領域連結
- [ ] 中文經典（論語、孟子）顯示中文原文 + Legge 英文
- [ ] 西方經典的中文標示為「摘要」，不是假裝譯文

### C. 閱讀與 AI 伴讀

- [ ] 問題頁面的七步流程可以走：第一想法 → 讀原文 → 問 AI → 寫反思 → 解鎖 → 討論 → AI 洞察
- [ ] AI 伴讀能解釋字詞、人物、背景
- [ ] 問「答案是什麼？」／「誰才對？」時，AI **拒絕給答案**，改為反問
- [ ] 要求 AI「幫我寫反思」時，AI 拒絕代寫
- [ ] 每日 AI 次數有上限（預設 20 次）

### D. 反思與解鎖

- [ ] 少於 50 字不能提交
- [ ] 提交後才看到其他人的反思
- [ ] 未提交前，只看到鎖定提示和「有 N 篇反思在等你」
- [ ] 可以選擇匿名；匿名後其他人看不到你的昵稱
- [ ] 可以編輯自己的反思
- [ ] 可以在「我的」頁刪除自己的反思

### E. 討論

- [ ] 可以對別人的反思點讚／取消讚
- [ ] 可以留言；回覆只能一層
- [ ] 可以舉報
- [ ] 管理員可以在 **Admin → Moderation** 隱藏被舉報的內容

### F. 回饋

- [ ] 解鎖後出現回饋表
- [ ] 可以給 1–5 分
- [ ] 可以回答「AI 有沒有幫你理解，而沒有告訴你應該怎樣想？」（有／有一部分／沒有）
- [ ] 可以留文字回饋

### G. 管理員後台

- [ ] `ADMIN_EMAILS` 裡的帳號可以打開 `/zh-HK/admin`
- [ ] 非管理員打不開（會 404）
- [ ] Dashboard 顯示註冊用戶、訪客、已登入訪客、打開原文、讀完、問 AI、反思、解鎖、留言、回饋
- [ ] 有日期範圍篩選（香港時間）
- [ ] 有 500 reach / 400 finish / 400 reflections / 10% feedback 的進度條
- [ ] 有平均回饋分數和最新文字回饋
- [ ] 每個問題的表格有 opened / finished / asked AI / reflected / unlocked / commented
- [ ] CSV 匯出可以打開，中文正常，沒有 `user_id` / `anon_id`

### H. AI 洞察

- [ ] 同一條問題有 **至少 5 篇反思** 時，管理員可以按「生成 AI 洞察」
- [ ] 洞察只描述觀點，不排名、不說哪個觀點更好
- [ ] 有 themes、tensions、延伸經典、下一個問題
- [ ] 只有已解鎖的讀者才看到洞察

> 目前測試資料只有 1 位測試讀者 + 你自己的反思，所以 AI 洞察按鈕會提示「反思太少」。要測這一項，請先讓 5 個帳號在同一條問題提交反思，或告訴我，我幫你準備一組測試資料。

### I. 安全與隱私

- [ ] 瀏覽器開發者工具 → Sources，搜尋 `SERVICE_ROLE`、`AI_API_KEY`、`sk-`，**不應該找到**
- [ ] 未登入時直接呼叫 Supabase REST API，讀不到別人的反思
- [ ] 未提交反思時，`reflection_feed` 回傳 0 行
- [ ] 匿名反思不會帶昵稱
- [ ] `.env.local` 不在 git 裡
- [ ] 隱私頁和社區守則看到的是最新版本（提到 DeepSeek，不是 Anthropic）

### J. 自動測試

在專案資料夾執行：

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

預期：**105 個測試全部通過**，typecheck / lint / build 沒有錯誤。

---

## 6. 測試資料說明

目前 Supabase 裡有：

- 你的帳號（`ADMIN_EMAILS` 裡的那個 email），管理員，昵稱 `kakahihi`
- 一個測試讀者：`lore-test-reader@example.com`，昵稱「測試讀者」，在「誰應該統治？」有一篇反思

測試讀者只為驗收討論功能而設。驗收完可以刪掉：

```sql
-- 在 Supabase SQL Editor 執行
delete from auth.users where email = 'lore-test-reader@example.com';
```

這會 cascade 刪除它的 profile、反思、讚好和留言。刪除後，admin analytics 的註冊用戶會回到 1。

---

## 7. 已知限制（請如實告訴同事）

1. **AI 洞察需要 5 篇反思**：目前測試資料不足，按鈕會提示「反思太少」。功能已用 SQL/單元測試驗證，但要 live 測試需先累積 5 篇。
2. **沒有 browser E2E 測試**：目前是 105 個單元/SQL 測試 + 手動流程；沒有 Playwright。
3. **內容出處要再抽樣核對**：8 段節錄已按 Project Gutenberg 整理，但正式使用前應再對一次連結。
4. **Supabase 免費版**：7 天無活動會暫停；內建寄信器每小時只能寄幾封，正式活動前要接 Resend SMTP。
5. **Vercel 部署**：本文件第 1 節是步驟；如果同事只驗收本機，不需要 Vercel。
6. **AI 成本**：默認 `deepseek-flash` 聊天、`deepseek-v4-pro` 洞察；請在 DeepSeek 後台設每月上限。

---

## 8. 安全提醒（重要）

- 你之前把 `service_role` key 和 DeepSeek key 貼在聊天裡。**正式交給同事前，建議去 Supabase 和 DeepSeek 後台重新生成 key，刪掉舊的**，然後更新 `.env.local` 和 Vercel 環境變數。
- `service_role` 可以繞過所有 RLS，外洩等於整庫任人讀寫。
- 不要把 `.env.local`、key、Supabase 密碼放進 GitHub、ZIP、電郵或 WhatsApp。
- 給同事的 GitHub 權限用 **Read** 就夠；Vercel 可以用 **Viewer**，不需要給管理權限。

---

## 9. 常用指令

```bash
npm run dev             # 本地開發
npm test                # 105 個測試
npm run typecheck       # TypeScript
npm run lint            # ESLint
npm run build           # production build
npm run seed            # 匯入 8 本經典、20 條問題
npm run setup:check     # 檢查 env、Supabase、DeepSeek（不印 key）
npm run ai:trap         # 5 個 AI 陷阱測試（需要 AI_API_KEY）
npm run migrations:build # 改 migration 後重新生成 one-file SQL
```
