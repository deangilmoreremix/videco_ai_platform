import { supabase } from "src/services";

export async function verifyToken(
    req: { body: { api_key: string } },
    res: {
        status: (code: number) => {
            json: (body: Record<string, string>) => void;
        };
    },
    next: () => void,
) {
    if (!req.body.api_key) {
        return res
            .status(401)
            .json({ message: "Authorization token is missing" });
    }

    try {
        // const decoded = jwt.verify(token, secretKey);
        const user_id = await supabase
            .from("apikey")
            .select("user_id")
            .eq("key", req.body.api_key);
        // Add the decoded user information to the request object
        req.user = user_id.data[0].user_id;
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}
