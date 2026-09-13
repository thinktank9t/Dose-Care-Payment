/** Fixed identities for the E2E fake backend (E2E_FAKE_BACKEND=1). */
export const FAKE_IDENTITIES = {
  user: {
    authId: "00000000-0000-4000-8000-000000000001",
    email: "user@example.com",
    name: "Test User",
  },
  admin: {
    authId: "00000000-0000-4000-8000-000000000002",
    email: "admin@example.com",
    name: "Test Admin",
  },
} as const;

export type FakeIdentity = keyof typeof FAKE_IDENTITIES;

export function encodeFakeSession(identity: FakeIdentity): string {
  return Buffer.from(JSON.stringify(FAKE_IDENTITIES[identity])).toString("base64url");
}
