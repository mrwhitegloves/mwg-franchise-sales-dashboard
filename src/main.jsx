import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { store } from "@/app/store";
import App from "@/App";
import "./index.css";
import { registerWorker } from "@/lib/push";

// Web Push service worker (FS10) — only shows notifications, no offline caching
registerWorker();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <TooltipProvider delayDuration={200}>
          <App />
          <Toaster richColors position="top-right" closeButton />
        </TooltipProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
