import React, { ReactElement } from "react";

import { ChakraProvider } from "@chakra-ui/react";

/**
 * Custom renderer example
 * You can customize it to your needs.
 *
 * To learn more about customizing renderer,
 * please visit https://testing-library.com/docs/react-testing-library/setup
 */

export const AllTheProviders = ({ children }: any) => {
    return (
        <>
            <ChakraProvider theme={{}}>{children}</ChakraProvider>
        </>
    );
};

export { AllTheProviders };

