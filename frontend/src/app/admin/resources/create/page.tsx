"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    LayoutDashboard, 
    BookOpen, 
    Users, 
    Calendar, 
    Settings, 
    LogOut, 
    PlusCircle, 
    Bell, 
    User,
    UploadCloud,
    Link as LinkIcon,
    ChevronLeft,
    Loader2,
    CheckCircle2,
    Shield,
    Search,
    ChevronDown,
    X
} from "lucide-react";
import api from "@/services/api";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function CreateResourcePage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "GUIDE",
        category: "General",
        contentUrl: "",
    });
    const [selectedTiers, setSelectedTiers] = useState<string[]>(["FREE"]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [existingCategories, setExistingCategories] = useState<string[]>(["General", "Strategic", "Community", "Leadership"]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState("");

    useEffect(() => {
        const fetchExistingTags = async () => {
            try {
                const { data } = await api.get("/resources", { params: { limit: 50 } });
                const tags = new Set<string>(["General", "Strategic", "Community", "Leadership"]);
                data.data?.forEach((r: any) => {
                    r.tags?.forEach((tag: string) => tags.add(tag));
                });
                setExistingCategories(Array.from(tags));
            } catch (error) {
                console.error("Failed to fetch tags", error);
            }
        };
        fetchExistingTags();
    }, []);

    const handleTierChange = (tier: string) => {
        if (selectedTiers.includes(tier)) {
            setSelectedTiers(selectedTiers.filter(t => t !== tier));
        } else {
            setSelectedTiers([...selectedTiers, tier]);
        }
    };

    const filteredCategories = existingCategories.filter(cat => 
        cat.toLowerCase().includes(categorySearch.toLowerCase())
    );

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) return toast.error("Please provide a title");
        if (!formData.contentUrl && !selectedFile) return toast.error("Please provide a content URL or upload a file");

        setIsSubmitting(true);
        let finalContentUrl = formData.contentUrl;

        if (selectedFile) {
            setUploading(true);
            const uploadFormData = new FormData();
            uploadFormData.append("files", selectedFile);
            try {
                const res = await api.post("/uploads/media", uploadFormData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                finalContentUrl = res.data.files[0].url;
                toast.success("File uploaded successfully!");
            } catch (error: any) {
                console.error("Upload failed", error);
                const res = error?.response;
                const errMsg = res?.data?.message ?? (res?.data?.errors?.[0] ? String(res.data.errors[0]) : "Failed to upload file");
                toast.error(errMsg);
                setIsSubmitting(false);
                setUploading(false);
                return;
            } finally {
                setUploading(false);
            }
        }

        try {
            // Determine hierarchical minTier as the highest selected tier
            const tiers = ["FREE", "UBUNTU", "IMANI", "KIONGOZI"];
            let minTier = "FREE";
            for (const tier of tiers) {
                if (selectedTiers.includes(tier)) {
                    minTier = tier;
                }
            }

            await api.post("/resources", {
                ...formData,
                contentUrl: finalContentUrl,
                minTier,
                allowedTiers: selectedTiers,
                tags: formData.category ? [formData.category] : [],
                visibility: "PUBLIC"
            });
            toast.success("Resource published successfully!");
            router.push("/admin/resources");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to publish resource");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
            
            <div className="max-w-5xl mx-auto w-full p-4 lg:p-12">
                <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-3 uppercase italic">Resource Details</h1>
                    <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-2xl">Deploy specialized knowledge assets, guides, and premium documentation to the TATT platform ecosystem.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* General Section */}
                    <section className="bg-white p-6 lg:p-10 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:shadow-slate-300/50">
                        <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-900 tracking-tight uppercase italic">
                            <div className="w-2.5 h-8 bg-tatt-lime rounded-full"></div>
                            General Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="col-span-2">
                                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-slate-500 italic">Resource Designation</label>
                                <input 
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-slate-900 font-bold focus:ring-2 focus:ring-tatt-lime focus:border-tatt-lime transition-all outline-none text-lg" 
                                    placeholder="e.g. Community Leadership Essentials" 
                                    type="text"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-slate-500 italic">Core Description & Summary</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 font-bold focus:ring-2 focus:ring-tatt-lime focus:border-tatt-lime transition-all outline-none min-h-[160px] text-lg leading-relaxed" 
                                    placeholder="Provide a tactical summary of what this resource covers..."
                                ></textarea>
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-slate-500 italic">Asset Category</label>
                                <div className="relative">
                                    <button 
                                        type="button"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-slate-900 font-bold flex items-center justify-between hover:border-slate-300 transition-all focus:ring-2 focus:ring-tatt-lime outline-none"
                                    >
                                        <span className={formData.category ? "text-slate-900" : "text-slate-400"}>
                                            {formData.category || "Select or Create Category"}
                                        </span>
                                        <ChevronDown size={20} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="p-3 border-b border-slate-100 bg-slate-50">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input 
                                                        type="text"
                                                        placeholder="Search or create new..."
                                                        value={categorySearch}
                                                        onChange={(e) => setCategorySearch(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-tatt-lime outline-none"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                                                {filteredCategories.map((cat) => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({...formData, category: cat});
                                                            setIsDropdownOpen(false);
                                                            setCategorySearch("");
                                                        }}
                                                        className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-tatt-lime/10 hover:text-slate-900 transition-colors border-b border-slate-50 last:border-0"
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                                {categorySearch && !existingCategories.includes(categorySearch) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExistingCategories([...existingCategories, categorySearch]);
                                                            setFormData({...formData, category: categorySearch});
                                                            setIsDropdownOpen(false);
                                                            setCategorySearch("");
                                                        }}
                                                        className="w-full text-left px-5 py-4 text-sm font-bold text-tatt-lime bg-slate-900 flex items-center justify-between hover:bg-slate-800 transition-colors"
                                                    >
                                                        <span>Create "{categorySearch}"</span>
                                                        <PlusCircle size={16} />
                                                    </button>
                                                )}
                                                {filteredCategories.length === 0 && !categorySearch && (
                                                    <div className="px-5 py-10 text-center text-slate-400 text-xs font-black uppercase tracking-widest italic">
                                                        No categories found
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest mb-3 text-slate-500 italic">Resource Format</label>
                                <div className="relative">
                                    <select 
                                        value={formData.type}
                                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-slate-900 font-bold focus:ring-2 focus:ring-tatt-lime focus:border-tatt-lime transition-all outline-none appearance-none pr-12 cursor-pointer"
                                    >
                                        <option value="GUIDE">Strategic Guide</option>
                                        <option value="DOCUMENT">Standard Document</option>
                                        <option value="VIDEO">Video Production</option>
                                        <option value="PARTNERSHIP">Partnership Portal</option>
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Media Section */}
                    <section className="bg-white p-6 lg:p-10 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:shadow-slate-300/50">
                        <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-900 tracking-tight uppercase italic">
                            <div className="w-2.5 h-8 bg-tatt-lime rounded-full"></div>
                            Content & Media Assets
                        </h3>
                        <div className="space-y-8">
                            <div className="relative">
                                <input 
                                    type="file" 
                                    id="doc-upload"
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.zip"
                                />
                                <label 
                                    htmlFor="doc-upload"
                                    className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center hover:bg-tatt-lime/5 hover:border-tatt-lime transition-all cursor-pointer group"
                                >
                                    {uploading ? (
                                        <Loader2 size={48} className="animate-spin text-tatt-lime mb-4" />
                                    ) : selectedFile || (formData.contentUrl && !formData.contentUrl.includes('youtube') && !formData.contentUrl.includes('vimeo')) ? (
                                        <CheckCircle2 size={48} className="text-tatt-lime mb-4" />
                                    ) : (
                                        <UploadCloud size={48} className="text-slate-300 group-hover:text-tatt-lime transition-colors mb-4" />
                                    )}
                                    <p className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">
                                        {selectedFile ? selectedFile.name : (formData.contentUrl && !formData.contentUrl.includes('youtube') && !formData.contentUrl.includes('vimeo') ? 'File Ready' : 'Upload Strategic Document')}
                                    </p>
                                    <p className="text-sm font-medium text-slate-500">PDF, DOCX, or Media up to 25MB (Deployment Cap)</p>
                                </label>
                            </div>
                            
                            <div className="relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Alternatively</span>
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <LinkIcon size={20} className="text-slate-400 group-focus-within:text-tatt-lime transition-colors" />
                                    </div>
                                    <input 
                                        value={formData.contentUrl}
                                        onChange={(e) => setFormData({...formData, contentUrl: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-16 pl-14 pr-6 text-slate-900 font-bold focus:ring-2 focus:ring-tatt-lime focus:border-tatt-lime transition-all outline-none text-lg" 
                                        placeholder="External Video Production Link (YouTube, Vimeo, Google Drive)" 
                                        type="url"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Access Control Section */}
                    <section className="bg-white p-6 lg:p-10 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:shadow-slate-300/50">
                        <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                            <h3 className="text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight uppercase italic">
                                <div className="w-2.5 h-8 bg-tatt-lime rounded-full"></div>
                                Access Control Grid
                            </h3>
                            <span className="text-[10px] font-black bg-slate-900 text-tatt-lime px-4 py-2 rounded-full uppercase tracking-widest border border-tatt-lime/20 shadow-lg shadow-black/10">
                                Deployment Status: Admin Only
                            </span>
                        </div>
                        <p className="text-lg font-medium text-slate-500 mb-10 leading-relaxed">Select organizational membership tiers enabled to decrypt and access this asset. Resources not mapped to a tier remain restricted to platform leadership.</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { id: 'FREE', label: 'Free Access', sub: 'General Public', icon: <User size={32} /> },
                                { id: 'UBUNTU', label: 'Ubuntu Core', sub: 'Standard Network', icon: <Users size={32} /> },
                                { id: 'IMANI', label: 'Imani Elite', sub: 'Premium Strategic', icon: <PlusCircle size={32} /> },
                                { id: 'KIONGOZI', label: 'Kiongozi Apex', sub: 'Executive Council', icon: <Shield size={32} /> }
                            ].map((tier) => (
                                <label 
                                    key={tier.id}
                                    className={`group relative flex flex-col items-center justify-center p-8 border-2 rounded-[1.5rem] cursor-pointer transition-all duration-300 ${
                                        selectedTiers.includes(tier.id) 
                                            ? 'bg-tatt-lime/10 border-tatt-lime shadow-lg shadow-tatt-lime/10' 
                                            : 'bg-slate-50 border-slate-200 hover:border-tatt-lime/50'
                                    }`}
                                >
                                    <input 
                                        type="checkbox"
                                        className="hidden"
                                        checked={selectedTiers.includes(tier.id)}
                                        onChange={() => handleTierChange(tier.id)}
                                    />
                                    <div className={`mb-4 transition-transform duration-300 group-hover:scale-110 ${selectedTiers.includes(tier.id) ? 'text-tatt-lime-dark' : 'text-slate-400'}`}>
                                        {tier.icon}
                                    </div>
                                    <span className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">{tier.label}</span>
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{tier.sub}</span>
                                    
                                    {selectedTiers.includes(tier.id) && (
                                        <div className="absolute top-4 right-4 text-tatt-lime">
                                            <CheckCircle2 size={24} />
                                        </div>
                                    )}
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-6 py-10 border-t border-slate-200">
                        <button 
                            onClick={() => router.back()}
                            className="w-full sm:w-auto px-8 py-5 rounded-2xl font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all text-sm italic" 
                            type="button"
                        >
                            Discard Draft
                        </button>
                        <button 
                            disabled={isSubmitting || uploading}
                            className="w-full sm:w-auto px-12 py-5 bg-slate-900 text-tatt-lime rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm min-w-[240px] flex items-center justify-center gap-3 border border-tatt-lime/20" 
                            type="submit"
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin text-tatt-lime" /> : <PlusCircle size={20} />}
                            Deploy Resource
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
