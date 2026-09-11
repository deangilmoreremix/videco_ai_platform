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
import { Player } from "@components/features/player";
import { useEditorStore } from "src/store/editor";
import { supabase } from "src/services";

const Edit: React.FC = () => {
    const router = useRouter();
    const { onClose } = useDisclosure();

    const [videoUrl, setVideoUrl] = useState("");
    const [password, setPassword] = useState("");
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
    const [, setPlaying] = useState(false);
    const [, setInput] = useState("");

    const handleInputChange = (e) => setInput(e.target.value);

    const [, setDuration] = useState(0);
    const playerRef = useRef(null);
    const {
        setVideo: _setVideo,
        setInteractiveElements: _setInteractiveElements,
        interactiveElements: _interactiveElements,
        video: _video,
    } = useEditorStore();
    const getAIVideoByID = useCallback(async (_og_url: string) => {
        if (router.query.ai_email) {
            await supabase
                .from("ai_videos")
                .select("url")
                .ilike("contact->>email", router.query.ai_email.toString())
                .eq("og_video_id", router.query.id)
                .then((res) => {
                    setVideoUrl(res.data?.[0]?.url);
                });
        } else {
            await supabase
                .from("ai_videos")
                .select("url")
                .match({ id: router.query.ai })
                .then((res) => {
                    setVideoUrl(res.data?.[0].url);
                });
        }
    }, []);
    const getVideoByID = useCallback(async () => {
        await supabase
            .from("videos")
            .select(
                "url, name, desc, elements, brand, remove_logo, endCTAlink, endCTAtitle, endCTAtext, preview, password_protection, primary_link, primary_text, secondary_text, secondary_link, platform",
            )
            .match({ id: router.query.id })
            .then((res) => {
                if (!!router.query.ai || !!router.query.ai_email) {
                    getAIVideoByID(res.data?.[0].url);
                } else {
                    setVideoUrl(res.data?.[0].url);
                }
                setVideoRest({
                    name: res.data?.[0].name,
                    desc: res.data?.[0].desc,
                    preview: res.data?.[0].preview,
                    platform: res.data?.[0].platform,
                    primary_link: res.data?.[0].primary_link,
                    primary_text: res.data?.[0].primary_text,
                    secondary_text: res.data?.[0].secondary_text,
                    secondary_link: res.data?.[0].secondary_link,
                    password_protection: res.data?.[0].password_protection,
                    elements: res.data?.[0].elements,
                    remove_logo: res.data?.[0]?.remove_logo,
                    brand: res.data?.[0]?.brand,
                    endCTAlink: res.data?.[0]?.endCTAlink,
                    endCTAtitle: res.data?.[0]?.endCTAtitle,
                    endCTAtext: res.data?.[0]?.endCTAtext,
                });
                setInteractiveElements(res.data?.[0].elements);
            });
    }, []);

    const setVideoAnalytics = useCallback(async () => {
        const view = localStorage.getItem("video_view") || false;
        //create another localstroage item called view_count and increment it when user come to the page
        const view_count = localStorage.getItem("view_count") || 1;

        if (view) {
            localStorage.setItem(
                "view_count",
                (Number(view_count) + 1).toString(),
            );
            await supabase
                .from("analytics")
                .update([
                    {
                        data: {
                            user_agent: navigator.userAgent,
                            count: Number(view_count) + 1,
                            name: videoRest.name,
                            lead: router.query.ai_email ?? "",
                        },
                    },
                ])
                .eq("anoyomous_id", view)
                .eq("event", "view");
        } else {
            localStorage.setItem("view_count", "1");
            await supabase
                .from("analytics")
                .insert([
                    {
                        video_id: router.query.id,
                        event: "view",
                        data: {
                            user_agent: navigator.userAgent,
                            count: view_count,
                            name: videoRest.name,
                            lead: router.query.ai_email ?? "",
                        },
                    },
                ])
                .select("anoyomous_id")
                .then((res) => {
                    localStorage.setItem(
                        "video_view",
                        res.data[0].anoyomous_id,
                    );
                });
        }
    }, [router.query]);

    const onPlayerPlay = async () => {
        const view = localStorage.getItem("video_play") || false;
        const view_count = localStorage.getItem("video_play_count") || 1;
        if (view) {
            await supabase
                .from("analytics")
                .update([
                    {
                        data: {
                            user_agent: navigator.userAgent,
                            count: Number(view_count) + 1,
                            name: videoRest.name,
                            lead: router.query.ai_email ?? "",
                        },
                    },
                ])
                .eq("anoyomous_id", view)
                .eq("event", "video_play");
        } else {
            localStorage.setItem("video_play_count", "1");
            await supabase
                .from("analytics")
                .insert([
                    {
                        video_id: router.query.id,
                        event: "video_play",
                        data: {
                            user_agent: navigator.userAgent,
                            count: view_count,
                            name: videoRest.name,
                            lead: router.query.ai_email ?? "",
                        },
                    },
                ])
                .select("anoyomous_id")
                .then((res) => {
                    localStorage.setItem(
                        "video_play",
                        res.data[0].anoyomous_id,
                    );
                });
        }
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
                    isOpen={
                        videoRest.password_protection === password ||
                        videoRest.password_protection === "false" ||
                        videoRest.password_protection === null
                            ? false
                            : true
                    }
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
                                <FormLabel>Enter the password</FormLabel>
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
                                onClick={() => {
                                    setPassword(input);
                                }}
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
                        id={router.query.id}
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
