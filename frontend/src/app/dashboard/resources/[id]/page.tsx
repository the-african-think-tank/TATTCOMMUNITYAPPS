"use client";

import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, ExternalLink, Lock, FileText, PlayCircle } from "lucide-react";
import type { ResourceDetail } from "@/types/resources";
import { analytics } from "@/lib/analytics";


export default function ResourceDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : null;
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !id) {
      setLoading(false);
      return;
    }
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<{ data: ResourceDetail }>(`/resources/${id}`);
        setResource(data?.data ?? null);
        if (data?.data) {
          analytics.trackResourceViewed(data.data, user);
        }
      } catch (err: unknown) {

        const res =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string }; status?: number } }).response
            : undefined;
        const status = res?.status;
        const msg = res?.data?.message;
        if (status === 403) {
          setError(typeof msg === "string" ? msg : "Your membership tier does not include access to this resource.");
        } else {
          setError(typeof msg === "string" ? msg : "Failed to load resource.");
        }
        setResource(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [user?.id, id]);

  if (!id) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center">
        <p className="text-tatt-gray">Invalid resource.</p>
        <Link href="/dashboard/resources" className="text-tatt-lime ml-2 hover:underline">
          Back to Resources
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="border-b border-border bg-surface px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard/resources"
            className="inline-flex items-center gap-2 text-tatt-gray hover:text-tatt-lime text-sm font-medium mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Resources
          </Link>
          {loading && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-tatt-lime" />
              <span className="text-tatt-gray">Loading…</span>
            </div>
          )}
          {!loading && resource && (
            <h1 className="text-2xl font-bold text-foreground">{resource.title}</h1>
          )}
          {!loading && error && (
            <h1 className="text-2xl font-bold text-foreground">Resource</h1>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-tatt-lime" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 text-center">
            <Lock className="h-14 w-14 mx-auto text-tatt-gray mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Access restricted</h2>
            <p className="text-tatt-gray mb-6">{error}</p>
            <Link
              href="/dashboard/resources"
              className="inline-flex items-center gap-2 text-tatt-lime font-medium hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Resources
            </Link>
          </div>
        )}

        {!loading && resource && !error && (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-surface overflow-hidden shadow-2xl shadow-black/5 animate-in fade-in duration-700">
              {/* Context Header */}
              <div className="p-8 lg:p-12 border-b border-border bg-background/50">
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-6">
                  <span className={`px-3 py-1 rounded-full border ${
                    resource.type === 'VIDEO' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                    resource.type === 'DOCUMENT' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-tatt-lime/10 text-tatt-lime border-tatt-lime/20'
                  }`}>
                    {resource.type}
                  </span>
                  {resource.tags?.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-foreground mb-6 uppercase italic leading-none">
                  {resource.title}
                </h1>
                
                {resource.description && (
                  <div 
                    className={`mt-8 prose prose-lg max-w-none text-foreground font-medium leading-relaxed ${
                      resource.type === 'GUIDE' ? 'bg-slate-50 p-6 lg:p-10 rounded-2xl border border-slate-200 shadow-inner' : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: resource.description }}
                  />
                )}
              </div>

              {/* Resource Content Viewer */}
              <div className="bg-background min-h-[500px] flex flex-col">
                {resource.contentUrl ? (
                  <div className="flex-1 w-full bg-black/5 aspect-video flex flex-col">
                    {resource.type === 'VIDEO' ? (
                      <div className="w-full flex-1">
                        {resource.contentUrl.includes('youtube.com') || resource.contentUrl.includes('youtu.be') ? (
                          <iframe
                            className="w-full h-full min-h-[500px]"
                            src={`https://www.youtube.com/embed/${resource.contentUrl.split('v=')[1]?.split('&')[0] || resource.contentUrl.split('/').pop()}`}
                            title={resource.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        ) : resource.contentUrl.includes('vimeo.com') ? (
                          <iframe
                            className="w-full h-full min-h-[500px]"
                            src={`https://player.vimeo.com/video/${resource.contentUrl.split('/').pop()}`}
                            title={resource.title}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        ) : (
                          <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                            <PlayCircle size={64} className="text-tatt-lime mb-4 opacity-20" />
                            <p className="text-tatt-gray font-bold mb-4 uppercase tracking-widest">External Video Resource</p>
                            <a 
                              href={resource.contentUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={() => analytics.trackResourceDownloaded(resource, user)}
                              className="px-8 py-3 bg-tatt-lime text-tatt-black rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                            >
                              Play Production
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (resource.type === 'DOCUMENT' || resource.type === 'GUIDE') && (resource.contentUrl.endsWith('.pdf') || resource.contentUrl.includes('docs.google.com')) ? (
                      <iframe
                        src={resource.contentUrl.includes('docs.google.com') ? resource.contentUrl : `https://docs.google.com/viewer?url=${encodeURIComponent(resource.contentUrl)}&embedded=true`}
                        className="w-full h-full min-h-[700px] border-none"
                        title={resource.title}
                      ></iframe>
                    ) : (
                      <div className="p-20 text-center flex flex-col items-center justify-center border-t border-border">
                        <FileText size={80} className="text-slate-300 mb-6" />
                        <h3 className="text-2xl font-black uppercase italic tracking-tight mb-4 text-foreground">Strategic Asset Ready</h3>
                        <p className="text-tatt-gray font-medium max-w-md mb-10 leading-relaxed">
                          This resource is optimized for external viewing or contains specific formatting suited for the native file viewer.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                          <a
                            href={resource.contentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => analytics.trackResourceDownloaded(resource, user)}
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black bg-tatt-lime text-tatt-black hover:brightness-105 transition-all uppercase tracking-widest shadow-xl shadow-tatt-lime/20"
                          >
                            Access Full Asset
                            <ExternalLink size={20} />
                          </a>
                        </div>
                      </div>

                    )}
                  </div>
                ) : (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <FileText className="h-20 w-20 text-slate-200 mb-6" />
                    <p className="text-tatt-gray font-black uppercase tracking-widest">No primary asset link provided.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between p-6 bg-surface border border-border rounded-3xl shrink-0 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Resource Hub Access</span>
              </div>
              <Link
                href="/dashboard/resources"
                className="inline-flex items-center gap-2 text-tatt-lime font-black uppercase tracking-widest text-xs hover:underline"
              >
                <ArrowLeft size={16} /> Return to Hub
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
