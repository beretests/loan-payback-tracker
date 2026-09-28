import { createContext, useContext } from "react";

export const NotificationContext = createContext({
  success: () => {},
  error: () => {},
  dismiss: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}
