"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Loader2, Bell, Plus, X, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import { JOB_CATEGORIES } from "@/types/jobs";

interface JobAlert {
  id: string;
  keyword: string;
  category: string | null;
}

export function JobsSidebar() {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get<JobAlert[]>("/jobs/alerts");
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    
    setSubmitting(true);
    try {
      await api.post("/jobs/alerts", { keyword: newKeyword, category: newCategory || undefined });
      toast.success("Job alert created!");
      setNewKeyword("");
      setNewCategory("");
      setShowForm(false);
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create alert.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await api.delete(`/jobs/alerts/${alertId}`);
      toast.success("Alert removed.");
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch {
      toast.error("Failed to delete alert.");
    }
  };

  if (loading) {
    return (
      <aside className="space-y-6 animate-pulse">
        <div className="h-48 rounded-xl bg-tatt-gray/10" />
      </aside>
    );
  }

  return (
    <aside className="space-y-6">
      <section className="bg-surface rounded-xl border border-border p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-foreground">Job Alerts</h3>
            <Bell className="size-4 text-tatt-lime" />
        </div>
        <p className="text-tatt-gray text-xs mb-5 leading-relaxed">
          Get notified immediately when roles matching your specific criteria are posted on the network.
        </p>

        {/* Existing Alerts */}
        <div className="space-y-2 mb-5">
            {alerts.length === 0 ? (
                <div className="bg-background border border-dashed border-border rounded-lg p-4 text-center">
                    <p className="text-[10px] uppercase font-bold text-tatt-gray tracking-widest">No Alerts Active</p>
                </div>
            ) : (
                alerts.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between bg-background border border-border rounded-lg p-3 group">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{alert.keyword}</p>
                            <p className="text-[10px] text-tatt-gray uppercase tracking-widest">{alert.category || "Any Category"}</p>
                        </div>
                        <button 
                            type="button"
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="p-1.5 text-tatt-gray hover:bg-surface hover:text-red-500 rounded-md transition-colors opacity-0 group-hover:opacity-100 cursor-pointer active:scale-95"
                            title="Remove alert"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                ))
            )}
        </div>

        {/* Action Button or Form */}
        {!showForm ? (
            <button
                type="button"
                onClick={() => setShowForm(true)}
                className="w-full min-h-[44px] py-2.5 rounded-lg font-bold bg-tatt-lime text-tatt-black hover:brightness-95 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
                <Plus className="size-4" /> Create Alert
            </button>
        ) : (
            <form onSubmit={handleCreateAlert} className="bg-background border border-border rounded-lg p-3 space-y-3 animate-in fade-in zoom-in-95">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1">Keyword / Title <span className="text-red-500">*</span></label>
                    <input 
                        required
                        type="text" 
                        value={newKeyword} 
                        onChange={e => setNewKeyword(e.target.value)}
                        placeholder="e.g. Director" 
                        className="w-full bg-surface border border-border text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-tatt-lime"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1">
                        Category Filter <span className="text-tatt-gray/50 normal-case tracking-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                        <select 
                            value={newCategory} 
                            onChange={e => setNewCategory(e.target.value)}
                            className="w-full appearance-none bg-surface border border-border text-foreground text-xs rounded-lg px-3 py-3 outline-none focus:border-tatt-lime cursor-pointer pr-10 transition-colors hover:border-tatt-gray/50"
                        >
                            <option value="">Any Category</option>
                            {JOB_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-tatt-gray">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 min-h-[36px] bg-foreground text-background font-bold text-xs uppercase tracking-widest rounded-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setShowForm(false)}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center border border-border rounded-md text-tatt-gray hover:bg-surface transition-colors cursor-pointer active:scale-95"
                        title="Cancel"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            </form>
        )}
      </section>
    </aside>
  );
}

