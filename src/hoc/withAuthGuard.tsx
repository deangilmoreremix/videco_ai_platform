import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { ReactNode, useEffect } from "react";
import { Spinner, Flex } from "@chakra-ui/react";

interface AuthGuardProps {
    children: ReactNode;
    redirectTo?: string;
    requireAuth?: boolean;
}

export const AuthGuard = ({
    children,
    redirectTo = "/auth/login",
    requireAuth = true,
}: AuthGuardProps) => {
    const session = useSession();
    const router = useRouter();
    const user = session?.user;

    useEffect(() => {
        if (requireAuth && !user && router.isReady) {
            router.replace(redirectTo);
        }
    }, [user, router, requireAuth, redirectTo]);

    if (requireAuth && !user) {
        return (
            <Flex h="100vh" align="center" justify="center">
                <Spinner size="xl" />
            </Flex>
        );
    }

    return <>{children}</>;
};

export const withAuthGuard = <P extends Record<string, unknown>>(
    Component: React.ComponentType<P>,
    options?: Omit<AuthGuardProps, "children">,
) => {
    return function WrappedComponent(props: P) {
        return (
            <AuthGuard {...options}>
                <Component {...props} />
            </AuthGuard>
        );
    };
};
