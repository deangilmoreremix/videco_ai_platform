import {
    Box,
    Button,
    Flex,
    Input,
    Link,
    List,
    ListIcon,
    ListItem,
    Stack,
    Text,
    useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { PiCheckCircleFill } from "react-icons/pi";
import { CloseIcon } from "@chakra-ui/icons";
import { planSelector } from "src/utils/plans";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface PricingTableProps {
    freeLitePlan: boolean;
    user: any;
    expanded?: any;
}

export const PricingTable = ({ user, expanded }: PricingTableProps) => {
    const [selectedPlan, setSelectedPlan] = useState("growth");
    const [isLoading, setIsLoading] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const supabase = createClientComponentClient();
    const [frequency, setFrequency] = useState("month");

    const handleBuy = async () => {
        setIsLoading(true);
        await handleSubscriptions();
    };
    const handleSubscriptions = async () => {
        // Stack is Supabase + Muapi + OpenAI only (no Stripe).
        // Persist the user's selected plan to their profile for visibility.
        const isScalePlan = selectedPlan === "scale";
        if (!isScalePlan) {
            await supabase
                .from("profiles")
                .update({
                    desired_plan: planSelector(selectedPlan, frequency),
                    plan_name: selectedPlan,
                })
                .eq("id", user.id);
            alert("Plan preference saved. Billing is handled separately from this build.");
            setIsLoading(false);
        } else {
            setIsLoading(false);
            alert("this plan is coming soon. Please select another plan");
        }
    };

    return (
        <Flex direction="column" alignContent="center" w="full" mt={3}>
            {expanded && (
                <Flex justify="center" mx={["auto", 0]} mb={-2}>
                    <Stack
                        direction="row"
                        justify="space-between"
                        p="2"
                        textAlign="center"
                        rounded="xl"
                        bg="#F8F8F8"
                    >
                        <Button
                            colorScheme="teal"
                            rounded="xl"
                            fontWeight="normal"
                            variant={frequency === "month" ? "videco" : "ghost"}
                            onClick={() => setFrequency("month")}
                            px={6}
                        >
                            Monthly
                        </Button>
                        <Button
                            colorScheme="teal"
                            fontWeight="normal"
                            rounded="xl"
                            variant={frequency === "year" ? "videco" : "ghost"}
                            onClick={() => setFrequency("year")}
                            px={6}
                        >
                            Annually{" "}
                            <Text
                                as="span"
                                ml={2}
                                bg="#DADADA"
                                px={1}
                                py="1px"
                                rounded="md"
                                color="#05405A"
                                fontSize="xs"
                            >
                                save 10%
                            </Text>
                        </Button>
                    </Stack>
                </Flex>
            )}
            <Flex maxW="990px" w="full" mt={5}>
                <Box
                    border={`2px solid ${
                        selectedPlan === "lite" ? "#383F40" : "#dfdfdf"
                    }`}
                    bg={selectedPlan === "lite" ? "#F6F6F6" : "white"}
                    onClick={() => setSelectedPlan("lite")}
                    rounded="xl"
                    px={10}
                    py={6}
                    cursor="pointer"
                    minW={0}
                >
                    <Box>
                        <Text color="#383F40">For individuals</Text>
                        <Text fontWeight="bold" fontSize="24" color="#166183">
                            Lite
                        </Text>
                        <Text fontWeight="bold" color="#383F40">
                            €{frequency === "month" ? 19 : 17} / mo{" "}
                        </Text>
                    </Box>
                    <Box>
                        <List mt={3} spacing={3}>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />
                                1 workspace
                            </ListItem>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />{" "}
                                100 dynamic videos
                            </ListItem>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />{" "}
                                1 AI avatar
                            </ListItem>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />{" "}
                                Video analytics{" "}
                            </ListItem>
                            {expanded && (
                                <>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        20 hosted videos
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Storage: 10GB
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Unlimited landing pages
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Interactive elements
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Basic integrations
                                    </ListItem>
                                </>
                            )}
                        </List>
                        <Button
                            bg="white"
                            rounded="full"
                            p={0}
                            m="24px auto 0"
                            border="2px solid #05405A"
                            width="20px"
                            height="20px"
                            maxW="full"
                            as="span"
                            minW="10px"
                            display="flex"
                        >
                            {selectedPlan === "lite" && (
                                <Button
                                    bg="#05405A"
                                    rounded="full"
                                    p={1}
                                    m="0 auto"
                                    as="span"
                                    width="12px"
                                    height="12px"
                                    maxW="full"
                                    minW="10px"
                                    display="flex"
                                ></Button>
                            )}
                        </Button>
                    </Box>
                </Box>
                <Box
                    border={`2px solid ${
                        selectedPlan === "growth" ? "#05405A" : "#dfdfdf"
                    }`}
                    bg={selectedPlan === "growth" ? "#F7F9FA" : "white"}
                    onClick={() => setSelectedPlan("growth")}
                    rounded="xl"
                    px={10}
                    py={6}
                    minW={0}
                    mx={6}
                    cursor="pointer"
                >
                    <Box>
                        <Text
                            rounded="md"
                            fontSize="sm"
                            as="span"
                            px={3}
                            py="4px"
                            color="white"
                            bg="#2B626E"
                        >
                            🔥 Popular
                        </Text>
                        <Text fontWeight="bold" fontSize="24" color="#166183">
                            Growth
                        </Text>
                        <Text fontWeight="bold" color="#383F40">
                            €{frequency === "month" ? 79 : 71} / mo{" "}
                        </Text>
                    </Box>
                    <Box>
                        <List mt={3} spacing={3}>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />
                                5 workspaces
                            </ListItem>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />{" "}
                                1500 dynamic videos
                            </ListItem>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />{" "}
                                5 AI avatars
                            </ListItem>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />{" "}
                                Video analytics{" "}
                            </ListItem>
                            {expanded && (
                                <>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        100 hosted videos
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Storage: 100GB
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Interactive elements
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Zapier integrations
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        API access
                                    </ListItem>
                                </>
                            )}
                        </List>
                        <Button
                            bg="white"
                            rounded="full"
                            p={0}
                            m="24px auto 0"
                            border="2px solid #05405A"
                            width="20px"
                            height="20px"
                            maxW="full"
                            as="span"
                            minW="10px"
                            display="flex"
                        >
                            {selectedPlan === "growth" && (
                                <Button
                                    bg="#05405A"
                                    rounded="full"
                                    p={1}
                                    m="0 auto"
                                    as="span"
                                    width="12px"
                                    height="12px"
                                    maxW="full"
                                    minW="10px"
                                    display="flex"
                                ></Button>
                            )}
                        </Button>
                    </Box>
                </Box>
                <Box
                    border={`2px solid ${
                        selectedPlan === "scale" ? "#05405A" : "#dfdfdf"
                    }`}
                    bg={selectedPlan === "scale" ? "#F7F9FA" : "white"}
                    onClick={() => setSelectedPlan("scale")}
                    rounded="xl"
                    minW={0}
                    px={10}
                    py={6}
                    cursor="pointer"
                >
                    <Box>
                        <Text color="#383F40">For larger teams</Text>
                        <Text fontWeight="bold" fontSize="24" color="#166183">
                            Lifetime
                        </Text>
                        <Text fontWeight="bold" color="#383F40">
                            Coming soon
                        </Text>
                    </Box>

                    <Box>
                        <List mt={3} spacing={3}>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />
                                10 workspaces
                            </ListItem>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />{" "}
                                3000 dynamic videos
                            </ListItem>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />{" "}
                                10 AI avatars
                            </ListItem>
                            <ListItem>
                                <ListIcon
                                    as={PiCheckCircleFill}
                                    color="#383F40"
                                />{" "}
                                Video analytics{" "}
                            </ListItem>
                            {expanded && (
                                <>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        250 hosted videos
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Storage: 400GB
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Custom domain
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Brand kit
                                    </ListItem>
                                    <ListItem>
                                        <ListIcon
                                            as={PiCheckCircleFill}
                                            color="#383F40"
                                        />{" "}
                                        Advanced integrations
                                    </ListItem>
                                </>
                            )}
                        </List>
                        <Button
                            bg="white"
                            rounded="full"
                            p={0}
                            m="24px auto 0"
                            border="2px solid #05405A"
                            width="20px"
                            height="20px"
                            maxW="full"
                            as="span"
                            minW="10px"
                            display="flex"
                        >
                            {selectedPlan === "scale" && (
                                <Button
                                    bg="#05405A"
                                    rounded="full"
                                    p={1}
                                    m="0 auto"
                                    as="span"
                                    width="12px"
                                    height="12px"
                                    maxW="full"
                                    minW="10px"
                                    display="flex"
                                ></Button>
                            )}
                        </Button>
                    </Box>
                </Box>
            </Flex>

            <Button
                zIndex={999}
                outline={0}
                px={20}
                className="buy-button"
                w={expanded ? "40%" : "60%"}
                py={6}
                fontWeight="normal"
                colorScheme="teal"
                bg="#05405A"
                variant="videco"
                rounded="md"
                fontSize="20px"
                display="flex"
                margin="32px auto"
                isLoading={isLoading}
                color="white"
                onClick={handleBuy}
            >
                {expanded ? "Upgrade" : "Get started now"}
            </Button>
            <Link
                margin="0 auto"
                href="https://videco.io/demo/"
                target="_blank"
            >
                Need more? Book a meeting with us
            </Link>
        </Flex>
    );
};
