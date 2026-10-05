"use client";

import { createContext, useContext } from "react";

export interface WebsiteUIContextType {
  publicSlug?: string;
  onSwitchPage?: (pageIdOrSlug: string) => void;
  isPublic?: boolean;
  sectionOrder?: string[];
}

export const WebsiteUIContext = createContext<WebsiteUIContextType>({});

export function useWebsiteUI() {
  return useContext(WebsiteUIContext);
}
