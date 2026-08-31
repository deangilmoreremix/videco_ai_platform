import React, { useCallback, useState } from "react";
import {
    Box,
    Heading,
    Flex,
    Card,
    CardBody,
    Text,
    Button,
    Container,
    Image,
    Link,
    Spinner,
    SimpleGrid,
} from "@chakra-ui/react";
import { Sidebar } from "@components/common/sidebar";
import { Header } from "@components/common/header";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import Head from "next/head";
import Script from "next/script";
import { supabase } from "src/services";
import { AuthGuard } from "src/hoc/withAuthGuard";
IntegrationsContentContent: React.FC = () => {
    const session = useSession();
    const [fullname, setFullname] = useState<any>("");
    const user = session?.user;
    const getFullName = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data, error, status } = await supabase
                .from("profiles")
                .select(`full_name, onboard_completed`)
                .eq("id", user.id)
                .single();

            if (error && status !== 406) {
                throw error;
            }
            if (data.full_name) {
                setFullname(data.full_name);
            }
        } catch (error) {
            console.log(error);
        }
    }, [user, supabase]);

    useEffect(() => {
        getFullName();
    }, [getFullName]);

    const zapierClientId = process.env.NEXT_PUBLIC_ZAPIER_CLIENT_ID;

    return (
        <>
            <Head>
                <link
                    rel="stylesheet"
                    href="https://cdn.zapier.com/packages/partner-sdk/v0/zapier-elements/zapier-elements.css"
                />
            </Head>

            <Script
                type="module"
                src="https://cdn.zapier.com/packages/partner-sdk/v0/zapier-elements/zapier-elements.esm.js"
                strategy="lazyOnload"
            />
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
                    <Box w="full" h="full" bg="white">
                        <Flex
                            direction="column"
                            bg="white"
                            mb={6}
                            boxShadow="sm"
                            w="full"
                        >
                            <Header pageTitle="Automation" />
                        </Flex>

                        <Container
                            bg="white"
                            w="full"
                            maxW="97%"
                            rounded="md"
                            boxShadow={"md"}
                            m={6}
                            p={4}
                            overflow="hidden"
                        >
                            {zapierClientId ? (
                                <zapier-workflow
                                    sign-up-email={user.email}
                                    sign-up-first-name={fullname}
                                    client-id={zapierClientId}
                                    intro-copy-display="show"
                                    guess-zap-display="show"
                                />
                            ) : (
                                <Box
                                    textAlign="center"
                                    py={10}
                                    px={6}
                                    bg="gray.50"
                                    borderRadius="md"
                                    border="1px solid #e2e2e2"
                                >
                                    <Heading size="md" mb={3} color="#383F40">
                                        Automation is not configured yet
                                    </Heading>
                                    <Text color="gray.500" mb={4}>
                                        Connect Zapier to automate your video
                                        workflows. Add your Zapier client ID in
                                        the environment variables to enable this
                                        feature.
                                    </Text>
                                    <Button
                                        colorScheme="teal"
                                        bg="#05405A"
                                        onClick={() =>
                                            window.open(
                                                "https://roadmap.videco.io/",
                                                "_blank",
                                            )
                                        }
                                    >
                                        Learn more about integrations
                                    </Button>
                                </Box>
                            )}
                        </Container>
                    </Box>
                </Sidebar>
            )}
        </>
    );
};

const IntegrationsWithAuth: React.FC = () => (
    <AuthGuard>
        <IntegrationsContent />
    </AuthGuard>
);

export default IntegrationsWithAuth;
