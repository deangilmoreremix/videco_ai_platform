import { render } from "@testing-library/react";

import { Sidebar } from "./index";

describe("Sidebar component testing with testing-library", () => {
    it("renders without crashing", () => {
        const component = render(<Sidebar></Sidebar>);

        expect(component).toBeTruthy();
    });
});
