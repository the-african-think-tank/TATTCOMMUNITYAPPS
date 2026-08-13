"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
    Plus, 
    Search, 
    BookOpen, 
    ChevronRight, 
    ChevronDown, 
    Loader2, 
    TerminalSquare, 
    Trash2, 
    Edit2 
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

export default function FaqsManagementPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultTopic = searchParams.get('topic') || '';

    const [faqs, setFaqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(searchParams.get('create') === 'true');
    const [faqForm, setFaqForm] = useState<{
        category: string;
        items: { question: string; answer: string; }[];
    }>({ 
        category: defaultTopic || '', 
        items: [{ question: '', answer: '' }] 
    });
    const [editingFaq, setEditingFaq] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    const toggleCategory = (category: string) => {
        setCollapsedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        try {
            const { data } = await api.get('/support/faqs');
            setFaqs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFaq = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const formattedCategory = faqForm.category.toUpperCase().trim();
            
            if (editingFaq) {
                // Edit mode always edits a single FAQ item (first item in form list)
                const item = faqForm.items[0];
                if (!item) {
                    toast.error("No FAQ items found");
                    setSaving(false);
                    return;
                }
                await api.patch(`/support/faqs/${editingFaq.id}`, {
                    question: item.question,
                    answer: item.answer,
                    category: formattedCategory
                });
                toast.success("FAQ updated successfully");
            } else {
                // Create mode creates all non-empty FAQ items in bulk
                const validItems = faqForm.items.filter(item => item.question.trim() && item.answer.trim());
                if (validItems.length === 0) {
                    toast.error("Please add at least one question and answer");
                    setSaving(false);
                    return;
                }
                
                await Promise.all(
                    validItems.map(item => 
                        api.post('/support/faqs', {
                            question: item.question,
                            answer: item.answer,
                            category: formattedCategory
                        })
                    )
                );
                toast.success(`Successfully created ${validItems.length} FAQs`);
            }

            setIsModalOpen(false);
            setFaqForm({ category: '', items: [{ question: '', answer: '' }] });
            setEditingFaq(null);
            fetchFaqs();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save FAQ");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFaq = async (id: string) => {
        if (!confirm("Are you sure you want to delete this FAQ?")) return;
        try {
            await api.delete(`/support/faqs/${id}`);
            toast.success("FAQ deleted successfully");
            fetchFaqs();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete FAQ");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Are you sure you want to delete this Category and ALL of its FAQs? This action cannot be undone.")) return;
        try {
            await api.delete(`/support/faqs/categories/${id}`);
            toast.success("Category deleted successfully");
            fetchFaqs();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete Category");
        }
    };

    const handleEditClick = (faq: any) => {
        setEditingFaq(faq);
        setFaqForm({
            category: faq.category,
            items: [{ question: faq.question, answer: faq.answer }]
        });
        setIsModalOpen(true);
    };

    const handleAddItem = () => {
        setFaqForm(prev => ({
            ...prev,
            items: [...prev.items, { question: '', answer: '' }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        setFaqForm(prev => ({
            ...prev,
            items: prev.items.filter((_, idx) => idx !== index)
        }));
    };

    const handleItemChange = (index: number, field: 'question' | 'answer', value: string) => {
        setFaqForm(prev => {
            const updatedItems = [...prev.items];
            updatedItems[index] = { ...updatedItems[index], [field]: value } as { question: string; answer: string; };
            return { ...prev, items: updatedItems };
        });
    };

    const filteredFaqs = faqs.map(cat => {
        const matchesCategory = cat.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTopic = defaultTopic ? cat.category.toLowerCase() === defaultTopic.toLowerCase() : true;
        
        if (!matchesTopic) return null;

        const matchedQuestions = cat.questions.filter((f: any) => 
            f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.answer.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (searchTerm.trim() === "") {
            return cat;
        }
        if (matchesCategory) {
            return cat;
        }
        if (matchedQuestions.length > 0) {
            return { ...cat, questions: matchedQuestions };
        }
        return null;
    }).filter(Boolean) as any[];

    const totalFilteredFaqsCount = filteredFaqs.reduce((acc, cat) => acc + (cat.questions?.length || 0), 0);

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-tatt-gray text-[12px] font-medium tracking-wide uppercase mb-2">
                        <button onClick={() => router.push('/admin/support-center')} className="hover:text-tatt-lime transition-colors">Support Center</button>
                        <ChevronRight className="size-3.5" />
                        <span className="text-foreground font-bold">FAQs</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">
                        {defaultTopic ? `Topic: ${defaultTopic.replace('_', ' ')}` : 'FAQ Management'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-surface border border-border px-3 py-2 rounded-xl">
                        <Search className="size-4 text-tatt-gray mr-2" />
                        <input 
                            type="text" 
                            placeholder="Search FAQs" 
                            className="bg-transparent border-none focus:ring-0 text-sm text-foreground placeholder:text-tatt-gray w-64 p-0 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => {
                            setEditingFaq(null);
                            setFaqForm({ category: defaultTopic || '', items: [{ question: '', answer: '' }] });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-tatt-lime text-tatt-black px-4 py-2 rounded-xl text-sm font-black hover:brightness-105 transition-all shadow-sm"
                    >
                        <Plus className="size-4" strokeWidth={3} /> Add FAQ
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <Loader2 className="size-8 animate-spin text-tatt-lime" />
                    <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest animate-pulse">Loading FAQs...</p>
                </div>
            ) : totalFilteredFaqsCount === 0 ? (
                <div className="bg-surface border border-border border-dashed rounded-2xl p-16 text-center shadow-sm">
                    <BookOpen className="size-12 text-border mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-foreground mb-2">No FAQs Found</h3>
                    <p className="text-sm text-tatt-gray max-w-md mx-auto mb-6">Create standardized FAQ responses and categorizations to help automatically resolve common member inquiries.</p>
                    <button 
                        onClick={() => {
                            setEditingFaq(null);
                            setFaqForm({ category: defaultTopic || '', items: [{ question: '', answer: '' }] });
                            setIsModalOpen(true);
                        }}
                        className="bg-tatt-lime/10 text-tatt-lime px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-tatt-lime/20 transition-colors inline-block"
                    >
                        Create First FAQ
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredFaqs.map((cat) => {
                        const isCollapsed = collapsedCategories[cat.category];
                        return (
                            <div key={cat.category} className="border border-border rounded-2xl overflow-hidden bg-surface/20 transition-all duration-200">
                                {/* Category Header */}
                                <div className="w-full flex items-center justify-between p-5 bg-surface border-b border-border transition-colors">
                                    <button
                                        onClick={() => toggleCategory(cat.category)}
                                        className="flex items-center gap-3 text-left flex-1"
                                    >
                                        {isCollapsed ? (
                                            <ChevronRight className="size-5 text-tatt-gray" />
                                        ) : (
                                            <ChevronDown className="size-5 text-tatt-lime" />
                                        )}
                                        <span className="text-sm font-black tracking-widest uppercase text-foreground">
                                            {cat.category.replace('_', ' ')}
                                        </span>
                                        <span className="bg-background text-[10px] font-bold text-tatt-gray px-2.5 py-0.5 rounded-full border border-border">
                                            {cat.questions.length} {cat.questions.length === 1 ? 'FAQ' : 'FAQs'}
                                        </span>
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="text-tatt-gray hover:text-tatt-error transition-colors p-1"
                                        title="Delete Category and All FAQs"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* FAQs Grid under Category */}
                                {!isCollapsed && (
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-background/10">
                                        {cat.questions.map((faq: any) => (
                                            <div key={faq.id} className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-tatt-lime/30 transition-all group flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <h3 className="text-base font-bold text-foreground leading-snug">{faq.question}</h3>
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                                            <button 
                                                                onClick={() => handleEditClick(faq)}
                                                                className="text-tatt-gray hover:text-foreground transition-colors p-1"
                                                            >
                                                                <Edit2 size={14}/>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteFaq(faq.id)}
                                                                className="text-tatt-gray hover:text-tatt-error transition-colors p-1"
                                                            >
                                                                <Trash2 size={14}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-tatt-gray line-clamp-4 leading-relaxed">
                                                        {faq.answer}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div 
                    onClick={() => { setIsModalOpen(false); setEditingFaq(null); setFaqForm({ category: '', items: [{ question: '', answer: '' }] }); }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 my-8"
                    >
                        <div className="p-6 border-b border-border flex justify-between items-center bg-background/50">
                            <h2 className="text-lg font-bold text-foreground">{editingFaq ? 'Edit FAQ' : 'Draft FAQ Topic'}</h2>
                            <button onClick={() => { setIsModalOpen(false); setEditingFaq(null); setFaqForm({ category: '', items: [{ question: '', answer: '' }] }); }} className="text-tatt-gray hover:text-foreground text-sm font-bold uppercase">Cancel</button>
                        </div>
                        <form onSubmit={handleCreateFaq} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-[11px] font-bold tracking-widest uppercase text-tatt-gray mb-2">Topic Category</label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder="e.g. MEMBERSHIP, BILLING, TECHNICAL"
                                    value={faqForm.category}
                                    onChange={(e) => setFaqForm({...faqForm, category: e.target.value})}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:border-tatt-lime outline-none transition-colors uppercase font-bold tracking-widest"
                                />
                                <p className="text-[10px] text-tatt-gray mt-1.5">This will group all these questions under this topic on the dashboard.</p>
                            </div>

                            <div className="space-y-6">
                                {faqForm.items.map((item, index) => (
                                    <div key={index} className="p-5 bg-background/30 rounded-xl border border-border relative space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-lime">
                                                {editingFaq ? 'Question' : `Question #${index + 1}`}
                                            </span>
                                            {!editingFaq && faqForm.items.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="text-tatt-gray hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <label className="block text-[10px] font-bold tracking-widest uppercase text-tatt-gray mb-2">Question Title</label>
                                            <input 
                                                required
                                                type="text" 
                                                placeholder="What happens to my data if I cancel?"
                                                value={item.question}
                                                onChange={(e) => handleItemChange(index, 'question', e.target.value)}
                                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:border-tatt-lime outline-none transition-colors"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold tracking-widest uppercase text-tatt-gray mb-2">Answer</label>
                                            <textarea 
                                                required
                                                rows={4}
                                                placeholder="Provide the comprehensive template answer here..."
                                                value={item.answer}
                                                onChange={(e) => handleItemChange(index, 'answer', e.target.value)}
                                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:border-tatt-lime outline-none transition-colors resize-y"
                                            ></textarea>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!editingFaq && (
                                <button 
                                    type="button"
                                    onClick={handleAddItem}
                                    className="w-full py-3 border border-dashed border-border rounded-xl text-tatt-gray hover:text-tatt-lime hover:border-tatt-lime/50 transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} strokeWidth={3} /> Add Question
                                </button>
                            )}

                            <div className="pt-4 flex justify-end">
                                <button 
                                    type="submit"
                                    disabled={saving}
                                    className="bg-tatt-lime text-tatt-black px-6 py-2.5 rounded-lg text-sm font-black hover:brightness-105 transition-all shadow-sm disabled:opacity-50"
                                >
                                    {saving ? 'Publishing...' : 'Publish FAQs'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
