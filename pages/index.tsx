import React from "react";

const Home: React.FC = () => {
    return null;
};

export default Home;

export const getServerSideProps = async () => {
    return {
        redirect: {
            destination: '/dashboard',
            permanent: false,
        },
    };
};
