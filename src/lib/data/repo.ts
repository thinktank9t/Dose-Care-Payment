import "server-only";
import { isFakeBackend } from "@/lib/env";
import type { Repo } from "./types";

let instance: Repo | null = null;

export async function getRepo(): Promise<Repo> {
  if (instance) return instance;
  if (isFakeBackend()) {
    const { FakeRepo } = await import("./fake-repo");
    instance = new FakeRepo();
  } else {
    const { SupabaseRepo } = await import("./supabase-repo");
    instance = new SupabaseRepo();
  }
  return instance;
}
