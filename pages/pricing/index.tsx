import React, { useEffect } from "react";
import { Box, Flex, Text, chakra, VStack, HStack, Card, CardBody, Heading, Button, Spinner, Center } from "@chakra-ui/react";
import { Sidebar } from "@components/common/sidebar";
import { useSession } from "@supabase/auth-helpers-react";
import { useUserPlan } from "src/hooks/useUserPlan";
import { plans, planDisplayNames, isPlanAtLeast, PlanName } from "src/utils/plans";
import { AuthGuard } from "src/hoc/withAuthGuard";
const PlanCard = ({ plan, isCurrentPlan }: { plan: typeof plans[0]; isCurrentPlan: boolean }) => (
    <Card shadow="md" borderWidth="1px" borderColor={isCurrentPlan ? "green.400" : "gray.200"} maxW="sm">
        <CardBody>
            <VStack spacing={3} align="start">
                <Heading size="md">{plan.name}</Heading>
                <Text fontSize="2xl" fontWeight="bold">{plan.price}</Text>
                <Text fontSize="sm" color="gray.500">{plan.description}</Text>
                {isCurrentPlan && (
                    <Text fontSize="xs" color="green.500" fontWeight="semibold">Current plan</Text>
                )}
            </VStack>
        </CardBody>
    </Card>
);

PricingContent: React.FC = () => {
    const [plan, setPlan] = React.useState<PlanName | null>(null);
    const [loading, setLoading] = React.useState(true);
    const session = useSession();
    const { getPlan, currentUserPlan } = useUserPlan();
    const user = session?.user;
    useEffect(() => {
        const loadPlan = async () => {
            try {
                const planData = await currentUserPlan();
                if (planData?.plan_name) {
                    setPlan(planData.plan_name as PlanName);
                }
            } catch (error) {
                console.error("Failed to load plan", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            loadPlan();
        } else {
            setLoading(false);
        }
    }, [user, currentUserPlan]);

    return (
        <Sidebar>
            <Box mt={0} h="full" bg="white">
                <Flex direction="column" align="center" w="full" py={10}>
                    <Box textAlign="center" mb={10} px={4}>
                        <Heading mb={4} size="xl">Find a plan to power your videos</Heading>
                        <chakra.p mb={4} fontSize="md" color="gray.600" maxW="xl" mx="auto">
                            Discover how Videco can improve your B2B company's engagement, conversions, and revenue with interactive video and easy to use platform.
                        </chakra.p>
                        <Text fontSize="md" color="gray.500">Plans are managed by your account administrator. Contact us to upgrade or change your plan.</Text>
                    </Box>

                    {loading ? (
                        <Center py={10}>
                            <Spinner size="xl" />
                        </Center>
                    ) : (
                        <HStack spacing={6} wrap="wrap" justify="center">
                            {plans.map((planItem) => (
                                <PlanCard
                                    key={planItem.name}
                                    plan={planItem}
                                    isCurrentPlan={!!plan && isPlanAtLeast(plan, planItem.plan_name)}
                                />
                            ))}
                        </HStack>
                    )}
                </Flex>
            </Box>
        </Sidebar>
    );
};

const PricingWithAuth: React.FC = () => (
    <AuthGuard>
        <PricingContent />
    </AuthGuard>
);

export default PricingWithAuth;
