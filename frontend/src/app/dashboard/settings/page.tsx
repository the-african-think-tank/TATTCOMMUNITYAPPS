"use client";

import { useAuth } from "@/context/auth-context";
import api from "@/services/api";
import { useEffect, useState } from "react";
import {
    User as UserIcon,
    BadgeCheck,
    Brain,
    Network,
    Building2,
    Camera,
    Plus,
    CheckCircle,
    Loader2,
    Save,
    Trash2,
    CreditCard,
    RefreshCw,
    Wallet,
    Lock,
    Image as ImageIcon,
    Zap
} from "lucide-react";

import { Interest } from "@/types/interests";
import { ChapterDetail } from "@/types/chapter";
import { toast } from "react-hot-toast";
import { ChevronDown, X, AlertTriangle, Globe, MapPin, Phone, Mail, Layout } from "lucide-react";

// --- Custom Components ---

const CustomSelect = ({
    label,
    name,
    value,
    options,
    onChange,
    placeholder = "Select an option"
}: {
    label: string,
    name: string,
    value: string,
    options: { label: string, value: string }[],
    onChange: (name: string, value: string) => void,
    placeholder?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="space-y-2 relative">
            <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-background border-border border rounded-xl px-4 py-3 text-sm flex items-center justify-between focus:ring-2 focus:ring-tatt-lime outline-none text-left transition-all hover:border-tatt-lime/50"
            >
                <span className={value ? "text-foreground" : "text-tatt-gray"}>
                    {options.find(opt => opt.value === value)?.label || placeholder}
                </span>
                <ChevronDown className={`size-4 text-tatt-gray transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 w-full mt-2 bg-surface border border-border rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(name, opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-4 py-3 text-sm text-left hover:bg-tatt-lime/10 transition-colors flex items-center justify-between ${value === opt.value ? 'bg-tatt-lime/5 text-tatt-lime font-bold' : 'text-foreground'}`}
                            >
                                {opt.label}
                                {value === opt.value && <CheckCircle className="size-4" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    isLoading
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: () => void,
    title: string,
    message: string,
    confirmText: string,
    isLoading: boolean
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-surface border border-border w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-tatt-gray hover:text-foreground transition-colors"
                >
                    <X className="size-6" />
                </button>

                <div className="size-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
                    <AlertTriangle className="text-red-500 size-8" />
                </div>

                <h3 className="text-2xl font-black mb-4">{title}</h3>
                <p className="text-tatt-gray text-sm leading-relaxed mb-8">
                    {message}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="w-full py-4 bg-red-500 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : confirmText}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full py-4 text-tatt-gray text-sm font-bold hover:text-foreground transition-colors"
                    >
                        Nevermind, take me back
                    </button>
                </div>
            </div>
        </div>
    );
};

const PaymentMethodModal = ({
    isOpen,
    onClose,
    onSuccess
}: {
    isOpen: boolean,
    onClose: () => void,
    onSuccess: () => void
}) => {
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvc: '',
        name: ''
    });
    const [cardType, setCardType] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let { name, value } = e.target;
        if (name === 'number') {
            value = value.replace(/\D/g, '').substring(0, 16);
            if (value.startsWith('4')) setCardType('visa');
            else if (value.startsWith('5')) setCardType('mastercard');
            else if (value.startsWith('34') || value.startsWith('37')) setCardType('amex');
            else if (value.startsWith('6')) setCardType('discover');
            else setCardType(null);
        }
        if (name === 'expiry') {
            value = value.replace(/\D/g, '');
            if (value.length > 2) value = value.substring(0, 2) + '/' + value.substring(2, 4);
            else value = value.substring(0, 4);
        }
        if (name === 'cvc') value = value.replace(/\D/g, '').substring(0, 4);
        setCardDetails(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        if (cardDetails.number.length < 13) return "Invalid card number";
        if (cardDetails.expiry.length < 5) return "Invalid expiry";
        if (cardDetails.cvc.length < 3) return "Invalid CVC";
        if (!cardDetails.name) return "Name on card is required";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            setError(err);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await api.post("/billing/payment-method", {
                paymentMethodId: "pm_card_visa" // MOCK - In production this would be from Stripe Elements
            });
            toast.success("Payment method updated!");
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || "Failed to update payment method.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-surface border border-border w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 text-tatt-gray hover:text-foreground">
                    <X className="size-6" />
                </button>

                <div className="size-14 rounded-2xl bg-tatt-lime/10 flex items-center justify-center mb-6">
                    <CreditCard className="text-tatt-lime size-7" />
                </div>

                <h3 className="text-2xl font-black mb-2">Add Payment Method</h3>
                <p className="text-tatt-gray text-sm mb-8">Update your default card for future renewals.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 block">Card Number</label>
                        <input
                            name="number"
                            value={cardDetails.number}
                            onChange={handleCardChange}
                            placeholder="•••• •••• •••• ••••"
                            className="w-full bg-background border-border border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                        />
                        {cardType && (
                            <span className="absolute right-4 bottom-3 text-[10px] font-black text-tatt-lime uppercase">{cardType}</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 block">Expiry</label>
                            <input
                                name="expiry"
                                value={cardDetails.expiry}
                                onChange={handleCardChange}
                                placeholder="MM/YY"
                                className="w-full bg-background border-border border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 block">CVC</label>
                            <input
                                name="cvc"
                                value={cardDetails.cvc}
                                onChange={handleCardChange}
                                placeholder="•••"
                                className="w-full bg-background border-border border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-1.5 block">Name on Card</label>
                        <input
                            name="name"
                            value={cardDetails.name}
                            onChange={handleCardChange}
                            placeholder="John Doe"
                            className="w-full bg-background border-border border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                        />
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold mt-2">{error}</p>}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-tatt-lime text-black text-sm font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all flex items-center justify-center mt-4 disabled:opacity-50 shadow-lg shadow-tatt-lime/20"
                    >
                        {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : "Securely Attach Card"}
                    </button>
                    <p className="text-[10px] text-tatt-gray text-center flex items-center justify-center gap-1">
                        <Lock className="size-3" /> Encrypted and processed by Stripe
                    </p>
                </form>
            </div>
        </div>
    );
};

export default function SettingsPage() {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
    const [availableIndustries, setAvailableIndustries] = useState<{ id: string, name: string }[]>([]);
    const [chapters, setChapters] = useState<ChapterDetail[]>([]);
    const [deletionLoading, setDeletionLoading] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        professionTitle: "",
        industryId: "",
        employer: "",
        professionalHighlight: "",
        expertise: "",
        connectionPreference: "OPEN",
        businessName: "",
        businessRole: "",
        businessProfileLink: "",
        interests: [] as string[],
        profilePicture: "",
        chapterId: "",
        linkedInProfileUrl: "",
        hasAutoPayEnabled: true,
    });

    const [paymentMethod, setPaymentMethod] = useState<{ last4: string, brand: string, exp_month: number, exp_year: number } | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [togglingAutoPay, setTogglingAutoPay] = useState(false);
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'BILLING' | 'BUSINESS'>('GENERAL');

    // Business Profile State
    const [businessData, setBusinessData] = useState({
        name: "",
        category: "All",
        website: "",
        locationText: "",
        perkOffer: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        logoUrl: "",
        bannerUrl: "",
        chapterId: "",
    });
    const [savingBusiness, setSavingBusiness] = useState(false);
    const [loadingBusiness, setLoadingBusiness] = useState(false);


    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [intRes, chapRes, indRes] = await Promise.all([
                    api.get("/interests"),
                    api.get("/chapters"),
                    api.get("/industries")
                ]);

                setAvailableInterests(intRes.data);
                setChapters(chapRes.data);
                setAvailableIndustries(indRes.data);

                if (user) {
                    setFormData({
                        firstName: user.firstName || "",
                        lastName: user.lastName || "",
                        professionTitle: user.professionTitle || "",
                        industryId: user.industryId || "",
                        employer: user.companyName || "",
                        professionalHighlight: user.professionalHighlight || "",
                        expertise: user.expertise || "",
                        connectionPreference: user.connectionPreference || "OPEN",
                        businessName: user.businessName || "",
                        businessRole: user.businessRole || "",
                        businessProfileLink: user.businessProfileLink || "",
                        interests: user.interests?.map(i => i.id) || [],
                        profilePicture: user.profilePicture || "",
                        chapterId: user.chapterId || "",
                        linkedInProfileUrl: user.linkedInProfileUrl || "",
                        hasAutoPayEnabled: user.hasAutoPayEnabled ?? true,
                    });

                }
            } catch (error) {
                console.error("Failed to load settings data", error);
            } finally {
                setFetching(false);
            }
        };

        const fetchPaymentMethod = async () => {
            try {
                const resp = await api.get("/billing/payment-method");
                setPaymentMethod(resp.data);
            } catch (err) {
                console.error("Failed to fetch payment method", err);
            }
        };

        const fetchBusinessProfile = async () => {
            if (user?.communityTier !== 'KIONGOZI') return;
            setLoadingBusiness(true);
            try {
                const { data } = await api.get("/business-directory/profile-managed");
                if (data) {
                    setBusinessData({
                        name: data.name || "",
                        category: data.category || "All",
                        website: data.website || "",
                        locationText: data.locationText || "",
                        perkOffer: data.perkOffer || "",
                        contactName: data.contactName || "",
                        contactEmail: data.contactEmail || "",
                        contactPhone: data.contactPhone || "",
                        logoUrl: data.logoUrl || "",
                        bannerUrl: data.bannerUrl || "",
                        chapterId: data.chapterId || "",
                    });
                }
            } catch (err) {
                console.error("Failed to fetch business profile", err);
            } finally {
                setLoadingBusiness(false);
            }
        };

        loadInitialData();
        fetchPaymentMethod();
        fetchBusinessProfile();
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleInterest = (interestId: string) => {
        setFormData(prev => {
            const interests = prev.interests.includes(interestId)
                ? prev.interests.filter(id => id !== interestId)
                : [...prev.interests, interestId];
            return { ...prev, interests };
        });
    };

    const handleAutoPayToggle = async (enabled: boolean) => {
        setTogglingAutoPay(true);
        try {
            await api.post("/billing/autopay/toggle", { enabled });
            setFormData(prev => ({ ...prev, hasAutoPayEnabled: enabled }));
            updateUser({ hasAutoPayEnabled: enabled } as any);
            toast.success(`Auto-pay ${enabled ? 'enabled' : 'disabled'} successfully.`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to toggle auto-pay.");
        } finally {
            setTogglingAutoPay(false);
        }
    };

    const cleanPayload = (data: any) => {
        const cleaned = { ...data };
        Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === "") cleaned[key] = null;
        });
        return cleaned;
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { employer, ...payload } = formData;
            const cleanedPayload = cleanPayload({
                ...payload,
                companyName: employer
            });

            const response = await api.patch("/account/profile", cleanedPayload);

            // Update auth context with new user data
            updateUser(response.data);
            toast.success("Profile settings saved securely!");
        } catch (error) {
            console.error("Failed to update profile", error);
            toast.error("Failed to update profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadFormData = new FormData();
        uploadFormData.append("files", file);

        try {
            toast.loading("Updating profile picture...", { id: 'upload' });

            // 1. Upload the image
            const response = await api.post("/uploads/media", uploadFormData);
            const imageUrl = response.data.files?.[0]?.url;

            if (!imageUrl) {
                toast.error("Failed to retrieve upload URL", { id: 'upload' });
                return;
            }

            // 2. Update the user profile immediately for a live feel
            const { employer, ...payload } = formData;
            const cleanedPayload = cleanPayload({
                ...payload,
                profilePicture: imageUrl,
                companyName: employer
            });

            const profileRes = await api.patch("/account/profile", cleanedPayload);

            // 3. Update both local state and auth context
            setFormData(prev => ({ ...prev, profilePicture: imageUrl }));
            updateUser(profileRes.data);

            toast.success("Profile picture updated!", { id: 'upload' });
        } catch (error) {
            console.error("Failed to update profile picture", error);
            toast.error("Failed to update profile picture.", { id: 'upload' });
        }
    };

    const handleRequestDeletion = async () => {
        setDeletionLoading(true);
        try {
            const response = await api.patch("/account/request-deletion");
            toast.success(response.data.message);

            // Refresh user profile
            const meRes = await api.get("/auth/me");
            updateUser(meRes.data);
            setIsConfirmModalOpen(false);
        } catch (error) {
            toast.error("Failed to schedule deletion.");
        } finally {
            setDeletionLoading(false);
        }
    };

    const handleCancelDeletion = async () => {
        setDeletionLoading(true);
        try {
            const response = await api.patch("/account/cancel-deletion");
            toast.success(response.data.message);

            // Refresh user profile
            const meRes = await api.get("/auth/me");
            updateUser(meRes.data);
        } catch (error) {
            toast.error("Failed to cancel deletion.");
        } finally {
            setDeletionLoading(false);
        }
    };

    const handleBusinessInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setBusinessData(prev => ({ ...prev, [name]: value }));
    };

    const handleBusinessSelectChange = (name: string, value: string) => {
        setBusinessData(prev => ({ ...prev, [name]: value }));
    };

    const handleBusinessFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'bannerUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadFormData = new FormData();
        uploadFormData.append("files", file);

        try {
            toast.loading(`Uploading business ${field === 'logoUrl' ? 'logo' : 'banner'}...`, { id: 'biz-upload' });
            const response = await api.post("/uploads/media", uploadFormData);
            const imageUrl = response.data.files?.[0]?.url;

            if (imageUrl) {
                setBusinessData(prev => ({ ...prev, [field]: imageUrl }));
                toast.success("Image uploaded successfully!", { id: 'biz-upload' });
            }
        } catch (error) {
            toast.error("Upload failed.", { id: 'biz-upload' });
        }
    };

    const handleSaveBusiness = async () => {
        setSavingBusiness(true);
        try {
            await api.post("/business-directory/profile-managed", businessData);
            toast.success("Business profile saved and published!");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to save business profile.");
        } finally {
            setSavingBusiness(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="size-10 animate-spin text-tatt-lime" />
            </div>
        );
    }

    const isKiongozi = user?.communityTier === "KIONGOZI";

    const categories = ['Agriculture & Food', 'Technology & Innovation', 'Healthcare & Wellness', 'Creative & Media', 'Finance & FinTech', 'Manufacturing & Trade', 'Education & Research'];

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2 text-foreground">Account Settings</h2>
                    <p className="text-tatt-gray">Manage your profile, visibility, and professional identity.</p>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex bg-surface border border-border p-1 rounded-2xl mb-8 overflow-x-auto no-scrollbar shadow-sm w-fit max-w-full">
                <button
                    onClick={() => setActiveTab('GENERAL')}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'GENERAL' ? 'bg-tatt-lime text-black shadow-md' : 'text-tatt-gray hover:text-foreground hover:bg-black/5'}`}
                >
                    <div className="flex items-center gap-2">
                        <UserIcon size={14} /> Global Profile
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('BILLING')}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'BILLING' ? 'bg-tatt-lime text-black shadow-md' : 'text-tatt-gray hover:text-foreground hover:bg-black/5'}`}
                >
                    <div className="flex items-center gap-2">
                        <Wallet size={14} /> Billing & Access
                    </div>
                </button>
                {isKiongozi && (
                    <button
                        onClick={() => setActiveTab('BUSINESS')}
                        className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'BUSINESS' ? 'bg-tatt-lime text-black shadow-md' : 'text-tatt-gray hover:text-foreground hover:bg-black/5'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Building2 size={14} /> Business Profile
                        </div>
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {activeTab === 'GENERAL' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {user?.deletionRequestedAt && (
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 animate-pulse">
                                <div className="size-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                                    <Trash2 className="text-red-500 size-6" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <p className="text-sm font-black text-red-500 uppercase tracking-widest">Account Scheduled for Deletion</p>
                                    <p className="text-xs text-tatt-gray italic">Your data is set for permanent removal on {new Date(new Date(user.deletionRequestedAt).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                                </div>
                                <button
                                    onClick={handleCancelDeletion}
                                    disabled={deletionLoading}
                                    className="px-6 py-3 bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    Cancel Request
                                </button>
                            </div>
                        )}

                        {/* Profile Header Card */}
                        <section className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="relative group">
                                    <div className="size-32 rounded-full overflow-hidden border-4 border-tatt-lime/20 bg-tatt-lime/10 flex items-center justify-center relative shadow-xl shadow-tatt-lime/5 group-hover:scale-105 transition-transform duration-300">
                                        {formData.profilePicture ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={formData.profilePicture} alt="Profile" className="size-full object-cover" />
                                        ) : (
                                            <UserIcon className="text-4xl text-tatt-lime/40 size-16" />
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 size-10 bg-tatt-lime text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
                                        <Camera className="size-5" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                        <h3 className="text-2xl font-bold">{formData.firstName} {formData.lastName}</h3>
                                        <span className="px-3 py-1 bg-tatt-lime/10 text-tatt-lime text-[10px] font-black uppercase tracking-widest rounded-full border border-tatt-lime/30">
                                            {user?.communityTier} Tier
                                        </span>
                                    </div>
                                    <p className="text-tatt-gray mb-4">Update your profile photo and visible tier status.</p>
                                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                        <label className="px-5 py-3 bg-tatt-lime text-black text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-tatt-lime/20 cursor-pointer flex items-center gap-2">
                                            <Camera className="size-4" />
                                            Change Photo
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Personal & Professional Info */}
                        <section className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <BadgeCheck className="text-tatt-lime size-5" />
                                Personal & Professional Info
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">First Name</label>
                                    <input
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full bg-background border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                        placeholder="e.g. John"
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">Last Name</label>
                                    <input
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full bg-background border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                        placeholder="e.g. Doe"
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">Profession</label>
                                    <input
                                        name="professionTitle"
                                        value={formData.professionTitle}
                                        onChange={handleInputChange}
                                        className="w-full bg-background border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                        placeholder="e.g. Senior Architect"
                                        type="text"
                                    />
                                </div>
                                <CustomSelect
                                    label="Industry Sector"
                                    name="industryId"
                                    value={formData.industryId}
                                    onChange={handleSelectChange}
                                    placeholder="Select your industry"
                                    options={availableIndustries.map(ind => ({ label: ind.name, value: ind.id }))}
                                />

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">Employer / Company</label>
                                    <input
                                        name="employer"
                                        value={formData.employer}
                                        onChange={handleInputChange}
                                        className="w-full bg-background border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                        placeholder="e.g. Global Tech Solutions"
                                        type="text"
                                    />
                                </div>
                                <CustomSelect
                                    label="Chapter"
                                    name="chapterId"
                                    value={formData.chapterId}
                                    onChange={handleSelectChange}
                                    placeholder="Global / Select Chapter"
                                    options={chapters.map(c => ({ label: c.name, value: c.id }))}
                                />

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">LinkedIn Profile URL</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-border bg-background text-tatt-gray text-xs font-bold">
                                            https://linkedin.com/in/
                                        </span>
                                        <input
                                            name="linkedInProfileUrl"
                                            value={formData.linkedInProfileUrl}
                                            onChange={handleInputChange}
                                            className="flex-1 min-w-0 block w-full px-4 py-3 rounded-none rounded-r-xl bg-background border-border focus:ring-2 focus:ring-tatt-lime outline-none text-sm"
                                            placeholder="yourname"
                                            type="text"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">Professional Description / Bio</label>
                                    <textarea
                                        name="professionalHighlight"
                                        value={formData.professionalHighlight}
                                        onChange={handleInputChange}
                                        className="w-full bg-background border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none resize-none"
                                        placeholder="Briefly describe your professional journey..."
                                        rows={4}
                                    ></textarea>
                                </div>
                            </div>
                        </section>

                        {/* Interests & Expertise */}
                        <section className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-foreground">
                                <Brain className="text-tatt-lime size-5" />
                                Interests & Expertise
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">Select Interests</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableInterests.map((interest) => {
                                            const isSelected = formData.interests.includes(interest.id);
                                            return (
                                                <button
                                                    key={interest.id}
                                                    onClick={() => toggleInterest(interest.id)}
                                                    className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${isSelected
                                                        ? 'bg-tatt-lime border-tatt-lime text-black'
                                                        : 'border-border text-tatt-gray hover:border-tatt-lime hover:text-tatt-lime'
                                                        }`}
                                                >
                                                    {interest.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">Specific Expertise (Skills)</label>
                                    <input
                                        name="expertise"
                                        value={formData.expertise}
                                        onChange={handleInputChange}
                                        className="w-full bg-background border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                        placeholder="e.g. Cloud Infrastructure, Strategic Planning"
                                        type="text"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Connection Preferences */}
                        <section className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Network className="text-tatt-lime size-5" />
                                Connection Preferences
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'OPEN', title: 'Open to Connect', desc: 'Available for all member outreach' },
                                    { id: 'CHAPTER_ONLY', title: 'Chapter Only', desc: 'Only show to your local chapter' },
                                    { id: 'NO_CONNECTIONS', title: 'No Connections', desc: 'Keep your profile private' },
                                ].map((pref) => (
                                    <label
                                        key={pref.id}
                                        className={`relative flex cursor-pointer rounded-2xl border p-4 shadow-sm transition-all ${formData.connectionPreference === pref.id
                                            ? 'border-tatt-lime bg-tatt-lime/5 shadow-md'
                                            : 'border-border hover:border-tatt-lime/40'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="connectionPreference"
                                            className="sr-only"
                                            value={pref.id}
                                            checked={formData.connectionPreference === pref.id}
                                            onChange={handleInputChange}
                                        />
                                        <div className="flex w-full flex-col">
                                            <span className={`text-sm font-bold ${formData.connectionPreference === pref.id ? 'text-tatt-lime' : 'text-foreground'}`}>
                                                {pref.title}
                                            </span>
                                            <span className="text-[10px] text-tatt-gray mt-1">{pref.desc}</span>
                                        </div>
                                        {formData.connectionPreference === pref.id && (
                                            <CheckCircle className="text-tatt-lime absolute top-4 right-4 size-4" />
                                        )}
                                    </label>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'BILLING' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Billing & Subscription */}
                        <section className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Wallet className="text-tatt-lime size-5" />
                                Billing & Subscription
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Auto-pay Toggle Block */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">Renewal Preference</label>
                                    <div className="flex flex-col gap-3">
                                        {[
                                            { id: true, title: 'Full Autopay (Recommended)', desc: 'Seamlessly renew membership using your default card on file.', icon: RefreshCw },
                                            { id: false, title: 'Manual Renewal', desc: 'Receive invoice reminders and pay manually each billing cycle.', icon: UserIcon }
                                        ].map((item) => {
                                            const Icon = item.icon;
                                            const isSelected = formData.hasAutoPayEnabled === item.id;
                                            return (
                                                <button
                                                    key={item.title}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, hasAutoPayEnabled: item.id }))}
                                                    className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${isSelected
                                                        ? 'border-tatt-lime bg-tatt-lime/5 shadow-md'
                                                        : 'border-border hover:border-tatt-lime/30'}`}
                                                >
                                                    <div className={`mt-1 p-2 rounded-lg ${isSelected ? 'bg-tatt-lime text-black' : 'bg-gray-100 text-tatt-gray'}`}>
                                                        <Icon className="size-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-sm font-bold ${isSelected ? 'text-foreground' : 'text-tatt-gray'}`}>{item.title}</p>
                                                        <p className="text-[10px] text-tatt-gray mt-1 leading-relaxed">{item.desc}</p>
                                                    </div>
                                                    {isSelected && <CheckCircle className="size-4 text-tatt-lime mt-1" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Payment Method Block */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-tatt-gray">Default Payment Method</label>

                                    {paymentMethod ? (
                                        <div className="p-5 bg-gradient-to-br from-[#1d1d1b] to-black rounded-2xl shadow-xl relative overflow-hidden group">
                                            <div className="size-10 bg-yellow-400/20 rounded-lg mb-8 backdrop-blur-sm border border-yellow-400/10 flex items-center justify-center">
                                                <div className="size-6 bg-yellow-400/40 rounded-sm"></div>
                                            </div>

                                            <div className="space-y-1 mb-8">
                                                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Card Number</p>
                                                <p className="text-white text-lg tracking-[0.2em] font-mono">•••• •••• •••• {paymentMethod.last4}</p>
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Expires</p>
                                                    <p className="text-white text-xs font-bold font-mono">
                                                        {String(paymentMethod.exp_month).padStart(2, '0')}/{String(paymentMethod.exp_year).slice(-2)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 grayscale group-hover:grayscale-0 transition-all">
                                                    <div className="size-8 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                                        <CreditCard className="size-4 text-white" />
                                                    </div>
                                                    <span className="text-white/40 text-[10px] font-black italic uppercase tracking-widest">
                                                        {paymentMethod.brand.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="absolute top-0 right-0 size-32 bg-tatt-lime/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-tatt-lime/20 transition-colors"></div>
                                        </div>
                                    ) : (
                                        <div className="p-5 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center py-10 bg-gray-50/50">
                                            <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                                <CreditCard className="size-6 text-tatt-gray opacity-40" />
                                            </div>
                                            <p className="text-xs font-bold text-tatt-gray">No payment method added</p>
                                            <p className="text-[10px] text-tatt-gray/60 mt-1 uppercase tracking-tighter">Please add a card for seamless renewals</p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setIsPaymentModalOpen(true)}
                                        className="w-full py-3 text-xs font-bold text-tatt-gray hover:text-tatt-lime transition-colors flex items-center justify-center gap-2 border border-dashed border-border rounded-xl"
                                    >
                                        <Plus className="size-4" />
                                        {paymentMethod ? 'Manage Payment Method' : 'Add New Payment Method'}
                                    </button>
                                </div>
                            </div>
                        </section>


                    </div>
                )}

                {activeTab === 'BUSINESS' && isKiongozi && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {loadingBusiness ? (
                            <div className="py-20 flex flex-col items-center justify-center text-tatt-gray">
                                <Loader2 className="size-10 animate-spin mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest">Retrieving Venture Details...</p>
                            </div>
                        ) : (
                            <>
                                {/* Business Identity */}
                                <section className="bg-surface p-8 rounded-[32px] border border-border shadow-sm">
                                    <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                                        <Building2 className="text-tatt-lime size-6" />
                                        Corporate Identity
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Business Legal Name</label>
                                                <input
                                                    name="name"
                                                    value={businessData.name}
                                                    onChange={handleBusinessInputChange}
                                                    className="w-full bg-background border-border rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                                    placeholder="e.g. Onyx Collective Ltd"
                                                />
                                            </div>
                                            <CustomSelect
                                                label="Industry Sector"
                                                name="category"
                                                value={businessData.category}
                                                onChange={handleBusinessSelectChange}
                                                options={categories.map(c => ({ label: c, value: c }))}
                                            />
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Website URL</label>
                                                <div className="flex">
                                                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-border bg-background text-tatt-gray text-xs font-bold font-sans">https://</span>
                                                    <input
                                                        name="website"
                                                        value={businessData.website}
                                                        onChange={handleBusinessInputChange}
                                                        className="flex-1 min-w-0 block w-full px-5 py-4 rounded-none rounded-r-xl bg-background border-border focus:ring-2 focus:ring-tatt-lime outline-none text-sm font-sans"
                                                        placeholder="www.onyxcollective.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 block">Corporate Logo</label>
                                                <div className="flex items-center gap-6">
                                                    <div className="size-24 rounded-2xl bg-background border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0">
                                                        {businessData.logoUrl ? (
                                                            <img src={businessData.logoUrl} className="size-full object-cover" alt="Logo" />
                                                        ) : (
                                                            <ImageIcon className="text-tatt-gray opacity-20 size-8" />
                                                        )}
                                                    </div>
                                                    <label className="px-6 py-3 bg-surface border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-tatt-lime transition-all cursor-pointer">
                                                        Upload Logo
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBusinessFileUpload(e, 'logoUrl')} />
                                                    </label>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 block">Directory Banner</label>
                                                <div className="w-full h-24 rounded-2xl bg-background border-2 border-dashed border-border flex items-center justify-center overflow-hidden mb-3">
                                                    {businessData.bannerUrl ? (
                                                        <img src={businessData.bannerUrl} className="size-full object-cover" alt="Banner" />
                                                    ) : (
                                                        <ImageIcon className="text-tatt-gray opacity-20 size-8" />
                                                    )}
                                                </div>
                                                <label className="px-6 py-3 bg-surface border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-tatt-lime transition-all cursor-pointer block text-center">
                                                    Upload Cover Image
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBusinessFileUpload(e, 'bannerUrl')} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Primary Location</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                                                <input
                                                    name="locationText"
                                                    value={businessData.locationText}
                                                    onChange={handleBusinessInputChange}
                                                    className="w-full bg-background border-border rounded-xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                                    placeholder="City, Country"
                                                />
                                            </div>
                                        </div>
                                        <CustomSelect
                                            label="Base Operations Chapter"
                                            name="chapterId"
                                            value={businessData.chapterId}
                                            onChange={handleBusinessSelectChange}
                                            options={chapters.map(c => ({ label: c.name, value: c.id }))}
                                        />
                                    </div>
                                </section>

                                {/* Member Perk & Contact */}
                                <section className="bg-surface p-8 rounded-[32px] border border-border shadow-sm">
                                    <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                                        <Zap className="text-tatt-lime size-6 fill-tatt-lime" />
                                        Exclusive Community Perk
                                    </h3>
                                    <div className="space-y-2 mb-10">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Your Offer to TATT Members</label>
                                        <textarea
                                            name="perkOffer"
                                            value={businessData.perkOffer}
                                            onChange={handleBusinessInputChange}
                                            className="w-full bg-background border-border rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-tatt-lime outline-none min-h-[120px] resize-none leading-relaxed"
                                            placeholder="e.g. 15% discount for all community members on architecture consulting services."
                                        />
                                    </div>

                                    <h3 className="text-2xl font-black mb-8 pt-8 border-t border-border flex items-center gap-3">
                                        <UserIcon className="text-tatt-lime size-6" />
                                        Inbound Representative
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Full Name</label>
                                            <input
                                                name="contactName"
                                                value={businessData.contactName}
                                                onChange={handleBusinessInputChange}
                                                className="w-full bg-background border-border rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                                placeholder="Point of Contact"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Inquiry Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                                                <input
                                                    name="contactEmail"
                                                    value={businessData.contactEmail}
                                                    onChange={handleBusinessInputChange}
                                                    className="w-full bg-background border-border rounded-xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                                    placeholder="Representative Email"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Contact Phone</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                                                <input
                                                    name="contactPhone"
                                                    value={businessData.contactPhone}
                                                    onChange={handleBusinessInputChange}
                                                    className="w-full bg-background border-border rounded-xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-tatt-lime outline-none"
                                                    placeholder="+1 (xxx) xxx-xxxx"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="bg-tatt-lime/5 border border-tatt-lime/20 rounded-[32px] p-8 flex flex-col items-center text-center">
                                    <div className="size-16 bg-tatt-lime/10 rounded-full flex items-center justify-center mb-6">
                                        <Globe className="text-tatt-lime size-8" />
                                    </div>
                                    <h4 className="text-xl font-black mb-2 tracking-tight">Direct Directory Publishing</h4>
                                    <p className="text-tatt-gray text-sm font-medium max-w-lg mb-8 leading-relaxed">
                                        As a Kiongozi member, your business profile is automatically approved. Saving these changes will immediately update your listing in the public Business Center.
                                    </p>
                                    <button
                                        onClick={handleSaveBusiness}
                                        disabled={savingBusiness}
                                        className="px-12 py-4 bg-tatt-lime text-black text-sm font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-tatt-lime/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {savingBusiness ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                                        Save &amp; Publish Business Portal
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-4 pt-6 pb-4">
                    {activeTab !== 'BUSINESS' && (
                        <>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 text-sm font-bold text-tatt-gray hover:text-foreground transition-colors"
                            >
                                Discard Changes
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-10 py-3 bg-tatt-lime text-black text-sm font-black uppercase tracking-[0.1em] rounded-xl shadow-lg shadow-tatt-lime/20 hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                Save Profile Settings
                            </button>
                        </>
                    )}
                </div>

                <div className="border-t border-border pt-8 pb-12">
                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <Trash2 className="text-red-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Danger Zone</h4>
                                <p className="text-xs text-tatt-gray">Request to close your account and remove all your information from the system.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsConfirmModalOpen(true)}
                            disabled={deletionLoading || !!user?.deletionRequestedAt}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${user?.deletionRequestedAt
                                ? 'bg-border text-tatt-gray cursor-not-allowed'
                                : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/10 hover:scale-105 active:scale-95'
                                }`}
                        >
                            {deletionLoading ? <Loader2 className="size-4 animate-spin" /> : 'Delete Account'}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleRequestDeletion}
                isLoading={deletionLoading}
                title="Permanently Close Account?"
                message="This will schedule your account for permanent deletion. All your data, connections, and historical records will be removed from the system in 14 days. This action cannot be undone once the period expires."
                confirmText="Yes, Schedule Deletion"
            />

            <PaymentMethodModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={async () => {
                    // Re-fetch payment method after success
                    try {
                        const resp = await api.get("/billing/payment-method");
                        setPaymentMethod(resp.data);
                    } catch (err) {
                        console.error("Failed to fetch payment method", err);
                    }
                }}
            />
        </div>
    );
}
