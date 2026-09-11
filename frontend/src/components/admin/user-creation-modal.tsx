"use client";

import { useState } from "react";
import { X, UserPlus, Copy, Check, Eye, EyeOff, KeyRound } from "lucide-react";
import api from "@/services/api";
import { toast } from "react-hot-toast";

const SYSTEM_ROLES = [
    { value: "COMMUNITY_MEMBER", label: "Community Member" },
    { value: "VOLUNTEER_ADMIN", label: "Volunteer Admin" },
    { value: "CONTENT_ADMIN", label: "Content Admin" },
    { value: "SALES", label: "Sales" },
    { value: "MODERATOR", label: "Moderator" },
    { value: "REGIONAL_ADMIN", label: "Regional Admin" },
    { value: "ADMIN", label: "Admin" },
    { value: "SUPERADMIN", label: "Super Admin" },
];

const COMMUNITY_TIERS = [
    { value: "FREE", label: "Sankofa" },
    { value: "UBUNTU", label: "Ubuntu" },
    { value: "IMANI", label: "Imani" },
    { value: "KIONGOZI", label: "Kiongozi" },
];

interface UserCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

interface CreatedCredentials {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    systemRole: string;
    communityTier: string;
}

export function UserCreationModal({ isOpen, onClose, onCreated }: UserCreationModalProps) {
    const [step, setStep] = useState<"form" | "credentials">("form");
    const [submitting, setSubmitting] = useState(false);
    const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        professionTitle: "",
        location: "",
        systemRole: "COMMUNITY_MEMBER",
        communityTier: "FREE",
    });

    const resetModal = () => {
        setStep("form");
        setForm({
            firstName: "",
            lastName: "",
            email: "",
            phoneNumber: "",
            professionTitle: "",
            location: "",
            systemRole: "COMMUNITY_MEMBER",
            communityTier: "FREE",
        });
        setCredentials(null);
        setShowPassword(false);
        setCopiedField(null);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.firstName || !form.lastName || !form.email) {
            toast.error("First name, last name, and email are required.");
            return;
        }
        setSubmitting(true);
        try {
            const payload: Record<string, string> = {
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                systemRole: form.systemRole,
                communityTier: form.communityTier,
            };
            if (form.phoneNumber) payload.phoneNumber = form.phoneNumber;
            if (form.professionTitle) payload.professionTitle = form.professionTitle;
            if (form.location) payload.location = form.location;

            const { data } = await api.post("/users/create-with-password", payload);

            setCredentials({
                email: data.credentials.email,
                password: data.credentials.password,
                firstName: data.user.firstName,
                lastName: data.user.lastName,
                systemRole: data.user.systemRole,
                communityTier: data.user.communityTier,
            });
            setStep("credentials");
            onCreated();
            toast.success("User created successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create user.");
        } finally {
            setSubmitting(false);
        }
    };

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    };

    const copyAllCredentials = async () => {
        if (!credentials) return;
        const text = `Account Credentials\n──────────────\nName: ${credentials.firstName} ${credentials.lastName}\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nRole: ${credentials.systemRole.replace(/_/g, ' ')}\nTier: ${credentials.communityTier}`;
        await copyToClipboard(text, "all");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-lg mx-4 bg-surface border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-300 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 bg-surface z-10 px-6 py-5 border-b border-border flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime border border-tatt-lime/20">
                            {step === "form" ? <UserPlus className="size-5" /> : <KeyRound className="size-5" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                                {step === "form" ? "Create User Account" : "Account Credentials"}
                            </h3>
                            <p className="text-[10px] text-tatt-gray font-bold uppercase tracking-widest">
                                {step === "form" ? "Fill in user details below" : "Copy and share securely"}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-background rounded-xl transition-colors text-tatt-gray hover:text-foreground">
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === "form" ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">First Name *</label>
                                    <input
                                        type="text"
                                        value={form.firstName}
                                        onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                                        placeholder="John"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">Last Name *</label>
                                    <input
                                        type="text"
                                        value={form.lastName}
                                        onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                                        placeholder="Doe"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">Email Address *</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                                    placeholder="john.doe@example.com"
                                    required
                                />
                            </div>

                            {/* Role & Tier */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">System Role</label>
                                    <select
                                        value={form.systemRole}
                                        onChange={(e) => setForm(f => ({ ...f, systemRole: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all appearance-none"
                                    >
                                        {SYSTEM_ROLES.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">Membership Tier</label>
                                    <select
                                        value={form.communityTier}
                                        onChange={(e) => setForm(f => ({ ...f, communityTier: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all appearance-none"
                                    >
                                        {COMMUNITY_TIERS.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Optional Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={form.phoneNumber}
                                        onChange={(e) => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                                        placeholder="+1234567890"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">Location</label>
                                    <input
                                        type="text"
                                        value={form.location}
                                        onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                                        placeholder="City, Country"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-2">Profession Title</label>
                                <input
                                    type="text"
                                    value={form.professionTitle}
                                    onChange={(e) => setForm(f => ({ ...f, professionTitle: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all"
                                    placeholder="Software Engineer"
                                />
                            </div>

                            {/* Info Banner */}
                            <div className="bg-tatt-lime/5 border border-tatt-lime/20 rounded-xl p-4 flex gap-3">
                                <KeyRound className="size-5 text-tatt-lime shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-foreground">Auto-Generated Password</p>
                                    <p className="text-[11px] text-tatt-gray mt-0.5">A secure 12-character password will be generated automatically. You'll be able to copy and share the credentials after creation.</p>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-tatt-lime text-tatt-black py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:brightness-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <span className="size-4 border-2 border-tatt-black/30 border-t-tatt-black rounded-full animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="size-4" />
                                        Create User Account
                                    </>
                                )}
                            </button>
                        </form>
                    ) : credentials ? (
                        <div className="space-y-5">
                            {/* Success Banner */}
                            <div className="bg-tatt-lime/10 border border-tatt-lime/20 rounded-xl p-4 text-center">
                                <div className="size-12 rounded-full bg-tatt-lime/20 flex items-center justify-center mx-auto mb-3">
                                    <Check className="size-6 text-tatt-lime" />
                                </div>
                                <p className="text-sm font-black text-foreground">Account Created Successfully</p>
                                <p className="text-xs text-tatt-gray mt-1">Share these credentials with <span className="font-bold text-foreground">{credentials.firstName} {credentials.lastName}</span></p>
                            </div>

                            {/* Credential Fields */}
                            <div className="space-y-3">
                                <CredentialField
                                    label="Email"
                                    value={credentials.email}
                                    copied={copiedField === "email"}
                                    onCopy={() => copyToClipboard(credentials.email, "email")}
                                />

                                <div className="bg-background border border-border rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">Password</p>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setShowPassword(p => !p)}
                                                className="p-1.5 hover:bg-surface rounded-lg transition-colors text-tatt-gray hover:text-foreground"
                                                title={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                            </button>
                                            <button
                                                onClick={() => copyToClipboard(credentials.password, "password")}
                                                className="p-1.5 hover:bg-surface rounded-lg transition-colors text-tatt-gray hover:text-tatt-lime"
                                                title="Copy password"
                                            >
                                                {copiedField === "password" ? <Check className="size-3.5 text-tatt-lime" /> : <Copy className="size-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm font-mono font-bold text-foreground tracking-wide">
                                        {showPassword ? credentials.password : "••••••••••••"}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <CredentialField
                                        label="System Role"
                                        value={credentials.systemRole.replace(/_/g, " ")}
                                        copied={copiedField === "role"}
                                        onCopy={() => copyToClipboard(credentials.systemRole, "role")}
                                    />
                                    <CredentialField
                                        label="Membership Tier"
                                        value={credentials.communityTier}
                                        copied={copiedField === "tier"}
                                        onCopy={() => copyToClipboard(credentials.communityTier, "tier")}
                                    />
                                </div>
                            </div>

                            {/* Copy All Button */}
                            <button
                                onClick={copyAllCredentials}
                                className="w-full bg-background border border-border py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:border-tatt-lime/30 transition-all flex items-center justify-center gap-2 text-foreground"
                            >
                                {copiedField === "all" ? (
                                    <>
                                        <Check className="size-4 text-tatt-lime" />
                                        <span className="text-tatt-lime">All Credentials Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="size-4" />
                                        Copy All Credentials
                                    </>
                                )}
                            </button>

                            {/* Warning */}
                            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 flex gap-3">
                                <div className="size-5 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-orange-500 text-xs font-black">!</span>
                                </div>
                                <p className="text-[11px] text-tatt-gray">
                                    <span className="font-bold text-orange-400">Security Notice:</span> This password will not be shown again. Make sure to copy and share it securely before closing this dialog.
                                </p>
                            </div>

                            {/* Done Button */}
                            <button
                                onClick={handleClose}
                                className="w-full bg-tatt-lime text-tatt-black py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:brightness-95 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function CredentialField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
    return (
        <div className="bg-background border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray">{label}</p>
                <button
                    onClick={onCopy}
                    className="p-1.5 hover:bg-surface rounded-lg transition-colors text-tatt-gray hover:text-tatt-lime"
                    title={`Copy ${label.toLowerCase()}`}
                >
                    {copied ? <Check className="size-3.5 text-tatt-lime" /> : <Copy className="size-3.5" />}
                </button>
            </div>
            <p className="text-sm font-bold text-foreground">{value}</p>
        </div>
    );
}
