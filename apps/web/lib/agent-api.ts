/// Client for services/agent's HTTP surface. NEXT_PUBLIC_AGENT_API_URL
/// overrides the deployed default — set it for local development against
/// `uvicorn app.main:app --reload` (http://localhost:8000).

export const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_API_URL ?? "https://kreda.onrender.com";

export interface OrderSummary {
  id: string;
  placed_at: string;
  total_amount: number;
  fulfilled: boolean;
  has_delivery_scan: boolean;
}

export interface StoreOrdersResponse {
  store_id: string;
  domain: string;
  orders: OrderSummary[];
}

export async function fetchStoreOrders(storeId: string): Promise<StoreOrdersResponse> {
  const response = await fetch(`${AGENT_API_URL}/stores/${encodeURIComponent(storeId)}/orders`);
  if (!response.ok) {
    throw new Error(`fetchStoreOrders(${storeId}) failed: HTTP ${response.status}`);
  }
  return response.json();
}

/// Mirrors app/core/models.py's CheckResult / Decision / EvidencePayload —
/// the raw shapes the agent service actually returns, kept separate from
/// lib/dashboard/types.ts's UI-shaped equivalents so the mapping between
/// them (see lib/agent-api-map.ts) is explicit and in one place.
export interface ApiCheckResult {
  name: string;
  status: "PASS" | "FLAG" | "FAIL";
  value: number;
  detail: string;
  threshold: number;
}

export interface ApiDecision {
  receivable_id: string;
  seller_address: string;
  outcome: "approved" | "declined";
  grade: "A" | "B+" | "B" | "C" | "DECLINE";
  advance_rate_bps: number;
  confidence_bps: number;
  expected_settlement_days: number;
  reasoning: string;
  checks: ApiCheckResult[];
  face_value: number;
  fallback_used: boolean;
  prompt_hash: string;
  model: string;
  evidence_ref: string | null;
  tx_hash: string | null;
}

export interface ApiEvidencePayload {
  receivable_id: string;
  store_domain: string;
  ingestion_window_start: string;
  ingestion_window_end: string;
  order_count: number;
  fulfilled_order_count: number;
  checks: ApiCheckResult[];
  grade: string;
  advance_rate_bps: number;
  confidence_bps: number;
  expected_settlement_days: number;
  reasoning: string;
  outcome: "approved" | "declined";
  prompt_hash: string;
  model: string;
  committed_at: string;
}

export interface ApiSignedAttestation {
  receivable_id: string;
  seller: string;
  face_value: number;
  grade: number;
  advance_rate: number;
  expected_settlement: number;
  confidence: number;
  evidence_ref: string;
  agent: string;
  approved: boolean;
  signature: string;
  evidence_uri: string;
  commitment_method: string;
  tx_hash: string | null;
}

export interface DecisionWithEvidence {
  decision: ApiDecision;
  evidence: ApiEvidencePayload | null;
}

export async function fetchDecision(receivableId: string): Promise<DecisionWithEvidence | null> {
  const response = await fetch(`${AGENT_API_URL}/decisions/${encodeURIComponent(receivableId)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`fetchDecision(${receivableId}) failed: HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchEvidence(ref: string): Promise<ApiEvidencePayload | null> {
  const response = await fetch(`${AGENT_API_URL}/evidence/${encodeURIComponent(ref)}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`fetchEvidence(${ref}) failed: HTTP ${response.status}`);
  }
  return response.json();
}

/// SSE event union for POST /underwrite — see
/// services/agent/app/api/routes.py's _underwrite_stream.
export type UnderwriteEvent =
  | { event: "ingest.started"; data: { store_id: string } }
  | { event: "ingest.completed"; data: { order_count: number } }
  | { event: "check.completed"; data: ApiCheckResult }
  | { event: "decide.started"; data: Record<string, never> }
  | { event: "decide.completed"; data: { grade: string; outcome: string } }
  | { event: "commit.completed"; data: { evidence_ref: string | null; tx_hash: string | null } }
  | { event: "done"; data: { decision: ApiDecision; attestation: ApiSignedAttestation } }
  | { event: "error"; data: { message: string } };

/// POST /underwrite streams Server-Sent Events. Native EventSource can't
/// do POST with a body, so this parses the SSE wire format (`event: X` /
/// `data: Y` lines, frames separated by a blank line) directly off a
/// fetch() ReadableStream.
export async function* streamUnderwrite(request: {
  store_id: string;
  receivable_ids: string[];
  seller_address: string;
}): AsyncGenerator<UnderwriteEvent> {
  const response = await fetch(`${AGENT_API_URL}/underwrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok || !response.body) {
    throw new Error(`POST /underwrite failed: HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let frameEnd = buffer.indexOf("\n\n");
    while (frameEnd !== -1) {
      const frame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);

      let eventName = "";
      let dataLine = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) eventName = line.slice("event: ".length);
        else if (line.startsWith("data: ")) dataLine = line.slice("data: ".length);
      }
      if (eventName && dataLine) {
        yield { event: eventName, data: JSON.parse(dataLine) } as UnderwriteEvent;
      }

      frameEnd = buffer.indexOf("\n\n");
    }
  }
}
