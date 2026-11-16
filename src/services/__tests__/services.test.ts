/**
 * @jest-environment node
 */
import { getTenantId, pollUntilDone, firstOutputUrl } from "src/services";

describe("getTenantId", () => {
    it("prefers app_metadata", () => {
        expect(
            getTenantId({
                app_metadata: { tenant_id: "app" },
                user_metadata: { tenant_id: "user" },
            }),
        ).toBe("app");
    });

    it("falls back to user_metadata (where signup stores it)", () => {
        expect(getTenantId({ user_metadata: { tenant_id: "user" } })).toBe(
            "user",
        );
    });

    it("returns undefined when missing", () => {
        expect(getTenantId(null)).toBeUndefined();
        expect(getTenantId({ app_metadata: {}, user_metadata: {} })).toBe(
            undefined,
        );
    });
});

describe("pollUntilDone", () => {
    const realFetch = global.fetch;
    afterEach(() => {
        global.fetch = realFetch;
    });

    const respond = (body: unknown) =>
        Promise.resolve(
            new Response(JSON.stringify(body), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
        );

    it("polls the api function until the job completes", async () => {
        const statuses = ["processing", "processing", "completed"];
        const calls: string[] = [];
        global.fetch = jest.fn((url: string) => {
            calls.push(url);
            const status = statuses.shift();
            return respond(
                status === "completed"
                    ? { status, outputs: ["https://cdn/x.mp4"] }
                    : { status },
            );
        }) as unknown as typeof fetch;

        const updates: string[] = [];
        const res = await pollUntilDone("job-1", {
            intervalMs: 1,
            onUpdate: (r) => updates.push(String(r.status)),
        });

        expect(res.status).toBe("completed");
        expect(firstOutputUrl(res)).toBe("https://cdn/x.mp4");
        expect(updates).toEqual(["processing", "processing", "completed"]);
        // Requests must go to the `api` Edge Function, not `jobs`/`videos`.
        expect(calls[0]).toMatch(
            /\/functions\/v1\/api\/jobs\?id=job-1&action=poll$/,
        );
    });

    it("stops on failure", async () => {
        global.fetch = jest.fn(() =>
            respond({ status: "failed", error: "boom" }),
        ) as unknown as typeof fetch;
        const res = await pollUntilDone("job-2", { intervalMs: 1 });
        expect(res.status).toBe("failed");
    });

    it("times out after maxAttempts", async () => {
        global.fetch = jest.fn(() =>
            respond({ status: "processing" }),
        ) as unknown as typeof fetch;
        await expect(
            pollUntilDone("job-3", { intervalMs: 1, maxAttempts: 2 }),
        ).rejects.toThrow("Timed out");
    });

    it("honours cancellation", async () => {
        global.fetch = jest.fn() as unknown as typeof fetch;
        const res = await pollUntilDone("job-4", {
            signal: { cancelled: true },
        });
        expect(res.status).toBe("cancelled");
        expect(global.fetch).not.toHaveBeenCalled();
    });
});

describe("firstOutputUrl", () => {
    it("accepts string or {url} outputs", () => {
        expect(firstOutputUrl({ outputs: ["a"] })).toBe("a");
        expect(firstOutputUrl({ outputs: [{ url: "b" }] })).toBe("b");
        expect(firstOutputUrl({})).toBeUndefined();
    });
});
