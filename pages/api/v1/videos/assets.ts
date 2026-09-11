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
        const { data, error } = await supabase.storage
            .from("videos")
            .list(req.body?.path || "", {
                limit: 100,
                offset: 0,
            });

        if (error) {
            return res
                .status(500)
                .json({ result: { success: false, error: error.message } });
        }

        return res.status(200).json({ result: { success: true, assets: data } });
    }

    return res.status(405).json({ result: { message: "Method Not Allowed" } });
}
