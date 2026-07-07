import React, { useState } from "react";
import { Button, Textarea, VStack, Text, useToast } from "@chakra-ui/react";
import axios from "axios";

interface PersonalizationPanelProps {
    lead?: { name?: string; company?: string; painPoint?: string };
    onScriptGenerated?: (script: string) => void;
}

export const PersonalizationPanel: React.FC<PersonalizationPanelProps> = ({
    lead = {},
    onScriptGenerated,
}) => {
    const [loading, setLoading] = useState(false);
    const [script, setScript] = useState("");
    const toast = useToast();

    const generate = async () => {
        setLoading(true);
        try {
            const { data } = await axios.post("/api/ai/personalize-script", {
                leadName: lead.name,
                company: lead.company,
                painPoint: lead.painPoint || "your current challenges",
                product: "our solution",
                tone: "professional",
                durationSeconds: 45,
            });
            const full = data.script?.fullScript || "";
            setScript(full);
            onScriptGenerated?.(full);
            toast({
                title: "Personalized script generated",
                status: "success",
            });
        } catch (e: any) {
            toast({
                title: "Generation failed",
                description: e.message,
                status: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <VStack
            align="stretch"
            spacing={3}
            p={4}
            borderWidth={1}
            borderRadius="md"
        >
            <Text fontWeight="medium">AI Personalization (Muapi + OpenAI)</Text>
            <Button
                size="sm"
                onClick={generate}
                isLoading={loading}
                colorScheme="purple"
            >
                Generate Personalized Video Script
            </Button>
            {script && (
                <Textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    rows={6}
                    fontSize="sm"
                />
            )}
            <Text fontSize="xs" color="gray.500">
                Powered by OpenAI Responses + Muapi video generation
            </Text>
        </VStack>
    );
};
