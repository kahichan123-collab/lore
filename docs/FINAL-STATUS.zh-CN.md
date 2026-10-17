# 古問 LORE — 目前完成到哪裡、你還需要做甚麼

更新日期：2026 年 10 月 18 日

## 一、已經完成的程式部分

- **AI 已由 Anthropic 換成 DeepSeek**：使用官方 `openai` 套件，`baseURL` 由 `AI_BASE_URL` 控制，聊天與洞察模型分別由 `AI_MODEL_CHAT` / `AI_MODEL_INSIGHT` 控制。
- **AI 伴讀**：登入檢查、每日上限（`AI_DAILY_LIMIT_PER_USER`）、500 字問題上限、只從資料庫讀取原文、輸入／輸出「不准給結論」守衛、`ai_usage` 與 `ask_ai` 事件記錄。
- **AI 洞察**：最少 **5** 篇反思才生成；只傳反思文字，不傳姓名或用戶 ID；要求嚴格 JSON，Zod 驗證，失敗重試一次；記錄 `response_count`；只有伺服器（service role）可以寫入。
- **反思與解鎖**：鎖定時顯示「有 N 篇反思在等你」；提交後才看到社群；反思列表每頁 20 篇，可「載入更多」；匿名貼文不顯示名字。
- **討論**：一層回覆、讚好、舉報、髒話過濾、管理員隱藏／刪除。
- **回饋**：1–5 分整體體驗、AI 是否有幫助（有／有一部分／沒有）、可選文字；會寫入 `feedback` 事件。
- **統計**：日期範圍（香港時間）、註冊用戶、不重複訪客、已登入訪客、閱讀漏斗、回饋平均分、最新文字回饋、每人每題數據；CSV 匯出不再包含 `user_id` / `anon_id`。
- **首次登入**：新用戶會被帶到 `/welcome` 選擇暱稱，之後才進入原本頁面。
- **內容**：8 本經典、8 段節錄、20 條雙語問題，全部連到節錄；每段節錄都有公共領域來源連結。
- **管理員匯入工具**：`/admin/content/import` 支援 JSON（經典＋節錄＋問題）和 CSV（只加問題）。
- **測試**：105 個自動測試；`typecheck`、`lint`、production build 全部通過。

## 二、我無法替你做的部分

我沒有你的 Supabase 帳號、DeepSeek 帳號和付款方式，所以**不能**替你：

1. 建立 Supabase 項目；
2. 建立 DeepSeek API key；
3. 把 key 填進你的 `.env.local`（你也不應該把 key 貼給我）。

這兩件事只能你本人做。其餘步驟我都已經把程式和文件準備好。

## 三、你需要做的（大約 20 分鐘）

完整圖文步驟在 [`STAGE-1-CHECKLIST.zh-CN.md`](STAGE-1-CHECKLIST.zh-CN.md)。濃縮版：

1. 在 <https://supabase.com> 建一個免費項目，地區選 Singapore 或 Frankfurt。
2. 複製 **Project URL**、**anon key**、**service_role key**。
3. Authentication → URL Configuration：Site URL `http://localhost:3000`；Redirect URL `http://localhost:3000/auth/callback`。
4. Authentication → Providers → Email：確認開啟。
5. 在 <https://platform.deepseek.com> 建 API key，充值 US$5 左右。
6. 在 `lore` 文件夾執行 `cp .env.example .env.local`，填入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AI_API_KEY`
   - `ADMIN_EMAILS`
   - `CRON_SECRET`（隨便一串長隨機字）
7. 在 Supabase SQL Editor 打開 `supabase/install/lore_all_in_one.sql`，全選、貼上、按 **Run**。
   這是 6 個 migration 的合併版，只適合全新項目；如果你已經跑過部分編號文件，請只補跑
   `0005` 和 `0006`（詳見中文清單）。
8. 執行：
   ```bash
   npm install
   npm run seed
   npm run dev
   ```
9. 用你的 email 登入一次，選擇暱稱；然後在 SQL Editor 運行：
   ```sql
   insert into public.admin_emails (email)
   values ('你的邮箱@example.com')
   on conflict (email) do nothing;

   update public.profiles p
   set is_admin = true
   from auth.users u
   where u.id = p.id
     and lower(u.email) = lower('你的邮箱@example.com');
   ```
10. 打開 <http://localhost:3000/zh-HK/admin>，確認能看到後台。

## 四、还需要你人工检查的

- **AI 陷阱測試**：填好 `AI_API_KEY` 後執行 `npm run ai:trap`，看 5 個陷阱問題的回覆。理想情況是 AI 解釋原文、拒絕給答案、反問引導，而不是說「誰才對」。
- **8 段節錄**：我已按 Project Gutenberg 原文整理，但正式使用前，請再抽樣對照 README 裡的連結。
- **登入 email**：Supabase 內建寄件器每小時只能寄幾封；正式活動前請接 Resend 等 SMTP。
- **研究倫理**：如果反思或回饋會用於研究／資助報告，請先問學校倫理委員會。

## 五、目前未驗證的部分

- 沒有在**真實 Supabase** 上跑過完整登入流程（因為沒有你的項目）。
- 沒有用**真實 DeepSeek key** 跑過 AI 回覆（只用 mock 測過程式邏輯）。
- 沒有在 Vercel 上部署過。

這三項是接下來的 live check；程式碼和本地測試已經準備好。

## 六、常用指令

```bash
npm run dev             # 本地開發
npm test                # 105 個測試
npm run typecheck       # TypeScript
npm run lint            # ESLint
npm run build           # production build
npm run seed            # 匯入 8 本經典、20 條問題
npm run setup:check     # 檢查 .env.local、Supabase 和 DeepSeek key（不會印出 key）
npm run ai:trap         # 需要 AI_API_KEY，手動檢查 AI 有沒有給結論
npm run migrations:build # 修改 migration 後重新產生 one-file SQL
```
