import { create } from "zustand";
import type { Project } from "@/types/project";
import { getProjects } from "@/lib/projects";

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  isInitialLoaded: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  setProjects: (projects: Project[]) => void;
  loadProjects: (forceRefresh?: boolean) => Promise<void>;
  addProject: (project: Project) => void;
  updateProjectInList: (id: string, updates: Partial<Project>) => void;
  removeProjectFromList: (id: string) => void;
  invalidate: () => void;
}

const CACHE_TTL_MS = 30000; // 30 seconds stale-while-revalidate window

let inFlightLoadPromise: Promise<void> | null = null;

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  isInitialLoaded: false,
  error: null,
  lastFetchedAt: null,

  setProjects: (projects) =>
    set({
      projects,
      isInitialLoaded: true,
      isLoading: false,
      error: null,
      lastFetchedAt: Date.now(),
    }),

  loadProjects: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const hasData = state.isInitialLoaded && state.projects.length > 0;
    const isFresh = state.lastFetchedAt && now - state.lastFetchedAt < CACHE_TTL_MS;

    // If data is already in cache and fresh, and not forced, return immediately
    if (hasData && isFresh && !forceRefresh) {
      return;
    }

    // Deduplicate concurrent in-flight requests
    if (inFlightLoadPromise) {
      return inFlightLoadPromise;
    }

    inFlightLoadPromise = (async () => {
      // If we don't have existing data, show loading state
      if (!hasData) {
        set({ isLoading: true, error: null });
      }

      try {
        const { data, error } = await getProjects();
        if (error) {
          // If we already had cached data, preserve it and record error
          set({
            error: error.message,
            isLoading: false,
          });
        } else {
          set({
            projects: data ?? [],
            isInitialLoaded: true,
            isLoading: false,
            error: null,
            lastFetchedAt: Date.now(),
          });
        }
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Failed to load projects",
          isLoading: false,
        });
      } finally {
        inFlightLoadPromise = null;
      }
    })();

    return inFlightLoadPromise;
  },

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects.filter((p) => p.id !== project.id)],
      isInitialLoaded: true,
      lastFetchedAt: Date.now(),
    })),

  updateProjectInList: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  removeProjectFromList: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    })),

  invalidate: () =>
    set({
      lastFetchedAt: null,
    }),
}));
