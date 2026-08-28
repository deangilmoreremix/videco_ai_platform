import React, { useEffect, useState } from "react";
import {
    Input,
    Box,
    Heading,
    Flex,
    Button,
    Card,
    CardBody,
    Text,
    CardHeader,
    Link,
    Stack,
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Spinner,
    useToast,
    useDisclosure,
    AlertDialog,
    AlertDialogBody,
    AlertDialogCloseButton,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    InputGroup,
    InputRightElement,
    Divider,
} from "@chakra-ui/react";
import { Sidebar } from "@components/common/sidebar";
import { Header } from "@components/common/header";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useFetchTeamData } from "src/hooks/useFetchTeamData";
import { useUserPlan } from "src/hooks/useUserPlan";
import axios from "axios";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { InviteList } from "@components/features/invite/list";
import { supabase } from "src/services";
import { AuthGuard } from "src/hoc/withAuthGuard";

function generateSecureKey() {
    const array = new Uint32Array(6);
    window.crypto.getRandomValues(array);
    return array.join("");
}
const SettingsContent: React.FC = () => {
    const session = useSession();
    const [plan, setPlan] = React.useState<any>();
    const [stipeId, setStipeId] = React.useState<any>();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const cancelRef = React.useRef();
    const user = session?.user;
    const router = useRouter();
    const toast = useToast();
    const [teamMembers, setTeamMembers] = useState<any>();
    const [deleted, setDeleted] = useState<any>(false);
    const { getTeamUserIds, getData } = useFetchTeamData();
    const { getPlan } = useUserPlan();
    const [videos, setVideos] = React.useState<any>(0);
    const [videoSize, setVideoSize] = React.useState<any>(0);
    const [show, setShow] = React.useState(false);
    const [key, setKey] = React.useState("");
    const [apiKeyLoading, setApiKeyLoading] = React.useState(false);
    const handleAPIKeyClick = async () => {
        if (!user?.id) {
            toast({
                title: "Authentication required",
                description: "Please sign in to manage your API key.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (plan === "lite") {
            toast({
                title: "Upgrade required",
                description:
                    "You need to be a Growth member to generate an API key.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        try {
            setApiKeyLoading(true);
            const { data: existingKeys, error: fetchError } = await supabase
                .from("apikey")
                .select("id, key")
                .eq("user_id", user.id)
                .limit(1);

            if (fetchError) {
                throw fetchError;
            }

            if (existingKeys?.length) {
                setKey(existingKeys[0].key);
                setShow((prev) => !prev);
                return;
            }

            const newKey = `api_${generateSecureKey()}_videco.io`;
            const { data: insertedKeys, error: insertError } = await supabase
                .from("apikey")
                .insert([
                    {
                        user_id: user.id,
                        tenant_id: user.user_metadata?.tenant_id ?? undefined,
                        key: newKey,
                    },
                ])
                .select("id, key");

            if (insertError) {
                throw insertError;
            }

            setKey(insertedKeys?.[0]?.key ?? newKey);
            setShow((prev) => !prev);
            toast({
                title: "API key generated",
                description:
                    "Your API key has been created. Make sure to copy it now.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error: any) {
            console.error("Failed to generate API key", error);
            toast({
                title: "Failed to generate API key",
                description: error?.message || "Please try again later.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setApiKeyLoading(false);
        }
    };
    const getFullTeamMembers = async () => {
        const team = await getTeamUserIds();
        if (team) {
            setTeamMembers(team ?? []);
        }
    };
    const calculateTotalSize = (data) => {
        let totalSize = 0;
        data.forEach((item: { size: number }) => {
            totalSize += item.size;
        });
        return totalSize;
    };

    const deleteUser = async () => {
        try {
            await supabase.auth.signOut();
            setDeleted(true);
            toast({
                title: "Account deletion requested",
                description:
                    "We've delete your account in 24 hours. This action is irreversible. If you made a mistake please contact us asap.",
                status: "error",
                duration: 1000,
                isClosable: true,
            });
            router.push("/auth/logout");
        } catch (error) {
            setDeleted(false);
        }
    };

    useEffect(() => {
        const plan = async () => {
            const fetchPlan = await getPlan(user?.id);
            setPlan(fetchPlan?.[0]?.plan_name);
            setStipeId(fetchPlan?.[0]?.stipe_id);
            const data = await getData("videos", {
                col: "status",
                val: "deleted",
            });
            data && setVideoSize(calculateTotalSize(data));
            setVideos(data?.length);
        };
        plan();
        getFullTeamMembers();
    }, [session, user]);

    return (
        <>
            {!session ? (
                <Box
                    textAlign="center"
                    alignItems="center"
                    justifyContent="center"
                    display="flex"
                    flexDirection="column"
                    height="full"
                    width="full"
                >
                    <Spinner size="xl" />
                    <Link mt={7} href="/auth/login">
                        Please Login
                    </Link>
                </Box>
            ) : (
                <Sidebar>
                    <AlertDialog
                        motionPreset="slideInBottom"
                        leastDestructiveRef={cancelRef}
                        onClose={onClose}
                        isOpen={isOpen}
                        isCentered
                    >
                        <AlertDialogOverlay />

                        <AlertDialogContent>
                            <AlertDialogHeader>
                                Delete account?
                            </AlertDialogHeader>
                            <AlertDialogCloseButton />
                            <AlertDialogBody>
                                Are you sure you want to delete your account?
                                All of your videos will be deleted.
                            </AlertDialogBody>
                            <AlertDialogFooter>
                                <Button ref={cancelRef} onClick={onClose}>
                                    No
                                </Button>
                                <Button
                                    colorScheme="red"
                                    ml={3}
                                    onClick={() => deleteUser()}
                                >
                                    Yes
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {router.query.success && (
                        <Alert
                            status="success"
                            position="fixed"
                            zIndex={1000}
                            left={0}
                            top={0}
                            height="full"
                            variant="subtle"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            textAlign="center"
                        >
                            <AlertIcon boxSize="40px" mr={0} />
                            <AlertTitle mt={4} mb={1} fontSize="lg">
                                You are now a premium member
                            </AlertTitle>
                            <AlertDescription maxWidth="sm">
                                Thanks for becaoming a premium member. You can
                                now create interactive videos with many more
                                features.
                            </AlertDescription>
                            <Button
                                variant="solid"
                                bg="green.400"
                                color="white"
                                mt={6}
                                onClick={() => router.push("/videos")}
                            >
                                {" "}
                                Back to Videos
                            </Button>
                        </Alert>
                    )}
                    <Box h="full" bg="#F8F8F8">
                        <Flex
                            direction="column"
                            bg="white"
                            mb={6}
                            boxShadow="sm"
                            w="full"
                        >
                            <Header pageTitle="Settings" />
                        </Flex>

                        <Flex justifyContent="space-between" w="85%" ml={20}>
                            <Flex ml={5} w="full" direction="column">
                                <Card
                                    w="98%"
                                    mr={12}
                                    shadow="md"
                                    mb={4}
                                    textAlign="left"
                                    alignItems="left"
                                >
                                    <CardHeader>
                                        <Heading
                                            size="sm"
                                            fontWeight="semibold"
                                        >
                                            Account Settings
                                        </Heading>
                                        <Text mt={1} fontSize="sm" as="span">
                                            Your account managment
                                        </Text>
                                        <Divider mt={2} />
                                    </CardHeader>
                                    <CardBody pt="0">
                                        <Stack
                                            spacing="1"
                                            direction="row"
                                            justifyContent="space-between"
                                            maxW="40%"
                                        >
                                            <Box>
                                                <Heading
                                                    size="xs"
                                                    fontWeight="semibold"
                                                >
                                                    Name
                                                </Heading>
                                                <Text pt="2" fontSize="sm">
                                                    {user?.user_metadata
                                                        ?.name ??
                                                        "Not provided"}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Heading
                                                    size="xs"
                                                    fontWeight="semibold"
                                                >
                                                    Email
                                                </Heading>
                                                <Text pt="2" fontSize="sm">
                                                    {user?.email}
                                                </Text>
                                            </Box>
                                        </Stack>
                                        <Stack
                                            textAlign="left"
                                            mt={10}
                                            spacing={0}
                                        >
                                            <Heading
                                                size="sm"
                                                fontWeight="semibold"
                                            >
                                                Other settings
                                            </Heading>
                                            <Text fontSize="sm" as="span">
                                                Other settings related to your
                                                account
                                            </Text>
                                            <Divider mt={2} />
                                            <Box mt={5}>
                                                <Link
                                                    href="/brand-kit"
                                                    color="#383F40"
                                                    mt="4"
                                                    _hover={{
                                                        textDecor: "none",
                                                        bg: "#DADADA",
                                                    }}
                                                    mr={4}
                                                    px={4}
                                                    py={2}
                                                    rounded="md"
                                                    border=".5px solid #383F40"
                                                    shadow="sm"
                                                    textAlign="left"
                                                >
                                                    Brand Kit{" "}
                                                    <ExternalLinkIcon
                                                        fontSize="sm"
                                                        ml={1}
                                                        mb={1}
                                                        fontWeight="normal"
                                                    />
                                                </Link>
                                            </Box>
                                        </Stack>
                                    </CardBody>
                                </Card>
                                <Card
                                    mr={6}
                                    shadow="md"
                                    bg="white"
                                    w="98%"
                                    mb={4}
                                    textAlign="left"
                                    alignItems="left"
                                >
                                    <CardBody>
                                        <Heading
                                            size="sm"
                                            fontWeight="semibold"
                                        >
                                            API Key
                                        </Heading>
                                        <Text mt={1} fontSize="sm" as="span">
                                            Manage your API keys here
                                        </Text>
                                        <Divider mt={2} />
                                        <InputGroup size="md" mt={5}>
                                            <Input
                                                pr="4.5rem"
                                                type={
                                                    show ? "text" : "password"
                                                }
                                                placeholder="your API key"
                                                value={key}
                                                isReadOnly
                                            />
                                            <InputRightElement width="auto">
                                                <Button
                                                    h="1.75rem"
                                                    mr={2}
                                                    px={2}
                                                    size="xs"
                                                    onClick={handleAPIKeyClick}
                                                    isLoading={apiKeyLoading}
                                                >
                                                    {show
                                                        ? "Hide"
                                                        : "Get your key"}
                                                </Button>
                                            </InputRightElement>
                                        </InputGroup>
                                    </CardBody>
                                </Card>
                                <Card
                                    mr={6}
                                    shadow="md"
                                    bg="white"
                                    w="98%"
                                    mb={4}
                                    textAlign="left"
                                    alignItems="left"
                                >
                                    <CardBody>
                                        <InviteList />
                                    </CardBody>
                                </Card>
                            </Flex>
                        </Flex>
                    </Box>
                </Sidebar>
            )}
        </>
    );
};

const SettingsWithAuth: React.FC = () => (
    <AuthGuard>
        <SettingsContent />
    </AuthGuard>
);

export default SettingsWithAuth;
