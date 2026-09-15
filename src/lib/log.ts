interface UsageLog {
    user_id?: string;
    model?: string;
    provider?: string;
    action?: string;
    details?: Record<string, unknown>;
    cost_estimate?: number;
}

export async function logUsage(entry: UsageLog): Promise<void> {
    try {
        console.info("Usage log", entry);
    } catch (error) {
        console.error("Usage logging error:", error);
    }
}
