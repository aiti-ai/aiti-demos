/** Stable ids so `?session=<id>` links into the demo keep working. */
export const SESSION_IDS = {
  welcome: "019d7e3a-5c10-7a41-8f2e-0a1b2c3d4e01",
  files: "019d7e2f-8b44-7c02-9d1a-1b2c3d4e5f02",
  models: "019d7e1c-2a93-7e13-a4b5-2c3d4e5f6a03",
  branching: "019d7d9e-6f21-7b24-b6c7-3d4e5f6a7b04",
  branchingFork: "019d7da4-1e55-7f35-8c9d-4e5f6a7b8c05",
  feature: "019d7c8b-3d77-7a46-9eaf-5f6a7b8c9d06",
  extend: "019d7b52-9c08-7d57-a0b1-6a7b8c9d0e07",
  extendSubagent: "019d7b53-4a19-7e68-b2c3-7b8c9d0e1f08",
  tips: "019d7a17-7b2a-7f79-c4d5-8c9d0e1f2a09",
  scratch: "019d79e0-5d3b-7a8a-d6e7-9d0e1f2a3b10",
  forkTour: "019d8a41-1c2d-7e3f-8a4b-5c6d7e8f9a01",
  multiAgent: "019d8a42-2d3e-7f40-9b5c-6d7e8f9a0b02",
  queueWorktree: "019d8a43-3e4f-7a51-8c6d-7e8f9a0b1c03",
  modelsVault: "019d8a44-4f50-7b62-9d7e-8f9a0b1c2d04",
  devtools: "019d8a45-5a61-7c73-8e8f-9a0b1c2d3e05",
} as const;

/** The session the demo opens on first visit. */
export const WELCOME_SESSION_ID = SESSION_IDS.welcome;
