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

function applyDom(branding: BrandingSettings) {
  if (typeof document === "undefined") return;
  const vars = brandingToCssVars(branding);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/public/branding", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.branding) {
        setBranding(data.branding);
      }
    } catch {
      /* keep current */
    }
  }, []);

  useEffect(() => {
    applyDom(branding);
  }, [branding]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ branding, refresh }), [branding, refresh]);
  const inline = cssVarsToInlineStyle(brandingToCssVars(branding));

  return (
    <BrandingContext.Provider value={value}>
      <style
        id="hih-branding-ssr"
        dangerouslySetInnerHTML={{
          __html: `html{${inline}}`,
        }}
      />
      {children}
    </BrandingContext.Provider>
  );
}
