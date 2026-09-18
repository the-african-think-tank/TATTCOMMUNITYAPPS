"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
    ChevronRight, 
    TerminalSquare, 
    Paperclip, 
    Bold, 
    Italic, 
    List, 
    Link as LinkIcon, 
    Image as ImageIcon,
    Headset,
    BookOpen,
    CalendarCheck,
    Loader2,
    Send,
    CheckCircle
} from "lucide-react";
import api from "@/services/api";
import { toast } from "react-hot-toast";

export default function TicketDetails() {
    const params = useParams();
    const router = useRouter();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [response, setResponse] = useState("");
    const [resolving, setResolving] = useState(false);
    const [sending, setSending] = useState(false);

    const fetchTicket = useCallback(async (silent = false) => {
        try {
            const { data } = await api.get(`/support/tickets/${params.id}`);
            setTicket(data);
        } catch (err) {
            console.error(err);
            if (!silent) toast.error("Failed to load ticket data.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchTicket();
        
        // Auto-refresh thread every 10 seconds
        const interval = setInterval(() => {
            fetchTicket(true);
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchTicket]);

    const handleResolve = async () => {
        if (!response && !confirm("No resolution notes provided. Proceed with marking as resolved?")) return;
        
        try {
            setResolving(true);
            await api.put(`/support/tickets/${params.id}/resolve`, { adminNotes: response });
            toast.success("Ticket marked as resolved.");
            fetchTicket(true);
            setResponse("");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update status.");
        } finally {
            setResolving(false);
        }
    };

    const handleSendResponse = async () => {
        if (!response) return;
        
        try {
            setSending(true);
            await api.post(`/support/tickets/${params.id}/messages`, { 
                message: response,
                isAdmin: true
            });
            toast.success("Response sent successfully.");
            fetchTicket(true);
            setResponse("");
        } catch (err) {
            console.error(err);
            toast.error("Failed to send response.");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4 min-h-[50vh]">
                <Loader2 className="size-8 animate-spin text-tatt-lime" />
                <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest animate-pulse">Loading Ticket Context...</p>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4 min-h-[50vh]">
                <p className="text-sm font-bold text-red-500 uppercase tracking-widest">Ticket Not Found</p>
            </div>
        );
    }

    return (
        <div className="flex gap-8 pb-12 animate-in fade-in duration-500">
            {/* Center Column: Ticket Thread & Response */}
            <div className="flex-1 max-w-4xl space-y-6">
                
                {/* Breadcrumbs / Status Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-tatt-gray text-[12px] font-medium tracking-wide uppercase">
                        <button onClick={() => router.push('/admin/support-center')} className="hover:text-tatt-lime transition-colors">Tickets</button>
                        <ChevronRight className="size-3.5" />
                        <span className="text-foreground font-bold">Ticket #{ticket.ticketNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {ticket.category === 'TECHNICAL' && (
                            <span className="bg-red-500/10 text-red-500 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest border border-red-500/20">Urgent</span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest border ${
                            ticket.status === 'RESOLVED' 
                                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                : 'bg-tatt-lime/10 text-tatt-lime border-tatt-lime/20'
                        }`}>
                            {ticket.status}
                        </span>
                    </div>
                </div>

                {/* Initial Request Card */}
                <section className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">{ticket.subject}</h1>
                            <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-tatt-gray">
                                Initial Request • {new Date(ticket.createdAt).toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="prose prose-sm max-w-none text-foreground/80 leading-relaxed text-[15px] whitespace-pre-wrap">
                            {ticket.description}
                        </div>

                        {/* Attachments Display */}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="pt-6 border-t border-border mt-6">
                                <p className="text-[10px] font-black uppercase text-tatt-gray tracking-widest mb-4">Member Attachments</p>
                                <div className="grid grid-cols-2 gap-4">
                                    {ticket.attachments.map((asset: string, i: number) => (
                                        <div key={i} className="rounded-lg border border-border overflow-hidden bg-background">
                                            {asset.startsWith('data:image') ? (
                                                <img src={asset} className="w-full h-40 object-cover" />
                                            ) : (
                                                <div className="p-4 flex items-center gap-3">
                                                    <Paperclip className="size-5 text-tatt-lime" />
                                                    <span className="text-xs font-bold text-foreground">Member Asset {i+1}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Ticket History / Thread */}
                <div className="space-y-4">
                    <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray/60 flex items-center gap-4">
                        <span className="flex-grow h-px bg-border"></span>
                        Transmission History
                        <span className="flex-grow h-px bg-border"></span>
                    </div>

                    {/* Render the full thread */}
                    {ticket.messages && ticket.messages.length > 0 ? (
                         ticket.messages.map((msg: any) => (
                            <div key={msg.id} className={`flex gap-4 items-start animate-in duration-500 ${msg.isAdminResponse ? 'slide-in-from-left-4' : 'flex-row-reverse slide-in-from-right-4'}`}>
                                {msg.isAdminResponse ? (
                                    <div className="w-8 h-8 rounded-lg bg-tatt-black flex items-center justify-center flex-shrink-0 shadow-lg border border-tatt-lime/20">
                                        {/* Use something to indicate Support */}
                                        <TerminalSquare className="text-tatt-lime size-4" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface border border-border flex-shrink-0 shadow-sm shadow-black/10">
                                        <img src={msg.sender?.profilePicture || '/assets/default-avatar.png'} alt="user" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className={`flex-1 border rounded-xl p-4 shadow-sm ${msg.isAdminResponse ? 'bg-surface border-tatt-lime/10' : 'bg-background border-border shadow-inner'}`}>
                                    <div className="flex justify-between mb-2 items-center">
                                        <span className="font-bold text-[12px] text-foreground uppercase tracking-widest">
                                            {msg.isAdminResponse ? 'TATT Support' : (msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Member')}
                                        </span>
                                        <span className="text-[10px] text-tatt-gray font-bold">{new Date(msg.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-foreground/80 text-[14px] whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                </div>
                            </div>
                         ))
                    ) : (
                        ticket.adminNotes && (
                            <div className="flex gap-4 items-start animate-in slide-in-from-left-4">
                                <div className="w-8 h-8 rounded-lg bg-tatt-black flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <TerminalSquare className="text-tatt-lime size-4" />
                                </div>
                                <div className="flex-1 bg-surface border border-tatt-lime/20 rounded-xl p-4 shadow-sm">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-[13px] text-foreground">Legacy Support Response</span>
                                        <span className="text-[11px] text-tatt-gray">Recent</span>
                                    </div>
                                    <p className="text-foreground/80 text-[14px] whitespace-pre-wrap">{ticket.adminNotes}</p>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {/* Rich Text Response Area */}
                {ticket.status !== 'RESOLVED' && (
                    <section className="bg-surface border-2 border-tatt-lime/20 rounded-xl shadow-lg overflow-hidden transition-all focus-within:border-tatt-lime animate-in slide-in-from-bottom-4">
                        <div className="bg-background/50 p-2 border-b border-border flex gap-2">
                            {[Bold, Italic, LinkIcon, List, ImageIcon].map((Icon, i) => (
                                <button key={i} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/5 text-tatt-gray transition-colors">
                                    <Icon className="size-4" />
                                </button>
                            ))}
                        </div>
                        <textarea 
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            className="w-full p-6 border-none focus:ring-0 text-[15px] bg-transparent text-foreground placeholder:text-tatt-gray resize-y min-h-[150px]" 
                            placeholder={`Type your response to ${ticket.user?.firstName || 'Member'}...`}
                        ></textarea>
                        
                        <div className="p-4 bg-background/50 border-t border-border flex items-center justify-between">
                            <button className="flex items-center gap-2 text-[13px] font-bold text-tatt-gray hover:text-foreground transition-colors px-3 py-1.5 uppercase tracking-widest text-[10px]">
                                <Paperclip className="size-4" /> Add Internal Note
                            </button>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleResolve}
                                    disabled={resolving || sending}
                                    className="px-6 py-2.5 bg-background text-foreground font-bold text-[14px] rounded-lg border border-border hover:bg-surface transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {resolving ? <Loader2 className="size-3 animate-spin" /> : <>Mark as Resolved <CheckCircle size={14} /></>}
                                </button>
                                <button 
                                    onClick={handleSendResponse}
                                    disabled={sending || resolving || !response}
                                    className="px-8 py-2.5 bg-tatt-lime text-tatt-black font-black text-[14px] rounded-lg shadow-sm hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                                >
                                    {sending ? <Loader2 className="size-4 animate-spin" /> : <>Send Response <Send size={14} /></>}
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* Sidebar Right: Member Context */}
            <aside className="w-80 space-y-6 shrink-0 hidden lg:block">
                
                {/* Member Profile Card */}
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray mb-6">Member Context</div>
                    
                    <div className="flex flex-col items-center mb-8">
                        {ticket.user?.profilePicture ? (
                            <img 
                                src={ticket.user.profilePicture} 
                                alt={ticket.user.firstName}
                                className="w-24 h-24 rounded-2xl object-cover mb-4 border-2 border-tatt-lime/20 p-1" 
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-2xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime font-black text-2xl mb-4 border-2 border-tatt-lime/20 p-1">
                                {ticket.user?.firstName?.charAt(0)}{ticket.user?.lastName?.charAt(0)}
                            </div>
                        )}
                        <h2 className="text-xl font-bold text-foreground">{ticket.user?.firstName} {ticket.user?.lastName}</h2>
                        <p className="text-sm text-tatt-gray">{ticket.user?.email}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-[12px] font-medium text-tatt-gray">Joined Date</span>
                            <span className="text-[13px] font-bold text-foreground">
                                {ticket.user?.createdAt ? new Date(ticket.user.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-[12px] font-medium text-tatt-gray">Tier Status</span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-tatt-lime"></span>
                                <span className="text-[13px] font-bold text-foreground capitalize">{String(ticket.user?.communityTier || 'FREE').toLowerCase()} Tier</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-[12px] font-medium text-tatt-gray">TATT-U Member ID</span>
                            <span className="text-[13px] font-bold text-foreground tracking-widest">{ticket.user?.tattMemberId || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Active Perks */}
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                    <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-tatt-gray mb-4">Active Modules</div>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-tatt-lime/5 rounded-lg border border-tatt-lime/10">
                            <TerminalSquare className="text-tatt-lime size-5" />
                            <div>
                                <div className="text-[12px] font-bold text-foreground">Directory Profile</div>
                                <div className="text-[11px] text-tatt-gray">Fully configured</div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}
