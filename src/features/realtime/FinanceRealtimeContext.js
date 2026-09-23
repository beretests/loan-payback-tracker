import { createContext, useContext } from "react";

export const FinanceRealtimeContext = createContext({
  revision: 0,
  connectionState: "Reconnecting",
});

export function useFinanceRealtime() {
  return useContext(FinanceRealtimeContext);
}
