import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, createTestDb } from "./helpers/db";

const ALICE = "00000000-0000-0000-0000-00000000000a";
let db: PGlite;
let questionId: string;

beforeEach(async () => {
  db = await createTestDb();
  await db.query(`insert into auth.users values ($1, 'a@x.com')`, [ALICE]);
  const { rows } = await db.query<{ id: string }>(
    `insert into questions (slug, question_zh, question_en, status) values ('q', '問', 'Q', 'published') returning id`);
  questionId = rows[0].id;
});

const countEvents = async () => Number((await db.query<{ n: number }>(`select count(*) as n from events`)).rows[0].n);

describe("events rate limit", () => {
  it("keeps the first 120 events per signed-out browser per hour and drops the rest silently", async () => {
    await as(db, null, async () => {
      for (let i = 0; i < 125; i++) {
        await db.query(`insert into events (anon_id, question_id, type) values ('browser-1', $1, 'view_question')`, [questionId]);
      }
      await db.query(`insert into events (anon_id, question_id, type) values ('browser-2', $1, 'view_question')`, [questionId]);
    });
    expect(await countEvents()).toBe(121);
  });

  it("limits signed-in users by account", async () => {
    await as(db, ALICE, async () => {
      for (let i = 0; i < 121; i++) {
        await db.query(`insert into events (user_id, question_id, type) values ($1, $2, 'open_text')`, [ALICE, questionId]);
      }
    });
    expect(await countEvents()).toBe(120);
  });

  it("drops events with no one to attribute them to", async () => {
    await as(db, null, () => db.query(`insert into events (question_id, type) values ($1, 'view_question')`, [questionId]));
    expect(await countEvents()).toBe(0);
  });
});

describe("reports rate limit", () => {
  it("allows 20 reports per person per hour", async () => {
    await expect(
      as(db, ALICE, async () => {
        for (let i = 0; i < 21; i++) {
          await db.query(`insert into reports (target_type, target_id, reporter_id, reason) values ('comment', gen_random_uuid(), $1, 'spam')`, [ALICE]);
        }
      }),
    ).rejects.toThrow(/Too many reports/);
    expect(Number((await db.query<{ n: number }>(`select count(*) as n from reports`)).rows[0].n)).toBe(20);
  });
});
