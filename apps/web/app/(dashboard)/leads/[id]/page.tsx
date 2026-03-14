"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GenerateAIButton } from "@/components/generate-ai-button";
import { useTeamMembers } from "@/lib/use-team-members";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  qualified: "bg-orange-100 text-orange-800 border-orange-200",
  proposal_sent: "bg-purple-100 text-purple-800 border-purple-200",
  negotiation: "bg-indigo-100 text-indigo-800 border-indigo-200",
  won: "bg-green-100 text-green-800 border-green-200",
  lost: "bg-red-100 text-red-800 border-red-200",
};

type TabKey = "overview" | "activity" | "notes" | "followups" | "quotations" | "whatsapp";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  source: string;
  priority: string;
  notes: string;
  nextFollowUp: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  company: string | null;
  value: number | null;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  performedBy: string;
  performedByName: string | null;
  metadata?: Record<string, unknown>;
}

interface FollowUp {
  id: string;
  scheduledAt: string;
  type: string;
  notes: string;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

interface FollowUpFormData {
  scheduledAt: string;
  type: string;
  notes: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): string {
  const found = STATUS_OPTIONS.find((s) => s.value === status);
  return found ? found.label : status;
}

function activityTypeIcon(type: string): string {
  switch (type) {
    case "call":
      return "phone";
    case "email":
      return "mail";
    case "meeting":
      return "users";
    case "note":
      return "file-text";
    case "status_change":
      return "refresh";
    case "follow_up":
      return "calendar";
    default:
      return "activity";
  }
}

function activityTypeLabel(type: string): string {
  switch (type) {
    case "call":
      return "Phone Call";
    case "email":
      return "Email";
    case "meeting":
      return "Meeting";
    case "note":
      return "Note";
    case "status_change":
      return "Status Changed";
    case "follow_up":
      return "Follow-up";
    case "created":
      return "Lead Created";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
  }
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "activity", label: "Activity" },
  { key: "notes", label: "Notes" },
  { key: "followups", label: "Follow-ups" },
  { key: "quotations", label: "Quotations" },
  { key: "whatsapp", label: "WhatsApp" },
];

const FOLLOW_UP_TYPES = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "visit", label: "Visit" },
  { value: "other", label: "Other" },
];

interface Quotation {
  id: string;
  quoteNumber: string;
  status: string;
  total: number;
  createdAt: string;
  validUntil: string | null;
}

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  revised: "bg-yellow-100 text-yellow-800",
  expired: "bg-orange-100 text-orange-800",
};

interface WaMessage {
  id: string;
  direction: string;
  body: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  status: string;
  timestamp: string;
}

function WhatsAppTab({ leadId, leadName, leadPhone }: { leadId: string; leadName: string; leadPhone: string }) {
  const router = useRouter();
  const { fetch: apiFetch, isReady } = useApi();
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    apiFetch<{ conversation: { id: string } | null; messages: WaMessage[] }>(`/inbox/by-lead/${leadId}`)
      .then((data) => {
        setMessages(data.messages || []);
        setConversationId(data.conversation?.id || null);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [isReady, apiFetch, leadId]);

  const statusTicks: Record<string, string> = {
    pending: "\u23F3",
    sent: "\u2713",
    delivered: "\u2713\u2713",
    read: "\u2713\u2713",
    failed: "\u2717",
  };

  if (!leadPhone) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-sm text-muted-foreground text-center">
            No phone number available for this lead. Add a phone number to enable WhatsApp messaging.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col" style={{ height: "calc(100vh - 20rem)" }}>
      <CardHeader className="pb-3 flex-shrink-0 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">WhatsApp</CardTitle>
          <CardDescription>Conversation with {leadName}</CardDescription>
        </div>
        {conversationId && (
          <Button
            size="sm"
            onClick={() => router.push(`/inbox?conversation=${conversationId}`)}
          >
            Open in Inbox
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden px-4 pb-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">No WhatsApp messages yet.</p>
            <Button
              onClick={() => {
                if (conversationId) {
                  router.push(`/inbox?conversation=${conversationId}`);
                } else {
                  router.push(`/inbox`);
                }
              }}
            >
              Send Message via Inbox
            </Button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.direction === "outbound"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.body ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    ) : msg.mediaType && msg.mediaType !== "text" ? (
                      <p className="text-sm italic opacity-70">
                        {msg.mediaType === "image" ? "Photo" :
                         msg.mediaType === "audio" ? "Audio message" :
                         msg.mediaType === "video" ? "Video" :
                         msg.mediaType === "document" ? "Document" :
                         msg.mediaType}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.direction === "outbound" && (
                        <span className={`text-xs ${msg.status === "read" ? "text-blue-400" : "opacity-70"}`}>
                          {statusTicks[msg.status] || ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Send message button */}
            <div className="flex-shrink-0 border-t pt-3">
              <Button
                className="w-full"
                onClick={() => {
                  if (conversationId) {
                    router.push(`/inbox?conversation=${conversationId}`);
                  } else {
                    router.push(`/inbox`);
                  }
                }}
              >
                Send Message
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function QuotationsTab({ leadId, leadName }: { leadId: string; leadName: string }) {
  const { fetch: apiFetch, isReady } = useApi();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    apiFetch<{ data: Quotation[] }>(`/quotations?leadId=${leadId}`)
      .then((res) => setQuotations(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load quotations"))
      .finally(() => setLoading(false));
  }, [leadId, apiFetch, isReady]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">Quotations</CardTitle>
          <CardDescription>Quotations for {leadName}</CardDescription>
        </div>
        <Button size="sm" asChild>
          <Link href={`/quotations/new?leadId=${leadId}`}>New Quote</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading quotations...</p>
        ) : quotations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No quotations yet. Click &quot;New Quote&quot; to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {quotations.map((q) => (
              <Link
                key={q.id}
                href={`/quotations/${q.id}`}
                className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{q.quoteNumber}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(q.createdAt)}
                      {q.validUntil && ` · Valid until ${formatDate(q.validUntil)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">
                      ₹{Number(q.total).toLocaleString("en-IN")}
                    </span>
                    <Badge className={QUOTE_STATUS_COLORS[q.status] || "bg-gray-100 text-gray-800"}>
                      {q.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetch: apiFetch, isReady } = useApi();
  const leadId = params.id as string;

  const { data: session } = useSession();
  const { members, getMemberName } = useTeamMembers();
  const userRole = (session?.user as any)?.role as string | undefined;
  const canAssign = userRole === "super_admin" || userRole === "manager";

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [followUpsError, setFollowUpsError] = useState<string | null>(null);

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(
    null
  );

  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState<FollowUpFormData>({
    scheduledAt: "",
    type: "call",
    notes: "",
  });
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpFormError, setFollowUpFormError] = useState<string | null>(
    null
  );

  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Lead>(`/leads/${leadId}`);
      setLead(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lead");
    } finally {
      setLoading(false);
    }
  }, [leadId, apiFetch]);

  const fetchActivities = useCallback(async () => {
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const data = await apiFetch<Activity[]>(`/leads/${leadId}/activities`);
      setActivities(data);
    } catch (err) {
      setActivitiesError(
        err instanceof Error ? err.message : "Failed to fetch activities"
      );
    } finally {
      setActivitiesLoading(false);
    }
  }, [leadId, apiFetch]);

  const fetchFollowUps = useCallback(async () => {
    setFollowUpsLoading(true);
    setFollowUpsError(null);
    try {
      const data = await apiFetch<FollowUp[]>(`/leads/${leadId}/follow-ups`);
      setFollowUps(data);
    } catch (err) {
      setFollowUpsError(
        err instanceof Error ? err.message : "Failed to fetch follow-ups"
      );
    } finally {
      setFollowUpsLoading(false);
    }
  }, [leadId, apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchLead();
  }, [fetchLead, isReady]);

  useEffect(() => {
    if (!isReady) return;
    if (activeTab === "activity" || activeTab === "notes") {
      fetchActivities();
    } else if (activeTab === "followups") {
      fetchFollowUps();
    }
  }, [activeTab, fetchActivities, fetchFollowUps, isReady]);

  async function handleStatusChange(newStatus: string) {
    if (!lead || newStatus === lead.status) return;
    setStatusUpdating(true);
    setStatusUpdateError(null);
    try {
      const updated = await apiFetch<Lead>(`/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setLead(updated);
    } catch (err) {
      setStatusUpdateError(
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleAssignChange(userId: string) {
    if (!lead) return;
    setAssigning(true);
    try {
      const updated = await apiFetch<Lead>(`/leads/${leadId}/assign`, {
        method: "POST",
        body: JSON.stringify({ userId: userId || null }),
      });
      setLead(updated);
    } catch {
      // silently fail
    } finally {
      setAssigning(false);
    }
  }

  function handleOpenFollowUpDialog() {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setFollowUpForm({
      scheduledAt: localISO,
      type: "call",
      notes: "",
    });
    setFollowUpFormError(null);
    setFollowUpDialogOpen(true);
  }

  async function handleFollowUpSubmit() {
    setFollowUpFormError(null);

    if (!followUpForm.scheduledAt) {
      setFollowUpFormError("Scheduled date and time is required");
      return;
    }

    setFollowUpSubmitting(true);
    try {
      await apiFetch(`/leads/${leadId}/follow-ups`, {
        method: "POST",
        body: JSON.stringify({
          scheduledAt: new Date(followUpForm.scheduledAt).toISOString(),
          type: followUpForm.type,
          notes: followUpForm.notes,
        }),
      });
      setFollowUpDialogOpen(false);
      fetchFollowUps();
      fetchLead();
    } catch (err) {
      setFollowUpFormError(
        err instanceof Error ? err.message : "Failed to create follow-up"
      );
    } finally {
      setFollowUpSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push("/leads")}
            className="hover:text-foreground transition-colors"
          >
            Leads
          </button>
          <span>/</span>
          <span>Loading...</span>
        </div>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push("/leads")}
            className="hover:text-foreground transition-colors"
          >
            Leads
          </button>
          <span>/</span>
          <span>Error</span>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            {error || "Lead not found"}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/leads")}>
          Back to Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.push("/leads")}
          className="hover:text-foreground transition-colors"
        >
          Leads
        </button>
        <span>/</span>
        <span className="text-foreground">{lead.name}</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{lead.name}</h1>
            <Badge
              className={
                STATUS_COLORS[lead.status] ||
                "bg-gray-100 text-gray-800 border-gray-200"
              }
            >
              {statusLabel(lead.status)}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {lead.phone && <span>{lead.phone}</span>}
            {lead.email && (
              <>
                <span className="hidden sm:inline">|</span>
                <span>{lead.email}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lead.phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${lead.phone}`}>Call</a>
            </Button>
          )}
          <Button size="sm" onClick={handleOpenFollowUpDialog}>
            Schedule Follow-up
          </Button>
        </div>
      </div>

      <div className="border-b overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Lead Details Card */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-x-12 gap-y-4 sm:grid-cols-2">
                  {/* Contact Column */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Contact</p>
                    <dl className="space-y-2.5">
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Phone</dt>
                        <dd className="text-sm font-medium tabular-nums">{lead.phone || "-"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Email</dt>
                        <dd className="text-sm font-medium">{lead.email || "-"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Company</dt>
                        <dd className="text-sm font-medium">{lead.company || "-"}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Business Column */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">Details</p>
                    <dl className="space-y-2.5">
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Source</dt>
                        <dd className="text-sm font-medium capitalize">{lead.source?.replace(/_/g, " ") || "-"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Priority</dt>
                        <dd className="text-sm">
                          <span className={
                            lead.priority === "high"
                              ? "text-red-600 font-medium"
                              : lead.priority === "medium"
                              ? "text-amber-600 font-medium"
                              : "text-muted-foreground"
                          }>
                            {lead.priority ? lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1) : "-"}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Value</dt>
                        <dd className="text-sm font-medium">{lead.value != null ? `Rs. ${lead.value.toLocaleString("en-IN")}` : "-"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Status + Assigned - full width row */}
                <div className="mt-5 pt-5 border-t grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Status</label>
                    {statusUpdateError && (
                      <Alert variant="destructive" className="mb-2">
                        <AlertDescription>{statusUpdateError}</AlertDescription>
                      </Alert>
                    )}
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusUpdating}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Assigned To</label>
                    {canAssign ? (
                      <select
                        value={lead.assignedTo || ""}
                        onChange={(e) => handleAssignChange(e.target.value)}
                        disabled={assigning}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-medium h-9 flex items-center">{getMemberName(lead.assignedTo)}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline + Notes Row */}
            <div className={`grid gap-6 ${lead.notes ? "md:grid-cols-2" : ""}`}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2.5">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Created</dt>
                      <dd className="text-sm font-medium">{formatDateTime(lead.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Last Updated</dt>
                      <dd className="text-sm font-medium">{formatDateTime(lead.updatedAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Next Follow-up</dt>
                      <dd className="text-sm font-medium">{formatDateTime(lead.nextFollowUp)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {lead.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
              <CardDescription>
                A chronological record of all interactions and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{activitiesError}</AlertDescription>
                </Alert>
              )}

              {activitiesLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Loading activities...
                </p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No activities recorded yet.
                </p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-6">
                    {activities.map((activity) => (
                      <div key={activity.id} className="relative pl-10">
                        <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-background bg-muted-foreground" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {activityTypeLabel(activity.type)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(activity.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {activity.description}
                          </p>
                          {activity.performedByName && (
                            <p className="text-xs text-muted-foreground">
                              by {activity.performedByName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "notes" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
              <CardDescription>
                Add and view notes for this lead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <textarea
                    placeholder="Add a note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={addingNote || !noteText.trim()}
                      onClick={async () => {
                        setAddingNote(true);
                        try {
                          const created = await apiFetch<Activity>(
                            `/leads/${leadId}/notes`,
                            {
                              method: "POST",
                              body: JSON.stringify({ text: noteText.trim() }),
                            }
                          );
                          setActivities((prev) => [created, ...prev]);
                          setNoteText("");
                        } catch {
                          // silently fail
                        } finally {
                          setAddingNote(false);
                        }
                      }}
                    >
                      {addingNote ? "Adding..." : "Add Note"}
                    </Button>
                  </div>
                </div>

                {activitiesLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Loading notes...
                  </p>
                ) : (
                  (() => {
                    const notes = activities.filter((a) => a.type === "note");
                    return notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No notes yet. Add one above.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((note) => (
                          <div
                            key={note.id}
                            className="rounded-lg border p-4 space-y-1"
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {note.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {note.performedByName && (
                                <span>{note.performedByName}</span>
                              )}
                              <span>{formatDateTime(note.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "followups" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg">Follow-ups</CardTitle>
                <CardDescription>
                  Scheduled and completed follow-up activities
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleOpenFollowUpDialog}>
                Schedule Follow-up
              </Button>
            </CardHeader>
            <CardContent>
              {followUpsError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{followUpsError}</AlertDescription>
                </Alert>
              )}

              {followUpsLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Loading follow-ups...
                </p>
              ) : followUps.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No follow-ups scheduled. Click &quot;Schedule Follow-up&quot;
                  to create one.
                </p>
              ) : (
                <div className="space-y-3">
                  {followUps.map((fu) => {
                    const isOverdue =
                      fu.status !== "completed" &&
                      new Date(fu.scheduledAt) < new Date();
                    const isCompleted = fu.status === "completed";

                    return (
                      <div
                        key={fu.id}
                        className={`rounded-lg border p-4 ${
                          isCompleted
                            ? "bg-muted/30 opacity-75"
                            : isOverdue
                            ? "border-red-200 bg-red-50"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium capitalize">
                                {fu.type}
                              </span>
                              {isCompleted && (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  Completed
                                </Badge>
                              )}
                              {isOverdue && !isCompleted && (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  Overdue
                                </Badge>
                              )}
                              {!isCompleted && !isOverdue && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  Scheduled
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Scheduled: {formatDateTime(fu.scheduledAt)}
                            </p>
                            {fu.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {fu.notes}
                              </p>
                            )}
                            {fu.completedAt && (
                              <p className="text-xs text-muted-foreground">
                                Completed: {formatDateTime(fu.completedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "quotations" && (
          <QuotationsTab leadId={leadId} leadName={lead.name} />
        )}

        {activeTab === "whatsapp" && (
          <WhatsAppTab leadId={leadId} leadName={lead.name} leadPhone={lead.phone} />
        )}
      </div>

      <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>
              Set a reminder to follow up with {lead.name}.
            </DialogDescription>
          </DialogHeader>

          {followUpFormError && (
            <Alert variant="destructive">
              <AlertDescription>{followUpFormError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label
                htmlFor="followup-datetime"
                className="text-sm font-medium"
              >
                Date & Time <span className="text-red-500">*</span>
              </label>
              <Input
                id="followup-datetime"
                type="datetime-local"
                value={followUpForm.scheduledAt}
                onChange={(e) =>
                  setFollowUpForm((prev) => ({
                    ...prev,
                    scheduledAt: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="followup-type" className="text-sm font-medium">
                Type
              </label>
              <select
                id="followup-type"
                value={followUpForm.type}
                onChange={(e) =>
                  setFollowUpForm((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {FOLLOW_UP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="followup-notes" className="text-sm font-medium">
                  Notes
                </label>
                <GenerateAIButton
                  leadId={leadId}
                  actionType={followUpForm.type}
                  onGenerated={(msg) =>
                    setFollowUpForm((prev) => ({ ...prev, notes: msg }))
                  }
                />
              </div>
              <textarea
                id="followup-notes"
                placeholder="What to discuss or follow up on..."
                value={followUpForm.notes}
                onChange={(e) =>
                  setFollowUpForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFollowUpDialogOpen(false)}
              disabled={followUpSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleFollowUpSubmit} disabled={followUpSubmitting}>
              {followUpSubmitting ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
