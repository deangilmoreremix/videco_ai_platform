import { render } from "@testing-library/react";
import { Editor } from "./index";

describe("Editor component testing with testing-library", () => {
    const component = render(<Editor />);

    it("renders without crashing", () => {
        expect(component).toBeTruthy();
    });
});
