import type { NextApiResponse } from "next";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
// Replaced Cloudinary uploads with Supabase Storage helper (dual support during migration)
import { v2 as cloudinary } from "cloudinary"; // kept for legacy support
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import multiparty from "multiparty";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type ResponseData = {
    result: any;
};

const secretKey = process.env.VIDECO_SECRET_KEY;

export const config = {
    api: {
        bodyParser: false, // Disable body parsing for this route
    },
};

export default async function handler(
    req: any,
    res: NextApiResponse<ResponseData>,
) {
    const supabase = createClientComponentClient();

    const form = new multiparty.Form();
    //verifyToken(req, res, async () => {
    if (req.method === "POST") {
        const passThroughId = uuidv4() + Date.now();
        try {
            // Configuration
            // Keep Cloudinary config as fallback (transitional)
            try {
                cloudinary.config({
                    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
                    api_key: process.env.CLOUDINARY_API_KEY || '',
                    api_secret: process.env.CLOUDINARY_API_SECRET || '',
                });
            } catch (e) {}

            form.parse(req, async (err, fields, files) => {
                if (err) {
                    return new Response("Error parsing form data", {
                        status: 500,
                    });
                }

                // Get the file from the form data
                const filePath = files.file[0].path;

                try {
                    // Move uploaded temp file into Supabase Storage
                    const fileStream = fs.createReadStream(filePath);
                    const fileName = `${uuidv4()}-${Date.now()}`;
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                        .from('user-uploads')
                        .upload(fileName, fileStream, { upsert: true });

                    // Remove the file from the file system after upload
                    fs.unlinkSync(filePath);

                    if (uploadErr) throw uploadErr;

                    const publicUrl = supabase.storage.from('user-uploads').getPublicUrl(uploadData.path).publicUrl;

                    if (fields?.video_id) {
                        await supabase
                            .from("videos")
                            .update({
                                training_audio: publicUrl,
                            })
                            .eq("user_id", fields?.user_id?.[0])
                            .eq("id", fields?.video_id?.[0])
                            .select();
                    }

                    // Send response back to the client with a normalized shape
                    res.status(200).json({
                        result: { publicUrl, path: uploadData.path },
                    });
                } catch (uploadError) {
                    console.error("Upload error:", uploadError);
                    return res.status(500).json({ result: [], error: uploadError.message });
                }
            });
        } catch (error) {
            console.log("error..", error);
            res.status(200).json({ result: [] });
        }
    } else {
        res.status(300).json({ result: "Not authorized!" });
    }
    //});
}
