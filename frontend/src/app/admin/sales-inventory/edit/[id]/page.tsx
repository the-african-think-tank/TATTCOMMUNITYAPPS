"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    Info,
    Image as ImageIcon,
    DollarSign,
    Layers,
    Timer,
    ChevronRight,
    UploadCloud,
    Trash2,
    PlusCircle,
    Eye,
    Save,
    Send,
    Loader2,
    X,
    Bold,
    Italic,
    List,
    Link as LinkIcon,
    AlertCircle,
    Truck,
    ChevronDown,
    Check
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { UPLOAD_LIMITS, validateFileSize, extractUploadedUrls, getUploadErrorMessage } from "@/lib/upload-utils";

interface Variant {
    id?: string;
    size: string;
    color: string;
    sku: string;
    stock: number;
}

const COLOR_MAP: Record<string, string> = {
    "Obsidian": "#000000",
    "Ivory": "#f8f8f5",
    "Emerald": "#064e3b",
    "Ruby": "#991b1b",
    "Slate": "#475569",
    "Amber": "#b45309",
    "Midnight": "#1e1b4b",
    "Olive": "#3f6212",
    "Sand": "#a8a29e"
};

const AVAILABLE_COLORS = Object.keys(COLOR_MAP);
const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

export default function EditProductPage() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [openColorDropdownIndex, setOpenColorDropdownIndex] = useState<number | null>(null);

    const [form, setForm] = useState({
        name: "",
        category: "APPAREL",
        brand: "TATT Original",
        description: "",
        price: 0,
        currency: "USD",
        stock: 0,
        lowStockThreshold: 5,
        imageUrl: "",
        additionalImages: [] as string[],
        isLimitedEdition: false,
        dropStart: "",
        dropEnd: "",
        status: "ACTIVE",
        deliveryFee: 0
    });

    const [variants, setVariants] = useState<Variant[]>([]);

    useEffect(() => {
        if (id) fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const res = await api.get(`/store/products/${id}`);
            const p = res.data;
            setForm({
                name: p.name,
                category: p.category,
                brand: p.brand || "TATT Original",
                description: p.description || "",
                price: p.price,
                currency: p.currency || "USD",
                stock: p.stock,
                lowStockThreshold: p.lowStockThreshold || 5,
                imageUrl: p.imageUrl || "",
                additionalImages: p.additionalImages || [],
                isLimitedEdition: p.isLimitedEdition || false,
                dropStart: p.dropStart ? new Date(p.dropStart).toISOString().slice(0, 16) : "",
                dropEnd: p.dropEnd ? new Date(p.dropEnd).toISOString().slice(0, 16) : "",
                status: p.status,
                deliveryFee: p.deliveryFee || 0
            });
            
            if (p.variants) {
                setVariants(p.variants.map((v: any) => ({
                    id: v.id,
                    size: v.size || "",
                    color: v.color || "",
                    sku: v.sku || "",
                    stock: v.stock || 0
                })));
            }
        } catch (error) {
            toast.error("Failed to load product details");
            router.push("/admin/sales-inventory");
        } finally {
            setLoading(false);
        }
    };

    const generateSKU = (size: string, color: string) => {
        const prefix = "TATT";
        const cleanSize = size.toUpperCase().replace(/\s+/g, "");
        const cleanColor = color.toUpperCase().replace(/\s+/g, "");
        return `${prefix}-${cleanSize}-${cleanColor}-${Math.floor(Math.random() * 1000)}`;
    };

    const addVariant = () => {
        const newSize = "L";
        const newColor = "Obsidian";
        const newVariant: Variant = { size: newSize, color: newColor, sku: generateSKU(newSize, newColor), stock: 0 };
        setVariants([...variants, newVariant]);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const updateVariant = (index: number, field: keyof Variant, value: any) => {
        setVariants(prev => {
            const next = [...prev];
            const currentItem = next[index];
            if (!currentItem) return prev;

            const updated = { ...currentItem, [field]: value } as Variant;
            if (field === 'size' || field === 'color') {
                updated.sku = generateSKU(updated.size, updated.color);
            }
            next[index] = updated;
            return next;
        });
        if (field === 'color') setOpenColorDropdownIndex(null);
    };

    const [isDragging, setIsDragging] = useState(false);

    const processFiles = async (files: File[]) => {
        if (!files.length) return;

        for (const file of files) {
            const validation = validateFileSize(file, UPLOAD_LIMITS.IMAGE.maxBytes, file.name);
            if (!validation.valid) {
                toast.error(validation.error!);
                return;
            }
        }

        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        try {
            setUploading(true);
            const res = await api.post("/uploads/media", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 180000,
            });
            const urls = extractUploadedUrls(res.data);
            if (urls.length > 0) {
                setForm(prev => ({
                    ...prev,
                    imageUrl: prev.imageUrl || urls[0] || "",
                    additionalImages: [...prev.additionalImages, ...urls]
                }));
                toast.success(`${urls.length} file(s) uploaded`);
            } else {
                toast.error("Failed to retrieve upload URLs");
            }
        } catch (error) {
            toast.error(getUploadErrorMessage(error, "Failed to upload media"));
        } finally {
            setUploading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const files = Array.from(e.target.files);
        processFiles(files);
        e.target.value = "";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const payload = {
                ...form,
                price: Number(form.price),
                deliveryFee: Number(form.deliveryFee),
                variants: variants.map(v => ({
                    ...v,
                    label: `${v.size} / ${v.color}`.trim() || "Default",
                    type: "SKU_VARIANT"
                }))
            };
            await api.patch(`/store/products/${id}`, payload);
            toast.success("Product updated!");
            router.push("/admin/sales-inventory");
        } catch (error) {
            toast.error("Failed to update product");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 text-tatt-lime animate-spin" />
            <p className="text-tatt-gray font-bold uppercase tracking-widest text-xs italic">Retrieving Archive Specs...</p>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-background p-6">
            <div className="max-w-4xl space-y-8 pb-32">
                <div>
                   <h1 className="text-4xl font-black italic uppercase tracking-tight">Edit Premium Listing</h1>
                   <p className="text-tatt-gray font-bold text-xs uppercase tracking-widest mt-2">Update luxury product details and inventory settings.</p>
                </div>

                <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-background/30"><h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-3">Basic Information</h3></div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="col-span-full">
                                <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-3">Product Title</label>
                                <input className="w-full h-14 px-6 rounded-2xl border-border bg-background font-black outline-none focus:border-tatt-lime" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-3">Category</label>
                                <select className="w-full h-14 px-6 bg-background rounded-2xl border-border font-bold outline-none cursor-pointer appearance-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                    <option value="APPAREL">Apparel</option>
                                    <option value="ACCESSORIES">Accessories</option>
                                    <option value="HOME_DECOR">Home Decor</option>
                                    <option value="LIMITED_DROPS">Limited Drops</option>
                                    <option value="BOOKS">Books & Media</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-3">Brand</label>
                                <input className="w-full h-14 px-6 rounded-2xl border-border bg-background font-black outline-none" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                             </div>
                        </div>
                    </div>
                </section>

                <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-background/30">
                        <h3 className="font-black text-sm uppercase tracking-widest">Product Media</h3>
                    </div>
                    <div className="p-8">
                        <label 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden group ${isDragging ? "border-tatt-lime bg-tatt-lime/10" : "border-border bg-background/50 hover:border-tatt-lime"}`}
                        >
                            <input type="file" className="hidden" multiple accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                            {uploading ? <Loader2 className="h-10 w-10 animate-spin text-tatt-lime" /> : (
                                <>
                                    <UploadCloud size={32} className={`transition-colors mb-2 ${isDragging ? "text-tatt-lime scale-110" : "text-tatt-gray group-hover:text-tatt-lime"}`} />
                                    <p className="text-xs font-bold text-foreground">Click to upload or drag and drop</p>
                                    <p className="text-[10px] text-tatt-gray mt-1">PNG, JPG, WebP up to 50MB each</p>
                                </>
                            )}
                        </label>
                        {form.additionalImages.length > 0 && (
                            <div className="grid grid-cols-4 gap-4 mt-8">
                                {form.additionalImages.map((url, i) => (
                                    <div key={i} className="aspect-square rounded-2xl border border-border overflow-hidden relative group">
                                        <img src={url} className="size-full object-cover" alt="Product thumbnail" />
                                        <button onClick={() => setForm({...form, additionalImages: form.additionalImages.filter(u => u !== url)})} className="absolute top-2 right-2 p-2 bg-red-500 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-background/30"><h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-3">Pricing & Logistics</h3></div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-3">Price (USD)</label>
                            <input 
                                className="w-full h-14 px-6 border-border rounded-2xl bg-background font-black outline-none focus:border-tatt-lime" 
                                type="number"
                                placeholder="0"
                                value={form.price === 0 ? "" : form.price}
                                onChange={e => setForm({...form, price: e.target.value === "" ? 0 : Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-tatt-gray uppercase tracking-widest mb-3 text-tatt-lime">Delivery Fee</label>
                            <input 
                                className="w-full h-14 px-6 border-border rounded-2xl bg-background font-black outline-none focus:border-tatt-lime text-tatt-lime" 
                                type="number"
                                placeholder="0"
                                value={form.deliveryFee === 0 ? "" : form.deliveryFee}
                                onChange={e => setForm({...form, deliveryFee: e.target.value === "" ? 0 : Number(e.target.value)})}
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-background/30 flex justify-between items-center">
                        <h3 className="font-black text-sm uppercase tracking-widest">Inventory & Variants</h3>
                        <button onClick={addVariant} className="text-[10px] font-black text-tatt-lime flex items-center gap-2 hover:translate-x-1 transition-transform">
                            <PlusCircle size={16}/> Add Row
                        </button>
                    </div>
                    <div className="p-8">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-tatt-gray border-b border-border uppercase tracking-widest">
                                    <th className="pb-4 px-2">Size</th>
                                    <th className="pb-4 px-2">Color</th>
                                    <th className="pb-4 px-2">Stock</th>
                                    <th className="pb-4 px-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {variants.map((v, idx) => (
                                    <tr key={idx} className="group hover:bg-background/20 transition-colors">
                                        <td className="py-5 px-2">
                                            <select className="h-10 px-3 bg-background border border-border rounded-xl font-bold text-xs" value={v.size} onChange={e => updateVariant(idx, 'size', e.target.value)}>
                                                {AVAILABLE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-5 px-2 relative">
                                            <button onClick={() => setOpenColorDropdownIndex(openColorDropdownIndex === idx ? null : idx)} className="flex items-center justify-between w-40 h-10 px-3 bg-background border border-border rounded-xl">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-4 rounded-full border" style={{ backgroundColor: COLOR_MAP[v.color] }} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest font-sans">{v.color}</span>
                                                </div>
                                                <ChevronDown size={14} className={`text-tatt-gray transition-transform ${openColorDropdownIndex === idx ? 'rotate-180' : ''}`} />
                                            </button>
                                            {openColorDropdownIndex === idx && (
                                                <div className="absolute top-[80%] z-50 w-48 mt-2 bg-surface border border-border rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in duration-200">
                                                    {AVAILABLE_COLORS.map(color => (
                                                        <button key={color} onClick={() => updateVariant(idx, 'color', color)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-background">
                                                            <div className="size-4 rounded-full border" style={{ backgroundColor: COLOR_MAP[color] }} />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{color}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-5 px-2">
                                            <input 
                                                className="w-24 h-10 px-4 bg-background border border-border rounded-xl font-black text-xs outline-none focus:border-tatt-lime" 
                                                type="number"
                                                placeholder="0"
                                                value={v.stock === 0 ? "" : v.stock}
                                                onChange={e => updateVariant(idx, 'stock', e.target.value === "" ? 0 : Number(e.target.value))}
                                            />
                                        </td>
                                        <td className="py-5 px-2 text-right">
                                            <button onClick={() => removeVariant(idx)} className="p-2 text-tatt-gray hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <div className="fixed bottom-0 left-0 lg:left-72 right-0 bg-surface/80 backdrop-blur-xl border-t border-border p-5 z-40">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <p className="text-[10px] font-black text-tatt-gray uppercase tracking-widest">Update Mode Active</p>
                    <div className="flex gap-4">
                        <button onClick={() => router.push("/admin/sales-inventory")} className="px-8 py-3.5 rounded-2xl border border-border text-[10px] font-black uppercase">Cancel</button>
                        <button onClick={handleSubmit} disabled={saving} className="px-10 py-3.5 rounded-2xl bg-tatt-lime text-tatt-black font-black text-[10px] uppercase shadow-xl hover:brightness-105">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Update Artifact
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
