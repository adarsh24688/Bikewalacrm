// Script: Download Honda Sitecore CDN images and upload to ImageKit, then update DB
// Usage: npx tsx prisma/migrate-images-to-imagekit.ts

import { PrismaClient } from "@prisma/client";
import { uploadImage } from "../src/services/imagekit";

const prisma = new PrismaClient();

const HONDA_CDN = "https://edge.sitecorecloud.io/hondamotorc388f-hmsi8ece-prodb777-e813/media/Project/HONDA2WI/honda2wheelersindia";

// Verified working Honda Sitecore CDN image URLs
const SOURCE_IMAGES: Record<string, string> = {
  "Activa e:": `${HONDA_CDN}/menu/Scooter--EV/activa-e.jpg`,
  "QC1": `${HONDA_CDN}/menu/Scooter--EV/qc1.jpg`,
  "Activa 110": `${HONDA_CDN}/menu/Scooter--EV/activa110.jpg`,
  "Dio 110": `${HONDA_CDN}/menu/Scooter--EV/dio110.jpg`,
  "Activa 125": `${HONDA_CDN}/menu/Scooter--EV/activa125.jpg`,
  "Dio 125": `${HONDA_CDN}/scooter/dio125/banner/DIO125.jpg`,
  "Shine 100": `${HONDA_CDN}/menu/RedWing/shine-100.jpg`,
  "Livo": `${HONDA_CDN}/menu/RedWing/Livo.jpg`,
  "Shine 125": `${HONDA_CDN}/menu/RedWing/shine-125.jpg`,
  "SP 125": `${HONDA_CDN}/menu/RedWing/sp-125.jpg`,
  "CB125 Hornet": `${HONDA_CDN}/motorcycle/CB-125/nav/CB125.jpg`,
  "Unicorn": `${HONDA_CDN}/menu/RedWing/Unicorn.jpg`,
  "SP 160": `${HONDA_CDN}/menu/RedWing/sp-160.jpg`,
  "NX200": `${HONDA_CDN}/menu/RedWing/NX200.jpg`,
  "Hornet 2.0": `${HONDA_CDN}/menu/RedWing/Hornet.jpg`,
  "CB300F": `${HONDA_CDN}/menu/BigWing/CB300F.jpg`,
  "CB300R": `${HONDA_CDN}/menu/BigWing/CB300R.jpg`,
  "CB350": `${HONDA_CDN}/menu/BigWing/CB350-menu.jpg`,
  "CB350RS": `${HONDA_CDN}/menu/BigWing/CB350RS.jpg`,
  "NX500": `${HONDA_CDN}/menu/BigWing/NX500.jpg`,
  "CB650R": `${HONDA_CDN}/menu/BigWing/CB650R-new.png`,
  "CBR650R": `${HONDA_CDN}/menu/BigWing/CBR650R-new.png`,
  "XL750 Transalp": `${HONDA_CDN}/menu/BigWing/xl750-transalp.png`,
  "Gold Wing Tour": `${HONDA_CDN}/Goldwing-Tour--New-(1).png`,
};

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, heroImage: true },
  });

  console.log(`Found ${products.length} products in DB\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    // Skip if already on ImageKit
    if (product.heroImage?.includes("imagekit.io")) {
      console.log(`SKIP (already on ImageKit): ${product.name}`);
      skipped++;
      continue;
    }

    const sourceUrl = SOURCE_IMAGES[product.name];
    if (!sourceUrl) {
      console.log(`SKIP (no source image): ${product.name}`);
      skipped++;
      continue;
    }

    const fileName = `${slugify(product.name)}-hero`;
    const ext = sourceUrl.split(".").pop()?.split("?")[0] || "jpg";

    try {
      process.stdout.write(`${product.name}... `);
      const buffer = await downloadImage(sourceUrl);
      process.stdout.write(`${(buffer.length / 1024).toFixed(0)}KB → `);

      const result = await uploadImage(buffer, `${fileName}.${ext}`, "/yash-crm/products");

      await prisma.product.update({
        where: { id: product.id },
        data: { heroImage: result.url },
      });

      console.log(`OK ${result.url}`);
      success++;
    } catch (err) {
      console.log(`FAILED — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} uploaded, ${skipped} skipped, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
