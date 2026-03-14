import { PrismaClient } from "@prisma/client";
import { hondaProducts } from "./seed-honda-products";

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || "admin@example.com";

  // Create main branch
  const branch = await prisma.branch.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Main Branch",
      city: "Mumbai",
      address: "123 Business Park",
    },
  });

  console.log(`Branch created: ${branch.name}`);

  // Create super admin in allowed_users
  const admin = await prisma.allowedUser.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      role: "super_admin",
      branchId: branch.id,
      isActive: true,
    },
  });

  console.log(`Super admin created: ${admin.email}`);

  // Clear existing products before seeding Honda catalog
  await prisma.product.deleteMany({});
  console.log("Cleared existing products");

  // Seed Honda 2-wheeler products
  for (const product of hondaProducts) {
    await prisma.product.create({
      data: {
        name: product.name,
        category: product.category,
        subSegment: product.subSegment || null,
        tagline: product.tagline || null,
        description: product.description || null,
        basePrice: product.basePrice,
        unit: "unit",
        heroImage: product.heroImage || null,
        colorVariants: product.colorVariants.length > 0 ? product.colorVariants : undefined,
        specifications: product.specifications.length > 0 ? product.specifications : undefined,
        features: product.features.length > 0 ? product.features : undefined,
        trims: product.trims.length > 0 ? product.trims : undefined,
        isActive: true,
        sortOrder: product.sortOrder,
      },
    });
  }

  console.log(`${hondaProducts.length} Honda products seeded`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
