"use client";

import { useState } from "react";
import api from "@/services/api";
import { Heart, MapPin, Briefcase, ExternalLink, Clock } from "lucide-react";
import type { JobListing } from "@/types/jobs";

type JobCardProps = {
  job: JobListing;
  saved?: boolean;
  applied?: boolean;
  onSaveToggle?: (jobId: string, saved: boolean) => void;
  onApplyClick: (job: JobListing) => void;
};

function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDatePosted(dateString?: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    if (diffHours === 0) return "Just now";
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function JobCard({ job, saved = false, applied = false, onSaveToggle, onApplyClick }: JobCardProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      const { data } = await api.post<{ saved: boolean }>(`/jobs/${job.id}/save`);
      onSaveToggle?.(job.id, data.saved);
    } finally {
      setSaving(false);
    }
  };

  const salaryText =
    job.salaryLabel ||
    (job.salaryMin != null && job.salaryMax != null
      ? `$${Number(job.salaryMin) / 1000}K - $${Number(job.salaryMax) / 1000}K / yr`
      : job.salaryMin != null
        ? `$${Number(job.salaryMin) / 1000}K / yr`
        : null);

  const datePostedText = formatDatePosted(job.createdAt);

  return (
    <article
      onClick={() => onApplyClick(job)}
      className="group bg-surface rounded-xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-tatt-lime/40 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex gap-4 flex-1 min-w-0">
        <div className="size-12 rounded-lg bg-tatt-green-deep flex items-center justify-center text-tatt-lime font-bold text-sm shrink-0 shadow-inner">
          {job.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.companyLogoUrl}
              alt=""
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            companyInitials(job.companyName)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {job.isNew && (
              <span className="bg-tatt-lime text-tatt-black text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                NEW
              </span>
            )}
            <h3 className="font-bold text-foreground text-base leading-tight group-hover:text-tatt-lime transition-colors">
              {job.title}
            </h3>
          </div>
          <p className="text-tatt-gray text-sm">{job.companyName}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-tatt-gray text-xs">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {job.location}
            </span>
            {salaryText && (
              <span className="flex items-center gap-1">
                {salaryText}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              {job.type}
            </span>
            {datePostedText && (
              <span className="flex items-center gap-1 text-tatt-gray/80">
                <Clock className="h-3.5 w-3.5 shrink-0 text-tatt-lime/80" />
                {datePostedText}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="p-2.5 rounded-lg border border-border hover:bg-background hover:border-tatt-gray/40 transition-colors text-tatt-gray hover:text-tatt-lime disabled:opacity-50 cursor-pointer active:scale-95"
          aria-label={saved ? "Unsave job" : "Save job"}
        >
          <Heart
            className={`h-4 w-4 ${saved ? "fill-tatt-lime text-tatt-lime" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={() => onApplyClick(job)}
          className="min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-semibold transition-all border border-border bg-surface text-foreground hover:bg-background hover:border-tatt-gray/40 active:scale-95 cursor-pointer"
        >
          View Details
        </button>

        {job.externalUrl ? (
          <a
            href={job.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="min-h-[40px] px-4 py-2 rounded-lg text-sm font-bold transition-all bg-tatt-lime text-tatt-black hover:brightness-95 active:scale-95 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            Apply ↗
          </a>
        ) : (
          <button
            type="button"
            onClick={() => !applied && onApplyClick(job)}
            disabled={applied}
            className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 cursor-pointer ${
              applied 
                ? "bg-border text-tatt-gray cursor-not-allowed opacity-50" 
                : "bg-tatt-lime text-tatt-black hover:brightness-95 shadow-sm"
            }`}
          >
            {applied ? "Applied" : "Apply Now"}
          </button>
        )}
      </div>
    </article>
  );
}
