import { create } from 'zustand';

type AddedMarket = {
  key: string;
  label: string;
  details: { label: string; value: string }[];
};

type MarketStore = {
  addedKeys: Record<string, boolean>;
  addedMarkets: AddedMarket[];
  setAddedKeys: (keys: string[]) => void;
  setAddedMarkets: (markets: AddedMarket[]) => void;
  setAdded: (key: string) => void;
  setRemoved: (key: string) => void;
  addMarketEntry: (market: AddedMarket) => void;
  removeMarketEntry: (key: string) => void;
};

export const useMarketStore = create<MarketStore>((set) => ({
  addedKeys: {},
  addedMarkets: [],
  setAddedKeys: (keys) =>
    set(() => {
      const map: Record<string, boolean> = {};
      for (const k of keys) map[k] = true;
      return { addedKeys: map };
    }),
  setAddedMarkets: (markets) => set({ addedMarkets: markets }),
  setAdded: (key) =>
    set((state) => ({ addedKeys: { ...state.addedKeys, [key]: true } })),
  setRemoved: (key) =>
    set((state) => {
      const next = { ...state.addedKeys };
      delete next[key];
      return { addedKeys: next };
    }),
  addMarketEntry: (market) =>
    set((state) => ({
      addedMarkets: [...state.addedMarkets, market],
      addedKeys: { ...state.addedKeys, [market.key]: true },
    })),
  removeMarketEntry: (key) =>
    set((state) => {
      const next = { ...state.addedKeys };
      delete next[key];
      return {
        addedMarkets: state.addedMarkets.filter((m) => m.key !== key),
        addedKeys: next,
      };
    }),
}));
