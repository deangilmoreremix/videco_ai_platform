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

    if (req.method === "GET") {
        const { data, error } = await supabase
            .from("videos")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            return res
                .status(500)
                .json({ result: { success: false, error: error.message } });
        }

        return res.status(200).json({ result: { success: true, data } });
    }

    return res.status(405).json({ result: { message: "Method Not Allowed" } });
}
