const TITLES = new Set(["dr", "mr", "mrs", "ms", "miss", "prof", "ca", "cs", "adv"]);

/** Login username used by the old app: first name, lowercased, @marcglocal.com (titles like "Dr." are skipped). */
export function defaultEmpid(fullName: string, domain = "marcglocal.com"): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9._-]/g, "").replace(/^[._-]+|[._-]+$/g, "");
  const first = words.map(clean).find((w, i) => w && !(TITLES.has(w) && i < words.length - 1)) ?? "";
  return first ? `${first}@${domain}` : "";
}

const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Random 12-character password (no look-alike characters). */
export function generatePassword(length = 12): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}
