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

// Upload via our server API so we can store in Supabase Storage
export const uploadVideosTocloudinaryDirectly = async (file: any) => {
    const blobFile = await blobUrlToBlob(file);
    const formData = new FormData();
    formData.append("file", new File([blobFile], `upload.mp4`));

    try {
        // Post to our API route that handles storage uploads
        const uploadedVideo: any = await axios.post("/api/v1/videos/cloudinary", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        // Normalize response to mimic previous shape
        return { data: { public_url: uploadedVideo.data.result.publicUrl || uploadedVideo.data.result.publicUrl, path: uploadedVideo.data.result.path } };
    } catch (e) {
        console.log(e);
    }
};

