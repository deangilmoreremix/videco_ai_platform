// Node 22 provides fetch/Response natively, so no fetch polyfill is needed.
// jsdom lacks TextEncoder/TextDecoder, which supabase-js needs at import.
import { TextDecoder, TextEncoder } from "util";

Object.assign(globalThis, { TextEncoder, TextDecoder });
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";

// Browser-only shims (suites marked @jest-environment node have no window).
if (typeof window !== "undefined") {
    window.matchMedia = jest.fn().mockImplementation((query) => {
        return {
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        };
    });

    window.scroll = jest.fn();
    window.alert = jest.fn();
}

// Components call useRouter(); give them a minimal router outside Next.
jest.mock("next/router", () => ({
    useRouter: () => ({
        query: {},
        pathname: "/",
        asPath: "/",
        push: jest.fn(),
        replace: jest.fn(),
        reload: jest.fn(),
        prefetch: jest.fn(() => Promise.resolve()),
        events: { on: jest.fn(), off: jest.fn() },
    }),
}));
