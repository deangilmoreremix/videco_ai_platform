import type { NextApiRequest, NextApiResponse } from "next";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type ResponseData = {
    result: any;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>,
) {
    const supabase = createClientComponentClient();

    if (req.method !== "POST") {
        return res.status(405).json({ result: { message: "Method Not Allowed" } });
    }

    // Generic video dispatcher.
    // Most concrete actions (clone/process/poll) are handled by their own
    // Next.js sub-routes under /api/v1/videos/*. This endpoint proxies a
    // job insert into Supabase `jobs` (mirroring netlify videos/preview)
    // and otherwise returns a thin status lookup.
    const body = req.body || {};
    const action = body.action || body.type;

    if (action && action !== "status") {
        const { data, error } = await supabase
            .from("jobs")
            .insert({
                user_id: body.user_id || null,
                type: action,
                model: body.model || null,
                input: body,
                status: "processing",
            })
            .select()
            .single();

        if (error) {
            return res
                .status(500)
                .json({ result: { success: false, error: error.message } });
        }

        return res
            .status(201)
            .json({ result: { success: true, job_id: data.id } });
    }

    const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        return res
            .status(500)
            .json({ result: { success: false, error: error.message } });
    }

    return res.status(200).json({ result: { success: true, data } });
}
