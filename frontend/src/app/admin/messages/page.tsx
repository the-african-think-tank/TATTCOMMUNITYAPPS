"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, MessageSquare, Users, Clock, Hash, CheckCircle, XCircle, Send, Diamond, AlertCircle, Loader2, Smile, ThumbsUp, Heart, Laugh, MoreHorizontal } from "lucide-react";
import api from "@/services/api";
import { initiateSocket, disconnectSocket, getSocket } from "@/services/socket";
import Picker from "emoji-picker-react";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import MembershipCard from "@/components/molecules/MembershipCard";
import { useAuth } from "@/context/auth-context";

type Tab = "Messages" | "Org Members";


interface Chapter {
    id: string;
    name: string;
    code: string;
}

interface MemberProfile {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    professionTitle: string | null;
    companyName: string | null;
    location: string | null;
    tattMemberId: string;
    communityTier: string;
    industry: string | null;
    systemRole?: string | null;
    flags?: string[];
    chapter?: Chapter | null;
}

interface NetworkConnection {
    connectionId: string;
    connectedSince: string;
    status?: string;
    member: MemberProfile;
}


interface PendingRequest {
    id: string;
    message: string;
    createdAt: string;
    type: "INCOMING" | "SENT";
    member: MemberProfile; // The other person (requester for INCOMING, recipient for SENT)
}


interface Conversation {
    connectionId: string;
    partner: MemberProfile;
    lastMessage?: {
        content: string;
        createdAt: string;
    };
    unreadCount: number;
}

interface DirectMessage {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    receiverId: string;
    readAt: string | null;
    reactions?: Record<string, string[]>; // Map of emoji to array of user IDs
}

const TIER_BADGES: Record<string, { label: string; classes: string }> = {
    KIONGOZI: { label: "Kiongozi", classes: "bg-tatt-lime text-tatt-black" },
    IMANI: { label: "Imani", classes: "bg-slate-200 text-neutral-700  " },
    UBUNTU: { label: "Ubuntu", classes: "bg-orange-100 text-orange-700  " },
    FREE: { label: "Sankofa", classes: "bg-neutral-100 border border-border text-tatt-gray" },
};

const getTierBadge = (tierCode: string | undefined): { label: string; classes: string } => {
    return TIER_BADGES[tierCode || "FREE"] || TIER_BADGES["FREE"] || { label: "Sankofa", classes: "" };
};

// Maps systemRole → { label, classes } using global CSS color tokens
const ROLE_BADGE_MAP: Record<string, { label: string; classes: string }> = {
    SUPERADMIN:      { label: "Super Admin",      classes: "bg-tatt-green-deep text-tatt-lime-light border border-tatt-lime/30" },
    ADMIN:           { label: "Admin",             classes: "bg-tatt-lime text-tatt-black border border-tatt-lime-dark" },
    REGIONAL_ADMIN:  { label: "Regional Admin",    classes: "bg-tatt-lime/20 text-tatt-lime-dark border border-tatt-lime/40" },
    MODERATOR:       { label: "Moderator",          classes: "bg-tatt-secondary/10 text-tatt-secondary border border-tatt-secondary/30" },
    CONTENT_ADMIN:   { label: "Content Admin",      classes: "bg-tatt-yellow-mustard/20 text-tatt-bronze-dark border border-tatt-bronze/30" },
    SALES:           { label: "Sales",              classes: "bg-tatt-gold-muted/20 text-tatt-bronze-dark border border-tatt-gold-muted/40" },
    VOLUNTEER_ADMIN: { label: "Volunteer Admin",    classes: "bg-tatt-bronze/10 text-tatt-bronze-dark border border-tatt-bronze/30" },
    COMMUNITY_MEMBER:{ label: "Member",             classes: "bg-border text-tatt-gray border border-border" },
};

const getRoleBadge = (role?: string | null) =>
    role ? (ROLE_BADGE_MAP[role] ?? { label: role.replace(/_/g, ' '), classes: "bg-border text-tatt-gray border border-border" }) : null;

const isVolunteer = (flags?: string[]) => flags?.includes("VOLUNTEER") || flags?.includes("VOLUNTEER_MANAGER");

export default function CommunicationsPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-tatt-lime size-10" /></div>}>
            <CommunicationsContent />
        </Suspense>
    );
}

function CommunicationsContent() {
    const searchParams = useSearchParams();
    const initConnectionId = searchParams?.get("connectionId");

    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>("Messages");
    const [search, setSearch] = useState("");

    const [connections, setConnections] = useState<NetworkConnection[]>([]);
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [orgMembers, setOrgMembers] = useState<MemberProfile[]>([]);


    const [selectedConnection, setSelectedConnection] = useState<NetworkConnection | null>(null);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);

    const [loading, setLoading] = useState(true);
    const [authUserId, setAuthUserId] = useState<string>("");

    // Real-time states
    const [partnerIsTyping, setPartnerIsTyping] = useState<boolean>(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<any>(null);
    const selectedConversationRef = useRef<Conversation | null>(null);

    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
    }, [selectedConversation]);

    useEffect(() => {
        const socket = initiateSocket();
        socketRef.current = socket;

            socket.on("new_message", (message: DirectMessage) => {
                const currentConv = selectedConversationRef.current;
                // If it's for the currently open conversation, add it to list
                if (currentConv && (message.senderId === currentConv.partner.id || message.receiverId === currentConv.partner.id)) {
                    setMessages(prev => {
                        if (prev.find((m: DirectMessage) => m.id === message.id)) return prev;
                        return [...prev, message];
                    });

                    // Mark as read if we are looking at it
                    if (message.senderId === currentConv.partner.id) {
                        api.patch(`/messages/read/${currentConv.connectionId}`, { messageIds: [message.id] });
                    }
                }

                // Update conversations list regardless
                setConversations((prev: Conversation[]) => {
                    return prev.map(c => {
                        const isPartner = message.senderId === c.partner.id || message.receiverId === c.partner.id;
                        if (isPartner) {
                            return {
                                ...c,
                                lastMessage: { content: message.content, createdAt: message.createdAt },
                                unreadCount: (message.senderId !== authUserId && (!currentConv || currentConv.connectionId !== c.connectionId)) ? c.unreadCount + 1 : c.unreadCount
                            };
                        }
                        return c;
                    });
                });

                if (message.senderId !== authUserId) {
                    toast.success("New message received");
                }
            });

            socket.on("typing_status", (data: { connectionId: string; userId: string; isTyping: boolean }) => {
                const currentConv = selectedConversationRef.current;
                if (currentConv && data.connectionId === currentConv.connectionId && data.userId !== authUserId) {
                    setPartnerIsTyping(data.isTyping);
                }
            });

            socket.on("notification", (payload: { type: string; data: any }) => {
                if (payload.type === "NEW_CONNECTION_REQUEST") {
                    const newReq: PendingRequest = {
                        ...payload.data,
                        type: "INCOMING",
                        member: payload.data.requester
                    };
                    setPendingRequests((prev: PendingRequest[]) => [newReq, ...prev]);
                    toast("New connection request!", { icon: "👋" });
                } else if (payload.type === "CONNECTION_REQUEST_ACCEPTED") {

                    toast.success(`${payload.data.member.firstName} accepted your request!`);
                    api.get("/connections/network").then(res => setConnections(res.data));
                }
            });

            socket.on("new_reaction", (data: { messageId: string; reaction: string; userId: string }) => {
                setMessages((prev: DirectMessage[]) => prev.map(m => {
                    if (m.id === data.messageId) {
                        const reactions = { ...(m.reactions || {}) };
                        const reactionArray = [...(reactions[data.reaction] || [])];
                        if (!reactionArray.includes(data.userId)) {
                            reactionArray.push(data.userId);
                        }
                        reactions[data.reaction] = reactionArray;
                        return { ...m, reactions };
                    }
                    return m;
                }));
            });
        return () => {
            disconnectSocket();
        };
    }, [authUserId]);

    useEffect(() => {
        // Find auth user ID directly from token or just rely on API backend returns
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [netRes, incomingRes, sentRes, convRes, orgRes] = await Promise.all([
                    api.get("/connections/network"),
                    api.get("/connections/requests/incoming"),
                    api.get("/connections/requests/sent"),
                    api.get("/messages/conversations").catch(() => ({ data: [] })),
                    api.get("/users/org-members").catch(() => ({ data: [] }))
                ]);
                setConnections(netRes.data);
                setOrgMembers(orgRes.data || []);
                
                // Internal normalisation
                const incoming: PendingRequest[] = incomingRes.data.map((r: any) => ({
                    ...r,
                    type: "INCOMING",
                    member: r.requester
                }));
                const sent: PendingRequest[] = sentRes.data.map((r: any) => ({
                    ...r,
                    type: "SENT",
                    member: r.recipient
                }));

                setPendingRequests([...incoming, ...sent]);
                setConversations(convRes.data || []);

                if (initConnectionId) {
                    const convToOpen = (convRes.data || []).find((c: any) => c.connectionId === initConnectionId);
                    if (convToOpen) {
                        setActiveTab("Messages");
                        handleSelectConversation(convToOpen);
                    } else {
                        // Might be a brand new connection not yet in conversations but in connections
                        const newConn = netRes.data.find((n: any) => n.connectionId === initConnectionId);
                        if (newConn) {
                            startConversationFromConnection(newConn);
                        } else {
                            if (netRes.data.length > 0 && selectedConnection === null) {
                                setSelectedConnection(netRes.data[0]!);
                            }
                        }
                    }
                } else {
                    if (netRes.data.length > 0 && selectedConnection === null) {
                        setSelectedConnection(netRes.data[0]!);
                    }
                }

            } catch (err) {
                console.error("Failed to load initial data", err);
            } finally {
                setLoading(false);
            }
        };

        // Get auth user ID directly from the auth context
        if (authUser?.id) {
            setAuthUserId(authUser.id);
        }
        fetchAllData();
    }, []);

    // Join room when conversation selected
    useEffect(() => {
        if (selectedConversation && socketRef.current) {
            socketRef.current.emit("join_conversation", { connectionId: selectedConversation.connectionId });
            setPartnerIsTyping(false);
        }
    }, [selectedConversation]);

    // Scroll to bottom of messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSwitchTab = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === "Messages") {
            if (conversations.length > 0) {
                handleSelectConversation(conversations[0]!);
            }
        }
    };


    const handleRespondRequest = async (id: string, status: "ACCEPTED" | "DECLINED") => {
        try {
            await api.patch(`/connections/request/${id}/respond`, { status });
            // Remove from pending list
            setPendingRequests((prev) => prev.filter((r) => r.id !== id));
            // Refresh connections if accepted
            if (status === "ACCEPTED") {
                const netRes = await api.get("/connections/network");
                setConnections(netRes.data);
                if (selectedConnection?.connectionId === id) {
                    setSelectedConnection(prev => prev ? { ...prev, status: "ACCEPTED" } : null);
                }
            } else {
                if (selectedConnection?.connectionId === id) {
                    setSelectedConnection(null);
                }
            }
        } catch (err) {
            console.error("Failed to respond", err);
            toast.error("Action failed. Request might have been already processed.");
        }
    };

    const handleWithdrawRequest = async (id: string) => {
        try {
            await api.patch(`/connections/request/${id}/withdraw`);
            setPendingRequests((prev) => prev.filter((r) => r.id !== id));
            if (selectedConnection?.connectionId === id) {
                setSelectedConnection(null);
            }
            toast.success("Connection request withdrawn.");
        } catch (err) {
            console.error("Failed to withdraw", err);
            toast.error("Failed to withdraw request.");
        }
    };


    const handleSelectConversation = async (conv: Conversation) => {
        setSelectedConversation(conv);
        try {
            const res = await api.get(`/messages/history/${conv.connectionId}?limit=50`);
            // The items come chronologically descending from the database possibly, so reverse to show properly
            const fetched = res.data.data;
            setMessages(fetched.reverse());
            // Mark as read
            if (conv.unreadCount > 0) {
                const unreadIds = fetched.filter((m: any) => m.receiverId === authUserId && !m.readAt).map((m: any) => m.id);
                if (unreadIds.length > 0) {
                    await api.patch(`/messages/read/${conv.connectionId}`, { messageIds: unreadIds });
                    setConversations(prev => prev.map(c => c.connectionId === conv.connectionId ? { ...c, unreadCount: 0 } : c));
                }
            }
        } catch (err) {
            console.error("Failed to load messages", err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation) return;

        setSendingMessage(true);
        try {
            const tempId = crypto.randomUUID();
            const payload = { content: newMessage.trim(), clientMessageId: tempId };
            const res = await api.post(`/messages/${selectedConversation.connectionId}`, payload);

            setMessages((prev) => [...prev, res.data]);
            setNewMessage("");
            setShowEmojiPicker(false);

            // Update conversation list last message locally
            setConversations(prev => prev.map(c =>
                c.connectionId === selectedConversation.connectionId
                    ? { ...c, lastMessage: { content: res.data.content, createdAt: res.data.createdAt } }
                    : c
            ));

            // Stop typing status
            if (socketRef.current) {
                socketRef.current.emit("typing", { connectionId: selectedConversation.connectionId, isTyping: false });
            }
        } catch (err) {
            console.error("Failed to send message", err);
            toast.error("Failed to send message");
        } finally {
            setSendingMessage(false);
        }
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);

        if (!selectedConversation || !socketRef.current) return;

        socketRef.current.emit("typing", { connectionId: selectedConversation.connectionId, isTyping: true });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current.emit("typing", { connectionId: selectedConversation.connectionId, isTyping: false });
        }, 2000);
    };

    const handleEmojiClick = (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
    };

    const handleAddReaction = (messageId: string, reaction: string) => {
        if (!selectedConversation || !socketRef.current) return;

        socketRef.current.emit("message_reaction", {
            connectionId: selectedConversation.connectionId,
            messageId,
            reaction
        });

        // Update locally
        setMessages(prev => prev.map(m => {
            if (m.id === messageId) {
                const reactions = { ...(m.reactions || {}) };
                if (!reactions[reaction]) reactions[reaction] = [];
                if (!reactions[reaction].includes(authUserId)) {
                    reactions[reaction].push(authUserId);
                } else {
                    reactions[reaction] = reactions[reaction].filter(id => id !== authUserId);
                }
                return { ...m, reactions };
            }
            return m;
        }));
    };

    const startConversationFromConnection = async (conn: NetworkConnection) => {
        // See if convo exists
        let existing = conversations.find((c) => c.connectionId === conn.connectionId);
        if (!existing) {
            existing = {
                connectionId: conn.connectionId,
                partner: conn.member,
                unreadCount: 0
            };
            setConversations(prev => [existing!, ...prev]);
        }
        
        setActiveTab("Messages");
        
        // Use a small timeout to let state flush before fetching history
        setTimeout(() => {
            handleSelectConversation(existing!);
        }, 50);
    };

    const startConversationWithOrgMember = async (targetUser: MemberProfile) => {
        try {
            setLoading(true);
            toast.loading("Starting conversation...", { id: "starting-chat" });
            const res = await api.post(`/messages/admin/initiate/${targetUser.id}`);
            const connectionId = res.data.connectionId;
            toast.success("Ready to send message!", { id: "starting-chat" });
            
            // Re-fetch conversations to include this new one or just try to open it
            const convRes = await api.get("/messages/conversations");
            setConversations(convRes.data || []);
            
            const existing = convRes.data?.find((c: any) => c.connectionId === connectionId);
            if (existing) {
                setActiveTab("Messages");
                setTimeout(() => {
                    handleSelectConversation(existing);
                }, 50);
            } else {
                // If the conversation object doesn't exist yet because no msgs were sent, handle fallback
                const fallbackConv = {
                    connectionId: connectionId,
                    partner: targetUser,
                    unreadCount: 0
                };
                setConversations(prev => [fallbackConv, ...prev]);
                setActiveTab("Messages");
                setTimeout(() => {
                    handleSelectConversation(fallbackConv);
                }, 50);
            }
        } catch (error) {
            console.error("Initiate chat error:", error);
            toast.error("Failed to start conversation", { id: "starting-chat" });
        } finally {
            setLoading(false);
        }
    };

    const renderLeftPane = () => {
        // Filter based on search
        const q = search.toLowerCase();

        if (activeTab === "Messages") {
            const filtered = conversations.filter(
                (c) => `${c.partner.firstName} ${c.partner.lastName}`.toLowerCase().includes(q)
            );

            return (
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-6">
                    <div className="px-4 py-2">
                        <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest">
                            Recent Conversations ({filtered.length})
                        </p>
                    </div>
                    {filtered.map((conv) => {
                        const isSelected = selectedConversation?.connectionId === conv.connectionId;
                        return (
                            <div
                                key={conv.connectionId}
                                onClick={() => handleSelectConversation(conv)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all mb-2 mx-2 flex items-center gap-3 ${isSelected ? 'bg-background border-tatt-lime/50 shadow-sm' : 'bg-surface border-border hover:bg-background/80'}`}
                            >
                                <div className="size-10 rounded-full border border-border bg-tatt-lime/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                                    {conv.partner.profilePicture ? (
                                        <Image src={conv.partner.profilePicture} alt={conv.partner.firstName} width={40} height={40} className="object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-tatt-lime">{conv.partner.firstName.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold truncate text-foreground">{conv.partner.firstName} {conv.partner.lastName}</h3>
                                        {/* Timestamp if desired -> can be added if available */}
                                    </div>
                                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-tatt-gray'}`}>
                                        {conv.lastMessage?.content || "No messages yet"}
                                    </p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <div className="size-5 rounded-full bg-tatt-lime text-tatt-black flex items-center justify-center text-[10px] font-black">
                                        {conv.unreadCount}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div className="p-6 text-center text-tatt-gray text-sm">No active conversations. Start one from your connections!</div>
                    )}
                </div>
            );
        }

        if (activeTab === "Org Members") {
            const orgFiltered = orgMembers.filter(
                (m) =>
                    `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
                    (m.chapter?.name || "").toLowerCase().includes(q)
            );

            return (
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-6">
                    <div className="px-4 py-3 flex justify-between items-center bg-surface sticky top-0 z-10 border-b border-border/50">
                        <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest flex items-center gap-2">
                            <Users className="size-3" /> Staff Direct Line ({orgFiltered.length})
                        </p>
                    </div>
                    <div className="pt-2">
                        {orgFiltered.map((member) => {
                            if (member.id === authUserId) return null; // don't list yourself
                            return (
                                <div
                                    key={member.id}
                                    className={`p-3 rounded-xl border transition-all mb-2 mx-2 flex items-center gap-3 bg-surface/50 border-border opacity-90 hover:opacity-100 hover:border-border`}
                                >
                                    <div className="size-10 rounded-full border border-border bg-tatt-lime/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                                        {member.profilePicture ? (
                                            <Image src={member.profilePicture} alt={member.firstName} width={40} height={40} className="object-cover" />
                                        ) : (
                                            <span className="text-xl font-bold text-tatt-lime">{member.firstName.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h3 className="text-sm font-bold text-foreground">{member.firstName} {member.lastName}</h3>
                                            {/* Message icon near name */}
                                            <MessageSquare className="size-3 text-tatt-gray opacity-50" />
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            {/* Role flag — always shown */}
                                            {(() => { const rb = getRoleBadge(member.systemRole); return rb ? (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider leading-none ${rb.classes}`}>
                                                    {rb.label}
                                                </span>
                                            ) : null; })()}
                                            {/* Volunteer flag */}
                                            {isVolunteer(member.flags) && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider leading-none bg-tatt-bronze/15 text-tatt-bronze-dark border border-tatt-bronze/40">
                                                    Volunteer
                                                </span>
                                            )}
                                            {member.professionTitle && (
                                                <p className="text-[10px] text-tatt-gray font-mono uppercase truncate">{member.professionTitle}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => startConversationWithOrgMember(member)}
                                        className="h-8 w-8 flex items-center justify-center bg-tatt-lime text-tatt-black rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1 shrink-0"
                                        title="Message Member"
                                    >
                                        <MessageSquare className="size-4" />
                                    </button>
                                </div>
                            );
                        })}
                        {orgFiltered.length === 0 && (
                            <div className="p-6 text-center text-tatt-gray text-sm">No other organization members found.</div>
                        )}
                    </div>
                </div>
            );
        }

        return null;
    };

    const renderRightPane = () => {
        if (activeTab === "Messages" && selectedConversation) {
            const partner = selectedConversation.partner;
            return (
                <div className="flex flex-col h-full">
                    {/* Chat Header */}
                    <div className="px-6 py-4 border-b border-border bg-surface flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full border border-border flex items-center justify-center overflow-hidden shrink-0">
                                {partner.profilePicture ? (
                                    <Image src={partner.profilePicture} alt={partner.firstName} width={40} height={40} className="object-cover" />
                                ) : (
                                    <span className="text-xl font-bold text-tatt-lime">{partner.firstName.charAt(0)}</span>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-foreground text-sm">{partner.firstName} {partner.lastName}</h3>
                                    {/* Role + volunteer flags in chat header */}
                                    {(() => { const rb = getRoleBadge((partner as any).systemRole); return rb ? (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider leading-none ${rb.classes}`}>
                                            {rb.label}
                                        </span>
                                    ) : null; })()}
                                    {isVolunteer((partner as any).flags) && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider leading-none bg-tatt-bronze/15 text-tatt-bronze-dark border border-tatt-bronze/40">
                                            Volunteer
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-tatt-gray truncate">{partner.professionTitle || partner.industry || "TATT Member"}</p>
                            </div>
                        </div>
                        <button onClick={() => { }} className="p-2 hover:bg-background rounded-full transition-colors text-tatt-gray hover:text-foreground group relative">
                            <Users className="size-4" />
                            <span className="absolute right-0 -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-1 text-[10px] rounded whitespace-nowrap">View Profile</span>
                        </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background/50 relative">
                        {messages.map((msg: DirectMessage) => {
                            const isMe = msg.senderId === authUserId;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm flex flex-col gap-1 relative ${isMe ? 'bg-tatt-lime text-black rounded-br-none' : 'bg-surface border border-border text-foreground rounded-bl-none'}`}>
                                        <p className="break-words font-medium">{msg.content}</p>

                                        {/* Reactions display */}
                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => handleAddReaction(msg.id, emoji)}
                                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border ${userIds.includes(authUserId) ? 'bg-tatt-lime/20 border-tatt-lime' : 'bg-background border-border'}`}
                                                    >
                                                        <span>{emoji}</span>
                                                        <span className="font-bold">{userIds.length}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between mt-1">
                                            <span className={`text-[9px] font-mono ${isMe ? 'text-black/60' : 'text-tatt-gray/60'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {msg.readAt && isMe && <CheckCircle className="size-2 text-black/40" />}
                                        </div>

                                        {/* Hover Reaction Toolbar */}
                                        <div className={`absolute -top-8 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity bg-surface border border-border rounded-full p-1 flex gap-1 shadow-sm z-10`}>
                                            {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => handleAddReaction(msg.id, emoji)}
                                                    className="hover:bg-background p-1 rounded-full transition-colors text-xs"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {partnerIsTyping && (
                            <div className="flex justify-start">
                                <div className="bg-surface border border-border rounded-2xl px-4 py-2 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-tatt-lime rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-tatt-lime rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-tatt-lime rounded-full animate-bounce"></span>
                                    </div>
                                    <span className="text-[10px] text-tatt-gray font-bold uppercase tracking-wider italic">
                                        {selectedConversation.partner.firstName} is typing...
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-surface border-t border-border shrink-0 relative">
                        {showEmojiPicker && (
                            <div className="absolute bottom-full right-4 z-50 shadow-2xl border border-border rounded-xl overflow-hidden">
                                <Picker
                                    onEmojiClick={handleEmojiClick}
                                    theme={'light' as any}
                                    width={300}
                                    height={400}
                                />
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`p-2 rounded-xl transition-colors ${showEmojiPicker ? 'bg-tatt-lime text-black' : 'hover:bg-background text-tatt-gray'}`}
                            >
                                <Smile className="size-5" />
                            </button>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={handleTyping}
                                placeholder="Type your message..."
                                className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tatt-lime outline-none transition-all placeholder:text-tatt-gray/50"
                            />
                            <button
                                type="submit"
                                disabled={sendingMessage || !newMessage.trim()}
                                className="bg-tatt-black text-white   h-11 px-5 rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
                            >
                                {sendingMessage ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                            </button>
                        </form>
                    </div>
                </div>
            );
        }


        // Empty state for right pane
        return (
            <div className="flex items-center justify-center h-full flex-col text-tatt-gray">
                {activeTab === "Messages" ? (
                    <MessageSquare className="size-16 mb-4 opacity-20" />
                ) : (
                    <Users className="size-16 mb-4 opacity-20" />
                )}
                <p className="text-lg font-bold">Select an item to view</p>
                <p className="text-sm mt-1">{activeTab === "Messages" ? "Choose a recent conversation on the left." : "Pick a connection to view their card."}</p>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-background w-full flex-col gap-4">
                <Loader2 className="size-10 animate-spin text-tatt-lime" />
                <p className="text-tatt-gray font-bold animate-pulse text-sm">Loading communcations...</p>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-80px)] w-full flex flex-col md:flex-row bg-background font-sans overflow-hidden">
            {/* Left Column: Lists */}
            <section className="flex flex-col w-full md:w-80 lg:w-96 border-r border-border bg-surface shrink-0 h-[40vh] md:h-full">
                <div className="pt-6 px-6">
                    <h2 className="text-2xl font-black mb-4 text-foreground tracking-tight">Community</h2>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-border overflow-x-auto custom-scrollbar">
                        {(["Messages", "Org Members"] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleSwitchTab(tab)}
                                className={`pb-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === tab
                                    ? "border-tatt-lime text-foreground"
                                    : "border-transparent text-tatt-gray hover:text-foreground"
                                    }`}
                            >
                                {tab}

                                {tab === "Messages" && conversations.reduce((acc, c) => acc + c.unreadCount, 0) > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center bg-tatt-lime text-black size-5 rounded-full text-[10px]">
                                        {conversations.reduce((acc, c) => acc + c.unreadCount, 0)}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>


                    {/* Search */}
                    <div className="py-5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tatt-gray size-4" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-tatt-lime outline-none transition-all placeholder:text-tatt-gray/60"
                                placeholder={`Search ${activeTab.toLowerCase()}...`}
                            />
                        </div>
                    </div>
                </div>

                {renderLeftPane()}
            </section>

            {/* Right Column: Active View */}
            <section className="flex-1 bg-background h-[60vh] md:h-full overflow-hidden">
                {renderRightPane()}
            </section>
        </div>
    );
}
