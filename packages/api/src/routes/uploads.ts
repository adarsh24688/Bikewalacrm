import { FastifyInstance } from "fastify";
import { requireAuth, requireRole } from "../middleware/auth";
import { uploadImage } from "../services/imagekit";

export async function uploadRoutes(app: FastifyInstance) {
  // POST /uploads/image
  app.post(
    "/uploads/image",
    { preHandler: [requireAuth, requireRole("super_admin", "manager")] },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ message: "No file uploaded" });
      }

      const buffer = await data.toBuffer();
      const result = await uploadImage(buffer, data.filename, "/yash-crm/products");

      return {
        url: result.url,
        fileId: result.fileId,
        thumbnailUrl: result.thumbnailUrl,
      };
    }
  );
}
