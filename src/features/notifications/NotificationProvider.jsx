import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NotificationContext } from "./NotificationContext";

const DEFAULT_DURATION = 5000;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const nextId = useRef(1);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) globalThis.clearTimeout(timer);
    timers.current.delete(id);
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }, []);

  const add = useCallback(
    (type, value, fallback, duration = DEFAULT_DURATION) => {
      const message =
        typeof value === "string"
          ? value
          : value?.message || fallback || "Something went wrong.";
      const id = nextId.current;
      nextId.current += 1;
      setNotifications((current) => [
        ...current.slice(-3),
        { id, type, message },
      ]);
      if (duration > 0) {
        timers.current.set(
          id,
          globalThis.setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) {
        globalThis.clearTimeout(timer);
      }
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(
    () => ({
      success: (message, duration) =>
        add("success", message, "Saved successfully.", duration),
      error: (error, fallback, duration) =>
        add("error", error, fallback, duration),
      dismiss,
    }),
    [add, dismiss],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div
        className="notification-stack"
        aria-label="Application notifications"
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification notification--${notification.type}`}
            role={notification.type === "error" ? "alert" : "status"}
          >
            <span>{notification.message}</span>
            <button
              type="button"
              className="notification__dismiss"
              aria-label="Dismiss notification"
              onClick={() => dismiss(notification.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
