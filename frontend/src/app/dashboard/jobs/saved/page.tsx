"use client";

import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, Bookmark, Lock } from "lucide-react";
import { JobCard } from "@/components/jobs/job-card";
import { JobApplicationModal } from "@/components/jobs/job-application-modal";
import type { JobListing } from "@/types/jobs";

const PAID_TIERS = ["UBUNTU", "IMANI", "KIONGOZI"];

export default function SavedJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [applyModalJob, setApplyModalJob] = useState<JobListing | null>(null);

  const isPaid = PAID_TIERS.includes(user?.communityTier ?? "");

  useEffect(() => {
    if (!user?.id || !isPaid) {
      setLoading(false);
      return;
    }
    const fetchSaved = async () => {
      try {
        const [savedRes, appliedRes] = await Promise.all([
          api.get<JobListing[]>("/jobs/saved"),
          api.get<string[]>("/jobs/applied-ids")
        ]);
        setJobs(Array.isArray(savedRes.data) ? savedRes.data : []);
        setSavedIds(new Set((Array.isArray(savedRes.data) ? savedRes.data : []).map((j) => j.id)));
        setAppliedIds(new Set(Array.isArray(appliedRes.data) ? appliedRes.data : []));
      } catch {
        setJobs([]);
        setSavedIds(new Set());
        setAppliedIds(new Set());
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, [user?.id]);

  const handleSaveToggle = (jobId: string, saved: boolean) => {
    if (!saved) setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  };

  // Gate for non-paid users
  if (!loading && !isPaid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
        <div className="size-16 rounded-2xl bg-tatt-lime/10 border border-tatt-lime/20 flex items-center justify-center mb-6">
          <Lock className="size-8 text-tatt-lime" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">Members Only</h1>
        <p className="text-tatt-gray text-sm max-w-sm mb-6">Saved roles are available to paid TATT members. Upgrade to access the full Job Board.</p>
        <Link href="/dashboard/upgrade" className="px-6 py-3 bg-tatt-lime text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-tatt-lime/20">
          Upgrade Now
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="border-b border-border bg-surface px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-[1920px] mx-auto">
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-2 text-tatt-gray hover:text-tatt-lime text-sm font-medium mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Opportunities
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Saved Roles</h1>
          <p className="text-tatt-gray text-sm mt-0.5">Jobs you have saved for later</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-tatt-lime" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center">
            <Bookmark className="h-14 w-14 mx-auto text-tatt-gray opacity-50 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">No saved roles</h2>
            <p className="text-tatt-gray mb-6">Save jobs from the Opportunities page to view them here.</p>
            <Link href="/dashboard/jobs" className="text-tatt-lime font-medium hover:underline">
              Browse opportunities
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {jobs.map((job) => (
              <li key={job.id}>
                <JobCard
                  job={job}
                  saved={savedIds.has(job.id)}
                  applied={appliedIds.has(job.id)}
                  onSaveToggle={handleSaveToggle}
                  onApplyClick={setApplyModalJob}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {applyModalJob && (
        <JobApplicationModal
          job={applyModalJob}
          user={user}
          onClose={() => setApplyModalJob(null)}
          onSuccess={() => {
            setAppliedIds(prev => {
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
