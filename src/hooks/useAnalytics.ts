import { trackVideoEvent } from "src/services";

/**
 * Viewer-side analytics for the player. Events go through the
 * videco_track_event RPC: anonymous viewers can't write the analytics table,
 * and the table has no `anoyomous_id` column that the old code relied on.
 */
export function useAnalytics() {
    const updateClickAnalytics = async (
        video_id: string | number,
        element_name: string,
    ) => {
        try {
            await trackVideoEvent(String(video_id), "link_click", {
                name: element_name,
            });
        } catch (error) {
            console.log("error..", error);
        }
    };

    return {
        updateClickAnalytics,
    };
}
