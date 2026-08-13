"use client";

import { useState, useRef } from "react";
import api from "@/services/api";
import { X, Upload, Loader2, ArrowRight, Star, Briefcase } from "lucide-react";
import type { JobListing, ApplyJobPayload } from "@/types/jobs";
import type { User } from "@/context/auth-context";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [".pdf", ".doc", ".docx"];

type JobApplicationModalProps = {
  job: JobListing;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function JobApplicationModal({
  job,
  user,
  onClose,
  onSuccess,
}: JobApplicationModalProps) {
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [fullName, setFullName] = useState(
    user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : ""
  );
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- BUSINESS SPOTLIGHT PRE-FILL LOGIC --
  const isKiongoziListing = job.postedBy?.communityTier === "KIONGOZI";
  const employerName = ((isKiongoziListing ? (job.postedBy?.businessName || job.companyName) : job.companyName) || "Company").trim() || "Company";
  const employerWebsite = isKiongoziListing ? (job.postedBy?.businessProfileLink || job.companyWebsite) : job.companyWebsite;
  const employerIndustry = ((isKiongoziListing ? (job.postedBy?.industry || job.category) : job.category) || "Industry").trim() || "Industry";
  const employerRole = isKiongoziListing ? job.postedBy?.businessRole : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    if (!file) {
      setResumeFile(null);
      setResumeUrl(null);
      return;
    }
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      setUploadError("Please upload PDF, DOC, or DOCX.");
      setResumeFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Maximum file size: 5MB.");
      setResumeFile(null);
      return;
    }
    setResumeFile(file);
    setResumeUrl(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setUploadError(null);
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      setUploadError("Please upload PDF, DOC, or DOCX.");
      setResumeFile(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("Maximum file size: 5MB.");
      setResumeFile(null);
      return;
    }
    setResumeFile(file);
    setResumeUrl(null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    let finalResumeUrl = resumeUrl;
    if (resumeFile && !resumeUrl) {
      const formData = new FormData();
      formData.append("files", resumeFile);
      try {
        const { data } = await api.post<{ files: { url: string }[] }>("/uploads/media", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalResumeUrl = data.files?.[0]?.url ?? null;
      } catch (err) {
        setError("Failed to upload resume. Try again.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload: ApplyJobPayload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        resumeUrl: finalResumeUrl || undefined,
        coverLetter: coverLetter.trim() || undefined,
      };
      await api.post(`/jobs/${job.id}/apply`, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined;
      setError(res?.data?.message ?? "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatList = (text: string | null | undefined) => {
    if (!text) return null;
    return text.split("\n").filter(line => line.trim().length > 0).map((line, i) => (
      <div key={i} className="flex gap-2">
        <span className="text-tatt-lime font-bold">•</span>
        <span>{line.replace(/^[-*•]\s+/, "")}</span>
      </div>
    ));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-tatt-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-modal-title"
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top Right (Z-index high) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-surface border border-border shadow-md hover:bg-background text-tatt-gray hover:text-foreground transition-all z-20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content Area */}
        {!showApplyForm ? (
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 hide-scrollbar scroll-smooth">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-16 rounded-2xl bg-tatt-green-deep flex items-center justify-center text-tatt-lime text-2xl font-black shrink-0">
                  {job.companyLogoUrl ? (
                    <img src={job.companyLogoUrl} alt={employerName} className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    employerName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-tatt-lime">{employerIndustry}</span>
                  <h2 id="application-modal-title" className="text-2xl font-black text-foreground mt-0.5 leading-tight">{job.title}</h2>
                  <p className="text-tatt-gray text-sm flex items-center gap-2 mt-1 font-medium italic">
                    {employerName}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-background border border-border rounded-full text-[10px] font-black uppercase tracking-wider text-tatt-gray">{job.type}</span>
                <span className="px-3 py-1 bg-background border border-border rounded-full text-[10px] font-black uppercase tracking-wider text-tatt-gray">{job.location}</span>
                {job.salaryLabel && <span className="px-3 py-1 bg-tatt-lime/10 border border-tatt-lime/20 rounded-full text-[10px] font-black uppercase tracking-wider text-tatt-lime">{job.salaryLabel}</span>}
              </div>
            </div>

            <div className="space-y-10 mb-10">
              <section>
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray mb-4">
                  <span className="size-1 bg-tatt-lime rounded-full"></span> Role Overview
                </h4>
                <div className="text-foreground/80 text-sm leading-relaxed whitespace-pre-line">
                  {job.description || "The employer has not provided a detailed description."}
                </div>
              </section>

              {job.requirements && (
                <section>
                  <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray mb-4">
                    <span className="size-1 bg-tatt-lime rounded-full"></span> Key Requirements
                  </h4>
                  <div className="text-foreground/80 text-sm leading-relaxed space-y-2">
                    {formatList(job.requirements)}
                  </div>
                </section>
              )}

              {job.qualifications && (
                <section>
                  <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray mb-4">
                    <span className="size-1 bg-tatt-lime rounded-full"></span> Desired Qualifications
                  </h4>
                  <div className="text-foreground/80 text-sm leading-relaxed space-y-2 italic opacity-80">
                    {formatList(job.qualifications)}
                  </div>
                </section>
              )}

              <section className="bg-background border border-border rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-tatt-lime mb-6">
                    <span className="size-1 bg-tatt-lime rounded-full"></span> Employer Profile
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="size-14 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black border border-tatt-lime/20 shrink-0 text-xl">
                      {employerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-extrabold text-foreground text-lg">{employerName}</h5>
                      <p className="text-sm text-tatt-gray">{employerIndustry}</p>
                      {employerRole && <p className="text-[10px] font-black text-tatt-lime uppercase tracking-widest mt-1.5 opacity-70">Leadership: {employerRole}</p>}
                    </div>
                    {employerWebsite && (
                      <div className="sm:ml-auto">
                        <a 
                          href={employerWebsite} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-tatt-lime/10 text-tatt-lime text-[10px] font-black uppercase tracking-widest hover:bg-tatt-lime/20 transition-all"
                        >
                          Visit Profile <ArrowRight className="size-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {isKiongoziListing && (
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] scale-[3] pointer-events-none">
                    <Star className="size-32 fill-tatt-lime text-tatt-lime" />
                  </div>
                )}
              </section>
            </div>

            <div className="sticky bottom-0 left-0 right-0 pt-6 pb-2 bg-gradient-to-t from-surface via-surface to-transparent">
              <button
                type="button"
                onClick={() => setShowApplyForm(true)}
                className="w-full py-4.5 bg-tatt-lime text-tatt-black font-black text-xs uppercase tracking-[0.25em] rounded-2xl shadow-xl shadow-tatt-lime/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                Proceed to Application <Briefcase className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 scroll-smooth">
            <div className="flex items-center justify-between mb-10">
              <button 
                onClick={() => setShowApplyForm(false)}
                className="inline-flex items-center gap-2 text-tatt-gray hover:text-foreground text-[10px] font-black uppercase tracking-[0.2em] transition-all group"
              >
                <ArrowRight className="size-4 rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Details
              </button>
              <div className="flex gap-1.5">
                <div className="size-1.5 rounded-full bg-tatt-lime/30" />
                <div className="size-1.5 rounded-full bg-tatt-lime" />
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-3xl font-black text-foreground mb-3 tracking-tight">Your Application</h3>
              <p className="text-tatt-gray text-sm font-medium">Applying for <span className="text-foreground">{job.title}</span> at {employerName}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-bold animate-pulse">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label htmlFor="job-fullname" className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2 ml-1 opacity-70">Personal Name *</label>
                  <input
                    id="job-fullname" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name" required
                    className="w-full px-5 py-3.5 rounded-2xl border border-border bg-background text-foreground placeholder:text-tatt-gray/50 focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="job-email" className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2 ml-1 opacity-70">Communications Email *</label>
                  <input
                    id="job-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com" required
                    className="w-full px-5 py-3.5 rounded-2xl border border-border bg-background text-foreground placeholder:text-tatt-gray/50 focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="job-phone" className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2 ml-1 opacity-70">Mobile Reference</label>
                  <input
                    id="job-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+..."
                    className="w-full px-5 py-3.5 rounded-2xl border border-border bg-background text-foreground placeholder:text-tatt-gray/50 focus:outline-none focus:ring-2 focus:ring-tatt-lime transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 ml-1 opacity-70">Curriculum Vitae / Resume *</label>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                <div
                  onDrop={handleDrop} onDragOver={handleDragOver} onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${resumeFile ? "bg-tatt-lime/5 border-tatt-lime/60 shadow-inner" : "bg-background border-border hover:border-tatt-lime/40"}`}
                >
                  <div className={`mx-auto mb-4 size-14 rounded-2xl flex items-center justify-center transition-all ${resumeFile ? "bg-tatt-lime text-black" : "bg-tatt-gray/10 text-tatt-gray"}`}>
                    <Upload className="size-6" />
                  </div>
                  <p className="text-sm text-foreground font-black">
                    {resumeFile ? resumeFile.name : (
                      <>Drop CV file or <span className="text-tatt-lime">Browse Work</span></>
                    )}
                  </p>
                  <p className="text-[10px] text-tatt-gray mt-2 font-black uppercase tracking-widest opacity-60">PDF, DOCX accepted (Max 5MB)</p>
                  {uploadError && <p className="text-red-500 text-xs mt-3 font-black uppercase tracking-tighter">{uploadError}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2 ml-1 opacity-70">Cover Pitch (Optional)</label>
                <textarea
                  value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell the employer why you're the right lead..." rows={6}
                  className="w-full px-5 py-4 rounded-2xl border border-border bg-background text-foreground placeholder:text-tatt-gray/50 focus:outline-none focus:ring-2 focus:ring-tatt-lime resize-none transition-all font-medium leading-relaxed"
                />
              </div>

              <div className="pt-6">
                <button
                  type="submit" disabled={submitting}
                  className="w-full py-5 bg-tatt-lime text-tatt-black font-black text-sm uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-tatt-lime/30 hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-3 transition-all active:scale-[0.98] relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    {submitting ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Transmitting...</>
                    ) : (
                      <>Confirm Application <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" /></>
                    )}
                  </span>
                </button>
                <p className="text-center text-[9px] text-tatt-gray font-black mt-4 uppercase tracking-[0.2em] opacity-40">Direct-to-Employer Submission System</p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
