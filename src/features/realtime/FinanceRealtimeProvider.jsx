import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { connectionLabel } from "./realtimeStatus";
import { FinanceRealtimeContext } from "./FinanceRealtimeContext";

const USER_TABLES = [
  "expenses",
  "financial_accounts",
  "income_entries",
  "recurring_transactions",
];
const LOAN_TABLES = ["loans", "rate_periods", "scheduled_payments", "payment_events"];

export function FinanceRealtimeProvider({ user, children }) {
  const [revision, setRevision] = useState(0);
  const [topologyRevision, setTopologyRevision] = useState(0);
  const [channelStatus, setChannelStatus] = useState("CLOSED");
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let channel;
    let subscribedBefore = false;

    async function subscribe() {
      const { data: accessibleLoans } = await supabase
        .from("loans")
        .select("id");
      if (!active) return;

      channel = supabase.channel(`finance:${user.id}:${topologyRevision}`);
      const invalidate = () => setRevision((value) => value + 1);
      const refreshTopology = () => {
        invalidate();
        setTopologyRevision((value) => value + 1);
      };

      for (const table of USER_TABLES) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `user_id=eq.${user.id}`,
          },
          invalidate,
        );
      }

      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loans",
          filter: `user_id=eq.${user.id}`,
        },
        refreshTopology,
      );

      if (user.email) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "loan_shares",
            filter: `invited_email=eq.${user.email.toLowerCase()}`,
          },
          refreshTopology,
        );
      }

      for (const { id } of accessibleLoans ?? []) {
        for (const table of LOAN_TABLES) {
          channel.on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table,
              filter: table === "loans" ? `id=eq.${id}` : `loan_id=eq.${id}`,
            },
            invalidate,
          );
        }
      }

      channel.subscribe((status) => {
        if (!active) return;
        setChannelStatus(status);
        if (status === "SUBSCRIBED") {
          if (subscribedBefore) invalidate();
          subscribedBefore = true;
        }
      });
    }

    subscribe();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, topologyRevision]);

  return (
    <FinanceRealtimeContext.Provider
      value={{
        revision,
        connectionState: connectionLabel(channelStatus, online),
      }}
    >
      {children}
    </FinanceRealtimeContext.Provider>
  );
}
