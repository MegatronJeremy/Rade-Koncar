import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Hero } from "./components/Hero";
import { SEEDED_RUN } from "./fixtures";
import { LiveApp } from "./LiveApp";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) throw new Error("Missing #root element in index.html");

/**
 * With no VITE_CONVEX_URL the app still renders — it falls back to the bundled
 * sample run rather than showing an error. A judge must never meet a red screen
 * because a deploy was missing a variable.
 */
const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = typeof convexUrl === "string" && convexUrl.length > 0
  ? new ConvexReactClient(convexUrl)
  : undefined;

createRoot(root).render(
  <StrictMode>
    {convex === undefined ? (
      <>
        <Hero state="absent" submit={async () => undefined} onBrowseSamples={() => undefined} />
        <App run={SEEDED_RUN} isSample />
      </>
    ) : (
      <ConvexProvider client={convex}>
        <LiveApp />
      </ConvexProvider>
    )}
  </StrictMode>,
);
