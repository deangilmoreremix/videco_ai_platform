export type PlanName = "trial" | "lite" | "growth" | "scale" | "enterprise";

export const planDisplayNames: Record<PlanName, string> = {
    trial: "Trial",
    lite: "Lite",
    growth: "Growth",
    scale: "Scale",
    enterprise: "Enterprise",
};

export const plans = [
    {
        name: "Starter",
        description: "Starter Plan",
        price: "€19/month",
        plan_name: "lite" as PlanName,
    },
    {
        name: "Premium",
        description: "Premium Plan",
        price: "€59/month",
        plan_name: "growth" as PlanName,
    },
];

export const planSelector = (plan_name: string, frequency: string) => {
    switch (plan_name) {
        case "trial":
            return "trial";
        case "lite":
            return frequency === "month" ? "lite_month" : "lite_year";
        case "growth":
            return frequency === "month" ? "growth_month" : "growth_year";
        case "scale":
            return frequency === "month" ? "scale_month" : "scale_year";
        default:
            return plan_name;
    }
};

export const planUsage = (plan_name: string) => {
    const baseUsage = {
        dynamicVideos: [0, 1500] as [number, number],
        seat: [1, 5] as [number, number],
        videos: [0, 100] as [number, number],
    };

    switch (plan_name) {
        case "trial":
            return {
                dynamicVideos: [0, 1500] as [number, number],
                seat: [1, 5] as [number, number],
                videos: [0, 100] as [number, number],
            };
        case "lite":
            return {
                dynamicVideos: [0, 100] as [number, number],
                seat: [1, 1] as [number, number],
                videos: [0, 20] as [number, number],
            };
        case "growth":
            return {
                dynamicVideos: [0, 1500] as [number, number],
                seat: [1, 5] as [number, number],
                videos: [0, 100] as [number, number],
            };
        case "scale":
            return {
                dynamicVideos: [0, 3000] as [number, number],
                seat: [10, 10] as [number, number],
                videos: [0, 250] as [number, number],
            };
        case "enterprise":
            return {
                dynamicVideos: [0, 5000] as [number, number],
                seat: [10, 25] as [number, number],
                videos: [0, 1000000] as [number, number],
            };
        default:
            return baseUsage;
    }
};

export const isPlanAtLeast = (current: string, target: PlanName): boolean => {
    const order: PlanName[] = [
        "trial",
        "lite",
        "growth",
        "scale",
        "enterprise",
    ];
    const currentIndex = order.indexOf(current as PlanName);
    const targetIndex = order.indexOf(target);
    return currentIndex >= targetIndex;
};
