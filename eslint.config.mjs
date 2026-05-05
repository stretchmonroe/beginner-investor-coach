import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Common fetch/init patterns use setState in effects — disable the overly strict rule
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
