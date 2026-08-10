"use client";

import { createContext, useContext } from "react";

const AuthBackgroundContext = createContext("/hero-home.jpg");

export function AuthBackgroundProvider({
  backgroundUrl,
  children,
}: {
  backgroundUrl: string;
  children: React.ReactNode;
}) {
  return (
    <AuthBackgroundContext.Provider value={backgroundUrl || "/hero-home.jpg"}>
      {children}
    </AuthBackgroundContext.Provider>
  );
}

export function useAuthBackground() {
  return useContext(AuthBackgroundContext);
}
