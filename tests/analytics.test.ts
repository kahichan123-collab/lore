// The grant-report numbers: counted per distinct person, admin-only.
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, createTestDb } from "./helpers/db";

const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";

let db: PGlite;
let q1: string;
let q2: string;

interface Row {
  question_id: string | null;
  visitors: number;
  opened_text: number;
  finished_text: number;
  reflected: number;
  feedback_count: number;
  avg_rating: string | null;
}

beforeEach(async () => {
  db = await createTestDb();
  await db.exec(`insert into admin_emails values ('admin@example.com')`);
  await db.query(`insert into auth.users values ($1, 'a@x.com'), ($2, 'b@x.com'), ($3, 'admin@example.com')`, [ALICE, BOB, ADMIN]);
  const { rows } = await db.query<{ id: string }>(
    `insert into questions (slug, question_zh, question_en, status) values ('q1','一','One','published'), ('q2','二','Two','published') returning id`);
  [q1, q2] = rows.map((r) => r.id);

  const event = (user: string | null, anon: string | null, q: string, type: string) =>
    db.query(`insert into events (user_id, anon_id, question_id, type) values ($1, $2, $3, $4)`, [user, anon, q, type]);

  // q1: Alice views twice, reads, finishes, reflects; Bob views and reads; an anonymous visitor views.
  await event(ALICE, null, q1, "view_question");
  await event(ALICE, null, q1, "view_question");
  await event(ALICE, null, q1, "open_text");
  await event(ALICE, null, q1, "finish_text");
  await event(ALICE, null, q1, "submit_reflection");
  await event(BOB, null, q1, "view_question");
  await event(BOB, null, q1, "open_text");
  await event(null, "browser-123", q1, "view_question");
  // q2: Bob views only.
  await event(BOB, null, q2, "view_question");

  await db.query(`insert into feedback (user_id, question_id, rating, ai_helped, own_view) values ($1, $2, 5, 4, 5), ($3, $2, 3, 2, 4)`, [ALICE, q1, BOB]);
});

describe("admin_analytics", () => {
  it("counts distinct people per question and overall", async () => {
    const { rows } = await as(db, ADMIN, () => db.query<Row>(`select * from admin_analytics()`));
    const total = rows.find((r) => r.question_id === null)!;
    const one = rows.find((r) => r.question_id === q1)!;
    const two = rows.find((r) => r.question_id === q2)!;

    expect([one.visitors, one.opened_text, one.finished_text, one.reflected].map(Number)).toEqual([3, 2, 1, 1]);
    expect(Number(two.visitors)).toBe(1);
    // Bob visited both questions but is one person overall.
    expect(Number(total.visitors)).toBe(3);
    expect(Number(one.feedback_count)).toBe(2);
    expect(Number(one.avg_rating)).toBe(4);
    expect(Number(total.feedback_count)).toBe(2);
  });

  it("refuses non-admins", async () => {
    await expect(as(db, ALICE, () => db.query(`select * from admin_analytics()`))).rejects.toThrow(/admin only/);
  });

  it("allows one feedback per person per question, readable by its author only", async () => {
    await expect(
      as(db, ALICE, () => db.query(`insert into feedback (user_id, question_id, rating) values ($1, $2, 1)`, [ALICE, q1])),
    ).rejects.toThrow(/feedback_one_per_question/);
    const mine = await as(db, BOB, () => db.query(`select * from feedback`));
    expect(mine.rows).toHaveLength(1);
  });
});
