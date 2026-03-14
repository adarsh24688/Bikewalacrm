import PDFDocument from "pdfkit";

interface LineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  selectedColor?: string;
  selectedTrim?: string;
}

interface QuotationData {
  quoteNumber: string;
  createdAt: string;
  validUntil?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  lineItems: LineItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  terms?: string | null;
  notes?: string | null;
}

export function generateQuotationPdf(data: QuotationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100; // 50 margin each side

    // --- Header ---
    doc.fontSize(20).font("Helvetica-Bold").text("Yash CRM", 50, 50);
    doc.fontSize(9).font("Helvetica").fillColor("#666666").text("Quotation", 50, 75);

    // Quote number & date — right aligned
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(data.quoteNumber, 350, 50, { width: pageWidth - 300, align: "right" });
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#666666")
      .text(`Date: ${formatDate(data.createdAt)}`, 350, 66, {
        width: pageWidth - 300,
        align: "right",
      });
    if (data.validUntil) {
      doc.text(`Valid until: ${formatDate(data.validUntil)}`, 350, 79, {
        width: pageWidth - 300,
        align: "right",
      });
    }

    // Divider
    doc
      .moveTo(50, 100)
      .lineTo(50 + pageWidth, 100)
      .strokeColor("#e5e7eb")
      .stroke();

    // --- Customer ---
    let y = 115;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#888888").text("BILL TO", 50, y);
    y += 16;
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(data.customerName, 50, y);
    y += 16;
    doc.fontSize(9).font("Helvetica").fillColor("#444444").text(data.customerPhone, 50, y);
    if (data.customerEmail) {
      y += 14;
      doc.text(data.customerEmail, 50, y);
    }

    // --- Line Items Table ---
    y += 30;
    doc
      .moveTo(50, y)
      .lineTo(50 + pageWidth, y)
      .strokeColor("#e5e7eb")
      .stroke();
    y += 8;

    // Table header
    const col = { item: 50, variant: 260, qty: 340, price: 400, total: 470 };
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#888888");
    doc.text("ITEM", col.item, y);
    doc.text("VARIANT", col.variant, y);
    doc.text("QTY", col.qty, y, { width: 40, align: "right" });
    doc.text("PRICE", col.price, y, { width: 55, align: "right" });
    doc.text("TOTAL", col.total, y, { width: 75, align: "right" });

    y += 18;
    doc
      .moveTo(50, y)
      .lineTo(50 + pageWidth, y)
      .strokeColor("#e5e7eb")
      .stroke();
    y += 8;

    // Table rows
    doc.font("Helvetica").fillColor("#000000").fontSize(9);
    for (const item of data.lineItems) {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.font("Helvetica-Bold").text(item.productName, col.item, y, { width: 200 });

      const variant = [item.selectedColor, item.selectedTrim].filter(Boolean).join(" / ");
      doc.font("Helvetica").fontSize(8).fillColor("#666666");
      doc.text(variant || "-", col.variant, y, { width: 70 });

      doc.fillColor("#000000").fontSize(9);
      doc.text(String(item.quantity), col.qty, y, { width: 40, align: "right" });
      doc.text(currency(item.unitPrice), col.price, y, { width: 55, align: "right" });
      doc.font("Helvetica-Bold").text(currency(item.total), col.total, y, {
        width: 75,
        align: "right",
      });

      y += 22;
    }

    // Divider before totals
    y += 4;
    doc
      .moveTo(350, y)
      .lineTo(50 + pageWidth, y)
      .strokeColor("#e5e7eb")
      .stroke();
    y += 10;

    // --- Totals ---
    const labelX = 380;
    const valX = col.total;
    const valW = 75;

    doc.font("Helvetica").fontSize(9).fillColor("#444444");
    doc.text("Subtotal", labelX, y);
    doc.text(currency(data.subtotal), valX, y, { width: valW, align: "right" });
    y += 16;

    if (data.discount > 0) {
      doc.fillColor("#16a34a");
      doc.text("Discount", labelX, y);
      doc.text(`-${currency(data.discount)}`, valX, y, { width: valW, align: "right" });
      y += 16;
      doc.fillColor("#444444");
    }

    doc.text(`Tax (${data.taxRate}%)`, labelX, y);
    doc.text(currency(data.taxAmount), valX, y, { width: valW, align: "right" });
    y += 18;

    doc
      .moveTo(350, y)
      .lineTo(50 + pageWidth, y)
      .strokeColor("#e5e7eb")
      .stroke();
    y += 8;

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000");
    doc.text("Total", labelX, y);
    doc.text(currency(data.total), valX, y, { width: valW, align: "right" });

    // --- Terms ---
    if (data.terms) {
      y += 40;
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#888888").text("TERMS & CONDITIONS", 50, y);
      y += 14;
      doc.fontSize(9).font("Helvetica").fillColor("#444444").text(data.terms, 50, y, {
        width: pageWidth,
        lineGap: 3,
      });
    }

    // --- Footer ---
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#aaaaaa")
      .text("Generated by Yash CRM", 50, doc.page.height - 50, {
        width: pageWidth,
        align: "center",
      });

    doc.end();
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function currency(value: number): string {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
