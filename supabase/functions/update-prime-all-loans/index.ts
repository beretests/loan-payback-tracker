import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Bank of Canada Valet: "Chartered bank interest rates" group (prime included)
const PRIME_GROUP_URL =
  "https://www.bankofcanada.ca/valet/observations/group/chartered_bank_interest/json";

// Prime rate series id in that group
const PRIME_SERIES_ID = "V80691311";

// Convert prime% -> decimal, then apply spread (e.g. -0.0025)
function primePctToLoanRateDecimal(primePct: number, spreadDecimal: number) {
  return primePct / 100 + spreadDecimal;
}

function parseLatestPrime(payload: any): { effective_date: string; primePct: number } | null {
  const obs = Array.isArray(payload?.observations) ? payload.observations : [];
  if (!obs.length) return null;

  const last = obs[obs.length - 1];
  const effective_date = last?.d ?? last?.date;
  const primeStr = last?.[PRIME_SERIES_ID];

  const primePct = primeStr != null ? Number(primeStr) : NaN;
  if (!effective_date || !Number.isFinite(primePct)) return null;

  return { effective_date, primePct };
}

Deno.serve(async (req) => {
  // Simple shared-secret auth (recommended for cron invocations)
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    return new Response("Missing CRON_SECRET env var", { status: 500 });
  }
  const provided = req.headers.get("x-cron-secret");
  if (provided !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response("Missing Supabase env vars", { status: 500 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // 1) Fetch latest prime
    const res = await fetch(PRIME_GROUP_URL, { headers: { "accept": "application/json" } });
    if (!res.ok) {
      return new Response(`BoC fetch failed: ${res.status}`, { status: 502 });
    }
    const payload = await res.json();
    const latest = parseLatestPrime(payload);
    if (!latest) {
      return new Response("Could not parse prime from BoC response", { status: 502 });
    }

    // 2) Load all loans
    // If you added loans.prime_spread, select it. Otherwise remove it and hardcode spread = -0.0025.
    const { data: loans, error: loansErr } = await admin
      .from("loans")
      .select("id, prime_spread");

    if (loansErr) throw loansErr;
    if (!loans?.length) {
      return Response.json({ ok: true, message: "No loans found", effective_date: latest.effective_date });
    }

    // 3) Build upsert rows for rate_periods
    const rows = loans.map((l: any) => {
      const spread = Number.isFinite(Number(l.prime_spread)) ? Number(l.prime_spread) : -0.0025;
      const annual_rate = primePctToLoanRateDecimal(latest.primePct, spread);

      return {
        loan_id: l.id,
        effective_date: latest.effective_date,
        annual_rate,
      };
    });

    // 4) Upsert (on conflict loan_id+effective_date)
    const { error: upsertErr } = await admin
      .from("rate_periods")
      .upsert(rows, { onConflict: "loan_id,effective_date" });

    if (upsertErr) throw upsertErr;

    return Response.json({
      ok: true,
      effective_date: latest.effective_date,
      primePct: latest.primePct,
      updatedLoans: rows.length,
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
});
