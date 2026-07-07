import React from "react";

const Home: React.FC = () => {
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
            destination: '/dashboard',
            permanent: false,
        },
    };
};
