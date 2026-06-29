import { render } from "@testing-library/react";

import { Header } from "./index";

describe("Header component testing with testing-library", () => {
    it("renders without crashing", () => {
        const component = render(<Header pageTitle="Test" />);

        expect(component).toBeTruthy();
    });
});
