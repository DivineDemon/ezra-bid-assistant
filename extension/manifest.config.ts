import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Ezra Bid Assistant",
  version: packageJson.version,
  description:
    "AI bidding assistant for Freelancer.com. Generates proposal drafts for manual review — no auto-submit.",
  permissions: ["sidePanel", "storage", "scripting"],
  host_permissions: ["*://*.freelancer.com/*"],
  icons: {
    16: "public/icons/icon-16.png",
    32: "public/icons/icon-32.png",
    48: "public/icons/icon-48.png",
    128: "public/icons/icon-128.png",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  side_panel: {
    default_path: "src/side-panel/index.html",
  },
  options_ui: {
    page: "src/options/index.html",
    open_in_tab: true,
  },
  content_scripts: [
    {
      matches: ["*://*.freelancer.com/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  action: {
    default_title: "Ezra Bid Assistant",
    default_icon: {
      16: "public/icons/icon-16.png",
      32: "public/icons/icon-32.png",
      48: "public/icons/icon-48.png",
      128: "public/icons/icon-128.png",
    },
  },
});
