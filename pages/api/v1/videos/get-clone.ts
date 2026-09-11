import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabase = createClientComponentClient();

export default async function handler(req, res) {
    if (req.method === "POST") {
        const getVideo = await supabase
            .from("videos")
            .select("ai_preview, media_status, url")
            .eq("id", req.body.id);

        if (getVideo.error) {
            return res.status(404).json({
                success: false,
                error: getVideo.error.message,
            });
        }

        const row = getVideo.data?.[0];
        if (!row) {
            return res
                .status(404)
                .json({ success: false, error: "Video not found" });
        }

        if (row.media_status === "in_progress" && row.ai_preview) {
            try {
                const { pollResult } = await import("src/lib/muapi");
                const muapiRes = await pollResult(String(row.ai_preview));
                if (
                    muapiRes.status === "completed" &&
                    muapiRes.outputs?.[0]?.url
                ) {
                    const finalUrl = muapiRes.outputs[0].url;
                    const { data, error } = await supabase
                        .from("videos")
                        .update({
                            url: finalUrl,
                            media_status: "ready",
                        })
                        .eq("id", req.body.id)
                        .select("ai_preview, media_status, url");

                    if (error) {
                        return res
                            .status(500)
                            .json({ success: false, error: error.message });
                    }
                    return res.status(200).json({
                        success: true,
                        data: {
                            status: data?.[0].media_status,
                            ai_preview: data?.[0].ai_preview,
                            url: data?.[0].url,
                        },
                    });
                }
            } catch (e) {
                console.log("muapi poll error", e?.message || e);
            }
        }

        return res.status(200).json({
            success: true,
            data: { status: row.media_status, ai_preview: row.ai_preview, url: row.url },
        });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
}
