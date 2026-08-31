import React, { useCallback, useEffect, useState } from "react";
import {
    Box,
    Heading,
    Flex,
    Spinner,
    Text,
    VStack,
    HStack,
    Avatar,
    useToast,
} from "@chakra-ui/react";
import { Sidebar } from "@components/common/sidebar";
import { Header } from "@components/common/header";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { supabase } from "src/services";
import { AuthGuard } from "src/hoc/withAuthGuard";

const CommentsContent: React.FC = () => {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const session = useSession();
    const user = session?.user;
    const router = useRouter();
    const toast = useToast();

    const fetchComments = useCallback(async () => {
        if (!user?.id) {
            setComments([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from("comments")
                .select(
                    `
                    id,
                    content,
                    created_at,
                    parent_id,
                    video_id,
                    user_id,
                    videos (
                        id,
                        name,
                        url
                    )
                `,
                )
                .is("parent_id", null)
                .order("created_at", { ascending: false });

            if (error) {
                throw error;
            }

            setComments(data ?? []);
        } catch (err: any) {
            console.error("Failed to load comments", err);
            setError(err?.message || "Failed to load comments");
            toast({
                title: "Error loading comments",
                description: err?.message || "Please try again later.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    if (loading) {
        return (
            <Flex h="100vh" align="center" justify="center">
                <Spinner size="xl" />
            </Flex>
        );
    }

    return (
        <Flex h="100vh" overflow="hidden">
            <Sidebar />
            <Flex flexDir="column" flex="1" overflow="hidden">
                <Header />
                <Box p={8} overflowY="auto" flex="1">
                    <Heading mb={6}>Comments</Heading>
                    {error && (
                        <Text color="red.500" mb={4}>
                            {error}
                        </Text>
                    )}
                    {!comments.length && !error && (
                        <Text color="gray.500">
                            No comments yet. Comments will appear here when viewers
                            interact with your videos.
                        </Text>
                    )}
                    <VStack spacing={4} align="stretch">
                        {comments.map((comment) => (
                            <Box
                                key={comment.id}
                                p={4}
                                border="1px solid #dcdcdc"
                                rounded="md"
                                bg="white"
                            >
                                <HStack spacing={3} align="start">
                                    <Avatar size="sm" name={comment.user_id} />
                                    <Box flex="1">
                                        <Text fontWeight="semibold" fontSize="sm">
                                            {comment.user_id?.slice(0, 8) ||
                                                "Anonymous"}
                                        </Text>
                                        <Text fontSize="sm" color="gray.500">
                                            {comment.videos?.name ||
                                                "Unknown video"}
                                        </Text>
                                        <Text mt={2}>{comment.content}</Text>
                                        <Text
                                            fontSize="xs"
                                            color="gray.400"
                                            mt={2}
                                        >
                                            {new Date(
                                                comment.created_at,
                                            ).toLocaleString()}
                                        </Text>
                                    </Box>
                                </HStack>
                            </Box>
                        ))}
                    </VStack>
                </Box>
            </Flex>
        </Flex>
    );
};

const CommentsWithAuth: React.FC = () => (
    <AuthGuard>
        <CommentsContent />
    </AuthGuard>
);

export default CommentsWithAuth;
