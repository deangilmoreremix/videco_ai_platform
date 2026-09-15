import "cross-fetch/polyfill";
import dotenv from "dotenv";
import * as nodeGlobals from "util";

dotenv.config({ path: ".env.test" });
if (typeof globalThis.TextEncoder === "undefined") {
    (globalThis as any).TextEncoder = nodeGlobals.TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
    (globalThis as any).TextDecoder = nodeGlobals.TextDecoder;
}
if (typeof globalThis.Request === "undefined") {
    (globalThis as any).Request = nodeGlobals.Request;
}
if (typeof globalThis.Response === "undefined") {
    (globalThis as any).Response = nodeGlobals.Response;
}
if (typeof globalThis.Headers === "undefined") {
    (globalThis as any).Headers = nodeGlobals.Headers;
}

import nock from "nock";

afterAll(() => {
    nock.cleanAll();
    nock.restore();
});

window.matchMedia = jest.fn().mockImplementation((query) => {
    return {
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
    };
});

window.scroll = jest.fn();
window.alert = jest.fn();
