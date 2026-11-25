// Pure helpers for notifications and @mentions. No network, so they are unit tested.

export type Person = { id: string; name: string };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Who is @mentioned in a comment? A mention is "@" followed by a person's full name, matched exactly (any letter case). */
export function extractMentions(text: string, people: Person[], max = 10): string[] {
  const found = new Set<string>();
  let work = text;
  // Longest names first; a matched span is blanked so "@Priya Nair Rao" cannot also count as "@Priya Nair".
  for (const p of [...people].sort((a, b) => b.name.length - a.name.length)) {
    const name = p.name.trim();
    if (!name || found.has(p.id)) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_])@${esc(name)}(?![\\p{L}\\p{N}_])`, "iu");
    const m = re.exec(work);
    if (!m) continue;
    found.add(p.id);
    const start = m.index + m[1].length;
    work = work.slice(0, start) + " ".repeat(name.length + 1) + work.slice(start + name.length + 1);
  }
  return people.filter((p) => found.has(p.id)).map((p) => p.id).slice(0, max);
}

/** Splits a comment so the @names that were mentioned can be drawn highlighted. */
export function splitMentions(text: string, names: string[]): { text: string; mention: boolean }[] {
  const list = names.map((n) => n.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!list.length) return [{ text, mention: false }];
  const re = new RegExp(`(^|[^\\p{L}\\p{N}_])(@(?:${list.map(esc).join("|")}))(?![\\p{L}\\p{N}_])`, "giu");
  const out: { text: string; mention: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index + m[1].length;
    if (start > last) out.push({ text: text.slice(last, start), mention: false });
    out.push({ text: m[2], mention: true });
    last = start + m[2].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), mention: false });
  return out;
}

/** "5 min ago", "2 h ago", "yesterday", or the date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 172800) return "yesterday";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
}

export type DigestItem = { title: string; body: string | null; href: string | null };

/** The morning email: one message per person listing what is waiting. Text from people is escaped. */
export function buildDigest(name: string, items: DigestItem[], baseUrl: string) {
  const base = baseUrl.replace(/\/$/, "");
  const shown = items.slice(0, 15), more = items.length - shown.length;
  const subject = items.length === 1 ? `Easy D: ${items[0].title}` : `Easy D: ${items.length} things need your attention`;
  const text = [`Hi ${name.split(/\s+/)[0] || "there"},`, "", ...shown.map((i) => `- ${i.title}${i.body ? ` (${i.body.slice(0, 120)})` : ""}${i.href ? `\n  ${base}${i.href}` : ""}`),
    ...(more > 0 ? [`...and ${more} more`] : []), "", `Open Easy D: ${base}/notifications`, "", "You can turn these emails off on the Notifications page."].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#16211b"><p>Hi ${escHtml(name.split(/\s+/)[0] || "there")},</p><ul style="padding-left:18px">${shown.map((i) =>
    `<li style="margin:6px 0">${i.href ? `<a href="${escHtml(base + i.href)}" style="color:#00510f;font-weight:600">${escHtml(i.title)}</a>` : `<b>${escHtml(i.title)}</b>`}${i.body ? `<br><span style="color:#62756a">${escHtml(i.body.slice(0, 120))}</span>` : ""}</li>`).join("")}</ul>${more > 0 ? `<p>...and ${more} more</p>` : ""}<p><a href="${escHtml(base)}/notifications" style="color:#00510f">Open Easy D</a></p><p style="color:#62756a;font-size:12px">You can turn these emails off on the Notifications page.</p></div>`;
  return { subject, text, html };
}
