import { uploadToStorage } from "src/services";

export async function uploadVideoToStorage(
    file: File | Blob,
): Promise<{ data: { path: string; url: string } }> {
    const result = await uploadToStorage(file as File, "videos", "default");
    return {
        data: {
            path: result.path,
            url: result.url,
        },
    };
}

// Upload via our server API to Supabase Storage (no Cloudinary)
export const uploadVideoToStorageDirect = async (file: string) => {
    const blobFile = await blobUrlToBlob(file);
    const formData = new FormData();
    formData.append("file", new File([blobFile], `upload.mp4`));

    try {
        const uploadedVideo = await axios.post(
            "/api/v1/videos/upload",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            },
        );
        return {
            data: {
                public_url: uploadedVideo.data.result.publicUrl,
                path: uploadedVideo.data.result.path,
            },
        };
    } catch (e) {
        console.log(e);
    }
};
