import { supabase } from "src/services";
import axios from "axios";

export default async function handler(req, res) {
    if (req.method === "POST") {
        const _cloneData = null;
        const getVideo = await supabase
            .from("videos")
            .select("ai_preview, media_status, url")
            .eq("id", req.body.id);

        if (getVideo.data?.[0].media_status === "in_progress") {
            // Try Muapi status polling instead of Sync
            try {
                const muapiRes = await axios.get(
                    `https://api.muapi.ai/api/v1/predictions/${getVideo.data?.[0].ai_preview}/result`,
                    {
                        headers: {
                            "x-api-key": process.env.MUAPI_API_KEY || "",
                        },
                    },
                );

                if (
                    muapiRes.data?.status === "completed" &&
                    muapiRes.data.outputs?.[0]?.url
                ) {
                    const finalUrl = muapiRes.data.outputs[0].url;
                    // Save final URL to Supabase
                    const { data, error } = await supabase
                        .from("videos")
                        .update({
                            url: finalUrl,
                            media_status: "ready",
                        })
                        .eq("id", req.body.id)
                        .select("ai_preview, media_status, url");

                    if (error) {
                        return res.status(500).json({ error: error });
                    } else {
                        return res.status(200).json({
                            status: data?.[0].media_status,
                            ai_preview: data?.[0].ai_preview,
                            url: data?.[0].url,
                        });
                    }
                }
            } catch (e) {
                console.log("muapi poll error", e.message || e);
            }
        }

        return res.status(200).json({
            status: getVideo.data?.[0].media_status,
        });
    }

    // Return 405 for methods other than POST
    return res.status(405).json({ message: "Method Not Allowed" });
}
