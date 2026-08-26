"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  brandingDarkSemanticVars,
  brandingLightSemanticVars,
  brandingToCssVars,
  cssVarsToInlineStyle,
  googleFontsHref,
} from "@/lib/branding-theme";
import {
  DEFAULT_BRANDING,
  type BrandingSettings,
} from "@/lib/branding-defaults";

type Ctx = {
  branding: BrandingSettings;
  refresh: () => Promise<void>;
};

const BrandingContext = createContext<Ctx>({
  branding: DEFAULT_BRANDING,
  refresh: async () => undefined,
});

export function useBranding() {
  return useContext(BrandingContext);
}

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyDom(branding: BrandingSettings, theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const brandVars = brandingToCssVars(branding);
  const semanticVars =
    theme === "dark"
      ? brandingDarkSemanticVars(branding)
      : brandingLightSemanticVars(branding);

  for (const [k, v] of Object.entries({ ...brandVars, ...semanticVars })) {
    root.style.setProperty(k, v);
  }

  const href = googleFontsHref(branding);
  let link = document.getElementById("hih-brand-fonts") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = "hih-brand-fonts";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) {
    link.setAttribute("href", href);
  }
}

export function BrandingProvider({
  initial,
  children,
}: {
  initial: BrandingSettings;
  children: ReactNode;
}) {
  const [branding, setBranding] = useState<BrandingSettings>(initial);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/public/branding");
      const data = await res.json();
      if (res.ok && data.branding) {
        setBranding(data.branding);
      }
    } catch {
      /* keep current */
    }
  }, []);

  useEffect(() => {
    setTheme(readTheme());
    const onTheme = (e: Event) => {
      const detail = (e as CustomEvent<"light" | "dark">).detail;
      if (detail === "light" || detail === "dark") setTheme(detail);
    };
    window.addEventListener("hih-theme-change", onTheme);
    return () => window.removeEventListener("hih-theme-change", onTheme);
  }, []);

  useEffect(() => {
    applyDom(branding, theme);
  }, [branding, theme]);

  // Refresh branding in the background after first paint — avoids blocking navigation
  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 100);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const value = useMemo(() => ({ branding, refresh }), [branding, refresh]);
  const brandOnly = cssVarsToInlineStyle(brandingToCssVars(branding));

  return (
    <BrandingContext.Provider value={value}>
      <style
        id="hih-branding-ssr"
        dangerouslySetInnerHTML={{
          __html: `html{${brandOnly}}`,
        }}
      />
      {children}
    </BrandingContext.Provider>
  );
}
