import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "src/services";

export interface PlanRow {
    id: string;
    tenant_id: string;
    user_id: string;
    plan_name: string;
    stipe_id?: string | null;
    status: string;
    free_trial_start_date?: string | null;
    free_trial_ended: boolean;
    video_limit?: number | null;
    dynamic_videos_limit?: number | null;
    created_at: string;
    updated_at: string;
}

export function useUserPlan() {
    const session = useSession();
    const user = session?.user;
    const getPlan = async (
        user_id?: string,
    ): Promise<PlanRow[] | undefined> => {
        if (!user_id) {
            return undefined;
        }
        try {
            const { data, error } = await supabase
                .from("plan")
                .select()
                .eq("user_id", user_id);

            if (error) {
                console.error("Failed to load plan", error);
                return undefined;
            }

            return data ?? [];
        } catch (error) {
            console.error("Error fetching plan", error);
            return undefined;
        }
    };
    const currentUserPlan = async (): Promise<PlanRow | undefined> => {
        if (!user?.id) {
            return undefined;
        }
        try {
            const { data, error } = await supabase
                .from("plan")
                .select()
                .eq("user_id", user.id)
                .maybeSingle();

            if (error || !data) {
                return undefined;
            }

            return data as PlanRow;
        } catch (error) {
            console.error("Error fetching current plan", error);
            return undefined;
        }
    };

    return {
        getPlan,
        currentUserPlan,
    };
}
