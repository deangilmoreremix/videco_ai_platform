import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Image, Progress } from "@chakra-ui/react";
import { supabase, uploadToStorage } from "src/services";
import { useRouter } from "next/router";

interface VideoPreviewProps {
    src: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ src: _src }) => {
    // Thumbnails go to Supabase Storage like other media (upstream used
    // next-s3-upload, which needs AWS credentials this deploy doesn't have).
    const fileInput = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const router = useRouter();
    const [preview, setPreview] = useState<string>("");
    const [_url, setUrl] = useState<string>("");

    const fetchPreview = async () => {
        try {
            const { data } = await supabase
                .from("videos")
                .select("preview, url")
                .eq("id", router.query.id)
                .single();
            if (data) {
                setPreview(data.preview);
                setUrl(data.url);
            }
        } catch (error) {
            console.log("error..", error);
        }
    };
    useEffect(() => {
        fetchPreview();
    }, []);

    // called every time a file's `status` changes
    const handleChangeStatus = async (file?: File) => {
        if (!file) return;
        setUploading(true);
        let uploadedData: { url: string };
        try {
            uploadedData = await uploadToStorage(file);
        } catch (error) {
            console.log("upload failed..", error);
            setUploading(false);
            return;
        }
        setUploading(false);
        setUploaded(true);
        setPreview(uploadedData.url);
        try {
            await supabase
                .from("videos")
                .update({
                    preview: uploadedData.url,
                })
                .eq("id", router.query.id);
        } catch (error) {
            console.log("error..", error);
        }
    };

    const handleRemove = async () => {
        try {
            await supabase
                .from("videos")
                .update({
                    preview: "",
                })
                .eq("id", router.query.id);
            setPreview("");
        } catch (error) {
            console.log("error..", error);
        }
    };

    return (
        <Box
            width="full"
            height="auto"
            position="relative"
            mt={2}
            display="flex"
            flexDir="column"
            alignItems="center"
        >
            {/* <FileInput accept=".mp4" onChange={handleChangeStatus} /> */}
            <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="1px dashed #000000"
                mb={4}
                mt={4}
                w="full"
                flexDirection="column"
            >
                <input
                    ref={fileInput}
                    type="file"
                    accept=".jpg, .png"
                    hidden
                    onChange={(e) => handleChangeStatus(e.target.files?.[0])}
                />

                <Button
                    p={12}
                    w="full"
                    onClick={() => fileInput.current?.click()}
                    fontWeight="normal"
                    fontSize="large"
                    position="relative"
                    zIndex={1}
                >
                    {uploading
                        ? "Uploading..."
                        : uploaded
                        ? "Uploaded"
                        : preview
                        ? "Change preview image"
                        : "Click to upload preview image"}
                </Button>

                {uploading && (
                    <Progress
                        w="full"
                        colorScheme="teal"
                        size="sm"
                        isIndeterminate
                    />
                )}
            </Box>
            {preview && (
                <>
                    <Image
                        src={preview}
                        objectFit="cover"
                        width="full"
                        height="300px"
                    />
                    <Button
                        mt={2}
                        onClick={handleRemove}
                        float="left"
                        variant="ghost"
                        textDecor="underline"
                    >
                        Remove Preview Image
                    </Button>
                </>
            )}
        </Box>
    );
};
