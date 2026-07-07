import React from "react";

import { useRouter } from "next/router";
import { useEffect } from "react";

const Home: React.FC = () => {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard");
    }, [router]);

    return null;
};

export default Home;

export const getServerSideProps = async (ctx: any) => {
    const { res } = ctx;

    res.setHeader("location", "/dashboard");
    res.statusCode = 302;
    res.end();

    return {
        redirect: {
            destination: "/dashboard",
            permanent: false,
        },
    };
};
