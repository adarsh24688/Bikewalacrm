import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

export async function uploadImage(
  file: Buffer,
  fileName: string,
  folder?: string
): Promise<{ url: string; fileId: string; thumbnailUrl: string }> {
  const response = await imagekit.upload({
    file,
    fileName,
    folder: folder || "/yash-crm",
  });

  return {
    url: response.url,
    fileId: response.fileId,
    thumbnailUrl: response.thumbnailUrl || response.url,
  };
}

export async function deleteImage(fileId: string): Promise<void> {
  await imagekit.deleteFile(fileId);
}
