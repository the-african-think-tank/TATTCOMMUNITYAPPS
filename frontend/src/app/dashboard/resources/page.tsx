"use client";

import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Folder,
  BookOpen,
  FileText,
  Video,
  Handshake,
  Search,
  Lock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Eye,
  X
} from "lucide-react";
import type { ResourceCard, ResourcesListResponse, ResourceType } from "@/types/resources";
import { AppModal } from "@/components/modals/app-modal";

const RESOURCE_TYPES: { value: ResourceType | ""; label: string; icon: typeof FileText }[] = [
  { value: "", label: "All", icon: Folder },
  { value: "GUIDE", label: "Guides", icon: BookOpen },
  { value: "DOCUMENT", label: "Documents", icon: FileText },
  { value: "VIDEO", label: "Videos", icon: Video },
  { value: "PARTNERSHIP", label: "Partnerships", icon: Handshake },
];

function ResourceTypeIcon({ type }: { type: ResourceType }) {
  const t = RESOURCE_TYPES.find((r) => r.value === type);
  const Icon = t?.icon ?? FileText;
  return <Icon className="h-5 w-5 text-tatt-gray" />;
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent ?? div.innerText ?? "";
  }
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ResourceCard[]>([]);
  const [meta, setMeta] = useState<ResourcesListResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ResourceType | "">("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Quick View Preview Modal State
  const [previewResource, setPreviewResource] = useState<ResourceCard | null>(null);

  const fetchResources = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get<ResourcesListResponse>("/resources", { params });
      setItems(data?.data ?? []);
      setMeta(data?.meta ?? null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(typeof msg === "string" ? msg : "Failed to load resources.");
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, typeFilter, page]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) ||
        (item.description && stripHtml(item.description).toLowerCase().includes(q))
    );
  }, [items, search]);

  const displayMeta = search.trim() ? null : meta;

  const handleOpenQuickView = (resource: ResourceCard, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewResource(resource);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground pb-12">
      {/* Top Banner */}
      <div className="border-b border-border bg-surface px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-tatt-lime/10 text-tatt-lime border border-tatt-lime/20">
                <Folder className="h-5 w-5 sm:h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  Knowledge &amp; Resources
                </h1>
                <p className="text-tatt-gray text-sm mt-0.5">
                  Guides, documents, videos and partnership opportunities for the network.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-tatt-lime/10 border border-tatt-lime/30 text-foreground font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray h-5 w-5 pointer-events-none" />
            <input
              type="search"
              placeholder="Search by title or tag..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-foreground text-sm placeholder:text-tatt-gray focus:outline-none focus:ring-2 focus:ring-tatt-lime"
              aria-label="Search resources"
            />
          </form>
          <div className="flex flex-wrap gap-2">
            {RESOURCE_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value || "all"}
                type="button"
                onClick={() => {
                  setTypeFilter(value);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg font-bold text-sm transition-all cursor-pointer active:scale-95 ${
                  typeFilter === value
                    ? "bg-tatt-lime text-tatt-black"
                    : "bg-tatt-gray/20 text-foreground hover:bg-tatt-gray/30"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-tatt-lime" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <Folder className="h-14 w-14 mx-auto text-tatt-gray opacity-50 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">No resources found</h2>
            <p className="text-tatt-gray">
              {search.trim() ? "Try a different search or filter." : "No resources match your filters yet."}
            </p>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredItems.map((resource) => {
                const cleanDesc = stripHtml(resource.description);

                return (
                  <li key={resource.id} className="relative">
                    <Link
                      href={resource.isPartnership ? (resource.isLocked ? "/dashboard/upgrade" : `/dashboard/partnerships/${resource.id}`) : `/dashboard/resources/${resource.id}`}
                      target="_self"
                      className={`relative flex flex-col justify-between h-full rounded-xl border border-border bg-surface p-4 sm:p-5 hover:border-tatt-lime/50 hover:shadow-md transition-all text-left group ${resource.isLocked ? "opacity-80 grayscale-[0.5]" : ""}`}
                    >
                      <div>
                        {/* Top Header: Lock / Quick View */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            {resource.isLocked && (
                              <div className="p-1 bg-background rounded-full border border-border" title="Tier Locked">
                                <Lock className="size-3 text-tatt-gray" />
                              </div>
                            )}
                            <span className="text-[10px] font-black text-tatt-gray uppercase tracking-widest">{resource.type}</span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleOpenQuickView(resource, e)}
                            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider p-1.5 rounded-lg bg-tatt-gray/10 hover:bg-tatt-lime hover:text-tatt-black text-tatt-gray transition-all cursor-pointer active:scale-95"
                            title="Quick View full description & details"
                          >
                            <Eye className="size-3.5" /> Preview
                          </button>
                        </div>

                        {/* Title & Icon */}
                        <div className="flex items-center gap-2.5 mb-3">
                          {resource.thumbnailUrl ? (
                            <img
                              src={resource.thumbnailUrl}
                              alt=""
                              className="size-8 sm:size-9 rounded-lg object-cover shrink-0 border border-border mt-0.5"
                            />
                          ) : (
                            <div className="size-8 sm:size-9 rounded-lg bg-tatt-lime/10 flex items-center justify-center shrink-0 border border-tatt-lime/20 mt-0.5">
                              <ResourceTypeIcon type={resource.type} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-foreground leading-snug whitespace-normal break-words text-sm sm:text-base">
                              {resource.title}
                            </h3>
                          </div>
                        </div>

                        {/* Truncated Description on Grid Card */}
                        {cleanDesc && (
                          <div className="mb-3">
                            <p className="text-sm text-tatt-gray transition-all leading-relaxed line-clamp-2">
                              {cleanDesc}
                            </p>
                            {cleanDesc.length > 80 && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenQuickView(resource, e)}
                                className="text-[11px] font-bold text-tatt-lime hover:underline mt-1.5 inline-block cursor-pointer"
                              >
                                Read more
                              </button>
                            )}
                          </div>
                        )}

                        {/* Tags */}
                        {resource.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {resource.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded bg-tatt-lime/20 text-tatt-green-deep font-medium"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Action CTA */}
                      <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-tatt-lime group-hover:underline">
                          {resource.isPartnership ? (resource.isLocked ? "Upgrade to Unlock" : (resource.buttonLabel || "Redeem Offer")) : "View resource"}
                        </span>
                        {resource.isPartnership && !resource.isLocked ? <ExternalLink className="h-3.5 w-3.5 text-tatt-lime" /> : <ChevronRight className="h-3.5 w-3.5 text-tatt-lime group-hover:translate-x-1 transition-transform" />}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {displayMeta && displayMeta.totalPages > 1 && !search.trim() && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="min-h-[44px] px-3 rounded-lg border border-border bg-surface text-foreground disabled:opacity-50 hover:bg-tatt-gray/10 transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="min-h-[44px] px-4 flex items-center text-sm text-tatt-gray font-bold">
                  Page {page} of {displayMeta.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= displayMeta.totalPages}
                  className="min-h-[44px] px-3 rounded-lg border border-border bg-surface text-foreground disabled:opacity-50 hover:bg-tatt-gray/10 transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hero UI AppModal Quick View */}
      <AppModal
        isOpen={!!previewResource}
        onClose={() => setPreviewResource(null)}
        size="lg"
        headerExtra={
          previewResource ? (
            previewResource.thumbnailUrl ? (
              <img
                src={previewResource.thumbnailUrl}
                alt={previewResource.title}
                className="size-12 rounded-xl object-cover shrink-0 border border-border"
              />
            ) : (
              <div className="size-12 rounded-xl bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center shrink-0">
                <ResourceTypeIcon type={previewResource.type} />
              </div>
            )
          ) : null
        }
        title={previewResource?.title}
        footer={
          previewResource ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setPreviewResource(null)}
                className="px-5 py-2 text-xs font-black uppercase tracking-widest text-tatt-gray hover:text-foreground transition-colors cursor-pointer active:scale-95"
              >
                Close
              </button>
              <Link
                href={previewResource.isPartnership ? (previewResource.isLocked ? "/dashboard/upgrade" : `/dashboard/partnerships/${previewResource.id}`) : `/dashboard/resources/${previewResource.id}`}
                onClick={() => setPreviewResource(null)}
                className="inline-flex items-center gap-2 bg-tatt-lime text-tatt-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-105 transition-all shadow-md cursor-pointer active:scale-95"
              >
                {previewResource.isPartnership ? (previewResource.isLocked ? "Upgrade to Unlock" : (previewResource.buttonLabel || "Access Offer")) : "Open Resource"}
                <ExternalLink size={14} />
              </Link>
            </div>
          ) : null
        }
      >
        {previewResource && (
          <div className="space-y-4">
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-tatt-lime/20 text-tatt-green-deep border border-tatt-lime/30">
                {previewResource.type}
              </span>
              {previewResource.isLocked && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-tatt-black text-tatt-lime border border-white/10 flex items-center gap-1">
                  <Lock size={10} /> Tier Restricted
                </span>
              )}
            </div>
        
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">Full Description</h4>
              <div className="text-sm sm:text-base text-tatt-gray leading-relaxed font-medium whitespace-pre-line">
                {stripHtml(previewResource.description || "No description provided for this resource.")}
              </div>
            </div>

            {previewResource.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                {previewResource.tags.map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-lg bg-tatt-lime/10 text-tatt-green-deep font-bold border border-tatt-lime/20">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </AppModal>
    </div>
  );
}
