import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { MotionConfig } from "framer-motion";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { NowProvider } from "@/hooks/use-now";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { AssistantLauncher } from "@/components/site/AssistantLauncher";
import { FavoriteAlerts } from "@/components/site/FavoriteAlerts";
import { startTimetableSync, startUpdatesSync } from "@/lib/cloud-sync";

function CloudSync() {
  useEffect(() => {
    const stopUpdates = startUpdatesSync();
    const stopTimetable = startTimetableSync();
    return () => {
      stopUpdates();
      stopTimetable();
    };
  }, []);
  return null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm font-semibold text-brand">ROOM 404</p>
        <h1 className="mt-2 text-5xl font-extrabold text-foreground">This room doesn’t exist</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you’re looking for isn’t on any floor. Try finding a free room instead.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            to="/find"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            Find a room
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const THEME_SCRIPT = `try{var s=JSON.parse(localStorage.getItem('unocc-state-v1')||'{}');if(s.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "UNOOCC — Smart Classroom & Lab Availability" },
      {
        name: "description",
        content:
          "See which classrooms and labs at Ramdeobaba University are free right now, and until when.",
      },
      { name: "author", content: "UNOOCC, Idea Lab Group 40" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0B2A4A" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <NowProvider>
          <CloudSync />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </main>
            <Footer />
          </div>
          <AssistantLauncher />
          <FavoriteAlerts />
          <Toaster position="top-center" richColors closeButton />
        </NowProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
