import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
    return {
        redirect: {
            destination: "/feedback",
            permanent: false,
        },
    };
};

const CommentsRedirect = () => {
    return null;
};

export default CommentsRedirect;
