import { uploadToStorage } from "src/services";

export async function uploadVideosTocloudinaryDirectly(file: File | Blob): Promise<{ data: { public_id: string; url: string } }> {
  const result = await uploadToStorage(file as File, "uploads", "default");
  return {
    data: {
      public_id: result.path,
      url: result.url,
    },
  };
}
