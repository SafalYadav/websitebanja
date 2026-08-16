"use client";

import { createContext, useContext } from "react";

export interface WebsiteUIContextType {
  publicSlug?: string;
  onSwitchPage?: (pageIdOrSlug: string) => void;
}

export const WebsiteUIContext = createContext<WebsiteUIContextType>({});

export function useWebsiteUI() {
  return useContext(WebsiteUIContext);
}
