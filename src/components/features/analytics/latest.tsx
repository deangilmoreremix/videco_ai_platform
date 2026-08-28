import { Divider, Box, Text, Spinner, Center } from "@chakra-ui/react";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useState, useCallback, useEffect } from "react";
import {
    ResponsiveContainer,
    AreaChart,
    Tooltip,
    CartesianGrid,
    XAxis,
    YAxis,
    Area,
} from "recharts";
import { supabase } from "src/services";

type VideoData = {
    filterById?: any;
    range?: number;
};
export const LatestAnalytics: React.FC<VideoData> = ({
    filterById,
    range = 7,
}) => {
    const router = useRouter();
    const [videoData, setVideoData] = useState<any>([]);
    const [formattedVideoData, setFormattedVideoData] = useState<any>([]);
    const [error, setError] = useState<string | null>(null);
    const session = useSession();
    const user = session?.user;
    const [loading, setLoading] = useState(true);
    const getProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            if (!user?.id) {
                setVideoData([]);
                return;
            }

            let query = supabase
                .from("videos")
                .select(
                    "name, id, size, status, analytics ( id, data, event, created_at )",
                )
                .neq("status", "deleted")
                .eq("user_id", user.id);

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
        } catch (err: any) {
            console.error("Failed to load latest analytics", err);
            setError(err?.message || "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    }, [user, filterById, range]);

    useEffect(() => {
        getProfile();
    }, [getProfile]);
    useEffect(() => {
        const processedVideoData = videoData.map((item) => ({
            ...item,
            analytics: item.analytics
                .filter((item: any) => item.event === "view")
                .map((analytic: any) => ({
                    ...analytic,
                })),
        }));

        const analyticsCounts: Record<string, number> = {};

        const today = new Date();

        processedVideoData?.forEach((item: any) => {
            item.analytics.forEach((analytic: any) => {
                const createdDate = new Date(analytic.created_at);

                if (Number.isNaN(createdDate.getTime())) {
                    return;
                }

                const dayDiff = Math.ceil(
                    (today.getTime() - createdDate.getTime()) /
                        (1000 * 60 * 60 * 24),
                );
                if (dayDiff >= 1 && dayDiff <= range) {
                    const dateString = createdDate.toISOString().split("T")[0];
                    analyticsCounts[dateString] =
                        (analyticsCounts[dateString] || 0) + 1;
                }
            });
        });

        const finalData = [];
        for (let i = 0; i < range; i++) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split("T")[0];

            finalData.push({
                date: dateString,
                name: dateString.split("-")[2],
                views: analyticsCounts[dateString] || 0,
            });
        }
        setFormattedVideoData(finalData);
    }, [user, filterById, videoData, range]);

    if (loading) {
        return (
            <Box
                shadow="sm"
                rounded="md"
                border="1px solid #dcdcdc"
                w="full"
                mr={4}
                pt={6}
                mb={6}
            >
                <Text
                    as="h2"
                    fontSize="lg"
                    fontWeight="semibold"
                    mb={5}
                    ml={5}
                >
                    Total views last {range} days
                </Text>
                <Divider mb={5} />
                <Center py={10}>
                    <Spinner />
                </Center>
            </Box>
        );
    }

    if (error) {
        return (
            <Box
                shadow="sm"
                rounded="md"
                border="1px solid #dcdcdc"
                w="full"
                mr={4}
                pt={6}
                mb={6}
            >
                <Text
                    as="h2"
                    fontSize="lg"
                    fontWeight="semibold"
                    mb={5}
                    ml={5}
                >
                    Total views last {range} days
                </Text>
                <Divider mb={5} />
                <Text ml={6} mt={3} color="red.500">
                    {error}
                </Text>
            </Box>
        );
    }

    return (
        <Box
            shadow="sm"
            rounded="md"
            border="1px solid #dcdcdc"
            w="full"
            mr={4}
            pt={6}
            mb={6}
        >
            <Text as="h2" fontSize="lg" fontWeight="semibold" mb={5} ml={5}>
                Total views last {range} days
            </Text>
            <Divider mb={5} />
            <ResponsiveContainer width="100%" height="80%">
                <AreaChart
                    width={500}
                    height={360}
                    data={formattedVideoData}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 20,
                    }}
                >
                    <CartesianGrid vertical={false} stroke="#e2f6f5" />
                    <defs>
                        <linearGradient
                            id="colorUv"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor="#129a74"
                                stopOpacity={0.1}
                            />
                            <stop
                                offset="95%"
                                stopColor="#FFFFFF"
                                stopOpacity={0.1}
                            />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="name" />
                    <YAxis />

                    <Tooltip />
                    <Area
                        type="monotone"
                        dataKey="views"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorUv)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Box>
    );
};
