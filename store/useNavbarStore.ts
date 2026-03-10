import { create } from 'zustand';

export type NavbarButton = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
};

type NavbarStore = {
  buttons: NavbarButton[];
  statusText: string | null;
  statusIcon: React.ReactNode | null;
  setButtons: (buttons: NavbarButton[]) => void;
  addButton: (button: NavbarButton) => void;
  removeButton: (id: string) => void;
  clearButtons: () => void;
  setStatus: (text: string | null, icon?: React.ReactNode) => void;
  clearStatus: () => void;
};

export const useNavbarStore = create<NavbarStore>((set) => ({
  buttons: [],
  statusText: null,
  statusIcon: null,

  setButtons: (buttons) => set({ buttons }),
  addButton: (button) => set((state) => ({ buttons: [...state.buttons, button] })),
  removeButton: (id) => set((state) => ({ buttons: state.buttons.filter((b) => b.id !== id) })),
  clearButtons: () => set({ buttons: [] }),
  setStatus: (text, icon) => set({ statusText: text, statusIcon: icon || null }),
  clearStatus: () => set({ statusText: null, statusIcon: null }),
}));
