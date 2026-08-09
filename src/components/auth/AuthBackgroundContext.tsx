"use client";

import { createContext, useContext } from "react";

const AuthBackgroundContext = createContext("/hero-london.png");

export function AuthBackgroundProvider({
  backgroundUrl,
  children,
}: {
  backgroundUrl: string;
  children: React.ReactNode;
}) {
  return (
    <AuthBackgroundContext.Provider value={backgroundUrl || "/hero-london.png"}>
      {children}
    </AuthBackgroundContext.Provider>
  );
}

export function useAuthBackground() {
  return useContext(AuthBackgroundContext);
}
