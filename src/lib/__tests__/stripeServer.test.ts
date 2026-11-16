/**
 * @jest-environment node
 */
describe("stripeServer price/plan mapping", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {
            ...OLD_ENV,
            NEXT_PUBLIC_PLAN_LITE_MONTH: "price_lite_m",
            NEXT_PUBLIC_PLAN_GROWTH_YEAR: "price_growth_y",
        };
    });
    afterAll(() => {
        process.env = OLD_ENV;
    });

    it("resolves prices from upstream env names", async () => {
        const { priceForPlan } = await import("src/lib/stripeServer");
        expect(priceForPlan("lite", "month")).toBe("price_lite_m");
        expect(priceForPlan("growth", "year")).toBe("price_growth_y");
    });

    it("rejects unknown or unconfigured plans", async () => {
        const { priceForPlan } = await import("src/lib/stripeServer");
        expect(priceForPlan("growth", "month")).toBeUndefined();
        expect(priceForPlan("enterprise", "month")).toBeUndefined();
        expect(priceForPlan("anything", "year")).toBeUndefined();
    });

    it("builds active plan rows with plan limits", async () => {
        const { activePlanFields } = await import("src/lib/stripeServer");
        expect(activePlanFields("lite")).toEqual({
            plan_name: "lite",
            status: "active",
            free_trial_ended: true,
            video_limit: 20,
            dynamic_videos_limit: 100,
            seat_limit: 1,
        });
    });
});
