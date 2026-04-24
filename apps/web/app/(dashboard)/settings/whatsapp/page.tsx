"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { useApi } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BAILEYS_URL =
  process.env.NEXT_PUBLIC_BAILEYS_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:4001" : "");

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface WhatsAppStatus {
  status: ConnectionStatus;
  phoneNumber?: string;
  connectedAt?: string;
}

export default function WhatsAppSettingsPage() {
  const { fetch: apiFetch, isReady } = useApi();

  // DB-persisted status (fetched once on mount)
  const [dbStatus, setDbStatus] = useState<WhatsAppStatus>({
    status: "disconnected",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real-time state driven by Socket.io only
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [waitingForQr, setWaitingForQr] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  // Local override: once user interacts or socket sends status, this takes over
  const [liveStatus, setLiveStatus] = useState<WhatsAppStatus | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // The effective status: live (from Socket.io) takes priority, then DB
  // DB "connecting" is always stale — treat it as "disconnected"
  const status: WhatsAppStatus = liveStatus ?? {
    ...dbStatus,
    status: dbStatus.status === "connecting" ? "disconnected" : dbStatus.status,
  };

  // Fetch persisted status from API
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<WhatsAppStatus>("/whatsapp/status");
      setDbStatus(data);
    } catch (err) {
      setDbStatus({ status: "disconnected" });
      setError(
        err instanceof Error ? err.message : "Failed to fetch WhatsApp status"
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchStatus();
  }, [fetchStatus, isReady]);

  // Socket.io connection to Baileys service
  useEffect(() => {
    if (!BAILEYS_URL) {
      setSocketConnected(false);
      setError("NEXT_PUBLIC_BAILEYS_URL is not configured.");
      return;
    }

    const socket = io(BAILEYS_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("wa:qr", ({ qr }: { qr: string }) => {
      setQrCode(qr);
      setWaitingForQr(false);
      setLiveStatus((prev) => ({
        ...prev,
        status: "connecting",
      }));
    });

    socket.on(
      "wa:status",
      ({
        status: newStatus,
        phoneNumber,
      }: {
        status: string;
        phoneNumber?: string;
      }) => {
        if (newStatus === "connected") {
          setQrCode(null);
          setWaitingForQr(false);
          setLiveStatus({
            status: "connected",
            phoneNumber,
            connectedAt: new Date().toISOString(),
          });
          showSuccess("WhatsApp connected successfully!");
        } else if (newStatus === "disconnected") {
          setQrCode(null);
          setWaitingForQr(false);
          setLiveStatus({ status: "disconnected" });
        } else if (newStatus === "connecting") {
          setLiveStatus((prev) => ({
            ...prev,
            status: "connecting",
          }));
        }
      }
    );

    socket.on("connect_error", () => {
      setSocketConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleConnect = () => {
    if (!socketRef.current?.connected) {
      setError(
        "Cannot reach WhatsApp service. Make sure the Baileys service is running."
      );
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setWaitingForQr(true);
    setQrCode(null);
    setLiveStatus({ status: "connecting" });
    socketRef.current.emit("wa:connect");
  };

  const handleDisconnect = () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp?")) return;

    setError(null);
    setSuccessMessage(null);
    if (socketRef.current?.connected) {
      socketRef.current.emit("wa:disconnect");
    }
    // Optimistically update — Baileys will also update DB via connection.close
    setQrCode(null);
    setWaitingForQr(false);
    setLiveStatus({ status: "disconnected" });
    showSuccess("WhatsApp disconnected successfully");
  };

  const getStatusDot = () => {
    switch (status.status) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500 animate-pulse";
      case "disconnected":
        return "bg-red-500";
    }
  };

  const getStatusLabel = () => {
    switch (status.status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting";
      case "disconnected":
        return "Disconnected";
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show QR section only when user has actively triggered connection
  const showQrSection = waitingForQr || qrCode !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          WhatsApp Connection
        </h1>
        <p className="text-muted-foreground">
          Manage your WhatsApp integration for sending messages and
          notifications
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {!socketConnected && !loading && (
        <Alert>
          <AlertDescription>
            WhatsApp service is not reachable. Make sure the Baileys service is
            running on {BAILEYS_URL}.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>
            Current status of the WhatsApp Business API connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                Checking connection status...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className={`h-4 w-4 rounded-full ${getStatusDot()}`} />
                <div className="flex-1">
                  <p className="text-lg font-semibold">{getStatusLabel()}</p>
                  {status.status === "connected" && status.phoneNumber && (
                    <p className="text-sm text-muted-foreground">
                      Phone: {status.phoneNumber}
                    </p>
                  )}
                  {status.status === "connected" && status.connectedAt && (
                    <p className="text-sm text-muted-foreground">
                      Connected since: {formatDate(status.connectedAt)}
                    </p>
                  )}
                  {status.status === "disconnected" && (
                    <p className="text-sm text-muted-foreground">
                      WhatsApp is not connected. Click Connect to start the
                      pairing process.
                    </p>
                  )}
                  {status.status === "connecting" && (
                    <p className="text-sm text-muted-foreground">
                      Scan the QR code below with your WhatsApp mobile app.
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    status.status === "connected"
                      ? "default"
                      : status.status === "connecting"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {getStatusLabel()}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                {status.status === "disconnected" && (
                  <Button onClick={handleConnect} disabled={!socketConnected}>
                    Connect
                  </Button>
                )}
                {status.status === "connecting" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQrCode(null);
                      setWaitingForQr(false);
                      setLiveStatus({ status: "disconnected" });
                    }}
                  >
                    Cancel
                  </Button>
                )}
                {status.status === "connected" && (
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setLiveStatus(null);
                    fetchStatus();
                  }}
                  disabled={loading}
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showQrSection && (
        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>
              Scan this QR code with your WhatsApp mobile app to connect
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-12">
              {waitingForQr && !qrCode && (
                <>
                  <div className="mb-4 flex h-48 w-48 items-center justify-center rounded-lg bg-muted">
                    <svg
                      className="h-10 w-10 animate-spin text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Waiting for QR code from WhatsApp...
                  </p>
                </>
              )}
              {qrCode && (
                <>
                  <div className="rounded-lg bg-white p-4">
                    <QRCodeSVG value={qrCode} size={256} />
                  </div>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Open WhatsApp on your phone, go to Settings &gt; Linked
                    Devices &gt; Link a Device, and scan this code.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>About WhatsApp Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              The WhatsApp integration uses the Baileys library to connect to
              WhatsApp Web. Once connected, you can:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Send follow-up reminders to leads via WhatsApp</li>
              <li>Receive and view incoming messages in the CRM inbox</li>
              <li>Send automated daily reports to configured recipients</li>
              <li>Share quotation PDFs directly through WhatsApp</li>
            </ul>
            <p>
              Note: This integration requires the WhatsApp service (Baileys) to
              be running on the backend server.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
