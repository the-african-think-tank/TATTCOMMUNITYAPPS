"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";
import { Menu, X, ArrowRight } from "lucide-react";
import { TATTLogo } from "../atoms/logo";

export function Navbar() {
    const { isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinks = [
        { label: "TATT Business Directory", href: "/business-directory" },
        { label: "Volunteer", href: isAuthenticated ? "/dashboard/volunteers" : "/volunteer" },
    ];

    return (
        <>
            <header className="sticky top-0 z-50 bg-tatt-black">
                <div className="flex items-center justify-between px-4 lg:px-20 py-4 max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                        <Link href="/" className="flex items-center gap-2 lg:gap-3 group">
                            <TATTLogo/>
                        </Link>
                    </div>

                    <nav className="flex items-center gap-2 lg:gap-8">
                        <div className="hidden xl:flex items-center gap-8 mr-4">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
                                return (
                                    <Link 
                                        key={link.href}
                                        href={link.href}
                                        className={`text-[10px] font-black uppercase tracking-widest transition-all relative py-1 ${
                                            isActive 
                                                ? "text-tatt-lime hover:text-tatt-lime/80" 
                                                : "text-white hover:text-tatt-lime"
                                        }`}
                                    >
                                        {link.label}
                                        {isActive && (
                                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-tatt-lime"></span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2">


                            <div className="hidden md:block h-6 w-px bg-white/10 mx-2"></div>

                            <div className="hidden md:flex items-center gap-6">
                                {isAuthenticated ? (
                                    <button
                                        onClick={logout}
                                        className="bg-tatt-lime text-tatt-black px-6 py-2 rounded-lg text-[10px] font-black shadow-sm hover:brightness-110 transition-all uppercase tracking-widest"
                                    >
                                        Log Out
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-6">
                                        <Link 
                                            href="/" 
                                            className="text-[10px] font-black text-white hover:text-tatt-lime transition-colors uppercase tracking-widest"
                                        >
                                            Log In
                                        </Link>
                                        <button
                                            onClick={() => router.push("/signup")}
                                            className="bg-tatt-lime text-tatt-black px-6 py-2 rounded-lg text-[10px] font-black shadow-sm hover:brightness-110 transition-all uppercase tracking-widest"
                                        >
                                            Join community
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="xl:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                            >
                                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Mobile Navigation Sidebar & Overlay */}
            <div className={`fixed inset-0 z-[100] xl:hidden transition-all duration-300 ${isMenuOpen ? "visible" : "invisible"}`}>
                <div 
                    className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
                    onClick={() => setIsMenuOpen(false)}
                />
                
                <div className={`absolute inset-y-0 left-0 w-[85%] max-w-xs bg-tatt-black border-r border-white/10 flex flex-col transition-transform duration-300 ease-out ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <TATTLogo/>
                        </div>
                        <button 
                            onClick={() => setIsMenuOpen(false)}
                            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto py-10 px-6 space-y-8">
                        <div className="space-y-6">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Menu</p>
                            <div className="flex flex-col gap-6">
                                {navLinks.map((link) => (
                                    <Link 
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="text-2xl font-black text-white hover:text-tatt-lime transition-colors flex items-center justify-between group"
                                    >
                                        {link.label}
                                        <ArrowRight size={20} className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-tatt-lime" />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/10 space-y-6">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Account</p>
                            {isAuthenticated ? (
                                <div className="space-y-4">
                                    <Link 
                                        href="/dashboard"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="block w-full text-center py-4 bg-white text-tatt-black rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform"
                                    >
                                        Dashboard
                                    </Link>
                                    <button 
                                        onClick={() => { logout(); setIsMenuOpen(false); }}
                                        className="w-full text-center py-2 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-red-400"
                                    >
                                        Log Out
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <Link 
                                        href="/signup"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="block w-full text-center py-4 bg-tatt-lime text-tatt-black rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-tatt-lime/10 hover:scale-[1.02] transition-transform"
                                    >
                                        Join community
                                    </Link>
                                    <Link 
                                        href="/" 
                                        onClick={() => setIsMenuOpen(false)}
                                        className="block w-full text-center py-3 text-white hover:text-tatt-lime transition-colors text-xs font-black uppercase tracking-[0.1em]"
                                    >
                                        Log In
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-8 border-t border-white/10 bg-white/[0.02]">
                        <p className="text-[10px] text-white/30 font-medium text-center italic leading-relaxed">
                            Empowering the African Diaspora through strategic collaboration.
                        </p>
                    </div>
                </div>
            </div>


        </>
    );
}
