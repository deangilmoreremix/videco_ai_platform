import { pollMuapiJob, waitForMuapiJob } from "src/lib/muapi";

/**
 * Convenience: keep polling until completed or failed.
 *
 * Delegates directly to src/lib/muapi so there is a single authoritative
 * Muapi client. pollMuapiJob and waitForMuapiJob are re-exported here
 * alongside pollUntilComplete for consumers that import from this module.
 */
export const pollUntilComplete = async (
    requestId: string,
    videoId?: string | number,
    onUpdate?: (status: string, finalUrl?: string) => void,
    maxAttempts = 60,
    intervalMs = 5000,
) => {
    return waitForMuapiJob(
        requestId,
        videoId,
        onUpdate,
        maxAttempts,
        intervalMs,
    );
};

export { pollMuapiJob, waitForMuapiJob };
