"use client";

import { useState, useEffect } from "react";
import { 
    Search, 
    ArrowRight, 
    ChevronDown, 
    Loader2, 
    Plus, 
    MessageSquare, 
    HelpCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";

interface FAQQuestion {
    id: string;
    question: string;
    answer: string;
}

interface FAQCategory {
    id: string;
    category: string;
    questions: FAQQuestion[];
}

export default function SupportCenterPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [faqs, setFaqs] = useState<FAQCategory[]>([]);
    const [loadingFaqs, setLoadingFaqs] = useState(true);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const { data } = await api.get("/support/faqs");
                setFaqs(data);
            } catch (error) {
                console.error("Failed to fetch FAQs:", error);
            } finally {
                setLoadingFaqs(false);
            }
        };

        const fetchTickets = async () => {
            try {
                const { data } = await api.get("/support/tickets/my");
                setTickets(data);
            } catch (error) {
                console.error("Failed to fetch tickets:", error);
            } finally {
                setLoadingTickets(false);
            }
        };

        fetchFaqs();
        fetchTickets();
    }, []);

    const filteredFaqs = searchQuery.trim() === "" ? faqs : faqs.map(cat => {
        const matchesCategory = cat.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchedQuestions = cat.questions.filter(faq => 
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        if (matchesCategory) {
            return cat;
        } else if (matchedQuestions.length > 0) {
            return { ...cat, questions: matchedQuestions };
        }
        return null;
    }).filter(Boolean) as FAQCategory[];

    const filteredTickets = tickets.filter(ticket => 
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen bg-background animate-in fade-in duration-500">
            {/* Hero Section */}
            <section className="px-6 py-16 bg-tatt-black text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-tatt-lime rounded-full blur-[120px]"></div>
                </div>
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 leading-tight italic">TATT Support Center</h2>
                    <p className="text-white/60 text-sm md:text-base max-w-2xl mx-auto mb-10 leading-relaxed">
                        Find instant answers in our Common FAQs or submit a support ticket to receive direct assistance from the TATT executive team.
                    </p>
                    <div className="relative max-w-2xl mx-auto group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-white/40 group-focus-within:text-tatt-lime transition-colors" />
                        </div>
                        <input 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-lg focus:outline-none focus:ring-2 focus:ring-tatt-lime/50 focus:border-tatt-lime transition-all placeholder:text-white/30 backdrop-blur-md" 
                            placeholder="Search the African Think Tank archives..." 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </section>

            {/* Content Area */}
            <main className="p-6 lg:p-12 max-w-[1400px] mx-auto w-full">
                <div className="max-w-4xl mx-auto space-y-16">
                    
                    {/* Ticketing History */}
                    <div className="space-y-8">
                        <div className="flex items-end justify-between border-b border-border pb-6">
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter">Support Requests</h3>
                            </div>
                            <Link 
                                href="/dashboard/support/new"
                                className="bg-tatt-lime text-tatt-black px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-tatt-lime/10 flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" /> New Ticket
                            </Link>
                        </div>

                        {loadingTickets ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-4 bg-surface border border-dashed border-border rounded-[32px]">
                                <Loader2 className="h-6 w-6 animate-spin text-tatt-lime" />
                                <p className="text-[10px] font-black text-tatt-gray uppercase tracking-widest">Retrieving archives...</p>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="py-16 text-center bg-surface border border-dashed border-border rounded-[32px] space-y-4">
                                <div className="size-16 rounded-2xl bg-background flex items-center justify-center mx-auto text-tatt-gray/20">
                                    <MessageSquare className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground">{searchQuery ? "No matching requests" : "No active requests found"}</p>
                                    <p className="text-xs text-tatt-gray">{searchQuery ? "Try a different search term." : "You haven&apos;t opened any support or concierge cases yet."}</p>
                                </div>
                                {!searchQuery && (
                                    <Link 
                                        href="/dashboard/support/new"
                                        className="text-[10px] font-black text-tatt-lime uppercase tracking-widest hover:underline"
                                    >
                                        Initiate first request
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredTickets.map(ticket => (
                                    <div 
                                        key={ticket.id} 
                                        onClick={() => router.push(`/dashboard/support/ticket/${ticket.id}`)}
                                        className="bg-surface border border-border p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-tatt-lime/30 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-start gap-4 text-left">
                                            <div className="size-12 rounded-xl bg-background flex items-center justify-center shrink-0">
                                                <span className="text-[10px] font-black text-tatt-gray">{ticket.category?.charAt(0) || 'R'}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-foreground group-hover:text-tatt-lime transition-colors">{ticket.subject}</h4>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                                        ticket.status === 'RESOLVED' ? 'bg-green-500/10 text-green-600' :
                                                        ticket.status === 'NEW' ? 'bg-tatt-lime text-tatt-black' : 'bg-tatt-gray/10 text-tatt-gray'
                                                    }`}>
                                                        {ticket.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-tatt-gray line-clamp-1">{ticket.description}</p>
                                                <p className="text-[9px] text-tatt-gray font-bold uppercase tracking-wider">Ref: {ticket.ticketNumber} • {new Date(ticket.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <div className="size-10 rounded-full border border-border flex items-center justify-center group-hover:bg-tatt-lime group-hover:border-tatt-lime group-hover:text-tatt-black transition-all">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* FAQ Section */}
                    <div className="space-y-8 pt-8 border-t border-border">
                        <div className="flex items-end justify-between pb-6">
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter">Common FAQs</h3>
                            </div>
                            <Link href="#" className="text-xs font-bold text-tatt-lime hover:underline transition-all underline-offset-4">Browse All</Link>
                        </div>

                        {loadingFaqs ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-tatt-lime" />
                                <p className="text-xs font-bold text-tatt-gray uppercase tracking-widest animate-pulse">Syncing Repository Data...</p>
                            </div>
                        ) : filteredFaqs.length === 0 ? (
                            <div className="py-20 text-center space-y-4">
                                <HelpCircle className="h-12 w-12 text-tatt-gray/20 mx-auto" />
                                <p className="text-tatt-gray italic">No archives found matching your query.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredFaqs.map(cat => (
                                    <div key={cat.id || cat.category} className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="h-1 w-1 rounded-full bg-tatt-lime" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-gray">{cat.category}</h4>
                                        </div>
                                        <div className="grid gap-3">
                                            {cat.questions.map((faq) => (
                                                <div 
                                                    key={faq.id} 
                                                    className={`bg-surface border border-border rounded-2xl transition-all hover:border-tatt-lime/30 overflow-hidden ${expandedFaq === faq.id ? 'ring-1 ring-tatt-lime/20 shadow-sm' : ''}`}
                                                >
                                                    <button 
                                                        onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                                                        className="w-full text-left p-6 flex justify-between items-center gap-4"
                                                    >
                                                        <span className="font-bold text-foreground">{faq.question}</span>
                                                        <ChevronDown className={`h-5 w-5 text-tatt-gray transition-transform duration-300 ${expandedFaq === faq.id ? 'rotate-180 text-tatt-lime' : ''}`} />
                                                    </button>
                                                    {expandedFaq === faq.id && (
                                                        <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                                                            <div className="h-px bg-border mb-6" />
                                                            <p className="text-tatt-gray text-sm leading-relaxed whitespace-pre-wrap">
                                                                {faq.answer}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
