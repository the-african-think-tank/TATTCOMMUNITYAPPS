"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Store, 
  CheckCircle2, 
  ExternalLink, 
  Lock as LockIcon,
  Globe,
  Star,
  MapPin,
  Phone,
  Building2,
  Calendar,
  BadgeCheck,
  Briefcase,
  Upload,
  Image as ImageIcon,
  X
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-hot-toast";

interface BusinessPartner {
  id: string;
  name: string;
  category: string;
  foundingYear: number;
  website: string;
  locationText: string;
  missionAlignment: string;
  perkOffer: string;
  logoUrl: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'INACTIVE';
  contactEmail: string;
  contactPhone: string;
  contactName: string;
  isVolunteer: boolean;
  description: string;
  ownershipType: string;
  partnershipReason: string;
  benefitType: string;
  offerDuration: string;
  typicalEngagement: string;
  additionalInfo: string;
  valuesAlignmentAgreed: boolean;
  contactAgreed: boolean;
  createdAt: string;
  clickCount: number;
}

const BusinessLogoDetail = ({ src, name }: { src?: string; name: string }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <Store className="text-tatt-black opacity-10" size={40} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className="size-full object-cover"
      onError={() => setError(true)}
    />
  );
};

export default function BusinessDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessPartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [logoInput, setLogoInput] = useState("");
  const [updatingLogo, setUpdatingLogo] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBusiness();
    }
  }, [id]);

  const [isUploading, setIsUploading] = useState(false);

  const handleSaveLogo = async () => {
    if (!business || !id) return;
    try {
      setUpdatingLogo(true);
      await api.patch(`/business-directory/${id}`, {
        logoUrl: logoInput.trim()
      });
      toast.success("Business logo updated successfully!");
      setIsEditingLogo(false);
      await fetchBusiness(); // Immediately refetch page data to show new logo everywhere!
    } catch (error) {
      console.error("Failed to update logo:", error);
      toast.error("Failed to update logo URL.");
    } finally {
      setUpdatingLogo(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append("files", file);

    setIsUploading(true);
    try {
      toast.loading("Uploading logo image...", { id: "logo-upload" });
      const response = await api.post("/uploads/media", uploadFormData);
      const imageUrl = response.data.files?.[0]?.url;
      if (imageUrl) {
        setLogoInput(imageUrl);
        toast.success("Logo uploaded successfully!", { id: "logo-upload" });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo file.", { id: "logo-upload" });
    } finally {
      setIsUploading(false);
    }
  };

  const fetchBusiness = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/business-directory/${id}`);
      setBusiness(response.data);
      if (response.data.adminNotes) {
        setReviewerNotes(response.data.adminNotes);
      }
    } catch (error) {
      console.error("Failed to fetch business details:", error);
      toast.error("Venture not found or access restricted.");
      router.push("/admin/business-directory");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: 'APPROVED' | 'DECLINED') => {
    try {
      await api.patch(`/business-directory/${id}/status`, { 
        status,
        adminNotes: reviewerNotes 
      });
      toast.success(`Application ${status.toLowerCase()} successfully.`);
      fetchBusiness();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Internal server error during status update.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="size-12 border-4 border-tatt-lime/20 border-t-tatt-lime rounded-full animate-spin"></div>
        <p className="text-tatt-gray font-bold animate-pulse">Reviewing Application...</p>
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-500">
      {/* Header equivalent */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/admin/business-directory")}
            className="p-2 hover:bg-surface rounded-lg text-tatt-gray transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-black text-xl lg:text-2xl tracking-tight text-tatt-black">
              Review Application: {business.name}
            </h1>
            <nav className="flex gap-4 mt-1">
              <span className="text-tatt-lime border-b-2 border-tatt-lime pb-1 text-[10px] font-black uppercase tracking-widest">Review Queue</span>
              <span className="text-tatt-gray/40 font-bold text-[10px] uppercase tracking-widest">Archive</span>
            </nav>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Primary Details */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Applicant Overview Card */}
          <section className="bg-surface rounded-2xl p-6 sm:p-8 shadow-sm border border-border">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Applicant Overview</span>
                <h2 className="text-2xl sm:text-3xl font-black mt-1 text-tatt-black tracking-tight">{business.name}</h2>
              </div>
              {business.website && (
                <a
                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-tatt-black text-white hover:bg-tatt-lime hover:text-tatt-black transition-all rounded-xl text-xs font-black uppercase tracking-widest shrink-0 self-start sm:self-center shadow-sm cursor-pointer"
                >
                  <Globe className="size-4" />
                  <span>Visit Website</span>
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="size-3 text-tatt-gray shrink-0" /> Industry
                </p>
                <p className="text-sm font-bold text-tatt-black truncate">{business.category || '—'}</p>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 flex items-center gap-1.5">
                  <Calendar className="size-3 text-tatt-gray shrink-0" /> Founding Year
                </p>
                <p className="text-sm font-bold text-tatt-black truncate">{business.foundingYear || '—'}</p>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 flex items-center gap-1.5">
                  <MapPin className="size-3 text-tatt-gray shrink-0" /> Location
                </p>
                <p className="text-sm font-bold text-tatt-black truncate" title={business.locationText || '—'}>{business.locationText || '—'}</p>
              </div>

              <div className="min-w-0 sm:col-span-2 md:col-span-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 flex items-center gap-1.5">
                  <Globe className="size-3 text-tatt-gray shrink-0" /> Website Link
                </p>
                {business.website ? (
                  <a
                    href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-tatt-black hover:text-tatt-lime hover:underline transition-colors block truncate cursor-pointer"
                    title={business.website}
                  >
                    {business.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <p className="text-sm font-bold text-tatt-gray">—</p>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 flex items-center gap-1.5">
                  <Building2 className="size-3 text-tatt-gray shrink-0" /> Ownership
                </p>
                <p className="text-sm font-bold text-tatt-black truncate">{business.ownershipType || '—'}</p>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 flex items-center gap-1.5">
                  <BadgeCheck className="size-3 text-tatt-gray shrink-0" /> Volunteer Partner
                </p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ${business.isVolunteer ? 'bg-tatt-lime/10 text-tatt-lime border border-tatt-lime/20' : 'bg-gray-100 text-tatt-gray'}`}>
                  {business.isVolunteer ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="min-w-0 sm:col-span-2 md:col-span-3 pt-2 border-t border-border/60">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 flex items-center gap-1.5">
                  <Phone className="size-3 text-tatt-gray shrink-0" /> Direct Contact Phone
                </p>
                <p className="text-sm font-black text-tatt-lime tracking-widest flex items-center gap-2">
                  {business.contactPhone ? (
                    <a href={`tel:${business.contactPhone}`} className="hover:underline cursor-pointer">
                      {business.contactPhone}
                    </a>
                  ) : (
                    <span className="text-tatt-gray font-normal italic">No Phone Provided</span>
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* Business Description */}
          <section className="bg-surface rounded-xl p-8 shadow-sm border border-border">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Business Description & Audience</span>
            <div className="mt-6">
              <p className="text-tatt-gray leading-relaxed text-sm font-medium">
                {business.description || "No description provided."}
              </p>
            </div>
          </section>

          <section className="bg-surface rounded-xl p-8 shadow-sm border border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-tatt-black">
              <Globe size={100} />
            </div>
            <div className="space-y-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Partnership Interest</span>
                <h3 className="text-lg font-black mt-2 mb-2 text-tatt-black">Why Partner with TATT?</h3>
                <p className="text-tatt-gray leading-relaxed text-sm font-medium italic">
                  "{business.partnershipReason || "No statement provided."}"
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Mission Alignment</span>
                <h3 className="text-lg font-black mt-2 mb-2 text-tatt-black">Core Philosophy Statement</h3>
                <p className="text-tatt-gray leading-relaxed text-sm font-medium">
                  "{business.missionAlignment}"
                </p>
              </div>
            </div>
          </section>

          {/* Proposed Member Perk */}
          <section className="bg-tatt-lime/5 rounded-xl p-8 border-l-4 border-tatt-lime">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-tatt-secondary">Proposed Member Perk</span>
                <h3 className="text-xl font-black mt-2 text-tatt-black italic">Exclusive Partner Incentive</h3>
              </div>
              <Star size={36} className="text-tatt-lime fill-current" />
            </div>
            <div className="mt-6 bg-surface p-6 rounded-lg border border-border space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1">Benefit Type</p>
                  <p className="text-sm font-bold text-tatt-black">{business.benefitType || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1">Duration</p>
                  <p className="text-sm font-bold text-tatt-black">{business.offerDuration || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1">Offer Description</p>
                <p className="text-lg font-black text-tatt-black">{business.perkOffer}</p>
              </div>
            </div>
          </section>

          {/* Community Engagement */}
          <section className="bg-surface rounded-xl p-8 shadow-sm border border-border">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Engagement & Agreements</span>
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1">Typical Engagement</p>
                <p className="text-sm font-bold text-tatt-black">{business.typicalEngagement || '—'}</p>
              </div>
              {business.additionalInfo && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1">Additional Info</p>
                  <p className="text-sm font-medium text-tatt-gray italic">{business.additionalInfo}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${business.valuesAlignmentAgreed ? 'bg-tatt-lime/10 text-tatt-lime' : 'bg-red-50 text-red-500'}`}>
                   {business.valuesAlignmentAgreed ? 'Values Aligned' : 'Values Not Signed'}
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${business.contactAgreed ? 'bg-tatt-lime/10 text-tatt-lime' : 'bg-red-50 text-red-500'}`}>
                   {business.contactAgreed ? 'Contact Agreed' : 'Contact Not Signed'}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Administrative Tools */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          
          {/* Internal Notes */}
          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Reviewer Notes</span>
            <div className="mt-4">
              <textarea 
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                className="w-full bg-background border-none rounded-lg focus:ring-2 focus:ring-tatt-lime/40 text-sm h-48 p-4 placeholder:text-tatt-gray/40 resize-none" 
                placeholder="Add internal observations regarding brand fit, documentation status, or strategic value..."
              ></textarea>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-tatt-gray font-bold italic">
              <LockIcon size={12} /> Notes are only visible to the administrative team.
            </div>
          </section>

          {/* Profile Snapshot & Brand Logo */}
          <section className="bg-surface rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Brand Logo</span>
              <button
                onClick={() => {
                  setLogoInput(business.logoUrl || "");
                  setIsEditingLogo(true);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-tatt-lime hover:underline flex items-center gap-1 cursor-pointer"
              >
                {business.logoUrl ? "Update Logo" : "Add Logo"}
              </button>
            </div>

            <div className="w-full h-44 bg-background rounded-xl mb-6 overflow-hidden border border-border flex items-center justify-center relative group p-2">
                <BusinessLogoDetail src={business.logoUrl} name={business.name} />
                <button
                  onClick={() => {
                    setLogoInput(business.logoUrl || "");
                    setIsEditingLogo(true);
                  }}
                  className="absolute inset-0 bg-tatt-black/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2 cursor-pointer"
                >
                  <Upload size={22} className="text-tatt-lime" />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {business.logoUrl ? "Change Logo URL" : "Set Logo URL"}
                  </span>
                </button>
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">Associated Contact</span>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-tatt-secondary rounded-full flex items-center justify-center text-white font-black text-sm">
                {business.contactName ? business.contactName.substring(0, 2).toUpperCase() : '??'}
              </div>
              <div>
                <p className="text-sm font-black text-tatt-black">{business.contactName || 'Anonymous'}</p>
                <div className="flex flex-col">
                  <p className="text-[10px] text-tatt-gray font-bold tracking-tighter truncate max-w-[150px]">{business.contactEmail}</p>
                  {business.contactPhone && (
                    <p className="text-[10px] text-tatt-lime font-black tracking-tighter mt-0.5">{business.contactPhone}</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Edit Logo Modal */}
      {isEditingLogo && (
        <div className="fixed inset-0 z-50 bg-tatt-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ImageIcon size={20} className="text-tatt-lime" />
                <h3 className="text-lg font-black text-tatt-black">
                  {business.logoUrl ? "Update Business Logo" : "Add Business Logo"}
                </h3>
              </div>
              <button 
                onClick={() => setIsEditingLogo(false)} 
                className="text-tatt-gray hover:text-tatt-black cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 mb-6">
              {/* File Upload Option */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">
                  Option 1: Upload Image File from Device
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-tatt-lime rounded-xl p-4 bg-background/50 hover:bg-tatt-lime/5 transition-all cursor-pointer group">
                  <Upload size={24} className="text-tatt-gray group-hover:text-tatt-lime mb-1" />
                  <span className="text-xs font-bold text-tatt-black">
                    {isUploading ? "Uploading image file..." : "Click to select image file"}
                  </span>
                  <span className="text-[10px] text-tatt-gray mt-0.5">PNG, JPG, WebP, SVG up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px bg-border flex-1"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">OR</span>
                <div className="h-px bg-border flex-1"></div>
              </div>

              {/* URL Input Option */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5">
                  Option 2: Image Web URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoInput}
                  onChange={(e) => setLogoInput(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-tatt-black focus:outline-none focus:ring-2 focus:ring-tatt-lime/50 font-medium"
                />
              </div>

              {/* Live Preview Box */}
              <div className="bg-background rounded-xl p-4 border border-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2 text-center">Live Preview</p>
                <div className="size-20 bg-white rounded-xl border border-border flex items-center justify-center overflow-hidden mx-auto p-1 shadow-sm">
                  <BusinessLogoDetail key={logoInput} src={logoInput} name={business.name} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEditingLogo(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-border hover:bg-background transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLogo}
                disabled={updatingLogo || isUploading}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-tatt-lime text-tatt-black hover:brightness-110 active:scale-95 transition-all shadow-md shadow-tatt-lime/10 disabled:opacity-50 cursor-pointer"
              >
                {updatingLogo ? "Saving..." : "Save Logo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Administrative Actions Footer */}
      <footer className="fixed bottom-0 left-0 lg:left-72 right-0 bg-surface/90 backdrop-blur-md border-t border-border p-4 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-background border border-border rounded-full">
              <span className={`w-2 h-2 rounded-full ${business.status === 'PENDING' ? 'bg-tatt-lime animate-pulse shadow-[0_0_8px_rgba(159,204,0,0.5)]' : 'bg-tatt-lime'}`}></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-black">
                {business.status === 'PENDING' ? 'Pending Review' : `Application ${business.status}`}
              </span>
            </div>
            <p className="text-xs text-tatt-gray font-medium italic">Submitted on {new Date(business.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div className="flex gap-3">
            {business.status === 'PENDING' ? (
                <>
                    <button 
                        onClick={() => handleStatusUpdate('DECLINED')}
                        className="px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest border border-border hover:bg-red-50 hover:text-red-600 transition-all font-sans active:scale-95 cursor-pointer"
                    >
                        Decline
                    </button>
                    <button 
                        onClick={() => handleStatusUpdate('APPROVED')}
                        className="px-12 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-tatt-lime text-tatt-black hover:brightness-110 transition-all shadow-lg shadow-tatt-lime/20 active:scale-95 whitespace-nowrap cursor-pointer"
                    >
                        Approve Application
                    </button>
                </>
            ) : (
                <button 
                    onClick={() => router.push("/admin/business-directory")}
                    className="px-12 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest bg-tatt-black text-white transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                    Back to Queue
                </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
