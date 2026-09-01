"use client";

import { useEffect, useRef, useState } from "react";
import { publicEnv } from "../env.js";

/**
 * WebSocket presence: who else is looking at this document right now.
 *
 * WS (not SSE) because presence is genuinely bidirectional — the client sends
 * heartbeats and a `focus`/`blur` signal, the server broadcasts the roster
 * (ADR-0001). Auth is a short-lived ticket minted by a server route, not the
 * session cookie, since the WS gateway is a different origin.
 */
export type PresentUser = { userId: string; displayName: string; lastSeen: number };

export function usePresence(documentId: string) {
  const [peers, setPeers] = useState<PresentUser[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    async function connect(): Promise<void> {
      if (closed) return;
      const ticketRes = await fetch(`/api/documents/${documentId}/presence-ticket`, { method: "POST" });
      if (!ticketRes.ok) {
        scheduleReconnect();
        return;
      }
      const { ticket } = (await ticketRes.json()) as { ticket: string };

      const ws = new WebSocket(`${publicEnv.NEXT_PUBLIC_PRESENCE_WS_URL}?doc=${documentId}&ticket=${ticket}`);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
        ws.send(JSON.stringify({ type: "focus" }));
        heartbeat = setInterval(() => ws.send(JSON.stringify({ type: "ping" })), 15_000);
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data as string) as { type: string; roster?: PresentUser[] };
        if (msg.type === "roster" && msg.roster) setPeers(msg.roster);
      };
      ws.onclose = () => {
        setConnected(false);
        if (heartbeat) clearInterval(heartbeat);
        scheduleReconnect();
      };
      ws.onerror = () => ws.close();
    }

    function scheduleReconnect(): void {
      if (closed) return;
      attempt++;
      const delay = Math.min(15_000, 2 ** attempt * 500);
      reconnectTimer = setTimeout(() => void connect(), delay + Math.random() * 500);
    }

    void connect();

    return () => {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [documentId]);

  return { peers, connected };
}
