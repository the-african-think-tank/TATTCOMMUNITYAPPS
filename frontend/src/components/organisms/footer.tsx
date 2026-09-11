"use client";

import React from "react";
import Link from "next/link";

import { Linkedin, Facebook, Instagram } from "lucide-react";
import { useTermsModal } from "@/context/terms-context";
import { TATTLogo } from "../atoms/logo";


const LOGO_ICON_SRC = "/assets/tattlogoIcon.svg";

export function Footer() {
    const { showTerms } = useTermsModal();

    return (
        <footer className="bg-tatt-black text-white py-12 md:py-16 px-6 sm:px-10 lg:px-20">
            {/* Top Section: Multi-column Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 mb-16 text-center md:text-left">

                {/* Column 1: Branding - Full width on mobile/tablet */}
                <div className="col-span-2 md:col-span-1 lg:col-span-1 space-y-4 flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-4">
                    </div>
                </div>

                {/* Column 2: Contact - Full width on mobile/tablet */}
                <div className="col-span-2 md:col-span-1 lg:col-span-1 space-y-4">
                    <h4 className="text-lg font-bold border-b border-tatt-lime pb-2 inline-block">The African Think Tank</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p>Dallas-Fort Worth, Texas, USA</p>
                        <p>
                            Email:{" "}
                            <a href="mailto:info@theafricanthinktank.com" className="text-tatt-lime hover:underline">
                                info@theafricanthinktank.com
                            </a>
                        </p>
                    </div>
                </div>

                {/* Column 3: Navigation - Side-by-side on mobile */}
                <div className="col-span-1 md:col-span-1 lg:col-span-1 space-y-4">
                    <h4 className="text-lg font-bold border-b border-tatt-lime pb-2 inline-block">Quick Links</h4>
                    <nav className="flex flex-col space-y-2 text-sm">
                        <a href="https://www.theafricanthinktank.com/home" target="_blank" rel="noopener noreferrer" className="text-tatt-lime hover:text-white transition">Home</a>
                        <a href="https://www.theafricanthinktank.com/about" target="_blank" rel="noopener noreferrer" className="text-tatt-lime hover:text-white transition">About</a>
                        <a href="https://www.theafricanthinktank.com/our-programs" target="_blank" rel="noopener noreferrer" className="text-tatt-lime hover:text-white transition">Our Programs</a>
                        <a href="https://www.theafricanthinktank.com/contact-us" target="_blank" rel="noopener noreferrer" className="text-tatt-lime hover:text-white transition">Contact Us</a>
                        <a href="https://docs.google.com/forms/d/e/1FAIpQLSdmpcWaHGtDCxo_5-_kIJLPGboP2W-uxaRLCFNF08LrHAjj1Q/viewform?usp=sf_link" target="_blank" rel="noopener noreferrer" className="text-tatt-lime hover:text-white transition">Volunteer with US</a>
                    </nav>
                </div>

                {/* Column 4: Socials - Side-by-side on mobile */}
                <div className="col-span-1 md:col-span-1 lg:col-span-1 space-y-4">
                    <h4 className="text-lg font-bold border-b border-tatt-lime pb-2 inline-block">Follow Us</h4>
                    <div className="flex flex-col space-y-2 text-sm">
                        <a href="https://instagram.com/theafricanthinktank?igshid=NGVhN2U2NjQ0Yg%3D%3D" target="_blank" rel="noopener noreferrer" className="text-tatt-lime hover:text-white transition">Instagram</a>
                        <a href="https://www.linkedin.com/company/the-african-think-tank/" target="_blank" rel="noopener noreferrer" className="text-tatt-lime hover:text-white transition">LinkedIn</a>
                        <a href="https://www.facebook.com/theafrthinktank" target="_blank" rel="noopener noreferrer" className="text-tatt-lime hover:text-white transition">Facebook</a>
                    </div>
                    <div className="flex gap-4 mt-4 justify-center md:justify-start">
                        {/* Social Icons */}
                        <a
                            href="https://www.linkedin.com/company/the-african-think-tank/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 w-10 bg-white flex items-center justify-center rounded transition hover:bg-tatt-lime group"
                            aria-label="LinkedIn"
                        >
                            <Linkedin className="h-5 w-5 text-tatt-black group-hover:text-tatt-white" />
                        </a>
                        <a
                            href="https://www.facebook.com/theafrthinktank"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 w-10 bg-white flex items-center justify-center rounded transition hover:bg-tatt-lime group"
                            aria-label="Facebook"
                        >
                            <Facebook className="h-5 w-5 text-tatt-black group-hover:text-tatt-white" />
                        </a>
                        <a
                            href="https://instagram.com/theafricanthinktank?igshid=NGVhN2U2NjQ0Yg%3D%3D"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-10 w-10 bg-white flex items-center justify-center rounded transition hover:bg-tatt-lime group"
                            aria-label="Instagram"
                        >
                            <Instagram className="h-5 w-5 text-tatt-black group-hover:text-tatt-white" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Middle Section: Newsletter */}
            <div className="max-w-4xl mx-auto border-t border-gray-800 pt-16 pb-16 text-center">
                <h3 className="text-2xl font-black mb-8 text-tatt-white">Join Our Newsletter</h3>
                <form className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4" onSubmit={(e) => e.preventDefault()}>
                    <input
                        type="text"
                        placeholder="First Name"
                        className="h-12 px-4 rounded bg-gray-100 text-tatt-black text-sm focus:outline-none focus:ring-2 focus:ring-tatt-yellow"
                    />
                    <input
                        type="text"
                        placeholder="Last Name"
                        className="h-12 px-4 rounded bg-gray-100 text-tatt-black text-sm focus:outline-none focus:ring-2 focus:ring-tatt-yellow"
                    />
                    <input
                        type="email"
                        placeholder="Email Address"
                        className="h-12 px-4 rounded bg-gray-100 text-tatt-black text-sm focus:outline-none focus:ring-2 focus:ring-tatt-yellow"
                    />
                    <button
                        type="submit"
                        className="h-12 rounded bg-tatt-yellow text-tatt-black font-bold text-sm tracking-widest hover:brightness-95 transition"
                    >
                        SUBSCRIBE
                    </button>
                </form>
            </div>

            {/* Bottom Section: Copyright & Legal */}
            <div className="max-w-7xl mx-auto border-t border-gray-800 pt-10 text-center space-y-4">
                <p className="text-gray-400 text-sm">©2025 The African Think Tank. All rights reserved.</p>
                <p className="text-sm font-light text-white/70 italic px-4">
                    Empowering the African Diaspora through Culture, Connection, and Community.
                </p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
                    <a href="https://www.theafricanthinktank.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-tatt-lime hover:underline">Privacy Policy</a>
                    <span className="text-gray-700 hidden sm:inline">|</span>
                    <button onClick={showTerms} className="text-tatt-lime hover:underline">Terms & Conditions</button>
                    <span className="text-gray-700 hidden sm:inline">|</span>
                    <a href="https://www.dohtechsolutions.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors">
                        Developed and maintained by DOHTECH SOLUTIONS
                    </a>
                </div>
            </div>
        </footer>
    );
}
