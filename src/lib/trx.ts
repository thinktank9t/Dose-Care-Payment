/** bKash Transaction IDs are 10 upper-case alphanumerics (e.g. 9GH7X2K1AB). */
export const TRX_ID_PATTERN = /^[A-Z0-9]{10}$/;

export function normalizeTrxId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidTrxId(value: string): boolean {
  return TRX_ID_PATTERN.test(value);
}

export const BD_MOBILE_PATTERN = /^01[0-9]{9}$/;

export function normalizeBdMobile(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  // Accept +8801XXXXXXXXX / 8801XXXXXXXXX and reduce to 01XXXXXXXXX.
  if (digits.length === 13 && digits.startsWith("880")) return digits.slice(2);
  return digits;
}
