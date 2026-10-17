// The most important rule in LORE: you cannot see anyone else's reflection
// until you have submitted your own. These tests run the real migrations.
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, createTestDb } from "./helpers/db";

const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";
const LONG = "我認為統治者需要專業知識，但也必須向被統治的人負責，否則知識只會變成權力的藉口。這是我讀完這段文字之後的第一個想法。";

let db: PGlite;
let questionId: string;

async function publish(userId: string, opts: { anonymous?: boolean } = {}) {
  return as(db, userId, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into reflections (question_id, user_id, body, status, is_anonymous)
       values ($1, $2, $3, 'published', $4) returning id`,
      [questionId, userId, LONG, opts.anonymous ?? false],
    );
    return rows[0].id;
  });
}

const feed = (userId: string | null) =>
  as(db, userId, async () =>
    (await db.query<{ nickname: string | null; is_mine: boolean }>(
      `select * from reflection_feed($1)`, [questionId])).rows);

beforeEach(async () => {
  db = await createTestDb();
  await db.exec(`insert into admin_emails values ('admin@example.com')`);
  await db.query(`insert into auth.users values ($1, 'alice@example.com'), ($2, 'bob@example.com'), ($3, 'Admin@Example.com')`, [ALICE, BOB, ADMIN]);
  const { rows } = await db.query<{ id: string }>(
    `insert into questions (slug, question_zh, question_en, status)
     values ('who-should-rule', '誰應該統治？', 'Who should rule?', 'published') returning id`);
  questionId = rows[0].id;
});

describe("sign-up", () => {
  it("creates a profile and makes listed emails admins (case-insensitive)", async () => {
    const { rows } = await db.query<{ id: string; is_admin: boolean }>(`select id, is_admin from profiles order by id`);
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.id === ADMIN)?.is_admin).toBe(true);
    expect(rows.find((r) => r.id === ALICE)?.is_admin).toBe(false);
  });

  it("does not let a user make themselves admin", async () => {
    await expect(as(db, BOB, () => db.query(`update profiles set is_admin = true where id = $1`, [BOB])))
      .rejects.toThrow(/permission denied/);
  });
});

describe("unlock rule", () => {
  beforeEach(async () => {
    await publish(ALICE);
  });

  it("hides other reflections from a user who has not reflected — table and feed", async () => {
    const table = await as(db, BOB, () => db.query(`select * from reflections`));
    expect(table.rows).toHaveLength(0);
    expect(await feed(BOB)).toHaveLength(0);
  });

  it("hides them from signed-out visitors", async () => {
    expect(await feed(null)).toHaveLength(0);
    await expect(as(db, null, () => db.query(`select * from reflections`))).rejects.toThrow(/permission denied/);
  });

  it("keeps them hidden while the user's own reflection is only a draft", async () => {
    await as(db, BOB, () =>
      db.query(`insert into reflections (question_id, user_id, body) values ($1, $2, 'just a draft')`, [questionId, BOB]));
    expect(await feed(BOB)).toHaveLength(0);
  });

  it("reveals them once the user submits", async () => {
    await publish(BOB);
    const rows = await feed(BOB);
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.is_mine)).toHaveLength(1);
  });

  it("does not unlock other questions", async () => {
    await publish(BOB);
    const { rows } = await db.query<{ id: string }>(
      `insert into questions (slug, question_zh, question_en, status) values ('other', '另一題', 'Other', 'published') returning id`);
    await as(db, ALICE, () =>
      db.query(`insert into reflections (question_id, user_id, body, status) values ($1, $2, $3, 'published')`, [rows[0].id, ALICE, LONG]));
    const other = await as(db, BOB, () => db.query(`select * from reflection_feed($1)`, [rows[0].id]));
    expect(other.rows).toHaveLength(0);
  });

  it("blocks comments and likes before unlocking", async () => {
    const [{ id }] = (await db.query<{ id: string }>(`select id from reflections where user_id = $1`, [ALICE])).rows;
    await expect(as(db, BOB, () =>
      db.query(`insert into comments (reflection_id, user_id, body) values ($1, $2, 'hi')`, [id, BOB]))).rejects.toThrow(/row-level security/);
    await expect(as(db, BOB, () =>
      db.query(`insert into likes (reflection_id, user_id) values ($1, $2)`, [id, BOB]))).rejects.toThrow(/row-level security/);

    await publish(BOB);
    await as(db, BOB, () => db.query(`insert into comments (reflection_id, user_id, body) values ($1, $2, 'hi')`, [id, BOB]));
    await as(db, BOB, () => db.query(`insert into likes (reflection_id, user_id) values ($1, $2)`, [id, BOB]));
    const comments = await as(db, BOB, () => db.query(`select * from comment_feed($1)`, [questionId]));
    expect(comments.rows).toHaveLength(1);
  });

  it("hides AI insights until unlocked", async () => {
    await db.query(`insert into ai_insights (question_id, summary_json) values ($1, '{}')`, [questionId]);
    expect((await as(db, BOB, () => db.query(`select * from ai_insights`))).rows).toHaveLength(0);
    await publish(BOB);
    expect((await as(db, BOB, () => db.query(`select * from ai_insights`))).rows).toHaveLength(1);
  });
});

describe("anonymity", () => {
  it("strips the nickname from anonymous reflections and the author's own replies", async () => {
    const id = await publish(ALICE, { anonymous: true });
    await publish(BOB);
    await as(db, ALICE, () => db.query(`insert into comments (reflection_id, user_id, body) values ($1, $2, 'author reply')`, [id, ALICE]));

    const alice = (await feed(BOB)).find((r) => !r.is_mine);
    expect(alice?.nickname).toBeNull();
    const reply = (await as(db, BOB, () => db.query<{ nickname: string | null; is_author: boolean }>(
      `select * from comment_feed($1)`, [questionId]))).rows[0];
    expect(reply.nickname).toBeNull();
    expect(reply.is_author).toBe(true);
  });
});

describe("write guards", () => {
  it("requires at least 50 characters to submit", async () => {
    await expect(as(db, BOB, () =>
      db.query(`insert into reflections (question_id, user_id, body, status) values ($1, $2, 'too short', 'published')`, [questionId, BOB])))
      .rejects.toThrow(/reflection_min_length/);
  });

  it("stops users hiding, unhiding or un-submitting reflections", async () => {
    const id = await publish(BOB);
    await expect(as(db, BOB, () => db.query(`update reflections set status = 'hidden' where id = $1`, [id]))).rejects.toThrow(/moderators/);
    await expect(as(db, BOB, () => db.query(`update reflections set status = 'draft' where id = $1`, [id]))).rejects.toThrow(/draft/);

    await as(db, ADMIN, () => db.query(`update reflections set status = 'hidden' where id = $1`, [id]));
    await expect(as(db, BOB, () => db.query(`update reflections set body = $2 where id = $1`, [id, LONG + "!"]))).rejects.toThrow(/hidden/);
  });

  it("hidden reflections leave the feed but still count as submitted", async () => {
    const aliceId = await publish(ALICE);
    await publish(BOB);
    await as(db, ADMIN, () => db.query(`update reflections set status = 'hidden' where id = $1`, [aliceId]));
    expect(await feed(BOB)).toHaveLength(1);
    expect(await feed(ALICE)).toHaveLength(1);
  });

  it("allows only one level of replies", async () => {
    const id = await publish(ALICE);
    await publish(BOB);
    const top = await as(db, BOB, () => db.query<{ id: string }>(
      `insert into comments (reflection_id, user_id, body) values ($1, $2, 'top') returning id`, [id, BOB]));
    const reply = await as(db, ALICE, () => db.query<{ id: string }>(
      `insert into comments (reflection_id, user_id, parent_id, body) values ($1, $2, $3, 'reply') returning id`, [id, ALICE, top.rows[0].id]));
    await expect(as(db, BOB, () =>
      db.query(`insert into comments (reflection_id, user_id, parent_id, body) values ($1, $2, $3, 'too deep')`, [id, BOB, reply.rows[0].id])))
      .rejects.toThrow(/one level/);
  });

  it("only shows published questions to non-admins", async () => {
    await db.exec(`insert into questions (slug, question_zh, question_en) values ('draft-q', '草稿', 'Draft')`);
    const visible = await as(db, BOB, () => db.query(`select slug from questions`));
    expect(visible.rows).toHaveLength(1);
    const all = await as(db, ADMIN, () => db.query(`select slug from questions`));
    expect(all.rows).toHaveLength(2);
  });
});
