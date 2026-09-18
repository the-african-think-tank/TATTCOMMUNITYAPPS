"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  ExternalLink, 
  Lock, 
  ShieldCheck, 
  Handshake, 
  ChevronRight,
  Info,
  CheckCircle2,
  Ticket,
  Clock,
  Box,
  TrendingUp,
  CreditCard,
  Target
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/auth-context";

export default function PartnershipDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [partnership, setPartnership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await api.get(`/partnerships/${id}`);
        setPartnership(data);
      } catch (err: any) {
        console.error("Failed to load partnership:", err);
        setError("Partnership not found or you don't have access.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tatt-lime"></div>
      </div>
    );
  }

  if (error || !partnership) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-20">
        <div className="bg-surface p-8 rounded-2xl border border-border shadow-sm">
          <Info className="h-12 w-12 text-tatt-gray mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-tatt-gray mb-6">{error || "Could not load partnership details."}</p>
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 bg-tatt-black text-white rounded-lg font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isLocked = partnership.isLocked;
  const userTier = user?.communityTier || "FREE";
  
  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Dynamic Navigation Header */}
      <nav className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-background rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-black text-lg tracking-tight">TATT Partner Network</span>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12 space-y-8">
        
        {/* Banner Hero Section */}
        <section className="relative overflow-hidden rounded-[2rem] bg-tatt-black text-white p-6 md:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-l from-tatt-lime to-transparent" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
              <div className="size-24 md:size-32 bg-white rounded-2xl flex items-center justify-center p-4 shadow-xl shrink-0 border-4 border-tatt-lime/20">
                {partnership.logoUrl ? (
                  <img src={partnership.logoUrl} alt={partnership.name} className="size-full object-contain" />
                ) : (
                  <Handshake className="size-12 text-tatt-gray" />
                )}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="bg-tatt-lime text-tatt-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-opacity-90">
                    Verified Partner
                  </span>
                  {!isLocked && (
                    <span className="bg-tatt-green-deep text-tatt-lime text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 border border-tatt-lime/20">
                      <ShieldCheck size={12} /> Active for {userTier}
                    </span>
                  )}
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                  {partnership.name}
                </h1>
                <p className="text-tatt-gray-light text-lg font-medium flex items-center justify-center md:justify-start gap-2 italic">
                   {partnership.category} Infrastructure Group
                </p>
              </div>
            </div>
            
            <div className="flex justify-center shrink-0">
               <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm text-center">
                  <p className="text-xs font-black text-tatt-lime uppercase mb-1">Benefit Type</p>
                  <p className="text-2xl font-black">{partnership.category}</p>
               </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Bento Perk Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="md:col-span-2 relative bg-tatt-lime rounded-[2rem] p-8 md:p-12 overflow-hidden shadow-xl group">
                  <div className="absolute -right-20 -top-20 size-64 bg-tatt-lime-vibrant rounded-full blur-[80px] opacity-40 transition-transform group-hover:scale-110" />
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <Target className="text-tatt-green-deep h-6 w-6" />
                       <span className="text-xs font-black uppercase tracking-[0.2em] text-tatt-green-deep/70">Membership Benefit</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-tatt-green-deep leading-tight max-w-2xl">
                       {partnership.description || "Exclusive Member Access"}
                    </h2>
                  </div>
               </div>

               {/* Offer Breakdown Box */}
               <div className="bg-surface rounded-3xl p-8 border border-border shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                     <Box className="text-tatt-lime h-6 w-6" />
                     <h3 className="font-black text-xl text-foreground italic">Redemption Eligibility</h3>
                  </div>
                  <ul className="space-y-5">
                    <li className="flex items-start gap-4">
                      <CheckCircle2 className="h-5 w-5 text-tatt-lime shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-base leading-tight">Minimum Level</p>
                        <p className="text-sm text-tatt-gray font-medium mt-1">Available to {partnership.tierAccess?.join(", ")} tiers.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <CheckCircle2 className="h-5 w-5 text-tatt-lime shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-base leading-tight">Priority Activation</p>
                        <p className="text-sm text-tatt-gray font-medium mt-1">Immediate access upon verification of membership status.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <CheckCircle2 className="h-5 w-5 text-tatt-lime shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-base leading-tight">Documentation</p>
                        <p className="text-sm text-tatt-gray font-medium mt-1">TATT-U Digital ID may be requested during {partnership.buttonLabel || "redemption"}.</p>
                      </div>
                    </li>
                  </ul>
               </div>

               {/* Quota Insights Box */}
               {/* Quota Insights Box */}
               <div className="bg-surface rounded-3xl p-8 border border-border shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                       <TrendingUp className="text-tatt-lime h-6 w-6" />
                       <h3 className="font-black text-xl text-foreground italic">Resource Quota</h3>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-black text-tatt-gray uppercase tracking-widest">Allowance for {userTier}</p>
                      <p className="text-4xl font-black text-foreground">
                        {partnership.currentTierQuota === 0 ? "∞" : partnership.currentTierQuota}
                        <span className="text-base font-bold text-tatt-gray ml-2">Available</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                     <div className="w-full bg-background h-3 rounded-full overflow-hidden">
                        <div className="bg-tatt-lime h-full w-[20%] rounded-full shadow-[0_0_10px_rgba(159,204,0,0.5)]" />
                     </div>
                     <div className="flex items-center gap-2 text-xs font-bold text-tatt-gray italic uppercase tracking-wider">
                        <Clock className="size-3" />
                        Next reset {partnership.quotaReset === 'ANNUAL' ? 'Yearly' : 'Monthly'} cycle
                     </div>
                  </div>
               </div>

               {/* Value Proposition Box */}
               {partnership.fullPrice > 0 && partnership.discountedPrice > 0 && (
                  <div className="bg-tatt-black rounded-3xl p-8 border border-white/10 shadow-xl flex flex-col justify-between group overflow-hidden relative min-h-[300px]">
                    <div className="absolute -right-10 -top-10 size-40 bg-tatt-lime-vibrant opacity-5 blur-[60px]" />
                    <div>
                      <div className="flex items-center gap-3 mb-8">
                         <div className="size-10 rounded-xl bg-tatt-lime/10 flex items-center justify-center">
                            <TrendingUp className="text-tatt-lime h-6 w-6" />
                         </div>
                         <h3 className="font-black text-xl text-white italic tracking-tight uppercase">Value Gain</h3>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Public Retail Rate</span>
                          <span className="text-xl font-black text-white/50 line-through decoration-tatt-lime/40 decoration-2">${partnership.fullPrice}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-tatt-lime uppercase tracking-widest">Member Advantage</span>
                          <div className="flex flex-col items-end">
                             <span className="text-4xl font-black text-tatt-lime tracking-tighter">${partnership.discountedPrice}</span>
                             <span className="text-[10px] font-bold text-tatt-gray-light italic">TATT Exclusive</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 bg-tatt-lime border border-tatt-lime/20 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(159,204,0,0.2)]">
                       <span className="text-[10px] font-black text-tatt-black uppercase tracking-widest">Immediate Savings</span>
                       <span className="text-2xl font-black text-tatt-black">+ ${(partnership.fullPrice - partnership.discountedPrice).toFixed(2)}</span>
                    </div>
                  </div>
               )}
            </div>

            {/* Redemption Steps Section */}
            <section className="bg-surface rounded-[2rem] p-8 md:p-12 border border-border shadow-sm">
                <h3 className="text-3xl font-black text-foreground mb-10 tracking-tight italic flex items-center gap-4">
                  <Ticket className="text-tatt-lime" />
                  How to Redeem
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                   {/* Step 1 */}
                   <div className="space-y-4 relative">
                      <div className="size-14 rounded-2xl bg-tatt-black text-tatt-lime flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-background">1</div>
                      <h4 className="font-black text-lg">Identity Check</h4>
                      <p className="text-sm text-tatt-gray font-medium leading-relaxed">Ensure your profile is complete with your TATT-U Member ID verified.</p>
                      <div className="hidden md:block absolute top-7 left-14 w-full h-[2px] bg-border -z-10" />
                   </div>
                   
                   {/* Step 2 */}
                   <div className="space-y-4 relative">
                      <div className="size-14 rounded-2xl bg-tatt-black text-tatt-lime flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-background">2</div>
                      <h4 className="font-black text-lg">Partner Portal</h4>
                      <p className="text-sm text-tatt-gray font-medium leading-relaxed">Head to the partner's internal application or website using the link below.</p>
                      <div className="hidden md:block absolute top-7 left-14 w-full h-[2px] bg-border -z-10" />
                   </div>

                   {/* Step 3 */}
                   <div className="space-y-4">
                      <div className="size-14 rounded-2xl bg-tatt-black text-tatt-lime flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-background">3</div>
                      <h4 className="font-black text-lg">Apply Benefit</h4>
                      <p className="text-sm text-tatt-gray font-medium leading-relaxed">Apply your TATT-U credentials at checkout to unlock your exclusive network pricing.</p>
                   </div>
                </div>

                {isLocked ? (
                  <Link 
                    href="/dashboard/upgrade"
                    className="mt-12 w-full bg-tatt-black text-white h-20 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 hover:scale-[1.01] active:scale-95 transition-all shadow-2xl"
                  >
                    <Lock size={28} className="text-tatt-lime" />
                    UPGRADE TO UNLOCK
                  </Link>
                ) : (
                  <a 
                    href={partnership.redemptionLink}
                    target="_blank"
                    className="mt-12 w-full bg-tatt-lime text-tatt-black h-20 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 hover:brightness-105 hover:scale-[1.01] active:scale-95 transition-all shadow-[0_20px_40px_-15px_rgba(159,204,0,0.5)]"
                  >
                    <Handshake size={28} />
                    REDEEM NOW
                  </a>
                )}
            </section>

          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Benefits Sidebar */}
            <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <h4 className="font-black text-lg italic">Network Perks</h4>
                  <Link href="/dashboard/resources" className="text-[10px] font-black text-tatt-lime uppercase tracking-widest hover:underline">View Hub</Link>
               </div>

               <div className="space-y-4">
                  <BenefitCard 
                    icon={<CreditCard className="size-5" />} 
                    title="Priority Support"
                    desc="Dedicated partner account manager."
                    color="bg-tatt-lime/10 text-tatt-lime"
                  />
                  <BenefitCard 
                    icon={<Box className="size-5" />} 
                    title="Extended Licenses"
                    desc="Exclusive tiers for TATT entities."
                    color="bg-foreground text-background"
                  />
                  <BenefitCard 
                    icon={<TrendingUp className="size-5" />} 
                    title="Volume Scaling"
                    desc="Unlock better rates as you grow."
                    color="bg-tatt-lime-light text-tatt-green-deep"
                  />
               </div>
            </div>



          </div>
        </div>
      </main>
    </div>
  );
}

function BenefitCard({ icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) {
  return (
    <div className="group flex items-center gap-4 p-4 rounded-2xl bg-background/50 hover:bg-background transition-colors cursor-default border border-transparent hover:border-border">
      <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
         <h5 className="font-black text-sm text-foreground italic truncate">{title}</h5>
         <p className="text-[11px] text-tatt-gray font-medium leading-tight">{desc}</p>
      </div>
      <ChevronRight className="size-4 text-tatt-gray group-hover:text-tatt-lime transition-colors" />
    </div>
  )
}
