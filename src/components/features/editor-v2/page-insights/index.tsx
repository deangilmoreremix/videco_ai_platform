import {
    Box,
    Text,
    Divider,
    Table,
    TableContainer,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    chakra,
    Container,
    Flex,
    Tag,
} from "@chakra-ui/react";
import { LatestAnalytics } from "@components/features/analytics/latest";
import { supabase } from "src/services";
import { useSession } from "@supabase/auth-helpers-react";
import "ka-table/style.css";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FiEye, FiPlay } from "react-icons/fi";

import { useBrandKit } from "src/hooks/getBrandKit";

type PageInsightsProps = {
    videoUrl: string;
    videoType: string;
    meta: Record<string, unknown>;
};
export const PageInsights: React.FC<PageInsightsProps> = ({
    videoUrl: _videoUrl,
    videoType: _videoType,
    meta: _meta,
}) => {
    const router = useRouter();
    const { getBrandKit } = useBrandKit();
    const [videoData, setVideoData] = useState<Record<string, unknown>[]>([]);
    const [leadsData, setLeadsData] = useState<
        { name: string; status: string }[]
    >([]);
    const [filterById] = useState<string | undefined>(
        router.query?.id as string | undefined,
    );
    const session = useSession();
    const user = session?.user;
    useEffect(() => {
        getBrandKit(user?.id);
    }, [user, getBrandKit]);

    const getProfile = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from("videos")
                .select(
                    "name, id, size, status, analytics ( id, data, event ), leads (id), feedback (id)",
                )
                .neq("status", "deleted")
                .eq("user_id", user?.id);

            if (filterById) {
                query = query.eq("id", filterById);
            }

            const { data, error, status } = await query;

            if (error && status !== 406) {
                throw error;
            }

            if (data) {
                setVideoData(data ?? []);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            getProfile();
        }
    }, [user, getProfile]);
    const processedVideoData = videoData?.map((item) => ({
        ...item,
        count: item.analytics[0]?.data.count,
        user_agent: item.analytics[0]?.data.user_agent,
    }));

    useEffect(() => {
        const statusMapping: Record<string, string> = {
            page_view: "Landing Page Visit",
            video_play: "Landing Page Visit",
            view: "Video Played",
            link_click: "Link Clicked",
        };
        const uniqueLeads = new Set<string>();

        const leads = processedVideoData?.[0].analytics
            .filter((item) => item.data.lead)
            .filter((item) => {
                const key = `${item.data.lead}-${item.event}`;
                if (uniqueLeads.has(key)) return false;
                uniqueLeads.add(key);
                return true;
            })
            .map((item) => ({
                name: item.data.lead,
                status: statusMapping[item.event] || "Unknown Event",
            }));
        setLeadsData(leads);
    }, [videoData]);

    return (
        <Box
            bg="#ffffff"
            height="full"
            overflow="auto"
            mt={0}
            w="full"
            pt={82}
            display="flex"
            flexDir="column"
            alignItems="left"
        >
            <>
                <Box
                    w="full"
                    m={0}
                    height="full"
                    p={0}
                    display="flex"
                    flexDirection="row"
                >
                    <Box w="60%" pl={12}>
                        <Container maxW="full" py={10} px={4}>
                            <Box
                                border="1px solid"
                                borderColor="gray.400"
                                rounded="md"
                                boxShadow="lg"
                                overflow="hidden"
                            >
                                <Flex justifyContent="left" p={5}>
                                    <chakra.h3
                                        fontSize="xl"
                                        fontWeight="bold"
                                        textAlign="center"
                                    >
                                        Analytics by leads
                                    </chakra.h3>
                                </Flex>
                                <Divider />
                                <TableContainer>
                                    {leadsData && !leadsData.length ? (
                                        <Box textAlign="center" w="full" p={12}>
                                            Not enough data
                                        </Box>
                                    ) : (
                                        <Table size="md">
                                            <Thead>
                                                <Tr fontWeight="900">
                                                    <Th>Lead</Th>
                                                    {/* <Th>Play Time</Th> */}
                                                    <Th>Status</Th>
                                                    <Th>Play time</Th>
                                                    <Th>Visits</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {leadsData &&
                                                    leadsData.map(
                                                        (network, index) => (
                                                            <Tr key={index}>
                                                                <Td fontSize="sm">
                                                                    {
                                                                        network.name
                                                                    }
                                                                </Td>
                                                                <Td>
                                                                    <Tag
                                                                        bg="#4991A1"
                                                                        color="white"
                                                                    >
                                                                        {
                                                                            network.status
                                                                        }
                                                                    </Tag>
                                                                </Td>
                                                                <Td
                                                                    fontSize="sm"
                                                                    color="gray.500"
                                                                >
                                                                    Coming soon
                                                                </Td>
                                                                <Td
                                                                    fontSize="sm"
                                                                    color="gray.500"
                                                                >
                                                                    Coming soon
                                                                </Td>
                                                            </Tr>
                                                        ),
                                                    )}
                                            </Tbody>
                                        </Table>
                                    )}
                                </TableContainer>
                            </Box>
                        </Container>
                    </Box>
                    <Divider ml={10} mr={3} orientation="vertical" />

                    <Box
                        ml={5}
                        // bg="#F6F6F6"
                        w="40%"
                        pl={2}
                        height="100vh"
                        color="#383F40"
                    >
                        <Box
                            mt={4}
                            fontSize="3xl"
                            fontWeight="semibold"
                            display="flex"
                            alignItems="center"
                            pr={8}
                            justifyContent="space-evenly"
                        >
                            <Box
                                display="flex"
                                bg="#2B626E"
                                color="white"
                                alignItems="left"
                                flexDir="column"
                                px={5}
                                py={2}
                                rounded="md"
                                w="full"
                            >
                                <Text
                                    fontSize="sm"
                                    fontWeight="normal"
                                    mt={2}
                                    as="span"
                                    display="flex"
                                    alignItems="center"
                                >
                                    <FiEye fontWeight="bold" fontSize="20px" />
                                    <Text as="span" ml={2} color="white">
                                        Total Views
                                    </Text>
                                </Text>
                                <Box
                                    flexDir="row"
                                    display="flex"
                                    mt={1}
                                    alignItems="center"
                                ></Box>
                            </Box>
                            <Box
                                display="flex"
                                bg="#CDD9DE"
                                alignItems="left"
                                flexDir="column"
                                px={5}
                                py={2}
                                ml={4}
                                rounded="md"
                                w="full"
                            >
                                <Text
                                    fontSize="sm"
                                    fontWeight="normal"
                                    mt={2}
                                    as="span"
                                    display="flex"
                                    alignItems="center"
                                >
                                    <FiPlay fontWeight="bold" fontSize="20px" />
                                    <Text as="span" ml={2} color="#383F40">
                                        Total Plays
                                    </Text>
                                </Text>
                                <Box
                                    flexDir="row"
                                    display="flex"
                                    mt={1}
                                    alignItems="center"
                                ></Box>
                            </Box>
                            <Box
                                display="flex"
                                bg="#adeee1"
                                alignItems="left"
                                flexDir="column"
                                px={5}
                                py={2}
                                ml={4}
                                rounded="md"
                                w="full"
                            >
                                <Text
                                    fontSize="sm"
                                    fontWeight="normal"
                                    mt={2}
                                    as="span"
                                    display="flex"
                                    alignItems="center"
                                >
                                    <FiPlay fontWeight="bold" fontSize="20px" />
                                    <Text as="span" ml={2} color="#383F40">
                                        CTA Clicks
                                    </Text>
                                </Text>
                                <Box
                                    flexDir="row"
                                    display="flex"
                                    mt={1}
                                    alignItems="center"
                                ></Box>
                            </Box>
                        </Box>
                        <Flex
                            flexDir="column"
                            p={"0"}
                            pt={0}
                            mt={5}
                            w="95%"
                            height="522px"
                            mr="0"
                        >
                            <LatestAnalytics
                                filterById={filterById}
                                range={filterByRange}
                            />
                        </Flex>
                    </Box>
                </Box>
            </>
        </Box>
    );
};
