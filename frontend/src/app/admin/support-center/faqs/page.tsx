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
    Trash2, 
    Edit2,
    FolderPlus,
    AlertTriangle,
    Tag,
    X
} from "lucide-react";
import api from "@/services/api";
import toast from "react-hot-toast";

interface FAQItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    categoryId?: string;
    isActive: boolean;
}

interface CategoryGroup {
    id: string;
    category: string;
    questions: FAQItem[];
}

export default function FaqsManagementPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultTopic = searchParams.get('topic') || '';

    const [faqs, setFaqs] = useState<CategoryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>(defaultTopic || "ALL");
    
    // FAQ Modal State
    const [isFaqModalOpen, setIsFaqModalOpen] = useState(searchParams.get('create') === 'true');
    const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
    const [faqForm, setFaqForm] = useState<{
        selectedCategoryId: string;
        newCategoryName: string;
        isCreatingNewCategory: boolean;
        items: { question: string; answer: string; }[];
    }>({ 
        selectedCategoryId: '', 
        newCategoryName: '',
        isCreatingNewCategory: false,
        items: [{ question: '', answer: '' }] 
    });
    const [savingFaq, setSavingFaq] = useState(false);

    // Category Create/Edit Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryGroup | null>(null);
    const [categoryNameInput, setCategoryNameInput] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);

    // Reassign & Delete Category Modal State
    const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<CategoryGroup | null>(null);
    const [targetCategoryIdForDelete, setTargetCategoryIdForDelete] = useState<string>("");
    const [deletingCategory, setDeletingCategory] = useState(false);

    // UI state
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    const toggleCategory = (categoryName: string, index: number) => {
        setCollapsedCategories(prev => {
            const currentIsCollapsed = prev[categoryName] ?? (index !== 0);
            return {
                ...prev,
                [categoryName]: !currentIsCollapsed
            };
        });
    };

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/support/faqs');
            setFaqs(data);
        } catch (err) {
            console.error("Error fetching FAQs:", err);
            toast.error("Failed to load FAQs");
        } finally {
            setLoading(false);
        }
    };

    // --- CATEGORY ACTIONS ---
    const handleOpenCreateCategoryModal = () => {
        setEditingCategory(null);
        setCategoryNameInput("");
        setIsCategoryModalOpen(true);
    };

    const handleOpenEditCategoryModal = (cat: CategoryGroup) => {
        setEditingCategory(cat);
        setCategoryNameInput(cat.category);
        setIsCategoryModalOpen(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryNameInput.trim()) {
            toast.error("Please enter a category name");
            return;
        }

        try {
            setSavingCategory(true);
            const formattedName = categoryNameInput.toUpperCase().trim();

            if (editingCategory) {
                await api.patch(`/support/faqs/categories/${editingCategory.id}`, {
                    category: formattedName
                });
                toast.success("Category renamed successfully");
            } else {
                await api.post('/support/faqs/categories', {
                    category: formattedName
                });
                toast.success("Category created successfully");
            }

            setIsCategoryModalOpen(false);
            setCategoryNameInput("");
            setEditingCategory(null);
            fetchFaqs();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save category");
        } finally {
            setSavingCategory(false);
        }
    };

    const handleInitiateDeleteCategory = (cat: CategoryGroup) => {
        setCategoryToDelete(cat);
        if (cat.questions && cat.questions.length > 0) {
            // Find first available target category that isn't the one being deleted
            const alternativeCat = faqs.find(c => c.id !== cat.id);
            setTargetCategoryIdForDelete(alternativeCat ? alternativeCat.id : "");
            setIsDeleteCategoryModalOpen(true);
        } else {
            // Direct delete confirmation for empty category
            if (confirm(`Are you sure you want to delete category "${cat.category}"?`)) {
                executeDeleteCategory(cat.id);
            }
        }
    };

    const executeDeleteCategory = async (id: string, targetCatId?: string) => {
        try {
            setDeletingCategory(true);
            let url = `/support/faqs/categories/${id}`;
            if (targetCatId) {
                url += `?targetCategoryId=${targetCatId}`;
            }
            await api.delete(url);
            toast.success("Category deleted successfully");
            setIsDeleteCategoryModalOpen(false);
            setCategoryToDelete(null);
            setTargetCategoryIdForDelete("");
            fetchFaqs();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to delete category");
        } finally {
            setDeletingCategory(false);
        }
    };

    // --- FAQ ACTIONS ---
    const handleOpenAddFaqModal = (preselectedCategory?: CategoryGroup) => {
        setEditingFaq(null);
        
        let initialCatId = '';
        const noCategoriesExist = faqs.length === 0;

        if (preselectedCategory) {
            initialCatId = preselectedCategory.id;
        } else if (selectedCategoryFilter !== "ALL") {
            const matched = faqs.find(c => c.category.toLowerCase() === selectedCategoryFilter.toLowerCase() || c.id === selectedCategoryFilter);
            if (matched) initialCatId = matched.id;
        } else if (faqs.length > 0 && faqs[0]) {
            initialCatId = faqs[0].id;
        }

        setFaqForm({
            selectedCategoryId: noCategoriesExist ? '__NEW__' : initialCatId,
            newCategoryName: '',
            isCreatingNewCategory: noCategoriesExist,
            items: [{ question: '', answer: '' }]
        });
        setIsFaqModalOpen(true);
    };

    const handleEditFaqClick = (faq: FAQItem) => {
        setEditingFaq(faq);
        const matchingCategory = faqs.find(c => c.category === faq.category || c.id === faq.categoryId);
        setFaqForm({
            selectedCategoryId: matchingCategory ? matchingCategory.id : '',
            newCategoryName: matchingCategory ? '' : faq.category,
            isCreatingNewCategory: !matchingCategory,
            items: [{ question: faq.question, answer: faq.answer }]
        });
        setIsFaqModalOpen(true);
    };

    const handleSaveFaq = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSavingFaq(true);

            let categoryId = faqForm.selectedCategoryId;
            let categoryName = faqForm.newCategoryName.trim();

            if (faqForm.isCreatingNewCategory) {
                if (!categoryName) {
                    toast.error("Please specify a category name");
                    setSavingFaq(false);
                    return;
                }
            } else if (!categoryId && faqs.length > 0 && faqs[0]) {
                categoryId = faqs[0].id;
            }

            if (editingFaq) {
                const item = faqForm.items[0];
                if (!item || !item.question.trim() || !item.answer.trim()) {
                    toast.error("Question and answer are required");
                    setSavingFaq(false);
                    return;
                }

                await api.patch(`/support/faqs/${editingFaq.id}`, {
                    question: item.question,
                    answer: item.answer,
                    categoryId: faqForm.isCreatingNewCategory ? undefined : categoryId,
                    category: faqForm.isCreatingNewCategory ? categoryName.toUpperCase() : undefined
                });
                toast.success("FAQ updated successfully");
            } else {
                const validItems = faqForm.items.filter(item => item.question.trim() && item.answer.trim());
                if (validItems.length === 0) {
                    toast.error("Please add at least one question and answer");
                    setSavingFaq(false);
                    return;
                }

                await Promise.all(
                    validItems.map(item => 
                        api.post('/support/faqs', {
                            question: item.question,
                            answer: item.answer,
                            categoryId: faqForm.isCreatingNewCategory ? undefined : categoryId,
                            category: faqForm.isCreatingNewCategory ? categoryName.toUpperCase() : undefined
                        })
                    )
                );
                toast.success(`Successfully created ${validItems.length} FAQ(s)`);
            }

            setIsFaqModalOpen(false);
            setEditingFaq(null);
            fetchFaqs();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save FAQ");
        } finally {
            setSavingFaq(false);
        }
    };

    const handleDeleteFaq = async (id: string) => {
        if (!confirm("Are you sure you want to delete this FAQ question?")) return;
        try {
            await api.delete(`/support/faqs/${id}`);
            toast.success("FAQ deleted successfully");
            fetchFaqs();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete FAQ");
        }
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
            const currentItem = updatedItems[index] ?? { question: '', answer: '' };
            updatedItems[index] = { ...currentItem, [field]: value };
            return { ...prev, items: updatedItems };
        });
    };

    // Filter Logic
    const filteredFaqs = faqs.map(cat => {
        const matchesCategoryFilter = 
            selectedCategoryFilter === "ALL" || 
            cat.id === selectedCategoryFilter || 
            cat.category.toLowerCase() === selectedCategoryFilter.toLowerCase();
        
        if (!matchesCategoryFilter) return null;

        const matchesSearchTerm = cat.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchedQuestions = cat.questions.filter(f => 
            f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.answer.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (searchTerm.trim() === "") {
            return cat;
        }
        if (matchesSearchTerm) {
            return cat;
        }
        if (matchedQuestions.length > 0) {
            return { ...cat, questions: matchedQuestions };
        }
        return null;
    }).filter(Boolean) as CategoryGroup[];

    const totalFilteredFaqsCount = filteredFaqs.reduce((acc, cat) => acc + (cat.questions?.length || 0), 0);

    return (
        <div className="space-y-8 pb-12">
            {/* Header & Controls Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-border">
                <div>
                    <div className="flex items-center gap-2 text-tatt-gray text-[12px] font-medium tracking-wide uppercase mb-2">
                        <button onClick={() => router.push('/admin/support-center')} className="hover:text-tatt-lime transition-colors cursor-pointer">Support Center</button>
                        <ChevronRight className="size-3.5" />
                        <span className="text-foreground font-bold">FAQs Management</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">
                        {defaultTopic ? `Topic: ${defaultTopic.replace('_', ' ')}` : 'FAQ Management'}
                    </h1>
                </div>

                {/* Filter and Action Controls */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="flex items-center bg-surface border border-border px-3.5 py-2.5 rounded-xl flex-1 sm:flex-none">
                        <Search className="size-4 text-tatt-gray mr-2.5 shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Search FAQs..." 
                            className="bg-transparent border-none focus:ring-0 text-sm text-foreground placeholder:text-tatt-gray w-full sm:w-48 p-0 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Category Filter Dropdown */}
                    <div className="flex items-center bg-surface border border-border px-3.5 py-2.5 rounded-xl">
                        <Tag className="size-4 text-tatt-gray mr-2 shrink-0" />
                        <select 
                            value={selectedCategoryFilter}
                            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold uppercase tracking-wider text-foreground outline-none cursor-pointer pr-2"
                        >
                            <option value="ALL" className="bg-surface text-foreground font-semibold">All Categories</option>
                            {faqs.map(c => (
                                <option key={c.id} value={c.id} className="bg-surface text-foreground font-semibold">
                                    {c.category.replace('_', ' ')} ({c.questions?.length || 0})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* New Category Button */}
                    <button 
                        onClick={handleOpenCreateCategoryModal}
                        className="flex items-center gap-2 bg-surface hover:bg-surface/80 border border-border text-foreground px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                        <FolderPlus className="size-4 text-tatt-lime" />
                        <span>+ Category</span>
                    </button>

                    {/* Add FAQ Primary Button */}
                    <button 
                        onClick={() => handleOpenAddFaqModal()}
                        className="flex items-center gap-2 bg-tatt-lime text-tatt-black px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-105 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                        <Plus className="size-4" strokeWidth={3} /> Add FAQ
                    </button>
                </div>
            </div>

            {/* Content Loading State */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4 bg-surface/30 border border-dashed border-border rounded-3xl">
                    <Loader2 className="size-8 animate-spin text-tatt-lime" />
                    <p className="text-[10px] font-bold text-tatt-gray uppercase tracking-widest animate-pulse">Loading FAQ Repository...</p>
                </div>
            ) : totalFilteredFaqsCount === 0 && faqs.length === 0 ? (
                <div className="bg-surface border border-border border-dashed rounded-3xl p-16 text-center shadow-sm">
                    <BookOpen className="size-12 text-border mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-foreground mb-2">No Categories or FAQs Found</h3>
                    <p className="text-sm text-tatt-gray max-w-md mx-auto mb-6">Create categories and standardized FAQ responses to help automatically resolve common member inquiries.</p>
                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={handleOpenCreateCategoryModal}
                            className="bg-surface border border-border text-foreground px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-tatt-lime transition-colors cursor-pointer"
                        >
                            Create Category
                        </button>
                        <button 
                            onClick={() => handleOpenAddFaqModal()}
                            className="bg-tatt-lime text-tatt-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-105 transition-all cursor-pointer"
                        >
                            Create First FAQ
                        </button>
                    </div>
                </div>
            ) : (
                /* Category Accordion & Questions List Layout */
                <div className="space-y-6">
                    {filteredFaqs.map((cat, index) => {
                        const isCollapsed = collapsedCategories[cat.category] ?? (index !== 0);
                        return (
                            <div key={cat.id || cat.category} className="border border-border rounded-2xl overflow-hidden bg-surface/30 transition-all duration-200 shadow-sm">
                                {/* Category Header Bar */}
                                <div className="w-full flex flex-wrap items-center justify-between p-4 sm:p-5 bg-surface border-b border-border gap-4">
                                    <button
                                        onClick={() => toggleCategory(cat.category, index)}
                                        className="flex items-center gap-3 text-left flex-1 cursor-pointer group"
                                    >
                                        {isCollapsed ? (
                                            <ChevronRight className="size-5 text-tatt-gray group-hover:text-tatt-lime transition-colors" />
                                        ) : (
                                            <ChevronDown className="size-5 text-tatt-lime" />
                                        )}
                                        <span className="text-base font-black tracking-wider uppercase text-foreground group-hover:text-tatt-lime transition-colors">
                                            {cat.category.replace('_', ' ')}
                                        </span>
                                        <span className="bg-background text-[10px] font-bold text-tatt-gray px-3 py-1 rounded-full border border-border">
                                            {cat.questions.length} {cat.questions.length === 1 ? 'Question' : 'Questions'}
                                        </span>
                                    </button>

                                    {/* Header Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        {/* Add Question to Category Action */}
                                        <button 
                                            onClick={() => handleOpenAddFaqModal(cat)}
                                            className="flex items-center gap-1.5 bg-tatt-lime/10 hover:bg-tatt-lime/20 text-tatt-lime border border-tatt-lime/20 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                                            title={`Add new question to ${cat.category}`}
                                        >
                                            <Plus size={14} strokeWidth={2.5} />
                                            <span>Add Question</span>
                                        </button>

                                        {/* Edit Category Action */}
                                        <button 
                                            onClick={() => handleOpenEditCategoryModal(cat)}
                                            className="p-2 text-tatt-gray hover:text-foreground hover:bg-background rounded-lg border border-transparent hover:border-border transition-all cursor-pointer"
                                            title="Edit Category Name"
                                        >
                                            <Edit2 size={15} />
                                        </button>

                                        {/* Delete Category Action */}
                                        <button 
                                            onClick={() => handleInitiateDeleteCategory(cat)}
                                            className="p-2 text-tatt-gray hover:text-red-500 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                                            title="Delete Category"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* FAQs Stacked Vertical List (No Grid) */}
                                {!isCollapsed && (
                                    <div className="p-4 sm:p-6 space-y-3 bg-background/20">
                                        {cat.questions.length === 0 ? (
                                            <div className="p-8 text-center border border-dashed border-border rounded-xl">
                                                <p className="text-xs text-tatt-gray italic mb-3">No questions added to this category yet.</p>
                                                <button 
                                                    onClick={() => handleOpenAddFaqModal(cat)}
                                                    className="text-xs font-bold text-tatt-lime hover:underline cursor-pointer"
                                                >
                                                    + Add first question to {cat.category}
                                                </button>
                                            </div>
                                        ) : (
                                            cat.questions.map((faq) => (
                                                <div 
                                                    key={faq.id} 
                                                    className="bg-surface border border-border rounded-xl p-5 hover:border-tatt-lime/30 transition-all group"
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                        <div className="space-y-2 flex-1">
                                                            <h3 className="text-base font-bold text-foreground leading-snug group-hover:text-tatt-lime transition-colors">
                                                                {faq.question}
                                                            </h3>
                                                            <p className="text-sm text-tatt-gray whitespace-pre-wrap leading-relaxed">
                                                                {faq.answer}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                                                            <button 
                                                                onClick={() => handleEditFaqClick(faq)}
                                                                className="p-2 text-tatt-gray hover:text-foreground hover:bg-background rounded-lg border border-transparent hover:border-border transition-all cursor-pointer"
                                                                title="Edit Question"
                                                            >
                                                                <Edit2 size={15}/>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteFaq(faq.id)}
                                                                className="p-2 text-tatt-gray hover:text-red-500 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                                                                title="Delete Question"
                                                            >
                                                                <Trash2 size={15}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- CREATE / EDIT CATEGORY MODAL --- */}
            {isCategoryModalOpen && (
                <div 
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-surface w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200"
                    >
                        <div className="p-5 border-b border-border flex justify-between items-center bg-background/50">
                            <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                <FolderPlus className="size-4 text-tatt-lime" />
                                <span>{editingCategory ? 'Rename Category' : 'Create New Category'}</span>
                            </h2>
                            <button 
                                onClick={() => setIsCategoryModalOpen(false)} 
                                className="text-tatt-gray hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold tracking-widest uppercase text-tatt-gray mb-2">
                                    Category Title
                                </label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder="e.g. MEMBERSHIP, BILLING, TECHNICAL"
                                    value={categoryNameInput}
                                    onChange={(e) => setCategoryNameInput(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-tatt-lime outline-none transition-colors uppercase font-bold tracking-wider"
                                />
                                <p className="text-[10px] text-tatt-gray mt-2">
                                    Categories help organize questions into clean sections across support dashboards.
                                </p>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsCategoryModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-tatt-gray hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={savingCategory}
                                    className="bg-tatt-lime text-tatt-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                                >
                                    {savingCategory ? 'Saving...' : editingCategory ? 'Save Category' : 'Create Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- REASSIGN & DELETE CATEGORY MODAL --- */}
            {isDeleteCategoryModalOpen && categoryToDelete && (
                <div 
                    onClick={() => setIsDeleteCategoryModalOpen(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200"
                    >
                        <div className="p-5 border-b border-border flex justify-between items-center bg-background/50">
                            <h2 className="text-base font-black text-foreground uppercase tracking-wider flex items-center gap-2 text-red-500">
                                <AlertTriangle className="size-5" />
                                <span>Reassign FAQs & Delete Category</span>
                            </h2>
                            <button 
                                onClick={() => setIsDeleteCategoryModalOpen(false)} 
                                className="text-tatt-gray hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
                                <p className="text-sm font-bold text-red-400">
                                    Category &quot;{categoryToDelete.category}&quot; contains {categoryToDelete.questions?.length || 0} question(s).
                                </p>
                                <p className="text-xs text-tatt-gray leading-relaxed">
                                    To protect knowledge data, you must reassign all questions in this category to another existing category before deletion.
                                </p>
                            </div>

                            {faqs.filter(c => c.id !== categoryToDelete.id).length === 0 ? (
                                <div className="p-4 bg-background border border-border rounded-xl text-center space-y-3">
                                    <p className="text-xs text-tatt-gray">
                                        No other category exists to reassign these questions to. Please create a target category first or delete individual questions.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDeleteCategoryModalOpen(false);
                                            handleOpenCreateCategoryModal();
                                        }}
                                        className="text-xs font-bold text-tatt-lime hover:underline cursor-pointer"
                                    >
                                        + Create Alternative Category
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <label className="block text-[11px] font-bold tracking-widest uppercase text-tatt-gray">
                                        Reassign Questions To:
                                    </label>
                                    <select 
                                        value={targetCategoryIdForDelete}
                                        onChange={(e) => setTargetCategoryIdForDelete(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground font-bold uppercase tracking-wider focus:border-tatt-lime outline-none cursor-pointer"
                                    >
                                        {faqs.filter(c => c.id !== categoryToDelete.id).map(c => (
                                            <option key={c.id} value={c.id} className="bg-surface text-foreground font-semibold">
                                                {c.category.replace('_', ' ')} ({c.questions?.length || 0} existing questions)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="pt-2 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsDeleteCategoryModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-tatt-gray hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    disabled={deletingCategory || !targetCategoryIdForDelete}
                                    onClick={() => executeDeleteCategory(categoryToDelete.id, targetCategoryIdForDelete)}
                                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                                >
                                    {deletingCategory ? 'Reassigning & Deleting...' : 'Reassign & Delete Category'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE / EDIT FAQ QUESTION MODAL --- */}
            {isFaqModalOpen && (
                <div 
                    onClick={() => setIsFaqModalOpen(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 my-8"
                    >
                        <div className="p-6 border-b border-border flex justify-between items-center bg-background/50">
                            <h2 className="text-lg font-bold text-foreground">
                                {editingFaq ? 'Edit FAQ Question' : 'Add FAQ Question'}
                            </h2>
                            <button 
                                onClick={() => setIsFaqModalOpen(false)} 
                                className="text-tatt-gray hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveFaq} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                            {/* Category Selector */}
                            <div>
                                <label className="block text-[11px] font-bold tracking-widest uppercase text-tatt-gray mb-2">
                                    Topic Category
                                </label>
                                
                                <div className="space-y-3">
                                    <select 
                                        value={faqForm.isCreatingNewCategory ? '__NEW__' : faqForm.selectedCategoryId}
                                        onChange={(e) => {
                                            if (e.target.value === '__NEW__') {
                                                setFaqForm(prev => ({ 
                                                    ...prev, 
                                                    isCreatingNewCategory: true, 
                                                    selectedCategoryId: '__NEW__' 
                                                }));
                                            } else {
                                                setFaqForm(prev => ({ 
                                                    ...prev, 
                                                    isCreatingNewCategory: false, 
                                                    selectedCategoryId: e.target.value 
                                                }));
                                            }
                                        }}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground font-bold uppercase tracking-wider focus:border-tatt-lime outline-none cursor-pointer"
                                    >
                                        {faqs.map(c => (
                                            <option key={c.id} value={c.id} className="bg-surface text-foreground font-semibold">
                                                {c.category.replace('_', ' ')}
                                            </option>
                                        ))}
                                        <option value="__NEW__" className="bg-surface text-tatt-lime font-bold">
                                            + Create New Category...
                                        </option>
                                    </select>

                                    {/* Stacked Text Input when creating new category */}
                                    {faqForm.isCreatingNewCategory && (
                                        <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                                            <input 
                                                required
                                                autoFocus
                                                type="text" 
                                                placeholder="ENTER NEW CATEGORY NAME (e.g. BILLING)"
                                                value={faqForm.newCategoryName}
                                                onChange={(e) => setFaqForm({ ...faqForm, newCategoryName: e.target.value })}
                                                className="w-full bg-background border border-tatt-lime/50 rounded-xl px-4 py-3 text-sm text-foreground focus:border-tatt-lime outline-none transition-colors uppercase font-bold tracking-wider"
                                            />
                                            <p className="text-[10px] text-tatt-gray">
                                                {faqs.length === 0 
                                                    ? "No categories exist yet. Enter a category title above."
                                                    : "Enter a title for your new category above. To pick an existing category instead, select it from the dropdown."
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Questions & Answers items */}
                            <div className="space-y-6">
                                {faqForm.items.map((item, index) => (
                                    <div key={index} className="p-5 bg-background/40 rounded-xl border border-border relative space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tatt-lime">
                                                {editingFaq ? 'Question' : `Question #${index + 1}`}
                                            </span>
                                            {!editingFaq && faqForm.items.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="text-tatt-gray hover:text-red-500 transition-colors p-1 cursor-pointer"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <label className="block text-[10px] font-bold tracking-widest uppercase text-tatt-gray mb-2">Question Title</label>
                                            <input 
                                                required
                                                type="text" 
                                                placeholder="e.g. How do I request a membership tier upgrade?"
                                                value={item.question}
                                                onChange={(e) => handleItemChange(index, 'question', e.target.value)}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-tatt-lime outline-none transition-colors"
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
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-tatt-lime outline-none transition-colors resize-y"
                                            ></textarea>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {!editingFaq && (
                                <button 
                                    type="button"
                                    onClick={handleAddItem}
                                    className="w-full py-3 border border-dashed border-border rounded-xl text-tatt-gray hover:text-tatt-lime hover:border-tatt-lime/50 transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Plus size={14} strokeWidth={3} /> Add Another Question
                                </button>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsFaqModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-tatt-gray hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={savingFaq}
                                    className="bg-tatt-lime text-tatt-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                                >
                                    {savingFaq ? 'Publishing...' : 'Publish FAQs'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
