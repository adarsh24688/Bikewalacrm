"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/lib/hooks";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import {
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  CalendarClock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTeamMembers } from "@/lib/use-team-members";

type ViewTab = "today" | "upcoming" | "missed";

interface FollowUpLead {
  id: string;
  name: string;
  assignedTo?: string | null;
}

interface FollowUp {
  id: string;
  lead: FollowUpLead;
  type: "call" | "whatsapp" | "email" | "visit" | "meeting";
  scheduledAt: string;
  notes: string;
  status: "pending" | "completed" | "missed";
}

interface Counts {
  today: number;
  upcoming: number;
  missed: number;
}

const TYPE_CONFIG: Record<
  FollowUp["type"],
  { label: string; icon: typeof Phone; color: string }
> = {
  call: { label: "Call", icon: Phone, color: "bg-blue-100 text-blue-700" },
  whatsapp: {
    label: "WhatsApp",
    icon: MessageSquare,
    color: "bg-green-100 text-green-700",
  },
  email: { label: "Email", icon: Mail, color: "bg-purple-100 text-purple-700" },
  visit: { label: "Visit", icon: MapPin, color: "bg-orange-100 text-orange-700" },
  meeting: {
    label: "Meeting",
    icon: Users,
    color: "bg-indigo-100 text-indigo-700",
  },
};

function formatScheduledTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timeStr = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${dateStr} at ${timeStr}`;
}

function toDatetimeLocalValue(dateString: string): string {
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function FollowUpsPage() {
  const { fetch: apiFetch, isReady } = useApi();
  const { getMemberName } = useTeamMembers();
  const [activeTab, setActiveTab] = useState<ViewTab>("today");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [counts, setCounts] = useState<Counts>({ today: 0, upcoming: 0, missed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUp | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<FollowUp | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completeLoading, setCompleteLoading] = useState(false);
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      const data = await apiFetch<Counts>("/follow-ups/counts");
      setCounts(data);
    } catch {
      // Counts fetch failure is non-critical; keep previous counts
    }
  }, [apiFetch]);

  const fetchFollowUps = useCallback(
    async (view: ViewTab) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<FollowUp[]>(`/follow-ups?view=${view}`);
        setFollowUps(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setFollowUps([]);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    if (!isReady) return;
    fetchCounts();
  }, [fetchCounts, isReady]);

  useEffect(() => {
    if (!isReady) return;
    fetchFollowUps(activeTab);
  }, [activeTab, fetchFollowUps, isReady]);

  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
  };

  const openCompleteDialog = (followUp: FollowUp) => {
    setCompleteTarget(followUp);
    setCompletionNotes("");
    setCompleteDialogOpen(true);
  };

  const handleMarkComplete = async () => {
    if (!completeTarget) return;
    setCompleteLoading(true);
    try {
      const body: Record<string, string> = { status: "completed" };
      if (completionNotes.trim()) body.completionNotes = completionNotes.trim();
      await apiFetch<FollowUp>(`/follow-ups/${completeTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setCompleteDialogOpen(false);
      setCompleteTarget(null);
      setCompletionNotes("");
      setFollowUps((prev) => prev.filter((fu) => fu.id !== completeTarget.id));
      await fetchCounts();
    } catch {
      setError("Failed to mark follow-up as completed. Please try again.");
    } finally {
      setCompleteLoading(false);
    }
  };

  const openRescheduleDialog = (followUp: FollowUp) => {
    setRescheduleTarget(followUp);
    setRescheduleDate(toDatetimeLocalValue(followUp.scheduledAt));
    setRescheduleDialogOpen(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    setRescheduleLoading(true);
    try {
      await apiFetch<FollowUp>(`/follow-ups/${rescheduleTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ scheduledAt: new Date(rescheduleDate).toISOString() }),
      });
      setRescheduleDialogOpen(false);
      setRescheduleTarget(null);
      setRescheduleDate("");
      await Promise.all([fetchFollowUps(activeTab), fetchCounts()]);
    } catch {
      setError("Failed to reschedule follow-up. Please try again.");
    } finally {
      setRescheduleLoading(false);
    }
  };

  const tabs: { key: ViewTab; label: string; count: number }[] = [
    { key: "today", label: "Today", count: counts.today },
    { key: "upcoming", label: "Upcoming", count: counts.upcoming },
    { key: "missed", label: "Missed", count: counts.missed },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Follow-ups</h1>
        <p className="text-muted-foreground">
          Manage your scheduled follow-ups with leads
        </p>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            onClick={() => handleTabChange(tab.key)}
            className="gap-2"
          >
            {tab.label}
            <Badge
              variant={activeTab === tab.key ? "secondary" : "outline"}
              className="ml-1 min-w-[1.25rem] justify-center"
            >
              {tab.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && followUps.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              No {activeTab} follow-ups
            </p>
            <p className="text-sm text-muted-foreground/70">
              {activeTab === "today"
                ? "You're all caught up for today!"
                : activeTab === "upcoming"
                  ? "No upcoming follow-ups scheduled."
                  : "Great job! No missed follow-ups."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Follow-up cards */}
      {!loading && followUps.length > 0 && (
        <div className="space-y-3">
          {followUps.map((followUp) => {
            const typeConfig = TYPE_CONFIG[followUp.type] || TYPE_CONFIG.call;
            const TypeIcon = typeConfig.icon;
            const isMissed = activeTab === "missed" || followUp.status === "missed";

            return (
              <Card
                key={followUp.id}
                className={
                  isMissed
                    ? "border-l-4 border-l-red-500"
                    : ""
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <button
                          onClick={() => setDrawerLeadId(followUp.lead.id)}
                          className="hover:underline text-left"
                        >
                          {followUp.lead.name}
                        </button>
                        <span className="text-xs font-normal text-muted-foreground">
                          {getMemberName(followUp.lead.assignedTo)}
                        </span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeConfig.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatScheduledTime(followUp.scheduledAt)}
                        </span>
                        {followUp.status === "completed" && (
                          <Badge variant="secondary" className="text-xs">
                            Completed
                          </Badge>
                        )}
                        {isMissed && followUp.status !== "completed" && (
                          <Badge variant="destructive" className="text-xs">
                            Missed
                          </Badge>
                        )}
                      </CardDescription>
                    </div>

                    {followUp.status !== "completed" && (
                      <div className="flex shrink-0 gap-2 mt-2 sm:mt-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRescheduleDialog(followUp)}
                          className="gap-1 flex-1 sm:flex-none"
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Reschedule</span>
                          <span className="sm:hidden">Resched.</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openCompleteDialog(followUp)}
                          className="gap-1 flex-1 sm:flex-none"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {followUp.notes && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">{followUp.notes}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Reschedule dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Follow-up</DialogTitle>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Rescheduling{" "}
                <span className="font-medium text-foreground">
                  {TYPE_CONFIG[rescheduleTarget.type]?.label || rescheduleTarget.type}
                </span>{" "}
                follow-up for{" "}
                <span className="font-medium text-foreground">
                  {rescheduleTarget.lead.name}
                </span>
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="reschedule-datetime"
                  className="text-sm font-medium leading-none"
                >
                  New date and time
                </label>
                <Input
                  id="reschedule-datetime"
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleDialogOpen(false)}
              disabled={rescheduleLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduleLoading || !rescheduleDate}
            >
              {rescheduleLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete follow-up dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
          </DialogHeader>
          {completeTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Completing{" "}
                <span className="font-medium text-foreground">
                  {TYPE_CONFIG[completeTarget.type]?.label || completeTarget.type}
                </span>{" "}
                follow-up for{" "}
                <span className="font-medium text-foreground">
                  {completeTarget.lead.name}
                </span>
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="completion-notes"
                  className="text-sm font-medium leading-none"
                >
                  Completion notes (optional)
                </label>
                <textarea
                  id="completion-notes"
                  placeholder="What was the outcome?"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={completeLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkComplete}
              disabled={completeLoading}
            >
              {completeLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeadDetailDrawer
        leadId={drawerLeadId}
        open={drawerLeadId !== null}
        onOpenChange={(open) => { if (!open) setDrawerLeadId(null); }}
      />
    </div>
  );
}
