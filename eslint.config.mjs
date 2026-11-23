import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// generated/ is a synced copy of the host UI (linted there); mock/ and app/ are demo-owned.
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  { ignores: ["generated/**", "public/**", "out/**", ".next/**", "capture/raw/**", "capture/runs/**"] },
  {
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
