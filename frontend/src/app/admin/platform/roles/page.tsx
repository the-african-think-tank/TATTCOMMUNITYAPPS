"use client";

import React from "react";
import Link from "next/link";
import { 
    ShieldAlert, ShieldCheck, Shield, ChevronLeft, Zap, Lock, Eye, 
    CheckCircle2, UserCog, FileEdit
} from "lucide-react";

const DEFINED_ROLES = [
    {
        id: "SUPERADMIN",
        name: "Super Administrator",
        icon: ShieldAlert,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        permissions: ["All System Access", "Revenue Center", "Root Configuration", "User Management"],
        description: "The highest level of access. Can configure core platform settings, view global revenue, and perform destructive actions across the entire system."
    },
    {
        id: "ADMIN",
        name: "Administrator",
        icon: ShieldCheck,
        color: "text-tatt-lime-dark",
        bgColor: "bg-tatt-lime/10",
        borderColor: "border-tatt-lime/20",
        permissions: ["Global Moderation", "Org Management", "All Content Apps", "Platform Configuration"],
        description: "General system administrator. Has full access to moderation, content, and management apps, but lacks access to the global Revenue Center."
    },
    {
        id: "REGIONAL_ADMIN",
        name: "Regional Admin",
        icon: Shield,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        permissions: ["Regional Chapters", "Chapter Events", "Volunteer Assignment", "Community Feed (Post Only)"],
        description: "Restricted to their assigned chapters. Can manage local events, coordinate regional volunteers, and interact on the feed without global moderation powers."
    },
    {
        id: "CONTENT_ADMIN",
        name: "Content Administrator",
        icon: FileEdit,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        permissions: ["Content & Resources", "Platform Management", "Jobs Center", "Events & Mixers", "Sales & Inventory"],
        description: "Focused exclusively on content population and resource management. Cannot access organizational oversight or system settings."
    },
    {
        id: "MODERATOR",
        name: "Content Moderator",
        icon: Eye,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
        permissions: ["TATT-U Feed Moderation", "Community Feed", "Post Removal", "Shadow Banning"],
        description: "Ensures community safety. Has tools to review reported content, shadow ban disruptive users, and remove inappropriate posts."
    },
    {
        id: "SALES",
        name: "Sales Representative",
        icon: Zap,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
        permissions: ["Sales & Inventory", "Community Feed", "Messages"],
        description: "Specialized role focusing on e-commerce, sales tracking, and direct messaging with leads and members."
    }
];

export default function RoleManagementPage() {
    return (
        <div className="min-h-screen bg-background text-foreground p-8 lg:p-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-10 space-y-4">
                <Link href="/admin/platform" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:text-tatt-lime transition-colors">
                    <ChevronLeft size={16} /> Back to Platform
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black tracking-tight italic uppercase text-foreground">Role Management</h1>
                        <p className="text-tatt-gray mt-2 text-sm font-medium max-w-2xl">
                            Configure and review system-level roles and internal organization hierarchy. Access levels and page permissions are managed at the user level to allow for specific overrides.
                        </p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-6 max-w-[1920px] mx-auto">
                {DEFINED_ROLES.map((role) => (
                    <div key={role.id} className="bg-surface rounded-2xl border border-border shadow-sm hover:border-tatt-lime/30 transition-all p-6 lg:p-8 flex flex-col xl:flex-row gap-8 xl:items-center relative overflow-hidden group">
                        
                        {/* Background subtle glow */}
                        <div className={`absolute -right-32 -top-32 size-64 rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity ${role.bgColor}`}></div>

                        <div className="flex items-start gap-6 xl:w-1/3 shrink-0 relative z-10">
                            <div className={`size-16 rounded-2xl flex items-center justify-center border ${role.bgColor} ${role.borderColor} ${role.color}`}>
                                <role.icon size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic tracking-tighter text-foreground group-hover:text-tatt-lime transition-colors">{role.name}</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mt-1 flex items-center gap-2">
                                    <Lock size={12} /> System ID: {role.id}
                                </p>
                            </div>
                        </div>

                        <div className="xl:flex-1 relative z-10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 border-b border-border/50 pb-2 text-foreground">Description & Scope</h4>
                            <p className="text-sm font-medium text-tatt-gray leading-relaxed group-hover:text-foreground transition-colors">
                                {role.description}
                            </p>
                        </div>

                        <div className="xl:flex-1 relative z-10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-3 border-b border-border/50 pb-2 text-foreground">Key Permissions Overview</h4>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {role.permissions.map((perm, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-xs font-bold text-foreground">
                                        <CheckCircle2 size={14} className={role.color} />
                                        {perm}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="xl:w-48 shrink-0 flex flex-col gap-3 relative z-10 mt-4 xl:mt-0 pt-6 xl:pt-0 border-t xl:border-t-0 border-border">
                            <Link 
                                href={`/admin/org-management?role=${role.id}`}
                                className="w-full bg-background border border-border hover:border-tatt-lime hover:text-tatt-lime rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center"
                            >
                                View Linked Users
                            </Link>
                            <Link 
                                href={`/admin/org-management?role=${role.id}`}
                                className="w-full bg-tatt-black text-white hover:bg-white hover:text-black border border-transparent hover:border-tatt-black rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center"
                            >
                                Edit Capabilities
                            </Link>
                        </div>

                    </div>
                ))}
            </div>
            
            <div className="mt-12 p-8 bg-tatt-lime/10 border border-tatt-lime/20 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 max-w-[1920px] mx-auto">
                <div className="flex items-center gap-6">
                    <div className="size-16 bg-tatt-lime rounded-full flex items-center justify-center text-tatt-black shrink-0 shadow-[0_0_20px_#9fcc00]">
                        <UserCog size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black italic tracking-tighter text-tatt-lime-dark">Need Custom Roles?</h4>
                        <p className="text-xs font-bold text-foreground mt-1">Contact platform engineering to inject custom permission matrices into the system core.</p>
                    </div>
                </div>
                <button className="whitespace-nowrap bg-tatt-lime text-tatt-black px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-tatt-lime/20 cursor-not-allowed">
                    Integration Requested
                </button>
            </div>
        </div>
    );
}
