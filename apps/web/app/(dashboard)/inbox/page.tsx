"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface Conversation {
  id: string;
  contactNumber: string;
  contactName: string | null;
  leadId: string | null;
  assignedTo: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  lead?: { id: string; name: string; status: string } | null;
}

interface Message {
  id: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  body: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  status: string;
  timestamp: string;
  sentBy: string | null;
}

interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  source: string | null;
  priority: string;
  notes: string | null;
  nextFollowUp: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: string | null;
  company: string | null;
  value: number | null;
  quotations?: Array<{
    id: string;
    quoteNumber: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  followUps?: Array<{
    id: string;
    scheduledAt: string;
    type: string;
    notes: string;
    status: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-orange-100 text-orange-800",
  proposal_sent: "bg-purple-100 text-purple-800",
  negotiation: "bg-indigo-100 text-indigo-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetch: apiFetch, isReady } = useApi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialConvHandled, setInitialConvHandled] = useState(false);

  // Lead sheet state
  const [leadSheetOpen, setLeadSheetOpen] = useState(false);
  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);

  // Auto-select conversation from query param (e.g. from lead detail page)
  useEffect(() => {
    if (initialConvHandled) return;
    const convParam = searchParams.get("conversation");
    if (convParam && conversations.length > 0) {
      setSelectedId(convParam);
      setInitialConvHandled(true);
    } else if (!convParam) {
      setInitialConvHandled(true);
    }
  }, [searchParams, conversations, initialConvHandled]);

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("filter", filter);
      if (search) params.set("search", search);
      const data = await apiFetch<{ data: Conversation[] }>(`/inbox/conversations?${params}`);
      setConversations(data.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filter, search, apiFetch]);

  useEffect(() => {
    if (!isReady) return;
    fetchConversations();
  }, [fetchConversations, isReady]);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const data = await apiFetch<Message[]>(`/inbox/conversations/${convId}/messages`);
      setMessages(data || []);
    } catch {
      setMessages([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (selectedId) fetchMessages(selectedId);
  }, [selectedId, fetchMessages]);

  const sendMessage = async () => {
    if (!selectedId || !messageText.trim()) return;
    try {
      await apiFetch(`/inbox/conversations/${selectedId}/send`, {
        method: "POST",
        body: JSON.stringify({ body: messageText }),
      });
      setMessageText("");
      fetchMessages(selectedId);
      fetchConversations();
    } catch {
      // silently fail
    }
  };

  const openLeadSheet = useCallback(async (leadId: string) => {
    setLeadSheetOpen(true);
    setLeadLoading(true);
    try {
      const data = await apiFetch<LeadDetail>(`/leads/${leadId}`);
      setLeadDetail(data);
    } catch {
      setLeadDetail(null);
    } finally {
      setLeadLoading(false);
    }
  }, [apiFetch]);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const statusTicks: Record<string, string> = {
    pending: "\u23F3",
    sent: "\u2713",
    delivered: "\u2713\u2713",
    read: "\u2713\u2713",
    failed: "\u2717",
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 md:gap-4">
      {/* Conversation List */}
      <div className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-80 flex-shrink-0 flex-col border rounded-lg bg-card`}>
        <div className="border-b p-3">
          <h2 className="mb-2 text-lg font-semibold">WhatsApp Inbox</h2>
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-2 flex gap-1">
            {["all", "unread", "linked", "unassigned"].map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "ghost"}
                size="sm"
                className="text-xs capitalize"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No conversations yet. Conversations will appear here when WhatsApp is connected.
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full border-b p-3 text-left transition-colors hover:bg-accent ${
                  selectedId === conv.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {conv.contactName || conv.contactNumber}
                  </span>
                  {conv.unreadCount > 0 && (
                    <Badge className="h-5 w-5 justify-center rounded-full p-0 text-xs">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {conv.contactNumber}
                  </span>
                  {conv.lastMessageAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                {conv.lead && (
                  <Badge
                    variant="secondary"
                    className="mt-1 text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLeadSheet(conv.lead!.id);
                    }}
                  >
                    {conv.lead.name}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 flex-col border rounded-lg bg-card`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedId(null)}
                  className="md:hidden text-muted-foreground hover:text-foreground"
                  aria-label="Back"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h3 className="font-semibold">
                    {selectedConversation.contactName ||
                      selectedConversation.contactNumber}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.contactNumber}
                  </p>
                </div>
              </div>
              {selectedConversation.lead && (
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => openLeadSheet(selectedConversation.lead!.id)}
                >
                  Lead: {selectedConversation.lead.name}
                </Badge>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.direction === "outbound" ? "justify-end" : "justify-start"
                  }`}
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
                    ) : !msg.mediaUrl && msg.mediaType && msg.mediaType !== "text" ? (
                      <p className="text-sm italic opacity-70">
                        {msg.mediaType === "image" ? "Photo" :
                         msg.mediaType === "audio" ? "Audio message" :
                         msg.mediaType === "video" ? "Video" :
                         msg.mediaType === "sticker" ? "Sticker" :
                         msg.mediaType === "document" ? "Document" :
                         msg.mediaType === "contact" ? "Contact" :
                         msg.mediaType === "location" ? "Location" :
                         msg.mediaType}
                      </p>
                    ) : null}
                    {msg.mediaUrl && (
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline"
                      >
                        {msg.mediaType === "image" ? "Photo" :
                         msg.mediaType === "video" ? "Video" :
                         msg.mediaType === "audio" ? "Audio" :
                         msg.mediaType === "document" ? "Document" :
                         "Attachment"}
                      </a>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.direction === "outbound" && (
                        <span
                          className={`text-xs ${
                            msg.status === "read" ? "text-blue-400" : "opacity-70"
                          }`}
                        >
                          {statusTicks[msg.status] || ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="border-t p-4 flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lead Detail Sheet */}
      <Sheet open={leadSheetOpen} onOpenChange={setLeadSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{leadDetail?.name || "Lead Details"}</SheetTitle>
            <SheetDescription>
              {leadDetail?.phone || "Loading..."}
            </SheetDescription>
          </SheetHeader>

          {leadLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Loading lead details...</p>
            </div>
          ) : leadDetail ? (
            <div className="space-y-6 p-6 pt-4">
              {/* Status & Priority */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={STATUS_COLORS[leadDetail.status] || ""}>
                  {leadDetail.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {leadDetail.priority} Priority
                </Badge>
                {leadDetail.source && (
                  <Badge variant="secondary">{leadDetail.source}</Badge>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="text-right font-medium">{leadDetail.phone}</span>
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-right font-medium">{leadDetail.email || "-"}</span>
                  <span className="text-muted-foreground">Company</span>
                  <span className="text-right font-medium">{leadDetail.company || "-"}</span>
                  {leadDetail.value != null && (
                    <>
                      <span className="text-muted-foreground">Value</span>
                      <span className="text-right font-medium">
                        {Number(leadDetail.value).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timeline</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-right">{formatDateTime(leadDetail.createdAt)}</span>
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="text-right">{formatDateTime(leadDetail.updatedAt)}</span>
                  <span className="text-muted-foreground">Next Follow-up</span>
                  <span className="text-right">{formatDateTime(leadDetail.nextFollowUp)}</span>
                </div>
              </div>

              {/* Notes */}
              {leadDetail.notes && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</h4>
                  <p className="text-sm whitespace-pre-wrap rounded-md bg-muted p-3">{leadDetail.notes}</p>
                </div>
              )}

              {/* Quotations */}
              {leadDetail.quotations && leadDetail.quotations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Quotations ({leadDetail.quotations.length})
                  </h4>
                  <div className="space-y-2">
                    {leadDetail.quotations.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between rounded-md border p-3 text-sm cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => {
                          setLeadSheetOpen(false);
                          router.push(`/quotations/${q.id}`);
                        }}
                      >
                        <div>
                          <span className="font-medium">{q.quoteNumber}</span>
                          <Badge variant="outline" className="ml-2 text-xs capitalize">
                            {q.status}
                          </Badge>
                        </div>
                        <span className="font-semibold">
                          {Number(q.total).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-ups */}
              {leadDetail.followUps && leadDetail.followUps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Follow-ups ({leadDetail.followUps.length})
                  </h4>
                  <div className="space-y-2">
                    {leadDetail.followUps.slice(0, 5).map((fu) => (
                      <div key={fu.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="capitalize font-medium">{fu.type}</span>
                          <Badge
                            variant={fu.status === "completed" ? "secondary" : "outline"}
                            className="text-xs capitalize"
                          >
                            {fu.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(fu.scheduledAt)}
                        </p>
                        {fu.notes && (
                          <p className="text-xs mt-1 text-muted-foreground">{fu.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Full Page Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setLeadSheetOpen(false);
                  router.push(`/leads/${leadDetail.id}`);
                }}
              >
                Open Full Lead Page
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Failed to load lead details.</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
