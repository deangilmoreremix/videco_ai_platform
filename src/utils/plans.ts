export const plans = [
    [
        {
            name: "Starter",
            description: "Starter Plan",
            price: "€19/month",
        },
        {
            name: "Premium",
            description: "Premium Plan",
            price: "€59/month",
        },
    ],
];

export const planSelector = (plan_name: string, frequency: string) => {
    let plan_id;
    switch (plan_name) {
        case "trial":
            plan_id = "trial";
            break;
        case "lite":
            plan_id = frequency === "month" ? "lite_month" : "lite_year";
            break;
        case "growth":
            plan_id = frequency === "month" ? "growth_month" : "growth_year";
            break;
        case "scale":
            plan_id = frequency === "month" ? "scale_month" : "scale_year";
            break;
        default:
            break;
    }
    return plan_id;
};
export const planUsage = (plan_name: string) => {
    let planUsage: {
        dynamicVideos: any[];
        seat: any[];
        videos: number[];
    } = {
        dynamicVideos: [1500, 1500],
        seat: [5, 5],
        videos: [100, 100],
    };
    switch (plan_name) {
        case "trial":
            planUsage = {
                dynamicVideos: [0, 1500],
                seat: [1, 5],
                videos: [0, 100],
            };
            break;
        case "lite":
            planUsage = {
                dynamicVideos: [0, 100],
                seat: [1, 1],
                videos: [0, 20],
            };
            break;
        case "growth":
            planUsage = {
                dynamicVideos: [0, 1500],
                seat: [1, 5],
                videos: [0, 100],
            };
            break;
        case "scale":
            planUsage = {
                dynamicVideos: [0, 3000],
                seat: [10, 10],
                videos: [0, 250],
            };
            break;
        case "enterprise":
            planUsage = {
                dynamicVideos: [0, 5000],
                seat: [10, 25],
                videos: [0, 1000000],
            };
            break;
        default:
            break;
    }
    return planUsage;
};
