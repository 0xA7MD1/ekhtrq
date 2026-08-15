import { create } from "zustand";

/**
 * Global client UI state. Only holds the marketing-site mobile nav today;
 * app-level slices (active case, terminal session) get added alongside the
 * features that need them.
 */
type UiState = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
}));
