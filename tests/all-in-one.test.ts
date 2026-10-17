import { describe, expect, it } from "vitest";
import { as, createAllInOneDb } from "./helpers/db";

const ALICE = "00000000-0000-0000-0000-00000000000a";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";

describe("one-file installer", () => {
  it("applies all six migrations in one paste and supports the core flow", async () => {
    const db = await createAllInOneDb();
    await db.exec(`insert into admin_emails values ('admin@example.com')`);
    await db.query(`insert into auth.users values ($1, 'alice@example.com'), ($2, 'admin@example.com')`, [ALICE, ADMIN]);
    const { rows } = await db.query<{ id: string; nickname_chosen: boolean }>(
      `select id, nickname_chosen from profiles where id = $1`, [ALICE]);
    expect(rows[0].nickname_chosen).toBe(false);

    const q = await db.query<{ id: string }>(
      `insert into questions (slug, question_zh, question_en, status)
       values ('who', '誰應該統治？', 'Who should rule?', 'published') returning id`);
    const questionId = q.rows[0].id;

    const body = "人工智慧可以幫助我們理解經典，但最後的判斷仍然應該由讀者自己作出。如果 AI 直接告訴我們答案，我們就失去了閱讀和思考的機會，這樣閱讀就沒有意義了。";
    await db.query(
      `insert into reflections (question_id, user_id, body, status) values ($1, $2, $3, 'published')`,
      [questionId, ALICE, body],
    );

    const feed = await as(db, ALICE, () => db.query(`select * from reflection_feed($1, 20, 0)`, [questionId]));
    expect(feed.rows).toHaveLength(1);
    const count = await db.query<{ n: number }>(`select question_reflection_count($1) as n`, [questionId]);
    expect(Number(count.rows[0].n)).toBe(1);

    const analytics = await as(db, ADMIN, () => db.query(`select * from admin_analytics()`));
    expect(analytics.rows.length).toBeGreaterThan(0);

    // 0005/0006 additions are present.
    const insightColumns = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'ai_insights'`);
    expect(insightColumns.rows.map((r) => r.column_name)).toContain("response_count");

    await db.close();
  });
});
