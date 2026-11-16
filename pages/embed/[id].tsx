import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Image,
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
    Stack,
    Text,
    useDisclosure,
    Link,
    useMediaQuery,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEditorStore } from "src/store/editor";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { FiArrowRight } from "react-icons/fi";
import { usePersonalizedContent } from "src/hooks/usePersonalizedContent";
import Head from "next/head";
import { getPublicVideo, trackVideoEvent } from "src/services";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Edit: React.FC<{ videoData: any }> = ({ videoData }) => {
    const router = useRouter();
    const { personalizedContent } = usePersonalizedContent();
    const { onClose } = useDisclosure();
    const [isLargerThan800] = useMediaQuery("(min-width: 800px)");

    const [videoUrl, setVideoUrl] = useState("");
    const [videoRest, setVideoRest] = useState({
        name: "",
        desc: "",
        platform: "videco",
        preview: "",
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
        endCTAtitle: "",
        endCTAtext: "",
    });
    const [brandKit, setBrandKit] = useState({
        primary_color: "#05405A",
        secondary_color: "#1A202C",
        primary_text_color: "#ffffff",
        secondary_text_color: "#ffffff",
    });
    const [, _setPlaying] = useState(false);
    const [input, setInput] = useState("");
    const handleInputChange = (e) => setInput(e.target.value);

    const [, _setDuration] = useState(0);
    const _playerRef = useRef<HTMLVideoElement | null>(null);
    const {
        setVideo: _setVideo,
        setInteractiveElements,
        interactiveElements: _interactiveElements,
        video: _video,
    } = useEditorStore();
    const [locked, setLocked] = useState(false);
    const [wrongPassword, setWrongPassword] = useState(false);

    // Loads through the videco_public_video RPC: anonymous viewers can't read
    // videos / brand_kit directly, and the password is checked server-side.
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
                return;
            }
            setLocked(false);
            setWrongPassword(false);
            setVideoUrl(video.url ?? "");
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
                brand:
                    (Array.isArray(video.brand)
                        ? video.brand[0]
                        : (video.brand as typeof prev.brand)) ?? prev.brand,
                endCTAlink: video.endCTAlink ?? "",
                endCTAtitle: video.endCTAtitle ?? "",
                endCTAtext: video.endCTAtext ?? "",
            }));
            setInteractiveElements((video.elements as never[]) ?? []);
            if (video.brand_kit) {
                setBrandKit((prev) => ({ ...prev, ...video.brand_kit }));
            }
        },
        [router.query],
    );

    const setVideoAnalytics = useCallback(async () => {
        if (!router.query.id || !videoRest.name || locked) return;
        await trackVideoEvent(router.query.id as string, "page_view", {
            name: videoRest.name,
        });
    }, [router.query, videoRest.name, locked]);

    useEffect(() => {
        getVideoByID();
    }, [router.query]);

    useEffect(() => {
        setVideoAnalytics();
    }, [router.query, videoRest.name]);
    return (
        <>
            <Head>
                <title>{videoData.title ?? "Videco"}</title>
                <meta name="description" content={videoData.desc ?? "Videco"} />
                <meta
                    property="og:title"
                    content={videoData.title ?? "Videco"}
                />
                <meta
                    property="og:image"
                    content={(function () {
                        try {
                            const {
                                getGifPreviewUrl,
                                // eslint-disable-next-line @typescript-eslint/no-var-requires
                            } = require("src/utils/media");
                            return getGifPreviewUrl(videoData.url);
                        } catch (e) {
                            return "/default_thumb.png";
                        }
                    })()}
                />
            </Head>
            {!router.query.method && (
                <Box bg="#FCFCFC" py={4}>
                    <Box
                        maxW="5xl"
                        m="0 auto"
                        px={["16px", "10px", "70px"]}
                        display="flex"
                        justifyContent="space-between"
                    >
                        <Image width={28} src="/logo.svg" alt="videco" />
                        <Text
                            fontSize="sm"
                            textAlign="center"
                            as="span"
                            ml={2}
                            display="flex"
                            alignItems="center"
                        >
                            Hosted with Videco.{" "}
                            <Link
                                href="https://app.videco.io"
                                textDecor="underline"
                                mx={1}
                            >
                                Sign up for free
                            </Link>
                            <FiArrowRight />
                        </Text>
                    </Box>
                </Box>
            )}
            <Box
                height="full"
                w="full"
                display="flex"
                alignItems={!router.query.method ? "center" : "flex-start"}
                flexDirection="column"
                textAlign="center"
                m={!router.query.method ? "21px auto" : 0}
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
                    <Box w="full" h="100%" bg="transparent">
                        {!!videoData.title && !router.query.method && (
                            <>
                                <Text
                                    textAlign="center"
                                    as="h2"
                                    fontSize="3xl"
                                    mt="4"
                                    mb="4"
                                    fontWeight="semibold"
                                >
                                    {personalizedContent(videoData.title)}
                                </Text>
                            </>
                        )}
                        {!!videoRest.name && !router.query.method ? (
                            <iframe
                                src={`/embed/player/${router.query.id}?ai=${
                                    router.query.ai ?? ""
                                }&ai_email=${router.query.ai_email ?? ""}`}
                                style={{
                                    width: "100%",
                                    overflow: "hidden",
                                    height: "auto",
                                    padding: "20px",
                                    margin: "0 auto",
                                    maxWidth: "900px",
                                    minHeight: isLargerThan800
                                        ? "450px"
                                        : "300px",
                                    border: "none",
                                }}
                            />
                        ) : (
                            <iframe
                                src={`/embed/player/${router.query.id}?ai=${
                                    router.query.ai ?? ""
                                }&ai_email=${router.query.ai_email ?? ""}`}
                                style={{
                                    width: "100%",
                                    overflow: "hidden",
                                    height: "100%",
                                    padding: "0",
                                    minHeight: "100%",
                                    border: "none",
                                }}
                            />
                        )}
                        {!!videoRest.name && !router.query.method && (
                            <Box maxW="900px" margin="0 auto" px={3}>
                                <Text
                                    textAlign="left"
                                    as="h2"
                                    margin="0 auto"
                                    pl={4}
                                    pr={0}
                                    fontSize="md"
                                    mt="4"
                                >
                                    {personalizedContent(videoRest.desc)}
                                </Text>
                                <Stack
                                    direction="row"
                                    spacing={4}
                                    pr={2}
                                    w="full"
                                    pb={"100px"}
                                    justifyContent="space-between"
                                    alignItems="center"
                                    mt={5}
                                >
                                    <Button
                                        colorScheme="teal"
                                        bg={brandKit.primary_color}
                                        color={brandKit.primary_text_color}
                                        rightIcon={<ArrowForwardIcon />}
                                        p={3}
                                        px="6"
                                        ml={4}
                                        variant="solid"
                                        onClick={() =>
                                            window.open(
                                                videoRest.primary_link ??
                                                    "https://videco.io",
                                            )
                                        }
                                    >
                                        {videoRest.primary_text ??
                                            "Primary button"}
                                    </Button>
                                    <Button
                                        p={6}
                                        pr={2}
                                        colorScheme="green"
                                        color={brandKit.secondary_text_color}
                                        variant="gohst"
                                        onClick={() =>
                                            window.open(
                                                videoRest.secondary_link ??
                                                    "https://videco.io",
                                            )
                                        }
                                    >
                                        {videoRest.secondary_text ??
                                            "Visit Videco"}
                                    </Button>
                                </Stack>
                            </Box>
                        )}
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
        </>
    );
};

export default Edit;

export async function getServerSideProps({ params }) {
    // Link-preview metadata (title / description). Uses the public RPC; the
    // old direct query returned nothing for anonymous visitors and the page
    // crashed with a 500 on data.data[0].
    const video = await getPublicVideo(params.id).catch(() => null);
    if (!video) return { notFound: true };
    const videoData = {
        title: video.name ?? "Videco",
        url: video.locked ? null : video.url ?? null,
        desc: video.locked ? null : video.desc ?? null,
    };
    return { props: { videoData } };
}
