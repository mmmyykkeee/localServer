"use client";

import { useState, useRef, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "../toast";
import Image from "next/image";

interface Lead {
  id: number;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  company?: string | null;
  notes?: string | null;
  enriched?: string | null | undefined;
  status?: string | null;
  response?: string | null;
  createdAt: string;
}

interface EnrichedData {
  title: string;
  description: string;
  emails: string[];
  phones: string[];
  socialLinks: Record<string, string>;
}

function GreenCheck({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <svg className="w-4 h-4 text-green-500 dark:text-green-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function TickIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-3.5 h-3.5 shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" className="tick-path" />
    </svg>
  );
}

function Spinner({ show }: { show: boolean }) {
  if (!show) return null;
  return <div className="w-3 h-3 border border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-300 rounded-full animate-spin shrink-0" />;
}

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "saving") return <Spinner show />;
  if (status === "saved") return <GreenCheck show />;
  return null;
}

function SkeletonRow() {
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-40" />
          <div className="mt-2 flex gap-3">
            <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-28" />
            <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-24" />
          </div>
        </div>
        <div className="flex gap-1">
          <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded w-14" />
          <div className="h-6 bg-neutral-100 dark:bg-neutral-800 rounded w-14" />
        </div>
      </div>
    </div>
  );
}

type Action = (formData: FormData) => Promise<{ error?: string } | void>;

/* ─── Highlight text component for search ─── */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200/70 text-neutral-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/* ─── Favicon thumbnail component ─── */
function SiteFavicon({ website, size = 20 }: { website?: string | null; size?: number }) {
  if (!website) return null;
  const domain = website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").split("/")[0];
  if (!domain) return null;
  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`}
      alt=""
      width={size}
      height={size}
      className="rounded object-contain shrink-0"
      unoptimized
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

/* ─── Input class helpers ─── */
const inputClass = "w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 focus:border-transparent transition-all duration-200";
const inputErrorClass = "w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-red-400 dark:border-red-500 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent transition-all duration-200";

export default function LeadsClient({
  leads,
  createLead,
  deleteLead,
  updateLead,
  totalCount = 0,
  currentPage = 1,
  pageSize = 8,
  statusFilter = "",
  unreadCounts = {},
}: {
  leads: Lead[];
  createLead: Action;
  deleteLead: Action;
  updateLead: Action;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  statusFilter?: string;
  unreadCounts?: Record<number, number>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoEnriching, setAutoEnriching] = useState(false);
  const [websiteSaved, setWebsiteSaved] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [generating, setGenerating] = useState<number | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [draftLead, setDraftLead] = useState<Lead | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [lastDraftId, setLastDraftId] = useState<number | null>(null);
  const [leadDrafts, setLeadDrafts] = useState<Record<number, Array<{ id: number; content: string; tone: string | null; purpose: string | null; used: boolean; createdAt: string }>>>(({}));
  const [leadMessages, setLeadMessages] = useState<Record<number, Array<{ id: number; direction: string; from: string | null; to: string | null; subject: string | null; content: string; createdAt: string }>>>({});
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [unreadIds, setUnreadIds] = useState<Set<number>>(new Set(Object.keys(unreadCounts).map(Number)));
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "no-replies">("idle");
  const [copied, setCopied] = useState(false);
  const [expandedDraftId, setExpandedDraftId] = useState<number | null>(null);
  const [draftCopiedId, setDraftCopiedId] = useState<number | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);
  const [sentEmailId, setSentEmailId] = useState<number | null>(null);
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [tone, setTone] = useState("professional and friendly");
  const [purpose, setPurpose] = useState("introduction and partnership inquiry");
  const [purposeFocused, setPurposeFocused] = useState(false);
  const [fieldStatus, setFieldStatus] = useState<Record<string, "idle" | "saving" | "saved">>({});
  const [editForm, setEditForm] = useState({ website: "", email: "", phone: "", name: "", company: "", notes: "" });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<() => void>(() => {});
  useEffect(() => { selectAllRef.current = selectAll; });

  useEffect(() => {
    return () => { Object.values(saveTimers.current).forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Ctrl+K / Cmd+K — focus search
      if (isMod && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // Ctrl+A / Cmd+A — select/deselect all visible leads
      if (isMod && e.key === "a") {
        e.preventDefault();
        selectAllRef.current();
        return;
      }

      // Ctrl+N / Cmd+N — new lead
      if (isMod && e.key === "n") {
        e.preventDefault();
        setShowForm(true);
        setEditingLead(null);
        return;
      }

      if (e.key === "Escape") {
        setShowForm(false);
        setEditingLead(null);
        setEmailDraft(null);
        setExpandedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ─── Sync search to URL (without server refresh, resets page) ─── */
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (search) {
        params.set("q", search);
        params.delete("page");
      } else {
        params.delete("q");
      }
      if (expandedId) {
        const expandedLead = leads.find((l) => l.id === expandedId);
        const slug = expandedLead ? (expandedLead.company || expandedLead.name || String(expandedId)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : String(expandedId);
        params.set("expanded", slug);
      } else {
        params.delete("expanded");
      }
      const newUrl = params.toString() ? `/leads?${params.toString()}` : "/leads";
      window.history.replaceState(null, "", newUrl);
    }, 300);
    return () => clearTimeout(t);
  }, [search, expandedId, leads]);

  /* ─── Read expanded state from URL on mount ─── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const expandedParam = params.get("expanded");
    if (expandedParam) {
      const byId = parseInt(expandedParam);
      if (!isNaN(byId)) {
        setExpandedId(byId);
        fetchDrafts(byId);
      } else {
        const match = leads.find((l) => {
          const slug = (l.company || l.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          return slug === expandedParam;
        });
        if (match) {
          setExpandedId(match.id);
          fetchDrafts(match.id);
        }
      }
    }
  }, [leads]);

  /* ─── Auto-sync email replies every 5 minutes ─── */
  useEffect(() => {
    const sync = async () => {
      try { await fetch("/api/leads/sync/auto"); } catch {}
    };
    sync();
    const interval = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  /* ─── Client-side search filtering with keyword extraction ─── */
  const searchQuery = search.trim().toLowerCase();

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.company, lead.email, lead.website, lead.phone].some(
        (f) => f?.toLowerCase().includes(searchQuery)
      )
    );
  }, [leads, searchQuery]);

  const nonMatchingIds = useMemo(() => {
    if (!searchQuery) return new Set<number>();
    const ids = new Set<number>();
    for (const lead of leads) {
      if (!filteredLeads.some((fl) => fl.id === lead.id)) {
        ids.add(lead.id);
      }
    }
    return ids;
  }, [leads, filteredLeads, searchQuery]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const url = params.toString() ? `/leads?${params.toString()}` : "/leads";
    router.push(url);
  };

  const refresh = () => startTransition(() => router.refresh());

  /* ─── Edit in-place ─── */
  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditForm({ website: lead.website || "", email: lead.email || "", phone: lead.phone || "", name: lead.name || "", company: lead.company || "", notes: lead.notes || "" });
    setDuplicateError(null);
    setFieldStatus({});
    setExpandedId(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingLead(null);
    setDuplicateError(null);
    setAutoEnriching(false);
    setFieldStatus({});
    setFormErrors({});
    setTouchedFields(new Set());
    setExpandedId(null);
  };

  /* ─── Bulk selection ─── */
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const visibleIds = leads.filter((l) => !nonMatchingIds.has(l.id)).map((l) => l.id);
    if (visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    const deleteCount = selectedIds.size;
    for (const id of selectedIds) {
      const fd = new FormData();
      fd.set("id", String(id));
      await deleteLead(fd);
    }
    setSelectedIds(new Set());
    setBulkProcessing(false);
    toast(`Deleted ${deleteCount} lead${deleteCount !== 1 ? "s" : ""}`, "default");
    // Redirect if current page becomes empty
    const newTotal = totalCount - deleteCount;
    const maxPage = Math.max(1, Math.ceil(newTotal / pageSize));
    const targetPage = Math.min(currentPage, maxPage);
    if (targetPage !== currentPage) {
      const params = new URLSearchParams(window.location.search);
      if (targetPage > 1) params.set("page", String(targetPage));
      else params.delete("page");
      router.push(params.toString() ? `/leads?${params.toString()}` : "/leads");
    } else {
      refresh();
    }
  };

  const handleBulkEnrich = async () => {
    const toEnrich = leads.filter((l) => selectedIds.has(l.id) && l.website);
    if (toEnrich.length === 0) {
      toast("No leads with websites selected", "error");
      return;
    }
    setBulkProcessing(true);
    let success = 0;
    for (const lead of toEnrich) {
      try {
        const res = await fetch("/api/leads/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: lead.id, website: lead.website }),
        });
        if (res.ok) success++;
      } catch { /* skip */ }
    }
    setSelectedIds(new Set());
    setBulkProcessing(false);
    toast(`Enriched ${success} of ${toEnrich.length} lead${toEnrich.length !== 1 ? "s" : ""}`, success === toEnrich.length ? "success" : "default");
    refresh();
  };

  const cancelEdit = () => {
    setEditingLead(null);
    setFieldStatus({});
  };

  const autoSaveField = (field: string, value: string) => {
    if (!editingLead) return;
    if (saveTimers.current[field]) clearTimeout(saveTimers.current[field]);
    setFieldStatus((prev) => ({ ...prev, [field]: "saving" }));
    saveTimers.current[field] = setTimeout(async () => {
      const fd = new FormData();
      fd.set("id", String(editingLead.id));
      fd.set("field", field);
      fd.set("value", value);
      await updateLead(fd);
      setFieldStatus((prev) => ({ ...prev, [field]: "saved" }));
      setTimeout(() => setFieldStatus((prev) => ({ ...prev, [field]: "idle" })), 2000);
    }, 800);
  };

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    autoSaveField(field, value);
  };

  const handleCreate = async (formData: FormData) => {
    setSaving(true);
    setDuplicateError(null);
    const errors = formRef.current ? validateForm(formRef.current) : {};
    setFormErrors(errors);
    setTouchedFields(new Set(["name", "email", "website", "phone", "company", "notes"]));
    if (Object.keys(errors).length > 0) {
      setSaving(false);
      return;
    }
    const result = await createLead(formData);
    if (result && "error" in result && result.error) {
      setDuplicateError(result.error);
      setSaving(false);
      return;
    }
    cancelForm();
    setSaving(false);
    toast("Lead created successfully");
    refresh();
  };

  const handleDelete = async (id: number) => {
    if (editingLead?.id === id) setEditingLead(null);
    const fd = new FormData();
    fd.set("id", String(id));
    await deleteLead(fd);
    toast("Lead deleted", "default");
    // Redirect to correct page if current page is now out of range
    const newTotal = totalCount - 1;
    const maxPage = Math.max(1, Math.ceil(newTotal / pageSize));
    const targetPage = Math.min(currentPage, maxPage);
    if (targetPage !== currentPage) {
      const params = new URLSearchParams(window.location.search);
      if (targetPage > 1) params.set("page", String(targetPage));
      else params.delete("page");
      router.push(params.toString() ? `/leads?${params.toString()}` : "/leads");
    } else {
      refresh();
    }
  };

  const handleEnrich = async (lead: Lead) => {
    if (!lead.website) return;
    setEnrichingId(lead.id);
    try {
      const res = await fetch("/api/leads/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, website: lead.website }) });
      const data = await res.json();
      if (!data.error) {
        toast("Lead enriched successfully");
        refresh();
      } else {
        toast(data.error || "Enrichment failed", "error");
      }
    } catch {
      toast("Enrichment failed", "error");
    } finally {
      setEnrichingId(null);
    }
  };

  const updateContactStatus = async (leadId: number, status: string) => {
    const fd = new FormData();
    fd.set("id", String(leadId));
    fd.set("field", "status");
    fd.set("value", status);
    await updateLead(fd);
    refresh();
  };

  const saveResponse = async (leadId: number, response: string) => {
    const fd = new FormData();
    fd.set("id", String(leadId));
    fd.set("field", "response");
    fd.set("value", response || "");
    await updateLead(fd);
    refresh();
  };

  const handleResponseBlur = (leadId: number, value: string) => {
    saveResponse(leadId, value);
  };

  const handleWebsiteBlur = async () => {
    const form = formRef.current;
    if (!form) return;
    const website = (form.elements.namedItem("website") as HTMLInputElement)?.value?.trim();
    if (!website || editingLead) return;
    setAutoEnriching(true);
    setWebsiteSaved(false);
    const res = await fetch("/api/leads/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ website }) });
    const data = await res.json();
    if (!("error" in data)) {
      if (data.title) {
        (form.elements.namedItem("company") as HTMLInputElement).value = data.title;
        // Also intelligently set the name field: extract first name-like segment from title
        const titleParts = data.title.split(/[-–—|]/)[0].trim();
        (form.elements.namedItem("name") as HTMLInputElement).value = titleParts;
      }
      if (data.emails?.[0]) (form.elements.namedItem("email") as HTMLInputElement).value = data.emails[0];
      if (data.phones?.[0]) (form.elements.namedItem("phone") as HTMLInputElement).value = data.phones[0];
      setWebsiteSaved(true);
      setTimeout(() => setWebsiteSaved(false), 3000);
    }
    setAutoEnriching(false);
  };

  const handleGenerateEmail = async (lead: Lead) => {
    const isRegen = emailDraft !== null;
    if (isRegen) setRegenerating(true);
    else { setGenerating(lead.id); setEmailDraft(null); }
    setDraftLead(lead);
    try {
      const res = await fetch("/api/leads/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lead, tone, purpose }) });
      const data = await res.json();
      setEmailDraft(data.email || "Failed to generate email.");
      setLastDraftId(data.draftId || null);
    } catch {
      setEmailDraft("Failed to generate email.");
    } finally {
      setGenerating(null);
      setRegenerating(false);
    }
  };

  const parseEnriched = (e: string | null | undefined): EnrichedData | null => { if (!e) return null; try { return JSON.parse(e); } catch { return null; } };

  const fetchDrafts = async (leadId: number) => {
    try {
      const [draftsRes, messagesRes] = await Promise.all([
        fetch(`/api/leads/${leadId}/drafts`),
        fetch(`/api/leads/${leadId}/messages`),
      ]);
      if (draftsRes.ok) {
        const data = await draftsRes.json();
        setLeadDrafts((prev) => ({ ...prev, [leadId]: data }));
      }
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setLeadMessages((prev) => ({ ...prev, [leadId]: data }));
      }
    } catch { /* skip */ }
  };

  const handleSendEmail = async (to: string, subject: string, content: string, draftId?: number) => {
    if (!to) { toast("No email address for this lead", "error"); return; }
    setSendingEmail(true);
    if (draftId) setSendingEmailId(draftId);
    try {
      const html = content.replace(/\n/g, "<br>");
      const res = await fetch("/api/leads/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject: subject || `Partnership Opportunity - Michaelsoft Procurement`, html, leadId: draftLead?.id }),
      });
      const data = await res.json();
      if (data.ok) {
        if (draftId) { setSentEmailId(draftId); setTimeout(() => setSentEmailId(null), 3000); }
        if (draftLead) { await fetchDrafts(draftLead.id); }
      } else {
        toast(data.error || "Failed to send email", "error");
      }
    } catch {
      toast("Failed to send email", "error");
    } finally {
      setSendingEmail(false);
      setSendingEmailId(null);
    }
  };

  const handleSendReply = async (lead: Lead) => {
    if (!replyContent.trim() || !lead.email) return;
    setSendingReply(true);
    try {
      const html = replyContent.replace(/\n/g, "<br>");
      const res = await fetch("/api/leads/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: lead.email, subject: `Re: Partnership Opportunity - Michaelsoft Procurement`, html, leadId: lead.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setReplyContent("");
        await fetchDrafts(lead.id);
        toast("Reply sent");
      } else {
        toast(data.error || "Failed to send reply", "error");
      }
    } catch {
      toast("Failed to send reply", "error");
    } finally {
      setSendingReply(false);
    }
  };

  const validateField = (field: string, value: string): string => {
    const trimmed = value.trim();
    if (field === "name") {
      if (!trimmed) return "Name is required";
      if (trimmed.length < 2) return "Name must be at least 2 characters";
    }
    if (field === "email" && trimmed) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address";
    }
    if (field === "website" && trimmed) {
      if (!/^https?:\/\/.+\..+/i.test(trimmed) && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(trimmed)) return "Enter a valid URL (e.g. https://acme.com)";
    }
    if (field === "phone" && trimmed) {
      if (!/^(?=.*\d)[\d\s\+\-\.\(\)]{7,}$/.test(trimmed)) return "Enter a valid phone number (e.g. +1 555 123 4567)";
    }
    return "";
  };

  const validateForm = (form: HTMLFormElement): Record<string, string> => {
    const fields = ["name", "email", "website", "phone", "company", "notes"];
    const identityFields = ["name", "email", "website", "phone"];
    const errors: Record<string, string> = {};
    let hasIdentity = false;
    for (const f of fields) {
      const el = form.elements.namedItem(f) as HTMLInputElement | HTMLTextAreaElement | null;
      const val = el?.value?.trim() || "";
      if (val && identityFields.includes(f)) hasIdentity = true;
      const err = validateField(f, val);
      if (err) errors[f] = err;
    }
    if (!hasIdentity) {
      errors._form = "Add at least one piece of identifying information (name, email, website, or phone)";
    }
    return errors;
  };

  const handleFieldBlur = (field: string, value: string) => {
    setTouchedFields((prev) => new Set(prev).add(field));
    const err = validateField(field, value);
    setFormErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const defaultPurpose = "introduction and partnership inquiry";

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {saving && (
        <div className="fixed inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-neutral-200 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-200 rounded-full animate-spin" />
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Saving...</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* ─── Breadcrumbs ─── */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
          <Link href="/" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-150">
            Home
          </Link>
          <svg className="w-3 h-3 text-neutral-300 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-neutral-600 dark:text-neutral-300 font-medium">Leads</span>
          <svg className="w-3 h-3 text-neutral-300 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/analytics" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-150">
            Analytics
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <kbd className="text-[10px] text-neutral-300 dark:text-neutral-600 hidden sm:inline-flex items-center gap-1">
              <span className="px-1 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded text-[9px] uppercase tracking-wider">⌘K</span>
              <span className="text-neutral-300 dark:text-neutral-600">search</span>
              <span className="px-1 py-0.5 border border-neutral-200 dark:border-neutral-700 rounded text-[9px] uppercase tracking-wider ml-1.5">⌘N</span>
              <span className="text-neutral-300 dark:text-neutral-600">new</span>
            </kbd>
          </div>
        </nav>

        {/* ─── Enhanced Header ─── */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <Image
              src="https://michaelsoft.co.ke/favicon.png"
              alt="MichaelSoft"
              width={28}
              height={28}
              className="rounded-md dark:brightness-90"
              unoptimized
            />
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              MichaelSoft Leads Management
            </h1>
          </div>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400 text-sm max-w-xl leading-relaxed">
            Collect, enrich, and manage your potential clients in one place. Paste a website to
            auto-fill contact details, generate cold emails with AI, and keep your pipeline organized.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
              </svg>
              {totalCount} lead{totalCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              AI-powered enrichment
            </span>
          </div>
        </div>

        {/* ─── Search + Add Lead ─── */}
        <div className="mb-8 flex items-center gap-3">
          {/* Select all checkbox */}
          {leads.length > 0 && (
            <button
              onClick={selectAll}
              className={`w-4 h-4 shrink-0 rounded border transition-all duration-150 cursor-pointer flex items-center justify-center ${
                selectedIds.size > 0
                  ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white"
                  : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-500 dark:hover:border-neutral-400"
              }`}
              title={selectedIds.size > 0 ? "Deselect all" : "Select all"}
            >
              {selectedIds.size > 0 && (
                <svg className="w-3 h-3 text-white dark:text-neutral-900" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search leads by name, company, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>

          {/* ─── Status Filter ─── */}
          <div className="flex items-center gap-1 shrink-0">
            {[
              { label: "All", value: "" },
              { label: "New", value: "new" },
              { label: "Contacted", value: "contacted" },
              { label: "Unresponsive", value: "unresponsive" },
            ].map(({ label, value }) => {
              const active = statusFilter === value || (!statusFilter && !value);
              return (
                <button
                  key={value}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    if (value) params.set("s", value);
                    else params.delete("s");
                    params.delete("page");
                    const url = params.toString() ? `/leads?${params.toString()}` : "/leads";
                    router.push(url);
                  }}
                  className={`px-2.5 py-1.5 text-xs rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={showForm ? cancelForm : () => setShowForm(true)}
            className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
          >
            {showForm ? null : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            {showForm ? "Cancel" : "Add lead"}
          </button>
          <button onClick={async () => { setSyncing(true); setSyncStatus("idle"); try { const res = await fetch("/api/leads/sync", { method: "POST" }); const data = await res.json(); if (data.ok) { if (data.matched > 0) { toast(`Caught ${data.matched} replies`); refresh(); } else { setSyncStatus("no-replies"); setTimeout(() => setSyncStatus("idle"), 2000); } } else { toast(data.error || "Sync failed", "error"); } } catch { toast("Sync failed", "error"); } finally { setSyncing(false); } }} disabled={syncing} className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50 ${syncStatus === "no-replies" ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800" : "text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"}`}>
            {syncing ? <div className="w-3.5 h-3.5 border border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-300 rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            {syncing ? "Syncing..." : syncStatus === "no-replies" ? "No new replies" : "Sync replies"}
          </button>
        </div>

        {/* ─── New Lead Form ─── */}
        {showForm && !editingLead && (
          <form ref={formRef} action={handleCreate} className="mb-8 p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl dark:bg-neutral-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">New lead</h2>
              <div className="flex items-center gap-2">
                {autoEnriching && <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500"><Spinner show />Fetching...</div>}
                {websiteSaved && !autoEnriching && <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><GreenCheck show />Data fetched</div>}
              </div>
            </div>
            {duplicateError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">{duplicateError}</div>}
            {formErrors._form && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {formErrors._form}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Website</label>
                <input type="url" name="website" className={formErrors.website && touchedFields.has("website") ? inputErrorClass : inputClass} placeholder="https://acme.com (paste to auto-fill)" onBlur={(e) => { handleWebsiteBlur(); handleFieldBlur("website", e.target.value); }} />
                {formErrors.website && touchedFields.has("website") && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{formErrors.website}</p>}
              </div>
              <div>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Name <span className="text-red-400 dark:text-red-500">*</span></label>
                <input type="text" name="name" className={formErrors.name && touchedFields.has("name") ? inputErrorClass : inputClass} placeholder="John Smith" onBlur={(e) => handleFieldBlur("name", e.target.value)} />
                {formErrors.name && touchedFields.has("name") && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Company</label>
                <input type="text" name="company" className={inputClass} placeholder="Auto-filled from website" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Email</label>
                <input type="email" name="email" className={formErrors.email && touchedFields.has("email") ? inputErrorClass : inputClass} placeholder="Auto-filled from website" onBlur={(e) => handleFieldBlur("email", e.target.value)} />
                {formErrors.email && touchedFields.has("email") && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Phone</label>
                <input type="tel" name="phone" className={formErrors.phone && touchedFields.has("phone") ? inputErrorClass : inputClass} placeholder="Auto-filled from website" onBlur={(e) => handleFieldBlur("phone", e.target.value)} />
                {formErrors.phone && touchedFields.has("phone") && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{formErrors.phone}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Notes</label>
                <textarea name="notes" className={`${inputClass} resize-none`} rows={2} placeholder="Any notes about this lead..." />
              </div>
            </div>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 cursor-pointer disabled:opacity-50">{saving ? "Saving..." : "Save lead"}</button>
          </form>
        )}

        {/* ─── Bulk Action Bar ─── */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
              {selectedIds.size} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleBulkEnrich}
                disabled={bulkProcessing}
                className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-150 cursor-pointer disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                {bulkProcessing ? <Spinner show /> : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                )}
                Enrich all
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkProcessing}
                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-all duration-150 cursor-pointer disabled:opacity-40 inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete all
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ─── Leads List ─── */}
        {isPending ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : leads.length === 0 ? (
          /* ─── Empty State ─── */
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="relative mb-8">
              <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-200">
                <rect x="56" y="22" width="88" height="116" rx="10" fill="currentColor" stroke="#D4D4D4" strokeWidth="1.5" />
                <rect x="74" y="12" width="52" height="16" rx="4" fill="#E5E5E5" stroke="#D4D4D4" strokeWidth="1.5" />
                <circle cx="100" cy="20" r="4" fill="#A3A3A3" />
                <rect x="70" y="50" width="60" height="3" rx="1.5" fill="#E5E5E5" className="opacity-60" />
                <rect x="70" y="66" width="48" height="3" rx="1.5" fill="#E5E5E5" className="opacity-60" />
                <rect x="70" y="82" width="54" height="3" rx="1.5" fill="#E5E5E5" className="opacity-60" />
                <rect x="70" y="98" width="40" height="3" rx="1.5" fill="#E5E5E5" className="opacity-60" />
                <g className="origin-center" style={{ animation: "empty-state-bounce 3s ease-in-out infinite", transformOrigin: "148px 46px" }}>
                  <circle cx="148" cy="46" r="16" fill="#F5F5F5" stroke="#D4D4D4" strokeWidth="1.5" />
                  <path d="M148 38v16M140 46h16" stroke="#A3A3A3" strokeWidth="2" strokeLinecap="round" />
                </g>
                <circle cx="44" cy="80" r="5" fill="#E5E5E5" />
                <circle cx="162" cy="110" r="4" fill="#E5E5E5" />
                <circle cx="36" cy="130" r="3" fill="#F0F0F0" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">No leads yet</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center max-w-sm mb-8 leading-relaxed">
              Your lead pipeline is empty. Add your first lead by entering their website — we&apos;ll automatically enrich it with contact details.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 cursor-pointer shadow-sm dark:shadow-neutral-900 hover:shadow-md active:scale-[0.97]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add your first lead
            </button>
            <style jsx>{`
              @keyframes empty-state-bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
              }
            `}</style>
          </div>
        ) : filteredLeads.length === 0 && searchQuery ? (
          /* ─── No search results ─── */
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <svg className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-1">No leads match &quot;{search}&quot;</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Try a different search term or clear the filter.</p>
          </div>
        ) : (
          /* ─── Lead Cards with inline editing ─── */
          <div className="space-y-2">
            {leads.map((lead) => {
              const enriched = parseEnriched(lead.enriched);
              const isExpanded = expandedId === lead.id;
              const isEditing = editingLead?.id === lead.id;
              const isHidden = nonMatchingIds.has(lead.id);

              return (
                <div
                  key={lead.id}
                  className={`relative border rounded-xl transition-all duration-500 ease-out ${
                    isHidden
                      ? "opacity-0 scale-y-95 max-h-0 overflow-hidden border-transparent pointer-events-none my-0"
                      : lead.status === "contacted"
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20"
                      : isEditing
                      ? "border-neutral-300 dark:border-neutral-700 shadow-sm dark:shadow-neutral-900"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600"
                  } ${isEditing ? "" : "hover:border-neutral-300 dark:hover:border-neutral-600"}`}
                >
                  {/* ─── Unread badge ─── */}
                  {unreadIds.has(lead.id) && (
                    <span className="absolute top-2 right-2 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full" title="New replies">
                      {unreadCounts[lead.id] || 1}
                    </span>
                  )}
                  {/* ─── Card header row ─── */}
                  <div className={`flex items-center gap-5 px-5 overflow-x-auto ${isEditing ? "pt-4 pb-3" : "py-3.5"}`}>
                    {/* Select checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(lead.id); }}
                      className={`w-4 h-4 shrink-0 rounded border transition-all duration-150 cursor-pointer flex items-center justify-center ${
                        selectedIds.has(lead.id)
                          ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white"
                          : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-500 dark:hover:border-neutral-400"
                      }`}
                    >
                      {selectedIds.has(lead.id) && (
                        <svg className="w-3 h-3 text-white dark:text-neutral-900" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    {/* Favicon thumbnail */}
                    <SiteFavicon website={lead.website} size={20} />

                    <div className="flex-1 min-w-[280px] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {searchQuery ? (
                            <HighlightText text={lead.name || "Unnamed"} query={search} />
                          ) : (
                            lead.name || "Unnamed"
                          )}
                        </span>
                        {lead.company && (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                            at {searchQuery ? <HighlightText text={lead.company} query={search} /> : lead.company}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        {lead.email && (
                          <span>{searchQuery ? <HighlightText text={lead.email} query={search} /> : lead.email}</span>
                        )}
                        {lead.phone && (
                          <span>{searchQuery ? <HighlightText text={lead.phone} query={search} /> : lead.phone}</span>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 underline underline-offset-2 transition-colors duration-150 cursor-pointer truncate max-w-[200px]"
                          >
                            {lead.website.replace(/^https?:\/\//, "")}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                      {lead.website && (          <button
            onClick={() => handleEnrich(lead)} disabled={enrichingId === lead.id} title="Enrich this lead" className="px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all duration-150 cursor-pointer disabled:opacity-40 inline-flex items-center gap-1">
                          {enrichingId === lead.id ? <><div className="w-3 h-3 border border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-300 rounded-full animate-spin" />Enriching...</> : "Enrich"}
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerateEmail(lead)}
                        disabled={generating === lead.id}
                        className="px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-all duration-150 cursor-pointer disabled:opacity-40"
                      >
                        {generating === lead.id ? <Spinner show /> : "Draft email"}
                      </button>
                      <button
                        onClick={() => (isEditing ? cancelEdit() : openEdit(lead))}
                        className={`px-2 py-1 text-xs rounded transition-all duration-150 cursor-pointer ${
                          isEditing
                            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {isEditing ? "Done" : "Edit"}
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="px-2 py-1 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-all duration-150 cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => { const next = isExpanded ? null : lead.id; setExpandedId(next); if (next) { setUnreadIds((prev) => { const next2 = new Set(prev); next2.delete(lead.id); return next2; }); if (!leadDrafts[lead.id]) fetchDrafts(lead.id); } }}
                        className="px-2 py-1 text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 rounded transition-all duration-150 cursor-pointer"
                      >
                        <svg className={`w-4 h-4 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* ─── Inline Edit Section ─── */}
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isEditing ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 pb-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        {/* Save indicator bar */}
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Editing lead</h3>
                          <div className="flex items-center gap-2">
                            {Object.values(fieldStatus).some((s) => s === "saving") && (
                              <div className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500"><Spinner show />Auto-saving...</div>
                            )}
                            {Object.values(fieldStatus).some((s) => s === "saved") && !Object.values(fieldStatus).some((s) => s === "saving") && (
                              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><GreenCheck show />All saved</div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {([
                            { field: "website", label: "Website", type: "url", placeholder: "https://acme.com", colSpan: true },
                            { field: "name", label: "Name", type: "text", placeholder: "John Smith", colSpan: false },
                            { field: "company", label: "Company", type: "text", placeholder: "Company name", colSpan: false },
                            { field: "email", label: "Email", type: "email", placeholder: "email@example.com", colSpan: false },
                            { field: "phone", label: "Phone", type: "tel", placeholder: "+1 234 567 890", colSpan: false },
                            { field: "notes", label: "Notes", type: "textarea", placeholder: "Any notes...", colSpan: true },
                          ] as const).map(({ field, label, type, placeholder, colSpan }) => (
                            <div key={field} className={colSpan ? "md:col-span-2" : ""}>
                              <div className="flex items-center gap-2 mb-1">
                                <label className="text-xs text-neutral-500 dark:text-neutral-400">{label}</label>
                                <SaveIndicator status={fieldStatus[field] || "idle"} />
                              </div>
                              {type === "textarea" ? (
                                <textarea
                                  value={editForm[field]}
                                  onChange={(e) => handleEditChange(field, e.target.value)}
                                  className={`${inputClass} resize-none`}
                                  rows={2}
                                  placeholder={placeholder}
                                />
                              ) : (
                                <input
                                  type={type}
                                  value={editForm[field]}
                                  onChange={(e) => handleEditChange(field, e.target.value)}
                                  className={inputClass}
                                  placeholder={placeholder}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ─── Expanded Section (Contact Status + Enriched Data) ─── */}
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 pb-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        {/* ─── Contact Status ─── */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Contact status</span>
                            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              lead.status === "contacted"
                                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                                : lead.status === "unresponsive"
                                ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500"
                            }`}>
                              {lead.status === "contacted" ? "Contacted" : lead.status === "unresponsive" ? "Unresponsive" : "New"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateContactStatus(lead.id, "contacted")}
                              className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-150 cursor-pointer ${
                                lead.status === "contacted"
                                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                                  : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400"
                              }`}
                            >
                              <svg className="w-3 h-3 inline mr-1 -mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Contacted
                            </button>
                            <button
                              onClick={() => updateContactStatus(lead.id, "unresponsive")}
                              className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-150 cursor-pointer ${
                                lead.status === "unresponsive"
                                  ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                                  : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-600 dark:hover:text-amber-400"
                              }`}
                            >
                              <svg className="w-3 h-3 inline mr-1 -mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Unresponsive
                            </button>
                            {lead.status && lead.status !== "new" && (
                              <button
                                onClick={() => updateContactStatus(lead.id, "new")}
                                className="px-3 py-1.5 text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-400 rounded-lg transition-colors duration-150 cursor-pointer"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ─── Enriched Data ─── */}
                        {enriched && (
                          <div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div><span className="text-neutral-400 dark:text-neutral-500 block mb-1">Title</span><span className="text-neutral-700 dark:text-neutral-300">{enriched.title || "—"}</span></div>
                              <div className="col-span-2"><span className="text-neutral-400 dark:text-neutral-500 block mb-1">Description</span><span className="text-neutral-700 dark:text-neutral-300 line-clamp-2">{enriched.description || "—"}</span></div>
                              <div><span className="text-neutral-400 dark:text-neutral-500 block mb-1">Found emails</span><span className="text-neutral-700 dark:text-neutral-300">{enriched.emails?.length ? enriched.emails.join(", ") : "—"}</span></div>
                              <div><span className="text-neutral-400 dark:text-neutral-500 block mb-1">Found phones</span><span className="text-neutral-700 dark:text-neutral-300">{enriched.phones?.length ? enriched.phones.join(", ") : "—"}</span></div>
                              <div className="col-span-3"><span className="text-neutral-400 dark:text-neutral-500 block mb-1">Social links</span><div className="flex gap-2 flex-wrap">{Object.entries(enriched.socialLinks || {}).map(([platform, url]) => <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline underline-offset-2 transition-colors duration-150">{platform}</a>)}{Object.keys(enriched.socialLinks || {}).length === 0 && <span className="text-neutral-700 dark:text-neutral-300">—</span>}</div></div>
                            </div>
                          </div>
                        )}

                        {/* ─── Email Drafts ─── */}
                        {leadDrafts[lead.id] && leadDrafts[lead.id].length > 0 && (
                          <div className="mt-4">
                            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-2">Email drafts ({leadDrafts[lead.id].length})</span>
                            <div className="space-y-2">
                              {leadDrafts[lead.id].map((draft) => {
                                const isDraftExpanded = expandedDraftId === draft.id;
                                return (
                                  <div key={draft.id} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-xs">
                                    <div className="flex items-center gap-2 mb-2">
                                      {draft.used && <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">Used</span>}
                                      {draft.tone && <span className="text-neutral-400 dark:text-neutral-500">{draft.tone}</span>}
                                      <span className="text-neutral-300 dark:text-neutral-600 ml-auto">{new Date(draft.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className={`text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed ${isDraftExpanded ? "" : "line-clamp-4"}`}>{draft.content}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <button onClick={() => setExpandedDraftId(isDraftExpanded ? null : draft.id)} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-150 cursor-pointer">{isDraftExpanded ? "Show less" : "Show more"}</button>
                                      <button onClick={async () => { setDraftCopiedId(draft.id); await navigator.clipboard.writeText(draft.content); await fetch(`/api/leads/draft/${draft.id}/use`, { method: "POST" }); setTimeout(() => setDraftCopiedId(null), 1500); }} className={`transition-all duration-200 cursor-pointer inline-flex items-center gap-1 ${draftCopiedId === draft.id ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"}`}>{draftCopiedId === draft.id ? <><TickIcon />Copied</> : "Copy"}</button>
                                      <button onClick={() => handleSendEmail(lead.email || "", `Partnership Opportunity - Michaelsoft Procurement`, draft.content, draft.id)} disabled={sendingEmail} className={`transition-all duration-200 cursor-pointer inline-flex items-center gap-1 ${sentEmailId === draft.id ? "text-emerald-600 dark:text-emerald-400" : sendingEmailId === draft.id ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400 dark:text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400"}`}>{sendingEmailId === draft.id ? <div className="w-3 h-3 border border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /> : sentEmailId === draft.id ? <TickIcon /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}{sentEmailId === draft.id ? "Sent" : "Send"}</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ─── Conversation Thread ─── */}
                        {leadMessages[lead.id] && leadMessages[lead.id].length > 0 && (
                          <div className="mt-4">
                            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-2">Conversation ({leadMessages[lead.id].length} messages)</span>
                            <div className="space-y-3">
                              {leadMessages[lead.id].map((msg) => (
                                <div key={msg.id} className={`relative ${msg.direction === "outgoing" ? "ml-4" : "mr-4"}`}>
                                  <div className={`rounded-lg p-3 text-xs ${msg.direction === "outgoing" ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800" : "bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"}`}>
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${msg.direction === "outgoing" ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" : "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400"}`}>
                                        {msg.direction === "outgoing" ? "Sent" : "Received"}
                                      </span>
                                      <span className="text-neutral-400 dark:text-neutral-500">{msg.from}</span>
                                      <span className="text-neutral-300 dark:text-neutral-600 ml-auto">{new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    {msg.subject && <p className="text-neutral-500 dark:text-neutral-400 mb-1">Re: {msg.subject}</p>}
                                    <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 flex gap-2">
                              <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} className={`${inputClass} resize-none flex-1`} rows={2} placeholder="Write a reply..." />
                              <button onClick={() => handleSendReply(lead)} disabled={sendingReply || !replyContent.trim()} className="px-3 py-1.5 text-xs font-medium text-white dark:text-neutral-900 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-40 self-end inline-flex items-center gap-1.5">
                                {sendingReply ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                                Reply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Pagination ─── */}
        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
            >
              Previous
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-8 h-8 text-xs rounded-lg transition-all duration-150 cursor-pointer ${
                    pageNum === currentPage
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
            >
              Next
            </button>
          </nav>
        )}

        {/* ─── Email Draft Modal ─── */}
        {(emailDraft || generating || regenerating) && draftLead && (
          <div className="fixed inset-0 bg-black/20 dark:bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl dark:shadow-black/40 max-w-2xl w-full max-h-[85vh] overflow-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Cold email draft</h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">For {draftLead.name || draftLead.company || "this lead"}</p>
                </div>
                <button onClick={() => { setEmailDraft(null); setDraftLead(null); setRegenerating(false); }} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors duration-150 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-6 py-4">
                <div className="mb-4">
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">To</label>
                  <input type="email" value={draftLead?.email || ""} onChange={(e) => { if (draftLead) setDraftLead({ ...draftLead, email: e.target.value }); }} className={inputClass} placeholder="recipient@email.com" />
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-2">Tone</label>
                  <div className="flex flex-wrap gap-2">
                    {["professional and friendly", "casual", "formal", "urgent", "persuasive", "concise", "warm", "direct"].map((t) => (
                      <button key={t} type="button" onClick={() => setTone(t)} className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-150 cursor-pointer ${tone === t ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white" : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Purpose</label>
                  <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} className={`${inputClass} resize-none transition-all duration-300 ease-out`} rows={purposeFocused ? 4 : 1} onFocus={() => setPurposeFocused(true)} onBlur={() => purpose === defaultPurpose && setPurposeFocused(false)} placeholder="What's the goal of this email?" />
                </div>
                {regenerating || (generating && !emailDraft) ? (
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 space-y-3 animate-pulse">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-11/12" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-4/5" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
                  </div>
                ) : (
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{emailDraft}</div>
                )}
                <div className="flex gap-2 mt-4">
                  <button onClick={async () => { setCopied(true); await navigator.clipboard.writeText(emailDraft || ""); if (lastDraftId) { await fetch(`/api/leads/draft/${lastDraftId}/use`, { method: "POST" }); } setTimeout(() => setCopied(false), 1500); }} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer inline-flex items-center gap-1.5 ${copied ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950" : "text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"}`}>{copied ? <><TickIcon />Copied</> : "Copy"}</button>
                  <button onClick={() => handleSendEmail(draftLead?.email || "", `Partnership Opportunity - Michaelsoft Procurement`, emailDraft || "", lastDraftId || undefined)} disabled={sendingEmail || !draftLead?.email} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer inline-flex items-center gap-1.5 ${sentEmailId === lastDraftId ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950" : "text-white dark:text-neutral-900 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600"} disabled:opacity-40`}>{sendingEmail ? <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Sending...</> : sentEmailId === lastDraftId ? <><TickIcon className="text-emerald-600 dark:text-emerald-400" />Sent</> : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Send email</>}</button>
                  <button onClick={() => handleGenerateEmail(draftLead)} disabled={generating === draftLead.id || regenerating} className="px-3 py-1.5 text-xs font-medium text-white dark:text-neutral-900 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40">Regenerate</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
