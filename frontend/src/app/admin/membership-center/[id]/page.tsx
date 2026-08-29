"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    ChevronRight, 
    ChevronUp,
    ChevronDown,
    Plus, 
    Trash2, 
    Ticket, 
    Loader2,
    Edit2,
    MoreVertical,
    Check
} from "lucide-react";
import { ActionDropdown } from "@/components/ui/action-dropdown";
import api from "@/services/api";
import toast from "react-hot-toast";



export default function EditMembershipPlanPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [editingPerkIndex, setEditingPerkIndex] = useState<number | null>(null);
    
    const [pricingTab, setPricingTab] = useState<'monthly'|'annual'>('monthly');
    const newPerkInputRef = useRef<HTMLInputElement | null>(null);
    const perkInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const triggerDebouncedAutoSave = (updatedFeatures: string[]) => {
        if (isNew) return;
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(async () => {
            try {
                const cleaned = updatedFeatures.filter(f => f.trim() !== "");
                await api.patch(`/membership-center/tiers/${id}`, {
                    features: cleaned,
                    perks: cleaned
                });
                toast.success("Perk order auto-saved", { id: "perk-auto-save" });
            } catch (err) {
                // Silent catch or minor warning
            }
        }, 1000);
    };
    
    const [planData, setPlanData] = useState({
        name: "",
        tagline: "",
        monthlyPrice: "",
        features: [""],
        hasYearlyDiscount: false,
        yearlyDiscountPercent: "15",
        eventDiscountPercent: 25,
        accessControls: [
            { title: 'Free Vendor Tables', subtitle: 'Exhibition and sales opportunities', enabled: false },
            { title: 'Pitch Event Access', subtitle: 'Priority invitation to funding sessions', enabled: false },
            { title: 'Talent Access', subtitle: 'Recruitment and networking priority', enabled: false },
            { title: 'TATT Job Board', subtitle: 'Exclusive Talent Matchmaking', enabled: false },
            { title: 'Premium Resource Library', subtitle: 'Research, Reports & Whitepapers', enabled: true }
        ]
    });

    useEffect(() => {
        if (!isNew) {
            const fetchPlan = async () => {
                try {
                    setLoading(true);
                    let plan: any = null;

                    // Try fetching single plan by ID or slug endpoint first
                    try {
                        const singleRes = await api.get(`/membership-center/tiers/${id}`);
                        if (singleRes.data && !Array.isArray(singleRes.data)) {
                            plan = singleRes.data;
                        }
                    } catch {
                        // Fallback to searching tiers list
                    }

                    if (!plan) {
                        const res = await api.get(`/membership-center/tiers`);
                        const lowerId = id.toLowerCase();
                        const normalizedSlug = lowerId.replace(/-/g, '_');
                        const normalizedName = lowerId.replace(/-/g, ' ');

                        plan = res.data.find((p: any) => 
                            p.id === id || 
                            p.tier?.toLowerCase() === lowerId || 
                            p.tier?.toLowerCase() === normalizedSlug || 
                            p.name?.toLowerCase() === normalizedName ||
                            p.name?.toLowerCase().replace(/\s+/g, '-') === lowerId
                        );
                    }

                    if (plan) {
                        const perksList = plan.features?.length > 0 
                            ? plan.features 
                            : (plan.perks?.length > 0 ? plan.perks : [""]);

                        setPlanData({
                            name: plan.name || "",
                            tagline: plan.tagline || "",
                            monthlyPrice: plan.monthlyPrice?.toString() || "",
                            features: perksList,
                            hasYearlyDiscount: plan.hasYearlyDiscount || false,
                            yearlyDiscountPercent: plan.yearlyDiscountPercent?.toString() || "15",
                            eventDiscountPercent: plan.eventDiscountPercent || 25,
                            accessControls: plan.accessControls?.length > 0 ? plan.accessControls : [
                                { title: 'Free Vendor Tables', subtitle: 'Exhibition and sales opportunities', enabled: false },
                                { title: 'Pitch Event Access', subtitle: 'Priority invitation to funding sessions', enabled: false },
                                { title: 'Talent Access', subtitle: 'Recruitment and networking priority', enabled: false },
                                { title: 'TATT Job Board', subtitle: 'Exclusive Talent Matchmaking', enabled: false },
                                { title: 'Premium Resource Library', subtitle: 'Research, Reports & Whitepapers', enabled: true }
                            ]
                        });
                    } else {
                        toast.error("Plan not found");
                        router.push('/admin/membership-center');
                    }
                } catch (err: any) {
                    toast.error("Failed to load plan");
                } finally {
                    setLoading(false);
                }
            };
            fetchPlan();
        }
    }, [id, isNew, router]);

    // --- PERKS REORDER & MANIPULATION HANDLERS ---
    const handleAddPerk = () => {
        const newIndex = planData.features.length;
        setPlanData(prev => ({
            ...prev,
            features: [...prev.features, ""]
        }));
        setEditingPerkIndex(newIndex);
        setTimeout(() => {
            perkInputRefs.current[newIndex]?.focus();
        }, 100);
    };



    const handleMovePerk = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= planData.features.length) return;

        const itemAtIndex = planData.features[index];
        const itemAtTarget = planData.features[targetIndex];
        if (itemAtIndex === undefined || itemAtTarget === undefined) return;

        const updatedFeatures = [...planData.features];
        updatedFeatures[index] = itemAtTarget;
        updatedFeatures[targetIndex] = itemAtIndex;

        setPlanData({ ...planData, features: updatedFeatures });
        triggerDebouncedAutoSave(updatedFeatures);
    };

    const handleRemovePerk = (index: number) => {
        if (!confirm("Are you sure you want to delete this perk?")) return;
        if (planData.features.length === 1) {
            setPlanData({ ...planData, features: [""] });
            toast.success("Perk removed");
            return;
        }
        const updatedFeatures = planData.features.filter((_, i) => i !== index);
        setPlanData({ ...planData, features: updatedFeatures });
        toast.success("Perk removed");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const parsedMonthly = parseFloat(planData.monthlyPrice) || 0;
            const parsedDiscount = parseFloat(planData.yearlyDiscountPercent) || 0;
            const cleanedFeatures = planData.features.filter(f => f.trim() !== "");

            const payload = {
                ...planData,
                monthlyPrice: parsedMonthly,
                yearlyDiscountPercent: parsedDiscount,
                yearlyPrice: parsedMonthly * 12 * (1 - (parsedDiscount / 100)),
                eventDiscountPercent: planData.eventDiscountPercent,
                accessControls: planData.accessControls,
                tier: isNew ? planData.name.toUpperCase().replace(/\s+/g, '_') : undefined,
                features: cleanedFeatures,
                perks: cleanedFeatures // Sync perks property
            };

            if (isNew) {
                await api.post("/membership-center/tiers", payload);
                toast.success("Plan created successfully");
            } else {
                await api.patch(`/membership-center/tiers/${id}`, payload);
                toast.success("Plan updated successfully");
            }
            router.push('/admin/membership-center');
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save plan");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="size-12 animate-spin text-tatt-lime" />
                <p className="text-tatt-gray font-black text-xs uppercase tracking-widest mt-4">Initializing Tier Parameters...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Main Content */}
            <main className="p-4 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-700">
                <header className="mb-10 flex flex-col items-start gap-2">
                    <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black mb-2">
                        <span className="text-tatt-gray/60 cursor-pointer hover:text-foreground transition-all" onClick={() => router.push('/admin/membership-center')}>Admin Portal</span>
                        <ChevronRight size={14} className="text-tatt-gray/40" />
                        <span className="text-tatt-gray/60 cursor-pointer hover:text-foreground transition-all" onClick={() => router.push('/admin/membership-center')}>Membership Center</span>
                        <ChevronRight size={14} className="text-tatt-gray/40" />
                        <span className="text-tatt-lime">{isNew ? 'Create New Plan' : `Edit ${planData.name || 'Plan'}`}</span>
                    </nav>
                    <h2 className="text-3xl font-black tracking-tight text-foreground">{isNew ? 'Create Membership Plan' : `Edit ${planData.name || 'Membership Plan'}`}</h2>
                    <p className="text-tatt-gray text-xs font-bold uppercase tracking-widest">{isNew ? 'Configure a new tier for the TATT community ecosystem.' : 'Modify tier perks and parameters for the TATT community ecosystem.'}</p>
                </header>

                <form onSubmit={handleSave} className="grid grid-cols-12 gap-8">
                    {/* Left Column: Identity, Pricing & Perks */}
                    <div className="col-span-12 lg:col-span-7 space-y-8">
                        {/* Plan Identity */}
                        <section className="bg-surface p-8 rounded-2xl border border-border shadow-sm group hover:border-border/80 transition-all">
                            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-tatt-gray mb-6 block">Plan Identity</label>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="col-span-1 sm:col-span-2">
                                        <label className="block text-[10px] uppercase tracking-widest font-black mb-2 text-foreground">Plan Display Name</label>
                                        <input 
                                            required
                                            value={planData.name}
                                            onChange={(e) => setPlanData({ ...planData, name: e.target.value })}
                                            className="w-full bg-background border border-border rounded-xl p-4 text-sm font-black focus:ring-2 focus:ring-tatt-lime outline-none transition-all placeholder:text-tatt-gray/40" 
                                            placeholder="e.g., Ubuntu Executive" 
                                            type="text" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-black mb-2 text-foreground">Short Description & Value Proposition</label>
                                    <textarea 
                                        value={planData.tagline}
                                        onChange={(e) => setPlanData({ ...planData, tagline: e.target.value })}
                                        className="w-full bg-background border border-border rounded-xl p-4 text-sm font-black focus:ring-2 focus:ring-tatt-lime outline-none transition-all custom-scrollbar placeholder:text-tatt-gray/40" 
                                        placeholder="Briefly describe the value proposition of this tier..." 
                                        rows={3}
                                    ></textarea>
                                </div>
                            </div>
                        </section>

                        {/* Pricing & Billing */}
                        <section className="bg-surface p-8 rounded-2xl border border-border shadow-sm group hover:border-border/80 transition-all">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div>
                                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-tatt-gray">Pricing & Billing</label>
                                    <p className="text-[9px] text-tatt-gray font-bold uppercase tracking-widest mt-1">Configure subscription cost structure</p>
                                </div>
                                <div className="flex items-center bg-background rounded-xl p-1 border border-border">
                                    <button 
                                        onClick={() => setPricingTab('monthly')}
                                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer active:scale-95 ${pricingTab === 'monthly' ? 'bg-tatt-lime text-tatt-black shadow-md' : 'text-tatt-gray hover:text-foreground'}`} 
                                        type="button"
                                    >
                                        Monthly View
                                    </button>
                                    <button 
                                        onClick={() => setPricingTab('annual')}
                                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer active:scale-95 ${pricingTab === 'annual' ? 'bg-tatt-lime text-tatt-black shadow-md' : 'text-tatt-gray hover:text-foreground'}`} 
                                        type="button"
                                    >
                                        Annual View
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-black mb-3 text-foreground">
                                        {pricingTab === 'monthly' ? 'Base Monthly Price (USD)' : 'Base Annual Total (USD)'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-lime font-black text-xl">$</span>
                                        <input 
                                            required
                                            value={pricingTab === 'monthly' ? planData.monthlyPrice : (parseFloat(planData.monthlyPrice || '0') * 12).toFixed(2)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (pricingTab === 'monthly') {
                                                    setPlanData({ ...planData, monthlyPrice: val });
                                                } else {
                                                    setPlanData({ ...planData, monthlyPrice: (parseFloat(val) / 12).toFixed(2) });
                                                }
                                            }}
                                            className="w-full bg-background border border-border rounded-2xl pl-12 pr-4 py-5 text-2xl font-black text-foreground focus:ring-2 focus:ring-tatt-lime outline-none transition-all placeholder:text-tatt-gray/40 shadow-inner" 
                                            placeholder="0.00" 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <p className="text-[9px] text-tatt-gray mt-3 font-bold uppercase tracking-widest italic">
                                        {pricingTab === 'monthly' ? 'Members pay this amount every 30 days' : 'Reflects 12 months of monthly payments'}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-[10px] uppercase tracking-widest font-black text-foreground">Annual Incentive (%)</label>
                                        <div 
                                            onClick={() => setPlanData({...planData, hasYearlyDiscount: !planData.hasYearlyDiscount})}
                                            className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-all ${planData.hasYearlyDiscount ?'bg-tatt-lime' : 'bg-background border border-border'}`}
                                        >
                                            <div className={`size-4 rounded-full bg-white shadow-sm transition-all ${planData.hasYearlyDiscount ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
                                    <div className={`relative ${!planData.hasYearlyDiscount ? 'opacity-30' : ''}`}>
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tatt-gray font-black text-xl">%</span>
                                        <input 
                                            disabled={!planData.hasYearlyDiscount}
                                            value={planData.yearlyDiscountPercent}
                                            onChange={(e) => setPlanData({ ...planData, yearlyDiscountPercent: e.target.value })}
                                            className="w-full bg-background border border-border rounded-2xl pr-12 pl-6 py-5 text-2xl font-black text-foreground focus:ring-2 focus:ring-tatt-lime outline-none transition-all disabled:cursor-not-allowed" 
                                            placeholder="15" 
                                            type="number" 
                                        />
                                    </div>
                                    {planData.hasYearlyDiscount && (
                                        <div className="p-3 bg-tatt-lime/5 border border-tatt-lime/20 rounded-xl text-[10px] font-black uppercase text-tatt-lime-dark tracking-tighter">
                                            Yearly Price: ${(parseFloat(planData.monthlyPrice || '0') * 12 * (1 - (parseFloat(planData.yearlyDiscountPercent)/100 || 0))).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Perks Configuration Section */}
                        <section className="bg-surface p-8 rounded-2xl border border-border shadow-sm group hover:border-border/80 transition-all">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-tatt-gray block">Perks & Features Configuration</label>
                                    <p className="text-[9px] text-tatt-gray font-bold uppercase tracking-widest mt-1">Define exclusive access perks for this tier</p>
                                </div>
                                <button 
                                    onClick={handleAddPerk}
                                    className="text-[10px] uppercase tracking-widest font-black text-tatt-black bg-tatt-lime px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:brightness-105 active:scale-95 transition-all shadow-sm cursor-pointer" 
                                    type="button"
                                >
                                    <Plus size={14} strokeWidth={3} /> Add Perk
                                </button>
                            </div>

                            {/* Active Perks List */}
                            <div className="space-y-3 mb-6">
                                {planData.features.map((perk, idx) => {
                                    const isEditing = editingPerkIndex === idx;
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`transition-all rounded-xl ${
                                                isEditing 
                                                    ? 'bg-tatt-lime/5 border-2 border-tatt-lime ring-4 ring-tatt-lime/10 shadow-md p-3.5 flex items-center gap-3' 
                                                    : 'bg-background p-3.5 border border-border group/perk hover:border-tatt-lime/40 flex items-center gap-3'
                                            }`}
                                        >
                                            <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                                isEditing ? 'bg-tatt-lime text-tatt-black' : 'bg-tatt-lime/10 text-tatt-lime'
                                            }`}>
                                                <Ticket size={16} />
                                            </div>

                                            <div className="flex-1">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            ref={(el) => {
                                                                perkInputRefs.current[idx] = el;
                                                            }}
                                                            value={perk}
                                                            autoFocus
                                                            onChange={(e) => {
                                                                const newFeat = [...planData.features];
                                                                newFeat[idx] = e.target.value;
                                                                setPlanData({ ...planData, features: newFeat });
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    setEditingPerkIndex(null);
                                                                    triggerDebouncedAutoSave(planData.features);
                                                                }
                                                            }}
                                                            className="w-full bg-transparent border-b-2 border-tatt-lime pb-1 text-sm font-black text-foreground outline-none transition-all placeholder:text-tatt-gray/40"
                                                            placeholder="Define exclusive perk..."
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingPerkIndex(null);
                                                                triggerDebouncedAutoSave(planData.features);
                                                            }}
                                                            className="bg-tatt-lime text-tatt-black px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:brightness-105 active:scale-95 cursor-pointer shrink-0 shadow-sm"
                                                        >
                                                            <Check size={12} strokeWidth={3} /> Done
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        onDoubleClick={() => {
                                                            setEditingPerkIndex(idx);
                                                            setTimeout(() => {
                                                                perkInputRefs.current[idx]?.focus();
                                                                perkInputRefs.current[idx]?.select();
                                                            }, 50);
                                                        }}
                                                        className="cursor-pointer group/title"
                                                        title="Double-click to edit perk"
                                                    >
                                                        <span className="text-sm font-black text-foreground group-hover/title:text-tatt-lime transition-colors block">
                                                            {perk || <span className="text-tatt-gray/40 italic">Empty perk...</span>}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Unboxed Reorder Buttons + Hero UI 3-Dots Dropdown */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => handleMovePerk(idx, 'up')}
                                                        className="p-0.5 text-tatt-gray hover:text-tatt-lime disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-90"
                                                        title="Move Perk Up"
                                                    >
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={idx === planData.features.length - 1}
                                                        onClick={() => handleMovePerk(idx, 'down')}
                                                        className="p-0.5 text-tatt-gray hover:text-tatt-lime disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-90"
                                                        title="Move Perk Down"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                </div>

                                                <ActionDropdown
                                                    ariaLabel={`Perk actions for perk ${idx + 1}`}
                                                    items={[
                                                        {
                                                            key: "edit",
                                                            label: "Edit Perk",
                                                            icon: <Edit2 size={14} />,
                                                            onPress: () => {
                                                                setEditingPerkIndex(idx);
                                                                setTimeout(() => {
                                                                    perkInputRefs.current[idx]?.focus();
                                                                    perkInputRefs.current[idx]?.select();
                                                                }, 50);
                                                            }
                                                        },
                                                        "divider",
                                                        {
                                                            key: "delete",
                                                            label: "Delete Perk",
                                                            icon: <Trash2 size={14} />,
                                                            isDanger: true,
                                                            onPress: () => handleRemovePerk(idx)
                                                        }
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>


                        </section>
                    </div>

                    {/* Right Column: Access & Discounts */}
                    <div className="col-span-12 lg:col-span-5 space-y-8">
                        {/* Member Benefits */}
                        <section className="bg-surface p-8 rounded-2xl border border-border shadow-sm group hover:border-border/80 transition-all">
                            <div className="flex justify-between items-center mb-6">
                                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-tatt-gray">System Access Controls</label>
                                <button 
                                    onClick={() => setPlanData({ ...planData, accessControls: [...planData.accessControls, { title: '', subtitle: '', enabled: false }] })}
                                    className="text-[10px] uppercase tracking-widest font-black text-tatt-black bg-tatt-lime px-3 py-1.5 rounded-lg flex items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer" 
                                    type="button"
                                >
                                    <Plus size={12} /> Add Entry
                                </button>
                            </div>
                            <div className="space-y-3">
                                {planData.accessControls.map((control: any, i: number) => (
                                    <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${control.enabled ? 'bg-background border-tatt-lime/40' : 'bg-surface border-border'} group/ctrl`}>
                                        <input 
                                            checked={control.enabled} 
                                            onChange={(e) => {
                                                const newCtrls = [...planData.accessControls];
                                                const ctrl = newCtrls[i];
                                                if (ctrl) {
                                                    ctrl.enabled = e.target.checked;
                                                    setPlanData({ ...planData, accessControls: newCtrls });
                                                }
                                            }}
                                            className="mt-1 w-4 h-4 rounded border-border text-tatt-lime focus:ring-tatt-lime bg-surface accent-tatt-lime cursor-pointer" 
                                            type="checkbox" 
                                        />
                                        <div className="flex flex-col flex-1">
                                            <input 
                                                value={control.title}
                                                onChange={(e) => {
                                                    const newCtrls = [...planData.accessControls];
                                                    const ctrl = newCtrls[i];
                                                    if (ctrl) {
                                                        ctrl.title = e.target.value;
                                                        setPlanData({ ...planData, accessControls: newCtrls });
                                                    }
                                                }}
                                                className="w-full bg-transparent border-none p-0 text-sm font-black text-foreground focus:ring-0 placeholder:text-tatt-gray/40 outline-none"
                                                placeholder="Control Title"
                                            />
                                            <input 
                                                value={control.subtitle}
                                                onChange={(e) => {
                                                    const newCtrls = [...planData.accessControls];
                                                    const ctrl = newCtrls[i];
                                                    if (ctrl) {
                                                        ctrl.subtitle = e.target.value;
                                                        setPlanData({ ...planData, accessControls: newCtrls });
                                                    }
                                                }}
                                                className="w-full bg-transparent border-none p-0 text-[10px] uppercase tracking-widest text-tatt-gray font-bold mt-1 focus:ring-0 placeholder:text-tatt-gray/30 outline-none"
                                                placeholder="Target Description"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if(planData.accessControls.length > 1) {
                                                    const newCtrls = planData.accessControls.filter((_: any, idx: number) => idx !== i);
                                                    setPlanData({ ...planData, accessControls: newCtrls });
                                                }
                                            }}
                                            className="text-tatt-gray hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50/10 opacity-0 group-hover/ctrl:opacity-100 cursor-pointer active:scale-95" 
                                            type="button"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[9px] font-black uppercase text-center mt-6 tracking-widest text-tatt-gray/60 italic">Dynamic System Configuration</p>
                        </section>

                        {/* Form Actions */}
                        <div className="flex flex-col gap-4 pt-4 sticky bottom-8">
                            <button 
                                disabled={saving}
                                className="w-full bg-tatt-lime text-tatt-black py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:shadow-xl hover:shadow-tatt-lime/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                                type="submit"
                            >
                                {saving ? <Loader2 className="animate-spin size-4" /> : null}
                                {isNew ? 'Create Plan' : 'Save Plan & Perks'}
                            </button>
                            <button 
                                onClick={() => router.push('/admin/membership-center')}
                                className="w-full bg-background border border-border hover:bg-surface text-tatt-gray py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-[0.98] cursor-pointer" 
                                type="button"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
