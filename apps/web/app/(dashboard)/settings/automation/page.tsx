"use client";

import { useEffect, useState, useCallback } from "react";
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

interface FollowUpRule {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  conditions: Record<string, unknown> | null;
  fromStatus: string | null;
  toStatus: string | null;
  delayHours: number;
  actionType: string;
  messageTemplate: string | null;
  followUpType: string | null;
  isActive: boolean;
  executionCount: number;
  createdAt: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "When lead is created",
  status_changed: "When status changes",
};

const ACTION_LABELS: Record<string, string> = {
  create_followup: "Create follow-up task",
  send_whatsapp: "Send WhatsApp",
  send_email: "Send email",
};

const STATUS_OPTIONS = [
  "new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost",
];

const FOLLOW_UP_TYPES = ["call", "whatsapp", "email", "visit", "meeting"];

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

interface RuleFormData {
  name: string;
  description: string;
  triggerType: string;
  fromStatus: string;
  toStatus: string;
  delayHours: number;
  actionType: string;
  messageTemplate: string;
  followUpType: string;
  isActive: boolean;
}

const defaultForm: RuleFormData = {
  name: "",
  description: "",
  triggerType: "lead_created",
  fromStatus: "",
  toStatus: "",
  delayHours: 0,
  actionType: "create_followup",
  messageTemplate: "",
  followUpType: "call",
  isActive: true,
};

export default function AutomationSettingsPage() {
  const { fetch: apiFetch, session, isReady } = useApi();
  const [rules, setRules] = useState<FollowUpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FollowUpRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const isAllowed =
    session?.user?.role === "super_admin" ||
    session?.user?.role === "manager";

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<FollowUpRule[]>("/automation/rules");
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rules");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchRules();
  }, [fetchRules, isReady]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  function openAddDialog() {
    setEditingRule(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEditDialog(rule: FollowUpRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description || "",
      triggerType: rule.triggerType,
      fromStatus: rule.fromStatus || "",
      toStatus: rule.toStatus || "",
      delayHours: rule.delayHours,
      actionType: rule.actionType,
      messageTemplate: rule.messageTemplate || "",
      followUpType: rule.followUpType || "call",
      isActive: rule.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        triggerType: form.triggerType,
        delayHours: form.delayHours,
        actionType: form.actionType,
        messageTemplate: form.messageTemplate || undefined,
        isActive: form.isActive,
      };

      if (form.triggerType === "status_changed") {
        if (form.fromStatus) payload.fromStatus = form.fromStatus;
        if (form.toStatus) payload.toStatus = form.toStatus;
      }

      if (form.actionType === "create_followup") {
        payload.followUpType = form.followUpType;
      }

      if (editingRule) {
        await apiFetch(`/automation/rules/${editingRule.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showSuccess("Rule updated successfully");
      } else {
        await apiFetch("/automation/rules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showSuccess("Rule created successfully");
      }

      setDialogOpen(false);
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(rule: FollowUpRule) {
    try {
      await apiFetch(`/automation/rules/${rule.id}/toggle`, {
        method: "PATCH",
      });
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle rule");
    }
  }

  async function handleDelete(rule: FollowUpRule) {
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/automation/rules/${rule.id}`, { method: "DELETE" });
      showSuccess("Rule deleted");
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  }

  if (!isAllowed) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              You do not have permission to access this page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Automation Rules</h1>
          <p className="text-muted-foreground text-sm hidden sm:block">
            Configure automatic follow-up actions triggered by lead events
          </p>
        </div>
        <Button onClick={openAddDialog} className="shrink-0">Add Rule</Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>
            Active rules will automatically execute when their trigger conditions are met.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading rules...</p>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No automation rules yet. Click &quot;Add Rule&quot; to create one.
            </p>
          ) : (
            <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Name</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Trigger</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Action</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Delay</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">Executions</th>
                    <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm">{TRIGGER_LABELS[rule.triggerType] || rule.triggerType}</span>
                        {rule.triggerType === "status_changed" && (rule.fromStatus || rule.toStatus) && (
                          <p className="text-xs text-muted-foreground">{rule.fromStatus || "*"} → {rule.toStatus || "*"}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4">{ACTION_LABELS[rule.actionType] || rule.actionType}</td>
                      <td className="py-3 pr-4">{rule.delayHours === 0 ? "Immediate" : `${rule.delayHours}h`}</td>
                      <td className="py-3 pr-4"><button onClick={() => handleToggle(rule)}><Badge variant={rule.isActive ? "default" : "secondary"}>{rule.isActive ? "Active" : "Inactive"}</Badge></button></td>
                      <td className="py-3 pr-4 text-center">{rule.executionCount}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(rule)}>Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(rule)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{rule.name}</p>
                      {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                    </div>
                    <button onClick={() => handleToggle(rule)} className="shrink-0">
                      <Badge variant={rule.isActive ? "default" : "secondary"}>{rule.isActive ? "Active" : "Inactive"}</Badge>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{TRIGGER_LABELS[rule.triggerType] || rule.triggerType}</span>
                    <span>→</span>
                    <span>{ACTION_LABELS[rule.actionType] || rule.actionType}</span>
                    <span>({rule.delayHours === 0 ? "Immediate" : `${rule.delayHours}h delay`})</span>
                    <span>· {rule.executionCount} runs</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(rule)}>Edit</Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDelete(rule)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
            <DialogDescription>
              Configure when and how to automatically follow up with leads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Welcome WhatsApp on new lead"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trigger</label>
              <select
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                className={selectClass}
              >
                <option value="lead_created">When lead is created</option>
                <option value="status_changed">When status changes</option>
              </select>
            </div>

            {form.triggerType === "status_changed" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Status</label>
                  <select
                    value={form.fromStatus}
                    onChange={(e) => setForm({ ...form, fromStatus: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Any</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Status</label>
                  <select
                    value={form.toStatus}
                    onChange={(e) => setForm({ ...form, toStatus: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Any</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Delay (hours)</label>
              <Input
                type="number"
                min={0}
                value={form.delayHours}
                onChange={(e) => setForm({ ...form, delayHours: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <select
                value={form.actionType}
                onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                className={selectClass}
              >
                <option value="create_followup">Create follow-up task</option>
                <option value="send_whatsapp">Send WhatsApp message</option>
                <option value="send_email">Send email</option>
              </select>
            </div>

            {form.actionType === "create_followup" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Follow-up Type</label>
                <select
                  value={form.followUpType}
                  onChange={(e) => setForm({ ...form, followUpType: e.target.value })}
                  className={selectClass}
                >
                  {FOLLOW_UP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Message Template</label>
                <GenerateAIButton
                  actionType={form.actionType}
                  onGenerated={(msg) => setForm({ ...form, messageTemplate: msg })}
                />
              </div>
              <textarea
                value={form.messageTemplate}
                onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })}
                placeholder="Hi {{name}}, following up on your interest in..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{{name}}"}, {"{{phone}}"}, {"{{status}}"}, {"{{product_interest}}"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rule-active"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="rule-active" className="text-sm font-medium">
                Active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.name.trim()}>
              {submitting ? "Saving..." : editingRule ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
