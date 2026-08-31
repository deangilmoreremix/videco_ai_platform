import React, { useEffect, useState } from "react";
import { SessionContextProvider, useSession } from "@supabase/auth-helpers-react";
import { AppProps } from "next/app";
import { Box, ChakraProvider } from "@chakra-ui/react";
import { useLanguageStore } from "src/store/language";
import { ILanguage } from "src/store/types";
import Head from "next/head";
import { appWithTranslation } from "@i18n";
import nextI18nextConfig from "../next-i18next.config";
import { theme } from "src/utils/theme";
import TagManager from "react-gtm-module";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/router";
import type { SupabaseClient } from "@supabase/supabase-js";
declare global {
    interface Window {
        Trengo: {
            key: string;
        };
        usetifulTags: any;
        $crisp: any[];
        shotstack: any;
        po: any;
        CRISP_WEBSITE_ID: string;
    }
}

function MyApp({ Component, pageProps }: AppProps): JSX.Element {
    const [supabase] = useState<SupabaseClient | null>(() => {
        if (
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ) {
            return createPagesBrowserClient();
        }
        return null;
    });
    const router = useRouter();
    const env = process.env.NODE_ENV;

    const { language, languages, setLanguage } = useLanguageStore();
    const [currentLanguage, setCurrentLanguage] = useState<
        ILanguage | undefined
    >();

    const tagManagerArgs = {
        gtmId: "GTM-KG3QRFCQ",
    };

    useEffect(() => {
        setCurrentLanguage(language);
    }, [language]);
    const authRegex = /^\/auth\//;
    const embedRegex = /^\/embed\//;
    useEffect(() => {
        const isAuthPath = authRegex.test(router.pathname);
        const isEmbedRegexPath = embedRegex.test(router.pathname);
        if (!isAuthPath && !isEmbedRegexPath) {
            window.$crisp = [];
            window.CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

            (function () {
                const d = document;
                const s = d.createElement("script");
                s.src = "https://client.crisp.chat/l.js";
                s.async = true;
                d.getElementById("CHAT").appendChild(s);
            })();
        }
    }, [router]);
    useEffect(() => {
        TagManager.initialize(tagManagerArgs);
    }, []);
    const AnyComponent = Component as any;

    const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
        const session = useSession();
        const user = session?.user;

        useEffect(() => {
            if (!user || !supabase) return;

            const ensureTenant = async () => {
                const existingTenantId =
                    (user.user_metadata?.tenant_id as string | undefined) ||
                    (user.app_metadata?.tenant_id as string | undefined);

                if (existingTenantId) {
                    return;
                }

                const { data: existingProfile } = await supabase
                    .from("profiles")
                    .select("tenant_id")
                    .eq("id", user.id)
                    .maybeSingle();

                if (existingProfile?.tenant_id) {
                    return;
                }

                const tenantId = crypto.randomUUID();
                const { error: tenantError } = await supabase
                    .from("tenants")
                    .insert([
                        {
                            id: tenantId,
                            name: user.email ?? "Default Tenant",
                        },
                    ]);

                if (tenantError) {
                    console.error("Failed to create tenant", tenantError);
                    return;
                }

                await supabase.auth.updateUser({
                    data: {
                        tenant_id: tenantId,
                    },
                });

                await supabase.from("profiles").upsert(
                    {
                        id: user.id,
                        tenant_id: tenantId,
                        email: user.email,
                        full_name: user.user_metadata?.full_name,
                        onboard_completed: false,
                    },
                    {
                        onConflict: "id",
                    },
                );

                const { error: wsError, count } = await supabase
                    .from("workspace")
                    .update({ tenant_id: tenantId })
                    .eq("owner", user.id)
                    .is("tenant_id", null);

                if (wsError) {
                    console.error("workspace update failed", wsError);
                }

                if (!count) {
                    await supabase.from("workspace").insert([
                        {
                            owner: user.id,
                            tenant_id: tenantId,
                            name: "Default",
                            image: "/default_icon.png",
                        },
                    ]);
                }
            };

            ensureTenant().catch((error) =>
                console.error("Tenant initialization failed", error),
            );
        }, [user, supabase]);

        return <>{children}</>;
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
            }}
            height="100vh"
            width={["initial", "initial", null]}
        >
            <style jsx global>{`
                @font-face {
                    font-family: "Inter", sans-serif;
                }
                html {
                    font-family: "Inter", sans-serif;
                }
            `}</style>
            <Head>
                <title>Videco</title>
            </Head>
            <ChakraProvider theme={theme}>
                {supabase ? (
                    <SessionContextProvider
                        supabaseClient={supabase}
                        initialSession={pageProps.initialSession}
                    >
                        {/* <Alert
                            textAlign="center"
                            justifyContent="center"
                            p={6}
                            status="info"
                        >
                            <AlertIcon />
                            Get 60% off on all plans. Use code{" "}
                        </Alert> */}
                        <AuthInitializer>
                            <AnyComponent {...pageProps} />
                        </AuthInitializer>
                    </SessionContextProvider>
                ) : (
                    <AnyComponent {...pageProps} />
                )}
            </ChakraProvider>
            <Box id="CHAT" />
        </Box>
    );
}

export default appWithTranslation(MyApp, nextI18nextConfig);
