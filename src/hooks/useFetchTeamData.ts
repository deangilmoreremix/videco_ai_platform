import { supabase } from "src/services";
import { useSession } from "@supabase/auth-helpers-react";
import { useWorkspaces } from "src/store/workspace";

export function useFetchTeamData() {
    const session = useSession();
    const user = session?.user;
    const { workspace } = useWorkspaces();

    const getTeamUserIds = async () => {
        if (!user?.email || !workspace?.id) {
            return [];
        }
        try {
            const mainAccountRes = await supabase
                .from("sub_accounts")
                .select("main_account")
                .eq("shared_account", user.email)
                .limit(1);

            if (mainAccountRes.error || !mainAccountRes.data?.length) {
                return [];
            }

            const team = await supabase
                .from("sub_accounts")
                .select(
                    "shared_account, name, role, shared_account_user",
                )
                .eq("main_account", mainAccountRes.data[0].main_account)
                .eq("workspace_id", workspace.id)
                .order("role", { ascending: false });

            if (team.error) {
                console.error("Failed to load team members", team.error);
                return [];
            }

            return team.data ?? [];
        } catch (error) {
            console.error("Error fetching team data", error);
            return [];
        }
    };

    const getData = async (
        scheam: string,
        neq: { col: string; val: string },
    ) => {
        if (!user?.id || !workspace?.id) {
            return [];
        }
        try {
            const teamIdResponse = await getTeamUserIds();
            const teamIds = teamIdResponse
                .filter((item) => item.shared_account_user !== null)
                .map((item) => item.shared_account_user);

            if (!teamIds.length) {
                return [];
            }

            const { data, error } = await supabase
                .from(scheam)
                .select()
                .in("user_id", teamIds)
                .neq(neq.col, neq.val)
                .eq("workspace_id", workspace.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Failed to fetch data", error);
                return [];
            }

            return data ?? [];
        } catch (error) {
            console.error("Error fetching data", error);
            return [];
        }
    };

    return {
        getData,
        getTeamUserIds,
    };
}
