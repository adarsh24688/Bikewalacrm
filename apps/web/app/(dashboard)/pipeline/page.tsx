"use client";

import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/hooks";
import { LeadDetailDrawer } from "@/components/lead-detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTeamMembers } from "@/lib/use-team-members";

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdAt: string;
}

const COLUMNS = [
  { key: "new", label: "New", color: "bg-blue-500" },
  { key: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { key: "qualified", label: "Qualified", color: "bg-orange-500" },
  { key: "proposal_sent", label: "Proposal Sent", color: "bg-purple-500" },
  { key: "negotiation", label: "Negotiation", color: "bg-indigo-500" },
  { key: "won", label: "Won", color: "bg-green-500" },
  { key: "lost", label: "Lost", color: "bg-red-500" },
];

export default function PipelinePage() {
  const { fetch: apiFetch, isReady } = useApi();
  const { getMemberName } = useTeamMembers();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [lostReasonDialog, setLostReasonDialog] = useState(false);
  const [wonDialog, setWonDialog] = useState(false);
  const [pendingLead, setPendingLead] = useState<Lead | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [wonAmount, setWonAmount] = useState("");
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState("new");

  const fetchLeads = useCallback(async () => {
    try {
      const data = await apiFetch<{ data: Lead[] }>("/leads?pageSize=500");
      setLeads(data.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchLeads();
  }, [fetchLeads, isReady]);

  const moveLeadToStatus = async (lead: Lead, newStatus: string) => {
    if (newStatus === "lost") {
      setPendingLead(lead);
      setLostReasonDialog(true);
      return;
    }
    if (newStatus === "won") {
      setPendingLead(lead);
      setWonDialog(true);
      return;
    }

    try {
      await apiFetch(`/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: newStatus } : l))
      );
    } catch {
      // silently fail
    }
  };

  const confirmLost = async () => {
    if (!pendingLead) return;
    try {
      await apiFetch(`/leads/${pendingLead.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "lost",
          notes: `Lost reason: ${lostReason}`,
        }),
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === pendingLead.id ? { ...l, status: "lost" } : l
        )
      );
    } catch {
      // silently fail
    } finally {
      setLostReasonDialog(false);
      setLostReason("");
      setPendingLead(null);
    }
  };

  const confirmWon = async () => {
    if (!pendingLead) return;
    try {
      await apiFetch(`/leads/${pendingLead.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "won",
          notes: `Won amount: ${wonAmount}`,
        }),
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === pendingLead.id ? { ...l, status: "won" } : l
        )
      );
    } catch {
      // silently fail
    } finally {
      setWonDialog(false);
      setWonAmount("");
      setPendingLead(null);
    }
  };

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDrop = (status: string) => {
    if (draggedLead && draggedLead.status !== status) {
      moveLeadToStatus(draggedLead, status);
    }
    setDraggedLead(null);
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading pipeline...</p>;
  }

  const mobileColumnLeads = leads.filter((l) => l.status === mobileTab);
  const mobileCol = COLUMNS.find((c) => c.key === mobileTab)!;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Pipeline</h1>

      {/* ── Mobile: Tab pills + vertical list ── */}
      <div className="md:hidden">
        {/* Status tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
          {COLUMNS.map((col) => {
            const count = leads.filter((l) => l.status === col.key).length;
            const isActive = mobileTab === col.key;
            return (
              <button
                key={col.key}
                onClick={() => setMobileTab(col.key)}
                className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${col.color}`} />
                {col.label}
                <span className={`tabular-nums ${isActive ? "text-background/70" : "text-muted-foreground/60"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lead cards for selected status */}
        <div className="space-y-2 mt-1">
          {mobileColumnLeads.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No leads in {mobileCol.label}
              </p>
            </div>
          ) : (
            mobileColumnLeads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-lg border bg-card p-3"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => setDrawerLeadId(lead.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </div>
                    <Badge
                      variant={
                        lead.priority === "urgent" || lead.priority === "high"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs shrink-0"
                    >
                      {lead.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-muted-foreground/70">
                      {getMemberName(lead.assignedTo)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {/* Move to action */}
                <div className="mt-2 pt-2 border-t">
                  <select
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                    value={lead.status}
                    onChange={(e) => {
                      if (e.target.value !== lead.status) {
                        moveLeadToStatus(lead, e.target.value);
                      }
                    }}
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.key === lead.status ? `${c.label} (current)` : `Move to ${c.label}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Desktop: Kanban columns with drag-and-drop ── */}
      <div className="hidden md:flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const columnLeads = leads.filter((l) => l.status === col.key);
          const isEndState = col.key === "won" || col.key === "lost";

          return (
            <div
              key={col.key}
              className={`min-w-[220px] flex-1 flex-shrink-0 rounded-lg border bg-muted/30 ${
                isEndState ? "opacity-80" : ""
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold">{col.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {columnLeads.length}
                </Badge>
              </div>

              <div className="space-y-2 p-2 min-h-[200px]">
                {columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead)}
                    className="cursor-grab rounded-md border bg-card p-3 shadow-sm hover:shadow transition-shadow"
                  >
                    <div
                      className="block cursor-pointer"
                      onClick={() => setDrawerLeadId(lead.id)}
                    >
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.phone}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {getMemberName(lead.assignedTo)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge
                        variant={
                          lead.priority === "urgent" || lead.priority === "high"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {lead.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lost Reason Dialog */}
      <Dialog open={lostReasonDialog} onOpenChange={setLostReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Why was this lead lost?
            </p>
            <select
              className="w-full rounded-md border p-2 text-sm"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            >
              <option value="">Select a reason...</option>
              <option value="Price too high">Price too high</option>
              <option value="Went with competitor">Went with competitor</option>
              <option value="No budget">No budget</option>
              <option value="Not interested">Not interested</option>
              <option value="No response">No response</option>
              <option value="Other">Other</option>
            </select>
            {lostReason === "Other" && (
              <Input
                placeholder="Enter reason..."
                onChange={(e) => setLostReason(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostReasonDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmLost}
              disabled={!lostReason}
            >
              Confirm Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Won Dialog */}
      <Dialog open={wonDialog} onOpenChange={setWonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Won</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Congratulations! Enter the won amount.
            </p>
            <Input
              type="number"
              placeholder="Amount"
              value={wonAmount}
              onChange={(e) => setWonAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWonDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmWon}>Confirm Won</Button>
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
