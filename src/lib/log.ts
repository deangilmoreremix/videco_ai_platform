// Minimal structured logger (was a broken self-import of "./log").
const logger = {
    info: (message: string, meta?: Record<string, unknown>) =>
        console.info(message, meta ?? {}),
};

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
        logger.info("Usage log", { ...entry });
    } catch (error) {
        console.error("Usage logging error:", error);
    }
}
