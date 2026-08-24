"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Search, MessageSquare, Users, Clock, Hash, CheckCircle, XCircle, Send, Diamond, AlertCircle, Loader2, Smile, ThumbsUp, Heart, Laugh, MoreHorizontal } from "lucide-react";
import api from "@/services/api";
import { initiateSocket, disconnectSocket, getSocket } from "@/services/socket";
import Picker from "emoji-picker-react";
import toast, { Toaster } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import MembershipCard from "@/components/molecules/MembershipCard";
import { useAuth } from "@/context/auth-context";

type Tab = "Messages" | "Connections" | "Pending";


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

export default function CommunicationsPage() {
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>("Connections");
    const [search, setSearch] = useState("");

    const [connections, setConnections] = useState<NetworkConnection[]>([]);
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);


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
                const [netRes, incomingRes, sentRes, convRes] = await Promise.all([
                    api.get("/connections/network"),
                    api.get("/connections/requests/incoming"),
                    api.get("/connections/requests/sent"),
                    api.get("/messages/conversations").catch(() => ({ data: [] }))
                ]);
                setConnections(netRes.data);
                if (netRes.data.length > 0 && selectedConnection === null) {
                    setSelectedConnection(netRes.data[0]!);
                }

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
        if (tab === "Connections") {
            if (connections.length > 0) {
                setSelectedConnection(connections[0]!);
            } else {
                setSelectedConnection(null);
            }
        } else if (tab === "Pending") {
            setSelectedConnection(null);
        } else if (tab === "Messages") {
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
        handleSelectConversation(existing);
    };

    const renderLeftPane = () => {
        // Filter based on search
        const q = search.toLowerCase();

        if (activeTab === "Pending") {
            const filtered = pendingRequests.filter(
                (r) =>
                    `${r.member?.firstName || ""} ${r.member?.lastName || ""}`.toLowerCase().includes(q) ||
                    (r.member?.chapter?.name || "").toLowerCase().includes(q)
            );

            const incoming = filtered.filter(f => f.type === "INCOMING");
            const outgoing = filtered.filter(f => f.type === "SENT");

            return (
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-6">
                    {/* Incoming Section */}
                    {incoming.length > 0 && (
                        <>
                            <div className="px-4 py-3">
                                <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="size-3" /> Incoming Requests ({incoming.length})
                                </p>
                            </div>
                            {incoming.map((req) => {
                                const tier = getTierBadge(req.member.communityTier);
                                const isSelected = selectedConnection?.connectionId === req.id;
                                return (
                                    <div key={req.id} className={`p-4 rounded-xl border transition-all mb-3 mx-2 shadow-sm ${isSelected ? 'bg-background border-tatt-lime/50 ring-1 ring-tatt-lime/20' : 'bg-surface border-border'}`}>
                                        <div
                                            className="flex items-center gap-3 mb-3 cursor-pointer group/member"
                                            onClick={() => setSelectedConnection({ connectionId: req.id, connectedSince: req.createdAt, status: "PENDING", member: req.member })}
                                        >
                                            <div className="size-10 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 group-hover/member:border-tatt-lime transition-colors">

                                                {req.member.profilePicture ? (
                                                    <Image src={req.member.profilePicture} alt={req.member.firstName} width={40} height={40} className="object-cover" />
                                                ) : (
                                                    <span className="text-xl font-bold text-tatt-lime">{req.member.firstName.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold truncate text-foreground">{req.member.firstName} {req.member.lastName}</h3>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${tier.classes}`}>
                                                        {tier.label}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-tatt-gray truncate">{req.member.chapter?.name || "No Chapter"}</p>
                                            </div>
                                        </div>
                                        <div className="bg-surface border border-border/50 p-3 rounded-lg mb-4">
                                            <p className="text-xs text-tatt-gray italic line-clamp-3">"{req.message}"</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRespondRequest(req.id, "ACCEPTED")} className="flex-1 bg-tatt-lime text-tatt-black text-xs font-bold py-2 rounded-lg hover:brightness-110 shadow shadow-tatt-lime/10 transition-all">
                                                Accept
                                            </button>
                                            <button onClick={() => handleRespondRequest(req.id, "DECLINED")} className="flex-1 bg-background border border-border text-foreground text-xs font-bold py-2 rounded-lg hover:bg-black hover:text-white   transition-all">
                                                Ignore
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {/* Outgoing Section */}
                    {outgoing.length > 0 && (
                        <>
                            <div className="px-4 py-3 mt-4">
                                <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest flex items-center gap-2">
                                    <Send className="size-3" /> Requests You Sent ({outgoing.length})
                                </p>
                            </div>
                            {outgoing.map((req) => {
                                const tier = getTierBadge(req.member.communityTier);
                                const isSelected = selectedConnection?.connectionId === req.id;
                                return (
                                    <div key={req.id} className={`p-4 rounded-xl border transition-all mb-3 mx-2 shadow-sm opacity-90 ${isSelected ? 'bg-background border-tatt-lime/50 ring-1 ring-tatt-lime/20' : 'bg-surface/50 border-border'}`}>
                                        <div
                                            className="flex items-center gap-3 mb-3 cursor-pointer group/member"
                                            onClick={() => setSelectedConnection({ connectionId: req.id, connectedSince: req.createdAt, status: "PENDING", member: req.member })}
                                        >
                                            <div className="size-10 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 group-hover/member:border-tatt-lime transition-colors">

                                                {req.member.profilePicture ? (
                                                    <Image src={req.member.profilePicture} alt={req.member.firstName} width={40} height={40} className="object-cover" />
                                                ) : (
                                                    <span className="text-xl font-bold text-tatt-lime">{req.member.firstName.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold truncate text-foreground">{req.member.firstName} {req.member.lastName}</h3>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${tier.classes}`}>
                                                        {tier.label}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-tatt-gray truncate">{req.member.chapter?.name || "No Chapter"}</p>
                                            </div>
                                        </div>
                                        <div className="bg-surface/40 border border-border/50 p-3 rounded-lg mb-4">
                                            <p className="text-xs text-tatt-gray italic line-clamp-3">"{req.message}"</p>
                                        </div>
                                        <button onClick={() => handleWithdrawRequest(req.id)} className="w-full bg-background border border-border text-foreground text-xs font-bold py-2 rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">
                                            Withdraw Request
                                        </button>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {filtered.length === 0 && (
                        <div className="p-12 flex flex-col items-center justify-center text-center opacity-40">
                            <Clock className="size-12 mb-4" />
                            <p className="text-sm font-bold">No pending activity</p>
                            <p className="text-[11px] mt-1 italic">Incoming and outgoing requests will appear here.</p>
                        </div>
                    )}
                </div>
            );
        }


        if (activeTab === "Connections") {
            const acceptedFiltered = connections.filter(
                (c) =>
                    `${c.member.firstName} ${c.member.lastName}`.toLowerCase().includes(q) ||
                    (c.member.chapter?.name || "").toLowerCase().includes(q) ||
                    (c.member.industry || "").toLowerCase().includes(q)
            );

            const pendingFiltered = pendingRequests.filter(
                (r) =>
                    `${r.member?.firstName || ""} ${r.member?.lastName || ""}`.toLowerCase().includes(q) ||
                    (r.member?.chapter?.name || "").toLowerCase().includes(q)
            );

            return (
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-6">
                    <div className="px-4 py-2 flex justify-between items-center">
                        <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest">
                            Your Network ({acceptedFiltered.length})
                        </p>
                    </div>
                    {acceptedFiltered.map((conn) => {
                        const tier = getTierBadge(conn.member.communityTier);
                        const isSelected = selectedConnection?.connectionId === conn.connectionId;
                        return (
                            <div
                                key={conn.connectionId}
                                onClick={() => setSelectedConnection(conn)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all mb-2 mx-2 flex items-center gap-3 ${isSelected ? 'bg-surface border-tatt-lime/50 shadow-sm' : 'bg-surface/50 border-border hover:bg-surface/80'}`}
                            >
                                <div className="size-10 rounded-full border border-border bg-tatt-lime/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                                    {conn.member.profilePicture ? (
                                        <Image src={conn.member.profilePicture} alt={conn.member.firstName} width={40} height={40} className="object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-tatt-lime">{conn.member.firstName.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-sm font-bold truncate text-foreground">{conn.member.firstName} {conn.member.lastName}</h3>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ml-2 ${tier.classes}`}>
                                            {tier.label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-tatt-gray truncate">{conn.member.professionTitle || conn.member.industry || "Member"}</p>
                                </div>
                            </div>
                        );
                    })}

                    {pendingFiltered.length > 0 && (
                        <>
                            <div className="px-4 py-3 mt-4 border-t border-border pt-4">
                                <p className="text-[10px] font-bold text-tatt-lime uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="size-3" /> Pending Invites ({pendingFiltered.length})
                                </p>
                            </div>
                            {pendingFiltered.map((req) => {
                                const tier = getTierBadge(req.member.communityTier);
                                const isSelected = selectedConnection?.connectionId === req.id;
                                return (
                                    <div
                                        key={req.id}
                                        onClick={() => setSelectedConnection({ connectionId: req.id, connectedSince: req.createdAt, status: "PENDING", member: req.member })}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all mb-2 mx-2 flex items-center gap-3 opacity-80 ${isSelected ? 'bg-background border-tatt-lime/50 shadow-sm' : 'bg-surface border-border border-dashed hover:bg-background/80'}`}
                                    >
                                        <div className="size-10 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 relative">
                                            {req.member.profilePicture ? (
                                                <Image src={req.member.profilePicture} alt={req.member.firstName} width={40} height={40} className="object-cover" />
                                            ) : (
                                                <span className="text-xl font-bold text-tatt-lime">{req.member.firstName?.charAt(0) || "?"}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-sm font-bold truncate text-foreground">{req.member.firstName} {req.member.lastName}</h3>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ml-2 ${tier.classes}`}>
                                                    {tier.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                {req.type === "INCOMING" ? (
                                                    <span className="text-[10px] font-bold text-red-500 bg-red-100  px-1.5 rounded uppercase">Incoming</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-tatt-gray bg-background border px-1.5 rounded uppercase">Sent</span>
                                                )}
                                                <p className="text-[11px] text-tatt-gray truncate ml-1">{req.member.professionTitle || req.member.industry || "Member"}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {acceptedFiltered.length === 0 && pendingFiltered.length === 0 && (
                        <div className="p-6 text-center text-tatt-gray text-sm">No connections found.</div>
                    )}
                </div>
            );
        }

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
                                <h3 className="font-bold text-foreground text-sm">{partner.firstName} {partner.lastName}</h3>
                                <p className="text-xs text-tatt-gray truncate">{partner.professionTitle || partner.industry || "TATT Member"}</p>
                            </div>
                        </div>
                        <button onClick={() => { startConversationFromConnection({ connectionId: selectedConversation.connectionId, connectedSince: "", member: partner }); setActiveTab("Connections"); setSelectedConnection({ connectionId: selectedConversation.connectionId, connectedSince: "", member: partner }) }} className="p-2 hover:bg-background rounded-full transition-colors text-tatt-gray hover:text-foreground group relative">
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

        if ((activeTab === "Connections" || activeTab === "Pending") && selectedConnection) {

            const member = selectedConnection.member;
            const tier = getTierBadge(member.communityTier);

            return (
                <div className="p-4 lg:p-8 max-w-2xl mx-auto h-full overflow-y-auto">
                    {/* Profile Header Card */}
                    <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden mb-6">
                        <div className="h-24 bg-gradient-to-r from-tatt-lime/30 to-tatt-lime/10 w-full"></div>
                        <div className="px-8 pb-8 -mt-12 flex flex-col items-center">
                            <div className="size-24 rounded-full border-4 border-surface shadow-md bg-background mb-4 flex items-center justify-center overflow-hidden">
                                {member.profilePicture ? (
                                    <Image src={member.profilePicture} alt={member.firstName} width={96} height={96} className="object-cover h-full w-full" />
                                ) : (
                                    <span className="text-4xl font-bold text-tatt-lime">{member.firstName.charAt(0)}</span>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">{member.firstName} {member.lastName}</h2>
                            <p className="text-tatt-gray font-medium">
                                {member.professionTitle || "Member"} {member.companyName && `• ${member.companyName}`}
                            </p>
                            <div className="flex gap-4 mt-6 w-full">
                                {(!selectedConnection.status || selectedConnection.status === "ACCEPTED") && (
                                    <button onClick={() => startConversationFromConnection(selectedConnection)} className="flex-1 bg-tatt-lime text-tatt-black font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:brightness-110 shadow-sm shadow-tatt-lime/20 transition-all uppercase tracking-widest">
                                        <MessageSquare className="size-4" /> Message
                                    </button>
                                )}
                                <a href={`/dashboard/network/${member.id}`} className="flex-1 bg-background border border-border text-foreground font-bold py-2.5 rounded-xl text-sm justify-center items-center flex hover:bg-foreground hover:text-background transition-colors uppercase tracking-widest">
                                    View Profile
                                </a>
                            </div>

                        </div>
                    </div>

                    {/* Digital Member Card Section */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-tatt-gray uppercase tracking-widest mb-4">Digital Identity</h3>
                        <MembershipCard
                            member={{
                                ...member,
                                chapterName: member.chapter?.name,
                                chapterCode: member.chapter?.code
                            }}
                            isCurrentUser={authUser?.id === member.id}
                        />
                    </div>

                    {/* Shared Info Component */}
                    <div className="bg-surface rounded-2xl p-6 shadow-sm border border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-foreground">Member Identity</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {member.industry && <span className="px-3 py-1.5 bg-background text-foreground text-xs font-medium rounded-full border border-border">{member.industry}</span>}
                            {member.location && <span className="px-3 py-1.5 bg-background text-foreground text-xs font-medium rounded-full border border-border">{member.location}</span>}
                            <span className="px-3 py-1.5 bg-tatt-lime/10 text-tatt-lime-dark  text-xs font-bold rounded-full border border-tatt-lime/20 uppercase tracking-tight">Verified Member</span>
                        </div>
                        <p className="mt-4 text-xs text-tatt-gray italic border-t border-border pt-4">
                            Details verified by TATT Network Operations. Visit their full profile to learn more.
                        </p>
                    </div>
                </div>
            )
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
                        {(["Messages", "Connections", "Pending"] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleSwitchTab(tab)}
                                className={`pb-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === tab
                                    ? "border-tatt-lime text-foreground"
                                    : "border-transparent text-tatt-gray hover:text-foreground"
                                    }`}
                            >
                                {tab}
                                {tab === "Pending" && pendingRequests.filter(r => r.type === "INCOMING").length > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center bg-red-500 text-white size-5 rounded-full text-[10px]">
                                        {pendingRequests.filter(r => r.type === "INCOMING").length}
                                    </span>
                                )}
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

            <Toaster position="top-right" />
        </div>
    );
}
