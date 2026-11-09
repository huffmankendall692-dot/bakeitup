import { neon } from "@neondatabase/serverless";

// Created on demand so a missing DATABASE_URL can't fail the build or the homepage.
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}
