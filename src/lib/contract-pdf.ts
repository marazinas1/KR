/**
 * Renders a filled lease contract (HTML from the template editor) into a
 * searchable A4 PDF with real Lithuanian characters (DejaVu, same font pipeline
 * as the invoice PDF). Text is drawn as text, never as an image.
 */
import { jsPDF } from "jspdf";

const FONT = "DejaVuSans";
let fontCache: { normal: string; bold: string } | null = null;

async function fetchFontBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function registerUnicodeFont(doc: jsPDF): Promise<boolean> {
  try {
    if (!fontCache) {
      const [normal, bold] = await Promise.all([
        fetchFontBase64("/fonts/DejaVuSans.ttf"),
        fetchFontBase64("/fonts/DejaVuSans-Bold.ttf"),
      ]);
      fontCache = { normal, bold };
    }
    doc.addFileToVFS("DejaVuSans.ttf", fontCache.normal);
    doc.addFont("DejaVuSans.ttf", FONT, "normal");
    doc.addFileToVFS("DejaVuSans-Bold.ttf", fontCache.bold);
    doc.addFont("DejaVuSans-Bold.ttf", FONT, "bold");
    return true;
  } catch {
    return false;
  }
}

type Block = { text: string; size: number; bold: boolean; gap: number };

/** Flattens the editor HTML into printable blocks. */
function htmlToBlocks(html: string): Block[] {
  const root = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html").body
    .firstElementChild;
  const blocks: Block[] = [];
  if (!root) return blocks;

  const walk = (el: Element, listPrefix?: string) => {
    for (const node of Array.from(el.children)) {
      const tag = node.tagName.toLowerCase();
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (tag === "ul" || tag === "ol") {
        let i = 1;
        for (const li of Array.from(node.children)) {
          const t = (li.textContent ?? "").replace(/\s+/g, " ").trim();
          if (t) blocks.push({ text: `${tag === "ol" ? `${i++}.` : "•"} ${t}`, size: 10, bold: false, gap: 2 });
        }
        continue;
      }
      if (tag === "h1") {
        if (text) blocks.push({ text, size: 14, bold: true, gap: 5 });
        continue;
      }
      if (tag === "h2" || tag === "h3") {
        if (text) blocks.push({ text, size: 11.5, bold: true, gap: 4 });
        continue;
      }
      if (tag === "div" || tag === "section") {
        walk(node, listPrefix);
        continue;
      }
      if (text) blocks.push({ text, size: 10, bold: false, gap: 3 });
      else if (tag === "p") blocks.push({ text: "", size: 10, bold: false, gap: 3 });
    }
  };
  walk(root);
  return blocks;
}

export type ContractPdfData = {
  title: string;
  html: string;
  landlordLabel: string;
  tenantLabel: string;
  signatureHint: string;
  place: string;
};

export async function buildContractPdf(data: ContractPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const hasFont = await registerUnicodeFont(doc);
  const font = hasFont ? FONT : "helvetica";
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const bottom = pageHeight - 22;
  const width = pageWidth - marginX * 2;
  let y = 24;

  const newPageIfNeeded = (need: number) => {
    if (y + need <= bottom) return;
    doc.addPage();
    y = 24;
  };

  doc.setFont(font, "bold");
  doc.setFontSize(15);
  doc.text(data.title, pageWidth / 2, y, { align: "center" });
  y += 6;
  if (data.place) {
    doc.setFont(font, "normal");
    doc.setFontSize(9.5);
    doc.text(data.place, pageWidth / 2, y, { align: "center" });
    y += 4;
  }
  y += 4;

  for (const block of htmlToBlocks(data.html)) {
    doc.setFont(font, block.bold ? "bold" : "normal");
    doc.setFontSize(block.size);
    if (!block.text) {
      y += block.gap;
      continue;
    }
    const lines = doc.splitTextToSize(block.text, width) as string[];
    for (const line of lines) {
      newPageIfNeeded(6);
      doc.text(line, marginX, y);
      y += block.size * 0.52 + 1.4;
    }
    y += block.gap;
  }

  // Signature block — paper signing.
  newPageIfNeeded(38);
  y += 8;
  doc.setFont(font, "normal");
  doc.setFontSize(9);
  doc.text(data.signatureHint, marginX, y);
  y += 12;
  const colW = (width - 12) / 2;
  doc.setDrawColor(140);
  doc.line(marginX, y, marginX + colW, y);
  doc.line(marginX + colW + 12, y, marginX + width, y);
  y += 5;
  doc.text(data.landlordLabel, marginX, y);
  doc.text(data.tenantLabel, marginX + colW + 12, y);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont(font, "normal");
    doc.setFontSize(8);
    doc.text(`${i} / ${pages}`, pageWidth - marginX, pageHeight - 12, { align: "right" });
  }

  return doc;
}
