import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { z } from "zod";

const colorVariantSchema = z.object({
  name: z.string().min(1),
  hexCode: z.string().min(1),
  imageUrl: z.string().optional(),
});

const specificationSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

const featureSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

const trimSchema = z.object({
  name: z.string().min(1),
  priceDiff: z.number(),
});

const createProductSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["ev", "motorcycle", "scooter"]),
  subSegment: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number().nonnegative(),
  unit: z.string().optional(),
  heroImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  colorVariants: z.array(colorVariantSchema).optional(),
  specifications: z.array(specificationSchema).optional(),
  features: z.array(featureSchema).optional(),
  trims: z.array(trimSchema).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const updateProductSchema = createProductSchema.partial();

export async function productRoutes(app: FastifyInstance) {
  // GET /products
  app.get("/products", { preHandler: [requireAuth] }, async (request) => {
    const { category, subSegment, active } = request.query as Record<string, string | undefined>;
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (subSegment) where.subSegment = subSegment;
    if (active !== undefined) where.isActive = active === "true";

    return prisma.product.findMany({
      where: where as any,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  });

  // GET /products/:id
  app.get("/products/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return reply.code(404).send({ message: "Product not found" });
    return product;
  });

  // POST /products
  app.post(
    "/products",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request, reply) => {
      const body = createProductSchema.parse(request.body);
      const product = await prisma.product.create({ data: body as any });
      return reply.code(201).send(product);
    }
  );

  // PATCH /products/:id
  app.patch(
    "/products/:id",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = updateProductSchema.parse(request.body);
      return prisma.product.update({ where: { id }, data: body as any });
    }
  );

  // DELETE /products/:id (soft delete)
  app.delete(
    "/products/:id",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await prisma.product.update({ where: { id }, data: { isActive: false } });
      return reply.code(204).send();
    }
  );

  // PATCH /products/reorder
  app.patch(
    "/products/reorder",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request) => {
      const { ids } = z.object({ ids: z.array(z.string().uuid()) }).parse(request.body);
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.product.update({ where: { id }, data: { sortOrder: index } })
        )
      );
      return { success: true };
    }
  );
}
