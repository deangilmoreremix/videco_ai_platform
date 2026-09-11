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

    if (req.method === "POST") {
        const body = req.body || {};
        const { data, error } = await supabase
            .from("jobs")
            .insert({
                user_id: body.user_id || null,
                type: "ai-preview",
                model: body.model || "gpt-4o-mini",
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

    return res.status(405).json({ result: { message: "Method Not Allowed" } });
}
