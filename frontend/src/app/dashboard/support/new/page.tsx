"use client";

import { useState, useRef } from "react";
import { 
    Plus, 
    ArrowRight, 
    CheckCircle, 
    CloudUpload,
    ChevronLeft,
    Loader2,
    Info,
    X,
    FileIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import { UPLOAD_LIMITS, validateFileSize, getUploadErrorMessage } from "@/lib/upload-utils";

export default function SubmitTicketPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [ticketForm, setTicketForm] = useState({
        subject: "",
        description: "",
        category: "MEMBERSHIP"
    });

    const categories = ["MEMBERSHIP", "TECHNICAL", "BILLING", "EVENT BOOKING", "OTHER"];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const validation = validateFileSize(file, UPLOAD_LIMITS.LOGO.maxBytes, "Attachment");
            if (!validation.valid) {
                toast.error(validation.error!);
                e.target.value = "";
                return;
            }
            setSelectedFile(file);
        }
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
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const validation = validateFileSize(file, UPLOAD_LIMITS.LOGO.maxBytes, "Attachment");
            if (!validation.valid) {
                toast.error(validation.error!);
                return;
            }
            setSelectedFile(file);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Helper to convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketForm.subject || !ticketForm.description) {
            toast.error("Please provide a subject and detailed description.");
            return;
        }

        setSubmitting(true);
        try {
            let attachments: string[] = [];
            if (selectedFile) {
                const base64 = await fileToBase64(selectedFile);
                attachments.push(base64);
            }

            const payload = {
                ...ticketForm,
                category: ticketForm.category === "EVENT BOOKING" ? "EVENTS" : ticketForm.category,
                attachments
            };
            
            await api.post("/support/tickets", payload);
            
            toast.success("Broadcast successful. The Archive team has been notified.");
            router.push("/dashboard/support");
        } catch (error: any) {
            toast.error(getUploadErrorMessage(error, "Failed to submit ticket."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-500">
            {/* Form Stage */}
            <section className="p-6 lg:p-12 max-w-6xl mx-auto w-full">
                {/* Back Button */}
                <Link 
                    href="/dashboard/support"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:text-tatt-lime transition-colors mb-10"
                >
                    <ChevronLeft className="h-4 w-4" /> Return to Support Center
                </Link>

                <div className="mb-12">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-tatt-lime font-black mb-3 block">Sovereign Support</span>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground mb-4">Submit a New Ticket</h2>
                    <p className="text-tatt-gray text-sm md:text-base max-w-xl leading-relaxed">
                        Provide details about your inquiry and our executive support team will initiate resolution within 24 hours.
                    </p>
                </div>

                {/* Bento Layout Form Container */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Main Form Body */}
                    <div className="lg:col-span-2">
                        <div className="bg-surface border border-border rounded-[32px] p-8 md:p-10 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-tatt-lime/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                            
                            <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                                {/* Category Selection */}
                                <div className="space-y-6">
                                    <label className="text-[10px] uppercase tracking-[0.2em] text-tatt-gray font-black block">Issue Category</label>
                                    <div className="flex flex-wrap gap-3">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setTicketForm({ ...ticketForm, category: cat })}
                                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                                                    ticketForm.category === cat 
                                                        ? 'bg-tatt-lime text-tatt-black border-tatt-lime shadow-lg shadow-tatt-lime/20' 
                                                        : 'bg-background text-tatt-gray border-border hover:border-tatt-lime/30'
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Subject Input */}
                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase tracking-[0.2em] text-tatt-gray font-black block" htmlFor="subject">Subject</label>
                                    <input 
                                        className="w-full bg-background border border-border rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-tatt-lime/20 focus:border-tatt-lime text-sm transition-all placeholder:text-tatt-gray/40" 
                                        id="subject" 
                                        placeholder="Summarize your request in a few words" 
                                        type="text"
                                        value={ticketForm.subject}
                                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                                    />
                                </div>

                                {/* Detailed Description */}
                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase tracking-[0.2em] text-tatt-gray font-black block" htmlFor="description">Detailed Description</label>
                                    <textarea 
                                        className="w-full bg-background border border-border rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-tatt-lime/20 focus:border-tatt-lime text-sm transition-all placeholder:text-tatt-gray/40 min-h-[200px]" 
                                        id="description" 
                                        placeholder="Please provide as much detail as possible. If this is a technical issue, include the steps taken before the error occurred." 
                                        rows={8}
                                        value={ticketForm.description}
                                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                                    />
                                </div>

                                {/* File Upload Area */}
                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase tracking-[0.2em] text-tatt-gray font-black block">Attachments (Optional)</label>
                                    
                                    {!selectedFile ? (
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer group ${isDragging ? "border-tatt-lime bg-tatt-lime/10" : "border-border bg-background/50 hover:bg-tatt-lime/[0.02] hover:border-tatt-lime/40"}`}
                                        >
                                            <CloudUpload className={`h-10 w-10 transition-colors mb-4 ${isDragging ? "text-tatt-lime scale-110" : "text-tatt-gray group-hover:text-tatt-lime"}`} />
                                            <p className="text-sm font-bold text-foreground">Click to upload or drag and drop</p>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-tatt-gray mt-2">PDF, DOC, DOCX, PNG, JPG (MAX. 10MB)</p>
                                        </div>
                                    ) : (
                                        <div className="bg-background border border-border rounded-2xl p-6 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-xl bg-tatt-lime/10 flex items-center justify-center text-tatt-lime">
                                                    <FileIcon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground truncate max-w-[200px]">{selectedFile.name}</p>
                                                    <p className="text-[10px] text-tatt-gray font-black uppercase tracking-widest">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={removeFile}
                                                className="size-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                    
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden" 
                                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-6 pt-8 border-t border-border">
                                    <button 
                                        type="button"
                                        onClick={() => router.push("/dashboard/support")}
                                        className="text-[10px] font-black uppercase tracking-widest text-tatt-gray hover:text-foreground transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        disabled={submitting}
                                        className="bg-tatt-lime text-tatt-black px-12 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-tatt-lime/20 active:scale-95 transition-all flex items-center gap-3"
                                        type="submit"
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>Submit Ticket <ArrowRight className="h-4 w-4" /></>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Secondary Info Panel */}
                    <div className="space-y-8">
                        {/* Guidelines Card */}
                        <div className="bg-surface border border-border rounded-[32px] p-8 shadow-sm">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-tatt-gray mb-8 flex items-center gap-2">
                                <Info className="h-4 w-4 text-tatt-lime" /> Submission Guide
                            </h4>
                            <ul className="space-y-6">
                                <li className="flex items-start gap-4">
                                    <div className="size-5 rounded-full bg-tatt-lime/10 flex items-center justify-center text-tatt-lime shrink-0 mt-0.5">
                                        <CheckCircle className="h-3 w-3" />
                                    </div>
                                    <span className="text-xs font-medium text-tatt-gray leading-relaxed">Be specific with subject lines to ensure priority routing.</span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="size-5 rounded-full bg-tatt-lime/10 flex items-center justify-center text-tatt-lime shrink-0 mt-0.5">
                                        <CheckCircle className="h-3 w-3" />
                                    </div>
                                    <span className="text-xs font-medium text-tatt-gray leading-relaxed">Include relevant contextual details for technical friction.</span>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="size-5 rounded-full bg-tatt-lime/10 flex items-center justify-center text-tatt-lime shrink-0 mt-0.5">
                                        <CheckCircle className="h-3 w-3" />
                                    </div>
                                    <span className="text-xs font-medium text-tatt-gray leading-relaxed">State your transaction ID for billing queries.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
