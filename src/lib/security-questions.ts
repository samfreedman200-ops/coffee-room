import "server-only";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const SECURITY_QUESTIONS: ReadonlyArray<{ key: string; text: string }> = [
  {
    key: "first_street_full",
    text:
      "What is the full name of the first street you remember living on (street name and direction, e.g. 'East Mulberry Drive')?",
  },
  {
    key: "first_car_make_color",
    text:
      "What was the make, model, AND color of the first car you ever drove regularly?",
  },
  {
    key: "first_concert_artist_venue",
    text:
      "What was the first concert you attended — the artist's name AND the venue or city?",
  },
  {
    key: "childhood_nickname",
    text:
      "What was a childhood nickname that only your family used for you (not one used at school)?",
  },
  {
    key: "grandparents_street",
    text:
      "What was the name of the street where one of your grandparents lived when you were a child?",
  },
  {
    key: "first_pet_full",
    text:
      "What was the full name of your first pet, including any middle name or title you gave it?",
  },
  {
    key: "elementary_teacher",
    text:
      "What was the first and last name of a teacher you had in elementary school whose class you remember most?",
  },
  {
    key: "favorite_book_age12",
    text:
      "What was the title of a book you finished and loved between the ages of 10 and 13?",
  },
  {
    key: "first_screenname",
    text:
      "What was the first internet username, screenname, or email handle you ever used?",
  },
  {
    key: "family_saying",
    text:
      "What is an unusual phrase or saying that a parent or grandparent used often with you?",
  },
];

export const SECURITY_QUESTION_MAP = new Map(
  SECURITY_QUESTIONS.map((q) => [q.key, q.text]),
);

export function isValidQuestionKey(key: string): boolean {
  return SECURITY_QUESTION_MAP.has(key);
}

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, "") // strip punctuation/symbols
    .replace(/\s+/g, " ")
    .trim();
}

export async function hashAnswer(answer: string): Promise<string> {
  return bcrypt.hash(normalizeAnswer(answer), 10);
}

export async function verifyAnswer(
  answer: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(normalizeAnswer(answer), hash);
}

export type StoredSecurityQuestion = {
  user_id: string;
  position: number;
  question_key: string;
  answer_hash: string;
};

export function insertSecurityQuestions(
  userId: string,
  qa: Array<{ question_key: string; answer_hash: string }>,
): void {
  const stmt = db().prepare(
    `INSERT INTO security_questions (user_id, position, question_key, answer_hash)
     VALUES (?, ?, ?, ?)`,
  );
  const tx = db().transaction(
    (items: Array<{ question_key: string; answer_hash: string }>) => {
      items.forEach((it, i) => {
        stmt.run(userId, i, it.question_key, it.answer_hash);
      });
    },
  );
  tx(qa);
}

export function getSecurityQuestions(userId: string): StoredSecurityQuestion[] {
  return db()
    .prepare(
      `SELECT user_id, position, question_key, answer_hash
       FROM security_questions
       WHERE user_id = ?
       ORDER BY position ASC`,
    )
    .all(userId) as StoredSecurityQuestion[];
}

export const REQUIRED_QUESTIONS = 4;
export const MIN_CORRECT_TO_RECOVER = 3;
