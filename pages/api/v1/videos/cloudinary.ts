import type { NextApiResponse } from 'next';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import multiparty from 'multiparty';
import { supabaseAdmin } from '../../../lib/storage';

type ResponseData = {
  result?: any;
  error?: string;
};

const USE_SUPABASE_STORAGE = process.env.NEXT_PUBLIC_USE_SUPABASE_STORAGE === 'true';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: any,
  res: NextApiResponse<ResponseData>
) {
  const supabase = createClientComponentClient();
  const form = new multiparty.Form();

  if (req.method === 'POST') {
    const passThroughId = uuidv4() + Date.now();

    try {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          return res.status(500).json({ error: 'Error parsing form data' });
        }

        const filePath = files.file[0].path;

        if (USE_SUPABASE_STORAGE) {
          const fileBuffer = fs.readFileSync(filePath);
          const filename = `${fields?.user_id?.[0]}/videos/${passThroughId}.mp4`;

          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('user-uploads')
            .upload(filename, fileBuffer, {
              contentType: 'video/mp4',
            });

          fs.unlinkSync(filePath);

          if (uploadError) {
            return res.status(500).json({ error: uploadError.message });
          }

          const { data: urlData } = supabaseAdmin.storage
            .from('user-uploads')
            .getPublicUrl(uploadData.path);

          const result = {
            secure_url: urlData.publicUrl,
            public_id: uploadData.path,
            format: 'mp4',
          };

          if (fields?.video_id) {
            await supabase
              .from('videos')
              .update({ training_audio: result.secure_url })
              .eq('user_id', fields?.user_id?.[0])
              .eq('id', fields?.video_id?.[0])
              .select();
          }

          return res.status(200).json({ result });
        }

        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
          api_key: process.env.CLOUDINARY_API_KEY!,
          api_secret: process.env.CLOUDINARY_API_SECRET!,
        });

        const result = (await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_large(
            filePath,
            { resource_type: 'video', chunk_size: 6000000 },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
        })) as any;

        fs.unlinkSync(filePath);

        if (fields?.video_id) {
          await supabase
            .from('videos')
            .update({ training_audio: result.secure_url })
            .eq('user_id', fields?.user_id?.[0])
            .eq('id', fields?.video_id?.[0])
            .select();
        }

        return res.status(200).json({ result });
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to upload' });
    }
  } else {
    return res.status(405).json({ error: 'Not authorized!' });
  }
}