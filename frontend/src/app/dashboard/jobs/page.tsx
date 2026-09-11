"use client";

import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Loader2,
  Briefcase,
  Search,
  MapPin,
  Filter,
  Bookmark,
  Plus,
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingUp,
  Users,
  Check,
  ChevronDown,
  RotateCcw,
  Clock,
  LayoutGrid,
  X,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { JobCard } from "@/components/jobs/job-card";
import { JobApplicationModal } from "@/components/jobs/job-application-modal";
import { JobsSidebar } from "@/components/jobs/jobs-sidebar";
import { JOB_CATEGORIES, type JobListing, type JobsResponse } from "@/types/jobs";

const CATEGORIES = ["All Categories", ...JOB_CATEGORIES];

const LOCATION_OPTIONS = [
  { label: "All Locations", value: "All" },
  { label: "Africa", value: "Africa" },
  { label: "United States", value: "United States" },
  { label: "Remote (US & Africa)", value: "Remote" },
];

const TYPE_OPTIONS = [
  { label: "All Types", value: "All Types" },
  { label: "Full-time", value: "Full-time" },
  { label: "Part-time", value: "Part-time" },
  { label: "Contract", value: "Contract" },
  { label: "Internship", value: "Internship" },
];

const DATE_POSTED_OPTIONS = [
  { label: "Any time", value: "all" },
  { label: "Past 24 hours", value: "24h" },
  { label: "Past week", value: "7d" },
  { label: "Past month", value: "30d" },
];

const PAID_TIERS = ["UBUNTU", "IMANI", "KIONGOZI"];

function isPaidMember(tier: string | undefined) {
  return PAID_TIERS.includes(tier ?? "");
}

function getPaginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function PremiumGate() {
  const benefits = [
    { icon: Briefcase, title: "Curated Listings", desc: "Roles matched to TATT Professionals" },
    { icon: Star, title: "Priority Applications", desc: "Apply directly through the TATT platform" },
    { icon: TrendingUp, title: "Talent Matchmaking", desc: "Get discovered by top employers in our network" },
    { icon: Users, title: "TATT Job Alerts", desc: "Get notified when roles match your profile" },
  ];

  const plans = [
    { name: "Ubuntu", color: "bg-[#333] text-white", badge: "Entry" },
    { name: "Imani", color: "bg-tatt-black text-white border border-white/20", badge: "Growth" },
    { name: "Kiongozi", color: "bg-tatt-lime text-black", badge: "Elite" },
  ];

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-hidden">
      {/* ── Blurred background preview ───────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="bg-surface px-4 sm:px-8 py-6 flex items-center justify-between border-b border-border blur-sm opacity-50">
          <div>
            <div className="h-8 w-40 rounded-lg bg-foreground/20 mb-2" />
            <div className="h-4 w-64 rounded bg-foreground/10" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 rounded-lg bg-foreground/10" />
            <div className="h-10 w-28 rounded-lg bg-tatt-lime/20" />
          </div>
        </div>
        <div className="px-4 sm:px-8 py-6 blur-sm opacity-30 space-y-4">
          <div className="h-11 w-full rounded-lg bg-surface border border-border" />
          <div className="flex gap-2">
            {["Technology & Software", "Finance & Banking", "Agriculture"].map((c) => (
              <div key={c} className="h-8 px-4 rounded-lg bg-surface border border-border text-xs flex items-center text-foreground/50">{c}</div>
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-xl border border-border p-5 flex gap-4">
              <div className="size-12 rounded-lg bg-tatt-lime/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 rounded bg-foreground/20" />
                <div className="h-3.5 w-32 rounded bg-foreground/10" />
                <div className="flex gap-3">
                  <div className="h-3 w-24 rounded bg-foreground/10" />
                  <div className="h-3 w-16 rounded bg-foreground/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Paywall Card ─────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl bg-surface/90 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-10 shadow-2xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tatt-lime/10 border border-tatt-lime/30 text-tatt-lime text-xs font-black uppercase tracking-widest mb-6">
            Members Only Opportunity Board
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-3 tracking-tight">
            Exclusive Career Opportunities
          </h2>
          <p className="text-tatt-gray text-base max-w-lg mx-auto mb-8 leading-relaxed">
            Our curated opportunities network connects African professionals with high-impact executive, innovation, and leadership roles across the globe.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3.5 p-4 rounded-2xl bg-background/50 border border-border/60">
                <div className="size-9 rounded-xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime shrink-0">
                  <Icon className="size-4" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm leading-snug">{title}</h4>
                  <p className="text-tatt-gray text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <p className="text-xs text-tatt-gray uppercase tracking-widest font-black">
              Available to Ubuntu, Imani &amp; Kiongozi members
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard/upgrade"
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-8 rounded-xl font-black text-xs uppercase tracking-widest bg-tatt-lime text-tatt-black hover:brightness-95 transition-all shadow-lg active:scale-95"
              >
                Upgrade Membership
              </Link>
              <Link
                href="/dashboard"
                className="text-center py-3 text-xs font-black text-tatt-gray uppercase tracking-widest hover:text-foreground transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial values from URL query string
  const urlCategory = searchParams.get("category");
  const urlLocation = searchParams.get("location");
  const urlType = searchParams.get("type");
  const urlDate = searchParams.get("datePosted");
  const urlSearch = searchParams.get("search") ?? searchParams.get("q") ?? "";
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10);
  const urlJobId = searchParams.get("jobId");

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [meta, setMeta] = useState<JobsResponse["meta"] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(urlSearch);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [category, setCategory] = useState(urlCategory || "All Categories");
  const [location, setLocation] = useState(urlLocation || "All");
  const [type, setType] = useState(urlType || "All Types");
  const [datePosted, setDatePosted] = useState(urlDate || "all");
  const [page, setPage] = useState(Number.isNaN(urlPage) || urlPage < 1 ? 1 : urlPage);

  const [applyModalJob, setApplyModalJob] = useState<JobListing | null>(null);

  // Dropdown open states
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const categoryRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const jobListTopRef = useRef<HTMLDivElement>(null);

  const updateUrl = useCallback(
    (updates: Record<string, string | number | undefined | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (
          val == null ||
          val === "" ||
          val === "All" ||
          val === "All Categories" ||
          val === "All Types" ||
          val === "all" ||
          (key === "page" && Number(val) <= 1)
        ) {
          current.delete(key);
        } else {
          current.set(key, String(val));
        }
      });
      const qs = current.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (categoryRef.current && !categoryRef.current.contains(target)) {
        setCategoryOpen(false);
      }
      if (locationRef.current && !locationRef.current.contains(target)) {
        setLocationOpen(false);
      }
      if (typeRef.current && !typeRef.current.contains(target)) {
        setTypeOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(target)) {
        setDateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userTier = user?.communityTier;

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (category !== "All Categories") params.category = category;
      if (location !== "All") params.location = location;
      if (type !== "All Types") params.type = type;
      if (datePosted !== "all") params.datePosted = datePosted;

      const { data } = await api.get<JobsResponse>("/jobs", { params });
      setJobs(Array.isArray(data?.data) ? data.data : []);
      setMeta(data?.meta ?? null);
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string }; status?: number } }).response
          : undefined;
      setError(res?.data?.message ?? "Failed to load opportunities.");
      setJobs([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, search, category, location, type, datePosted]);

  const fetchSavedIds = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await api.get<string[]>("/jobs/saved-ids");
      setSavedIds(new Set(Array.isArray(data) ? data : []));
    } catch {
      setSavedIds(new Set());
    }
  }, [user?.id]);

  const fetchAppliedIds = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await api.get<string[]>("/jobs/applied-ids");
      setAppliedIds(new Set(Array.isArray(data) ? data : []));
    } catch {
      setAppliedIds(new Set());
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (!isPaidMember(user.communityTier)) { setLoading(false); return; }
    fetchJobs();
  }, [fetchJobs, user]);

  useEffect(() => {
    if (user && isPaidMember(user.communityTier)) {
      fetchSavedIds();
      fetchAppliedIds();
    }
  }, [fetchSavedIds, fetchAppliedIds, user]);

  // Deep linking: Open modal if jobId is in URL
  useEffect(() => {
    if (!urlJobId) {
      if (applyModalJob) setApplyModalJob(null);
      return;
    }
    const found = jobs.find((j) => j.id === urlJobId);
    if (found) {
      setApplyModalJob(found);
    } else {
      api
        .get<JobListing>(`/jobs/${urlJobId}`)
        .then((res) => {
          if (res.data) setApplyModalJob(res.data);
        })
        .catch(() => {});
    }
  }, [urlJobId, jobs]);

  const handleOpenJobModal = (job: JobListing) => {
    setApplyModalJob(job);
    updateUrl({ jobId: job.id });
  };

  const handleCloseJobModal = () => {
    setApplyModalJob(null);
    updateUrl({ jobId: undefined });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
    updateUrl({ search: searchInput.trim() || undefined, page: 1 });
  };

  const handleResetFilters = () => {
    setSearch("");
    setSearchInput("");
    setCategory("All Categories");
    setLocation("All");
    setType("All Types");
    setDatePosted("all");
    setPage(1);
    updateUrl({
      search: undefined,
      category: undefined,
      location: undefined,
      type: undefined,
      datePosted: undefined,
      page: undefined,
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === page) return;
    setPage(newPage);
    updateUrl({ page: newPage });
    jobListTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const hasActiveFilters =
    category !== "All Categories" ||
    location !== "All" ||
    type !== "All Types" ||
    datePosted !== "all" ||
    search.trim() !== "" ||
    searchInput.trim() !== "";

  const handleSaveToggle = useCallback((jobId: string, saved: boolean) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }, []);

  // While auth is resolving, show spinner
  if (user === undefined || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-tatt-lime" />
      </div>
    );
  }

  // Show gate for free members
  if (!isPaidMember(userTier)) {
    return <PremiumGate />;
  }

  const totalPages = meta?.totalPages ?? 0;

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-surface px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Opportunities</h1>
                <span className="px-2 py-0.5 rounded-md bg-tatt-lime/10 border border-tatt-lime/30 text-tatt-lime text-[10px] font-black uppercase tracking-widest">Members Only</span>
              </div>
              <p className="text-tatt-gray text-sm">Curated leadership and innovation roles for our network.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/jobs/saved"
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg font-bold bg-tatt-gray/20 text-foreground hover:bg-tatt-gray/30 transition-all cursor-pointer active:scale-95 text-sm"
              >
                <Bookmark className="h-4 w-4" />
                Saved Roles
              </Link>
              {userTier === "KIONGOZI" && (
                <Link
                  href="/dashboard/jobs/post"
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg font-bold bg-tatt-lime text-tatt-black hover:brightness-95 transition-all cursor-pointer active:scale-95 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Post a Listing
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div ref={jobListTopRef} className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-tatt-lime/10 border border-tatt-lime/30 text-foreground font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Search Toolbar */}
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-tatt-gray pointer-events-none" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by job title, company, keyword..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-foreground placeholder:text-tatt-gray focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all text-sm"
                    aria-label="Search jobs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-tatt-lime text-tatt-black font-bold text-sm hover:brightness-95 cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
                >
                  Search
                </button>
              </div>

              {/* Filter Dropdowns Toolbar */}
              <div className="flex gap-2 flex-wrap items-center">
                {/* Category Dropdown */}
                <div ref={categoryRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryOpen((prev) => !prev);
                      setLocationOpen(false);
                      setTypeOpen(false);
                      setDateOpen(false);
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95 select-none focus:outline-none focus:ring-2 focus:ring-tatt-lime/50 ${
                      category !== "All Categories"
                        ? "border-tatt-lime/50 bg-tatt-lime/10 text-foreground font-semibold"
                        : "border-border bg-surface text-foreground hover:bg-background"
                    }`}
                    aria-expanded={categoryOpen}
                    aria-haspopup="listbox"
                  >
                    <LayoutGrid className="h-4 w-4 text-tatt-lime shrink-0" />
                    <span className="max-w-[130px] sm:max-w-[170px] truncate">{category}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-tatt-gray transition-transform duration-200 ${
                        categoryOpen ? "rotate-180 text-foreground" : ""
                      }`}
                    />
                  </button>

                  {categoryOpen && (
                    <div className="absolute left-0 mt-2 w-64 rounded-xl border border-border bg-surface shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 max-h-80 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-tatt-gray border-b border-border/50 mb-1">
                        Filter by Category
                      </div>
                      {CATEGORIES.map((cat) => {
                        const isSelected = category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setCategory(cat);
                              setPage(1);
                              updateUrl({ category: cat, page: 1 });
                              setCategoryOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer active:scale-[0.98] ${
                              isSelected
                                ? "bg-tatt-lime/15 text-tatt-lime font-bold"
                                : "text-foreground hover:bg-background/80"
                            }`}
                          >
                            <span className="truncate">{cat}</span>
                            {isSelected && <Check className="h-4 w-4 text-tatt-lime shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Location Dropdown */}
                <div ref={locationRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationOpen((prev) => !prev);
                      setCategoryOpen(false);
                      setTypeOpen(false);
                      setDateOpen(false);
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95 select-none focus:outline-none focus:ring-2 focus:ring-tatt-lime/50 ${
                      location !== "All"
                        ? "border-tatt-lime/50 bg-tatt-lime/10 text-foreground font-semibold"
                        : "border-border bg-surface text-foreground hover:bg-background"
                    }`}
                    aria-expanded={locationOpen}
                    aria-haspopup="listbox"
                  >
                    <MapPin className="h-4 w-4 text-tatt-lime shrink-0" />
                    <span>{LOCATION_OPTIONS.find((opt) => opt.value === location)?.label ?? location}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-tatt-gray transition-transform duration-200 ${
                        locationOpen ? "rotate-180 text-foreground" : ""
                      }`}
                    />
                  </button>

                  {locationOpen && (
                    <div className="absolute left-0 mt-2 w-56 rounded-xl border border-border bg-surface shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-tatt-gray border-b border-border/50 mb-1">
                        Filter by Location
                      </div>
                      {LOCATION_OPTIONS.map((opt) => {
                        const isSelected = location === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setLocation(opt.value);
                              setPage(1);
                              updateUrl({ location: opt.value, page: 1 });
                              setLocationOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer active:scale-[0.98] ${
                              isSelected
                                ? "bg-tatt-lime/15 text-tatt-lime font-bold"
                                : "text-foreground hover:bg-background/80"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="h-4 w-4 text-tatt-lime shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Job Type Dropdown */}
                <div ref={typeRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setTypeOpen((prev) => !prev);
                      setCategoryOpen(false);
                      setLocationOpen(false);
                      setDateOpen(false);
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95 select-none focus:outline-none focus:ring-2 focus:ring-tatt-lime/50 ${
                      type !== "All Types"
                        ? "border-tatt-lime/50 bg-tatt-lime/10 text-foreground font-semibold"
                        : "border-border bg-surface text-foreground hover:bg-background"
                    }`}
                    aria-expanded={typeOpen}
                    aria-haspopup="listbox"
                  >
                    <Filter className="h-4 w-4 text-tatt-lime shrink-0" />
                    <span>{type}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-tatt-gray transition-transform duration-200 ${
                        typeOpen ? "rotate-180 text-foreground" : ""
                      }`}
                    />
                  </button>

                  {typeOpen && (
                    <div className="absolute left-0 mt-2 w-48 rounded-xl border border-border bg-surface shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-tatt-gray border-b border-border/50 mb-1">
                        Filter by Type
                      </div>
                      {TYPE_OPTIONS.map((opt) => {
                        const isSelected = type === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setType(opt.value);
                              setPage(1);
                              updateUrl({ type: opt.value, page: 1 });
                              setTypeOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer active:scale-[0.98] ${
                              isSelected
                                ? "bg-tatt-lime/15 text-tatt-lime font-bold"
                                : "text-foreground hover:bg-background/80"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="h-4 w-4 text-tatt-lime shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Date Posted Dropdown */}
                <div ref={dateRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setDateOpen((prev) => !prev);
                      setCategoryOpen(false);
                      setLocationOpen(false);
                      setTypeOpen(false);
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95 select-none focus:outline-none focus:ring-2 focus:ring-tatt-lime/50 ${
                      datePosted !== "all"
                        ? "border-tatt-lime/50 bg-tatt-lime/10 text-foreground font-semibold"
                        : "border-border bg-surface text-foreground hover:bg-background"
                    }`}
                    aria-expanded={dateOpen}
                    aria-haspopup="listbox"
                  >
                    <Clock className="h-4 w-4 text-tatt-lime shrink-0" />
                    <span>{DATE_POSTED_OPTIONS.find((opt) => opt.value === datePosted)?.label ?? "Date Posted"}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-tatt-gray transition-transform duration-200 ${
                        dateOpen ? "rotate-180 text-foreground" : ""
                      }`}
                    />
                  </button>

                  {dateOpen && (
                    <div className="absolute left-0 mt-2 w-48 rounded-xl border border-border bg-surface shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-tatt-gray border-b border-border/50 mb-1">
                        Date Posted
                      </div>
                      {DATE_POSTED_OPTIONS.map((opt) => {
                        const isSelected = datePosted === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setDatePosted(opt.value);
                              setPage(1);
                              updateUrl({ datePosted: opt.value, page: 1 });
                              setDateOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-left transition-colors cursor-pointer active:scale-[0.98] ${
                              isSelected
                                ? "bg-tatt-lime/15 text-tatt-lime font-bold"
                                : "text-foreground hover:bg-background/80"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="h-4 w-4 text-tatt-lime shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-tatt-lime hover:bg-tatt-lime/10 border border-tatt-lime/30 cursor-pointer active:scale-95 transition-all"
                    title="Reset all filters"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
              </div>

              {/* Removable Active Filter Chips Bar */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-tatt-gray font-semibold">Active Filters:</span>
                  {search && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-xs text-foreground">
                      <span>Keyword: &ldquo;{search}&rdquo;</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setSearchInput("");
                          setPage(1);
                          updateUrl({ search: undefined, q: undefined, page: 1 });
                        }}
                        className="text-tatt-gray hover:text-foreground cursor-pointer"
                        aria-label="Remove search filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {category !== "All Categories" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-xs text-foreground">
                      <span>{category}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCategory("All Categories");
                          setPage(1);
                          updateUrl({ category: undefined, page: 1 });
                        }}
                        className="text-tatt-gray hover:text-foreground cursor-pointer"
                        aria-label="Remove category filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {location !== "All" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-xs text-foreground">
                      <span>{LOCATION_OPTIONS.find((o) => o.value === location)?.label ?? location}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLocation("All");
                          setPage(1);
                          updateUrl({ location: undefined, page: 1 });
                        }}
                        className="text-tatt-gray hover:text-foreground cursor-pointer"
                        aria-label="Remove location filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {type !== "All Types" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-xs text-foreground">
                      <span>{type}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setType("All Types");
                          setPage(1);
                          updateUrl({ type: undefined, page: 1 });
                        }}
                        className="text-tatt-gray hover:text-foreground cursor-pointer"
                        aria-label="Remove type filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {datePosted !== "all" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-xs text-foreground">
                      <span>{DATE_POSTED_OPTIONS.find((o) => o.value === datePosted)?.label ?? datePosted}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDatePosted("all");
                          setPage(1);
                          updateUrl({ datePosted: undefined, page: 1 });
                        }}
                        className="text-tatt-gray hover:text-foreground cursor-pointer"
                        aria-label="Remove date filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-tatt-lime hover:underline font-bold cursor-pointer ml-1"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </form>

            {/* Live Results Counter Bar */}
            {!loading && meta && meta.total > 0 && (
              <div className="flex items-center justify-between text-xs text-tatt-gray font-medium pb-2 border-b border-border/50">
                <p>
                  Showing <span className="text-foreground font-bold">{Math.min((page - 1) * meta.limit + 1, meta.total)}–{Math.min(page * meta.limit, meta.total)}</span> of <span className="text-foreground font-bold">{meta.total}</span> {meta.total === 1 ? "opportunity" : "opportunities"}
                  {category !== "All Categories" && <span> in <span className="text-tatt-lime font-bold">{category}</span></span>}
                  {location !== "All" && <span> • <span className="text-foreground font-bold">{LOCATION_OPTIONS.find(o => o.value === location)?.label ?? location}</span></span>}
                </p>
              </div>
            )}

            {/* Job list */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-tatt-lime mb-4" />
                <p className="text-tatt-gray font-medium">Loading opportunities...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-20 text-center bg-surface/50 border border-border/60 rounded-2xl p-8">
                <Briefcase className="h-14 w-14 mx-auto text-tatt-gray opacity-50 mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">No opportunities found</h2>
                <p className="text-tatt-gray max-w-md mx-auto mb-5 text-sm leading-relaxed">
                  {hasActiveFilters
                    ? "No jobs match your selected filters. Try broadening your criteria or clearing filters."
                    : "Check back soon for curated roles, or post a listing if you're an employer."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-tatt-lime text-tatt-black font-bold text-sm hover:brightness-95 cursor-pointer active:scale-95 transition-all shadow-sm"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset all filters
                    </button>
                  )}
                  <a
                    href="#job-alerts"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface text-foreground font-semibold text-sm hover:bg-background cursor-pointer active:scale-95 transition-all"
                  >
                    <Bell className="h-4 w-4 text-tatt-lime" />
                    Set an Alert for this Search
                  </a>
                </div>
              </div>
            ) : (
              <>
                <ul className="space-y-4">
                  {jobs.map((job) => (
                    <li key={job.id}>
                      <JobCard
                        job={job}
                        saved={savedIds.has(job.id)}
                        applied={appliedIds.has(job.id)}
                        onSaveToggle={handleSaveToggle}
                        onApplyClick={handleOpenJobModal}
                      />
                    </li>
                  ))}
                </ul>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-8 select-none">
                    <button
                      type="button"
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-background hover:border-tatt-gray/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all text-foreground"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    {getPaginationPages(page, totalPages).map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="min-w-[36px] h-10 flex items-center justify-center text-tatt-gray font-bold text-sm select-none"
                          >
                            ...
                          </span>
                        );
                      }
                      const isActive = page === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePageChange(p)}
                          aria-current={isActive ? "page" : undefined}
                          className={`min-w-[40px] h-10 px-3 rounded-lg font-bold text-sm transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                            isActive
                              ? "bg-tatt-lime text-tatt-black shadow-md ring-2 ring-tatt-lime/40"
                              : "bg-surface border border-border text-foreground hover:border-tatt-gray/40 hover:bg-background"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-background hover:border-tatt-gray/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-all text-foreground"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div id="job-alerts" className="lg:col-span-1">
            <JobsSidebar />
          </div>
        </div>
      </div>

      {applyModalJob && (
        <JobApplicationModal
          job={applyModalJob}
          user={user}
          onClose={handleCloseJobModal}
          onSuccess={() => {
            setAppliedIds((prev) => {
              const next = new Set(prev);
              next.add(applyModalJob.id);
              return next;
            });
          }}
        />
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-tatt-lime" />
        </div>
      }
    >
      <JobsContent />
    </Suspense>
  );
}
