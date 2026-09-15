import "cross-fetch/polyfill";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

// jsdom does not provide all web API globals required by modern nock/@mswjs/interceptors.
// Node 20 has native implementations; expose them explicitly before importing nock.
const nodeGlobals = require("util") as Record<string, unknown>;
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
