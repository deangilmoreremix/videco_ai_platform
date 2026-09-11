import React, { useEffect, useState } from "react";
import { Box, Button, Progress } from "@chakra-ui/react";
import { useS3Upload } from "next-s3-upload";
import { supabase } from "src/services";
import { useRouter } from "next/router";

interface VideoPreviewProps {
    src: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ src: _src }) => {
    const { uploadToS3, FileInput, openFileDialog } = useS3Upload();
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
    const handleChangeStatus = async (file: File) => {
        const uploadedData = await uploadToS3(file);
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
                <FileInput accept=".jpg, .png" onChange={handleChangeStatus} />

                <Button
                    p={12}
                    w="full"
                    onClick={openFileDialog}
                    fontWeight="normal"
                    fontSize="large"
                    position="relative"
                    zIndex={1}
                >
                    {preview
                        ? "Change preview image"
                        : "Click to upload preview image"}
                </Button>

                <Box w="full" bg="transparent">
                    {files.map((file: { progress: number }, index: number) => (
                        <div key={index}>
                            <Progress
                                w="full"
                                colorScheme="teal"
                                size="sm"
                                value={file.progress}
                                isIndeterminate={file.progress === 0}
                            />
                        </div>
                    ))}
                </Box>
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
