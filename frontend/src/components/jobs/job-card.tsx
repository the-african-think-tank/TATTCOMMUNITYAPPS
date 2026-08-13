"use client";

import { useState } from "react";
import api from "@/services/api";
import { Heart, MapPin, Briefcase } from "lucide-react";
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

  return (
    <article className="bg-surface rounded-xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4 flex-1 min-w-0">
        <div className="size-12 rounded-lg bg-tatt-green-deep flex items-center justify-center text-tatt-lime font-bold text-sm shrink-0">
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
              <span className="bg-tatt-lime text-tatt-black text-xs font-bold px-2 py-0.5 rounded">
                NEW
              </span>
            )}
            <h3 className="font-bold text-foreground text-base leading-tight">
              {job.title}
            </h3>
          </div>
          <p className="text-tatt-gray text-sm">{job.companyName}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-tatt-gray text-xs">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3 shrink-0" />
              {job.location}
            </span>
            {salaryText && (
              <span className="flex items-center gap-1">
                {salaryText}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3 shrink-0" />
              {job.type}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="p-2 rounded-lg border border-border hover:bg-background transition-colors text-tatt-gray hover:text-tatt-lime disabled:opacity-50"
          aria-label={saved ? "Unsave job" : "Save job"}
        >
          <Heart
            className={`h-5 w-5 ${saved ? "fill-tatt-lime text-tatt-lime" : ""}`}
          />
        </button>
        <button
          type="button"
          onClick={() => !applied && onApplyClick(job)}
          disabled={applied}
          className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            applied 
              ? "bg-border text-tatt-gray cursor-not-allowed" 
              : "bg-tatt-lime text-tatt-black hover:brightness-95"
          }`}
        >
          {applied ? "Applied" : "Apply Now"}
        </button>
      </div>
    </article>
  );
}
