import axios from "axios";

export const axiosInstance = axios.create({
    baseURL: "",
    timeout: 30000,
    headers: {
        post: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
    },
});
