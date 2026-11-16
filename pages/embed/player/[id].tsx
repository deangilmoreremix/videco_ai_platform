import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Spinner,
    useDisclosure,
} from "@chakra-ui/react";
import { Player } from "@components/features/player";
import { useRouter } from "next/router";
import { useEditorStore } from "src/store/editor";
import {
    getPublicAiVideoUrl,
    getPublicVideo,
    trackVideoEvent,
} from "src/services";

const Edit: React.FC = () => {
    const router = useRouter();
    const { onClose } = useDisclosure();

    const [videoUrl, setVideoUrl] = useState("");
    const [videoRest, setVideoRest] = useState({
        name: "",
        desc: "",
        platform: "videco",
        preview: "",
        remove_logo: false,
        primary_link: "https://videco.io",
        primary_text: "Learn More",
        secondary_text: "Watch more videos",
        secondary_link: "https://videco.io/docs",
        elements: [],
        password_protection: "false",
        brand: {
            videcoBranding: false,
        },
        endCTAlink: "",
        endCTAtext: "",
        endCTAtitle: "",
    });
    const [playing, setPlaying] = useState(false);
    const [input, setInput] = useState("");

    const handleInputChange = (e) => setInput(e.target.value);

    const [, setDuration] = useState(0);
    const playerRef = useRef(null);
    const {
        setVideo,
        setInteractiveElements,
        interactiveElements,
        video: _video,
    } = useEditorStore();
    const [locked, setLocked] = useState(false);
    const [wrongPassword, setWrongPassword] = useState(false);

    // Loads through the videco_public_video RPC: anonymous viewers can't read
    // the videos table directly, and the password is checked server-side.
    const getVideoByID = useCallback(
        async (passwordAttempt?: string) => {
            const id = router.query.id as string | undefined;
            if (!id) return;
            const video = await getPublicVideo(id, passwordAttempt).catch(
                (e) => {
                    console.error("Could not load video", e);
                    return null;
                },
            );
            if (!video) return;
            if (video.locked) {
                setLocked(true);
                setWrongPassword(!!video.wrong_password);
                setVideoRest((prev) => ({
                    ...prev,
                    name: video.name ?? "",
                    preview: video.preview ?? "",
                }));
                return;
            }
            setLocked(false);
            setWrongPassword(false);

            const aiId = router.query.ai as string | undefined;
            const aiEmail = router.query.ai_email as string | undefined;
            if (aiId || aiEmail) {
                const aiUrl = await getPublicAiVideoUrl(id, {
                    aiId,
                    email: aiEmail,
                }).catch(() => null);
                setVideoUrl(aiUrl || video.url || "");
            } else {
                setVideoUrl(video.url ?? "");
            }
            setVideoRest((prev) => ({
                ...prev,
                name: video.name ?? "",
                desc: video.desc ?? "",
                preview: video.preview ?? "",
                platform: video.platform ?? prev.platform,
                primary_link: video.primary_link ?? prev.primary_link,
                primary_text: video.primary_text ?? prev.primary_text,
                secondary_text: video.secondary_text ?? prev.secondary_text,
                secondary_link: video.secondary_link ?? prev.secondary_link,
                password_protection: "false",
                elements: (video.elements as never[]) ?? [],
                remove_logo: video.remove_logo ?? false,
                brand: (video.brand as typeof prev.brand) ?? prev.brand,
                endCTAlink: video.endCTAlink ?? "",
                endCTAtitle: video.endCTAtitle ?? "",
                endCTAtext: video.endCTAtext ?? "",
            }));
            setInteractiveElements((video.elements as never[]) ?? []);
        },
        [router.query],
    );

    const setVideoAnalytics = useCallback(async () => {
        if (!router.query.id || !videoRest.name || locked) return;
        await trackVideoEvent(router.query.id as string, "view", {
            name: videoRest.name,
            lead: (router.query.ai_email as string) ?? "",
        });
    }, [router.query, videoRest.name, locked]);

    const onPlayerPlay = async () => {
        if (!router.query.id) return;
        await trackVideoEvent(router.query.id as string, "video_play", {
            name: videoRest.name,
            lead: (router.query.ai_email as string) ?? "",
        });
    };

    useEffect(() => {
        getVideoByID();
    }, [router.query]);

    useEffect(() => {
        setVideoAnalytics();
    }, [router.query, videoRest.name]);
    return (
        <Box
            height="full"
            w="full"
            display="flex"
            alignItems={!router.query.method ? "center" : "flex-start"}
            flexDirection="column"
            bg="transparent"
            textAlign="center"
        >
            <>
                <Modal
                    closeOnOverlayClick={false}
                    isOpen={locked}
                    onClose={onClose}
                    size="3xl"
                >
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>
                            This video is password protected
                        </ModalHeader>
                        <ModalBody pb={6}>
                            <FormControl>
                                <FormLabel>
                                    {wrongPassword
                                        ? "Wrong password, try again"
                                        : "Enter the password"}
                                </FormLabel>
                                <Input
                                    value={input}
                                    onChange={handleInputChange}
                                    placeholder="Password"
                                />
                            </FormControl>
                        </ModalBody>

                        <ModalFooter>
                            <Button
                                colorScheme="green"
                                mr={3}
                                onClick={() => getVideoByID(input)}
                            >
                                Watch
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </>
            {videoUrl ? (
                <Box w="full" height="full" bg="transparent">
                    <Player
                        videcoBrandingRemoved={videoRest?.remove_logo ?? false}
                        preview={"/default_thumb.png"}
                        embeded={true}
                        onPlayerPlay={onPlayerPlay}
                        height="100%"
                        width="100%"
                        id={router.query.id as string}
                        elements={interactiveElements}
                        platform={videoRest.platform}
                        videoUrl={videoUrl}
                        playerRef={playerRef}
                        playing={playing}
                        endCTA={{
                            link: videoRest.endCTAlink,
                            title: videoRest.endCTAtitle,
                            text: videoRest.endCTAtext,
                        }}
                        setDuration={setDuration}
                        setPlaying={setPlaying}
                        setVideo={setVideo}
                    />
                </Box>
            ) : (
                <Box
                    textAlign="center"
                    pt="12"
                    justifyContent="center"
                    w="full"
                    margin="0 auto"
                >
                    <Spinner color="green.500" />
                </Box>
            )}
        </Box>
    );
};

export default Edit;
