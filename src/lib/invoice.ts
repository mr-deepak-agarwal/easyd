// Invoice rules carried over from the legacy Easy D app: numbering, GST split, totals, amount in words.
// Numbers themselves are issued by the database (next_invoice_no); invoicePrefix mirrors it for display and tests.

export type InvoiceType = "Proforma" | "Taxable" | "Export";
export type Entity = "MARC" | "KNP" | "KNPM" | "KNPI" | "AC";
export const INVOICE_TYPES: InvoiceType[] = ["Proforma", "Taxable", "Export"];
export const SERIES = ["M", "Q", "Y", "MISC"] as const;
export const CURRENCIES = ["USD", "AED", "EUR", "GBP", "ZAR"] as const;
export const CURRENCY_SYMBOL: Record<string, string> = { "": "₹", INR: "₹", USD: "$", AED: "AED ", EUR: "€", GBP: "£", ZAR: "ZAR " };
export const GST_RATE = 18;

export type EntityInfo = {
  code: Entity; label: string; name: string; subtitle?: string; address: string[]; phone: string;
  gstin: string; pan: string; stateCode: number;
  bank: { name: string; account: string; ifsc: string };
  hasSeries: boolean;
};
const GOA = ["2nd Floor, CMM Building, Rua de Ourem", "Panjim, Goa - 403001"];
const GOA_PH = "+91-832-6631761 / +91-9359628675";
const HDFC = { name: "HDFC Bank", ifsc: "HDFC0000059" };
const ICICI = { name: "ICICI Bank", account: "136405000321", ifsc: "ICIC0001364" };
export const ENTITIES: Record<Entity, EntityInfo> = {
  MARC: { code: "MARC", label: "MARC", name: "Mangal Analytics and Research Consulting Private Limited", address: GOA, phone: GOA_PH,
    gstin: "30AAKCM0485G1ZO", pan: "AAKCM0485G", stateCode: 30, bank: { ...HDFC, account: "50200018570336" }, hasSeries: false },
  AC: { code: "AC", label: "Ashutosh & Co.", name: "Ashutosh & Co.", subtitle: "Chartered Accountants", address: GOA, phone: GOA_PH,
    gstin: "30ATPPK7872A1ZQ", pan: "ATPPK7872A", stateCode: 30, bank: { ...HDFC, account: "50200019218571" }, hasSeries: false },
  KNP: { code: "KNP", label: "Kharangate Pereira (Goa)", name: "Kharangate Pereira & Company", subtitle: "Chartered Accountants", address: GOA, phone: GOA_PH,
    gstin: "30AAVFK8058M1ZN", pan: "AAVFK8058M", stateCode: 30, bank: ICICI, hasSeries: false },
  KNPM: { code: "KNPM", label: "Kharangate Pereira (Mumbai)", name: "Kharangate Pereira & Company", subtitle: "Chartered Accountants",
    address: ["509 Wings, Satyam CHS Ltd, Link Road, Borivali West", "Mumbai City, Maharashtra - 400091"], phone: "9923826595",
    gstin: "27AAVFK8058M1ZA", pan: "AAVFK8058M", stateCode: 27, bank: ICICI, hasSeries: true },
  KNPI: { code: "KNPI", label: "Kharangate Pereira (Indore)", name: "Kharangate Pereira & Company", subtitle: "Chartered Accountants",
    address: ["Flat No.201, Sobhagyashree Apartment, 16 Janki Nagar Main", "Ramesh and Ramesh, Indore, Madhya Pradesh - 452001"], phone: "9923826595",
    gstin: "23AAVFK8058M1ZI", pan: "AAVFK8058M", stateCode: 23, bank: ICICI, hasSeries: true },
};

/** Financial year from April, written "26-27". */
export function financialYear(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  const y = dt.getFullYear(), start = dt.getMonth() + 1 >= 4 ? y : y - 1;
  const yy = (n: number) => String(n % 100).padStart(2, "0");
  return `${yy(start)}-${yy(start + 1)}`;
}

/** Legacy number prefix, e.g. P-MARC-26-27- or T-KPC-MH-26-27-Q- (the sequence number is appended). */
export function invoicePrefix(type: InvoiceType, entity: Entity, series: string | null | undefined, fy: string): string {
  const t = type === "Proforma" ? "P" : type === "Taxable" ? "T" : "E";
  switch (entity) {
    case "MARC": return `${t}-MARC-${fy}-`;
    case "AC": return `${t}-AC-${fy}-`;
    case "KNPM": return `${t}-KPC-MH-${fy}-${series ?? ""}-`;
    case "KNPI": return `${t}-KPC-MP-${fy}-${series ?? ""}-`;
    default: return `${t}-KPC-${fy}-`;
  }
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v: unknown) => { const n = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(n) ? n : 0; };

export type InvoiceLine = { service_description?: string | null; sac?: string | null; taxable_value: number | string | null; rupee_value?: number | string | null };
export type Totals = {
  linesTotal: number; advance: number; ope: number; taxable: number;
  mode: "cgst_sgst" | "igst" | "none"; cgst: number; sgst: number; igst: number; gst: number; total: number;
};

/** Taxable = lines − advance + OPE. Taxable/Proforma invoices carry 18% GST: CGST+SGST when the delivery state
 *  is the seller's own state, otherwise IGST. Export invoices are against LUT: no GST, no advance. */
export function computeInvoice(opts: {
  type: InvoiceType; entity: Entity; lines: InvoiceLine[]; advance?: unknown; ope?: unknown; deliveryStateCode?: string | null;
}): Totals {
  const linesTotal = r2(opts.lines.reduce((s, l) => s + num(l.taxable_value), 0));
  const export_ = opts.type === "Export";
  const advance = export_ ? 0 : r2(num(opts.advance));
  const ope = r2(num(opts.ope));
  const taxable = r2(linesTotal - advance + ope);
  if (export_) return { linesTotal, advance, ope, taxable, mode: "none", cgst: 0, sgst: 0, igst: 0, gst: 0, total: taxable };
  const gst = r2((taxable * GST_RATE) / 100);
  const intra = String(opts.deliveryStateCode ?? "").trim() !== "" && Number(opts.deliveryStateCode) === ENTITIES[opts.entity].stateCode;
  const half = r2(gst / 2);
  return intra
    ? { linesTotal, advance, ope, taxable, mode: "cgst_sgst", cgst: half, sgst: r2(gst - half), igst: 0, gst, total: r2(taxable + gst) }
    : { linesTotal, advance, ope, taxable, mode: "igst", cgst: 0, sgst: 0, igst: gst, gst, total: r2(taxable + gst) };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
  "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const below100 = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : ""));
function below1000(n: number): string {
  const h = Math.floor(n / 100), rest = n % 100;
  return [h ? ONES[h] + " Hundred" : "", rest ? (h ? "and " : "") + below100(rest) : ""].filter(Boolean).join(" ");
}
/** Indian grouping (crore/lakh/thousand). "Rupees … Only", paise as "and Fifty Paise". */
export function amountInWords(amount: number, currencyWord = "Rupees"): string {
  const v = Math.round(Math.abs(amount) * 100);
  const rupees = Math.floor(v / 100), paise = v % 100;
  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(below1000(crore) + " Crore");
  if (lakh) parts.push(below100(lakh) + " Lakh");
  if (thousand) parts.push(below100(thousand) + " Thousand");
  if (n) parts.push(below1000(n));
  const words = parts.length ? parts.join(" ") : "Zero";
  return `${currencyWord} ${words}${paise ? ` and ${below100(paise)} Paise` : ""} Only`;
}

export function money(n: number, currency?: string | null): string {
  const sym = CURRENCY_SYMBOL[currency ?? ""] ?? "";
  return sym + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
