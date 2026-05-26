import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  Share2, 
  Globe, 
  Laptop, 
  Smartphone, 
  Copy, 
  Check, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle, 
  HelpCircle, 
  BookMarked,
  Layers,
  ChevronRight,
  Calculator
} from 'lucide-react';

interface Article {
  id: string;
  category: string;
  title: string;
  slug: string;
  readTime: string;
  summary: string;
  content: React.ReactNode;
  tags: string[];
}

export default function EducationCenter() {
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  
  // SEO simulator state
  const [seoTitle, setSeoTitle] = useState('FinanceForge - Personal Retirement Wealth & RMD Planner');
  const [seoDescription, setSeoDescription] = useState('Secure, client-side portfolio allocations, cash flow projections, and SECURE Act 2.0 RMD tax simulators. Calculate Traditional, SEP, SIMPLE and Roth IRAs safely with zero servers.');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const articles: Article[] = [
    {
      id: "art-1",
      category: "SECURE Act 2.0 Rules",
      title: "The Smart Senior's Guide to SECURE Act 2.0 Distributions",
      slug: "secure-act-dist-guide-73-75",
      readTime: "6 min read",
      tags: ["RMDs", "Tax Penalties", "Spouse Rules"],
      summary: "Understanding the transition from Age 72 to 73 and 75, how joint life spousal exceptions work, and avoiding the dreaded federal tax penalties.",
      content: (
        <div className="space-y-6 text-neutral-700 font-light leading-relaxed">
          <p>
            The regulatory landscape of retirement savings underwent its most seismic shift in a generation with the signing of the <strong>SECURE Act 2.0</strong> in late 2022. Designed to adapt federal tax laws to longer lifespans, the law fundamentally altered when, how, and of what quantity retirees must distribute from their pre-tax wealth assets.
          </p>

          <h4 className="text-sm font-semibold text-neutral-900 mt-6 md:text-base">1. The Shifting RMD Age Timeline</h4>
          <p>
            Your exact starting age for Required Minimum Distributions is strictly contingent upon your legal birth year. Under SECURE Act 2.0 code:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li><strong>If you were born prior to 1951:</strong> Your RMD start age remains <strong>72</strong>.</li>
            <li><strong>If you were born between 1951 and 1959:</strong> Your RMD start age is strictly delayed to <strong>73</strong>.</li>
            <li><strong>If you were born in 1960 or later:</strong> Your starting age moves forward to <strong>75</strong>.</li>
          </ul>
          <p>
            This delay provides two additional years of valuable, uninterrupted taxable compounding growth for seniors in their mid-seventies, allowing investments to generate asset weight before compulsory liquidations trigger tax bracket pushes.
          </p>

          <h4 className="text-sm font-semibold text-neutral-900 mt-6 md:text-base">2. Steep Penalty Reductions of Key IRS Section 4974</h4>
          <p>
            Prior to the passage of SECURE 2.0, failing to satisfy the mandatory distribution calculation for any given tax year resulted in what was widely recognized as the harshest penalty in the entire Internal Revenue Code: a flat <strong>50% excise tax</strong> on the shortfall value.
          </p>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-xs space-y-2 my-4">
            <span className="font-mono text-[9px] uppercase tracking-wider text-amber-800 font-bold block">Tax Code Update</span>
            <p className="text-amber-950 font-normal">
              <strong>Section 302 of the Act</strong> reduced this penalty to <strong>25%</strong> of the outstanding required amount. 
            </p>
            <p className="text-neutral-600 font-light">
              Furthermore, if the error is identified and rectified in a timely manner (by filing IRS Form 5329 within standard correction windows), the penalty is reduced to a modest <strong>10%</strong>. This represents a massive shield for retirees from administrative hiccups.
            </p>
          </div>

          <h4 className="text-sm font-semibold text-neutral-900 mt-6 md:text-base">3. The Joint Life Expectancy Exception</h4>
          <p>
            Typically, lifetime distributions leverage standard IRS Table III (Uniform Lifetime Table), which assumes a single user life model. However, an elegant loophole is preserved: if the client's legal spouse is the <strong>sole primary beneficiary</strong> and is <strong>more than 10 years younger</strong> than the owner, the IRS allows calculations using <strong>Table II (Joint Life and Last Survivor Expectancy)</strong>. 
          </p>
          <p>
            This results in a significantly larger life divisor, reducing the compulsory distribution and protecting the wealth pool from premature taxable exhaustion.
          </p>
        </div>
      )
    },
    {
      id: "art-2",
      category: "Retirement Accounts",
      title: "Decoding the Four-Pronged IRA Ledger: Tradition, SEP, SIMPLE & Roth",
      slug: "decode-traditional-sep-simple-roth",
      readTime: "8 min read",
      tags: ["SEP IRA", "SIMPLE IRA", "Roth", "Contributions"],
      summary: "A deep comparative synthesis of pre-tax and post-tax retirement vehicle constraints, penalty horizons, and distribution mechanics.",
      content: (
        <div className="space-y-6 text-neutral-700 font-light leading-relaxed">
          <p>
            Not all Individual Retirement Accounts (IRAs) are treated equally under the tax code. Navigating the regulatory differences is crucial for maximizing portfolio longevity. Below we dissect the exact mechanics of the four primary vehicles representing standard US retirement ledger weights.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            <div className="bg-neutral-50 p-4 rounded-2xl border space-y-2">
              <strong className="text-neutral-900 block text-xs">Traditional Ira (Individual)</strong>
              <p className="text-[11px] text-neutral-500 font-light">
                Funded with pre-tax income, reducing modern-day Adjusted Gross Income (AGI). Compound growth is completely deferred, but 100% of future withdrawals are taxed as ordinary federal income. Mandatory RMDs start at Age 73/75.
              </p>
            </div>
            <div className="bg-neutral-50 p-4 rounded-2xl border space-y-2">
              <strong className="text-neutral-900 block text-xs">SEP IRA (Simplified Employee Pension)</strong>
              <p className="text-[11px] text-neutral-500 font-light">
                Utilized heavily by self-employed independent contractors and business owners. Contribution capacity is significantly higher (up to 25% of net trade income). Subject to the same standard RMD age bounds and timelines as Traditional IRAs.
              </p>
            </div>
            <div className="bg-neutral-50 p-4 rounded-2xl border space-y-2">
              <strong className="text-neutral-900 block text-xs">SIMPLE IRA (Savings Incentive Match)</strong>
              <p className="text-[11px] text-neutral-500 font-light">
                Tailored for small business workplaces. Employees make salary deductions with mandatory employer matching. <strong>Crucial Trap:</strong> Early withdrawals taken in the first 2 years of starting participation carry a punitive <strong>25% tax surcharge</strong> rather than the standard 10%.
              </p>
            </div>
            <div className="bg-neutral-50 p-4 rounded-2xl border space-y-2">
              <strong className="text-neutral-900 block text-xs">Roth IRA (Tax-Free Haven)</strong>
              <p className="text-[11px] text-neutral-500 font-light">
                Funded completely under post-tax capital. Yields bulletproof tax-free withdrawable interest after age 59½. <strong>Core Benefit:</strong> Original account owners are 100% exempt from lifetime RMDs.
              </p>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-neutral-900 mt-6 md:text-base">Roth Beneficiary Death Exceptions</h4>
          <p>
            While original owners are entirely exempt from lifetime distributions on Roth IRAs, if a non-spouse beneficiary inherits a Roth IRA, they correspond to the strict SECURE Act <strong>10-Year Empty Rule</strong>. Although they do not have to make annual distributions in years 1-9, the account must be entirely zeroed out by the end of December following the 10th anniversary of the original owner's death. Fortunately, all distributions remain 100% tax-free.
          </p>
        </div>
      )
    },
    {
      id: "art-3",
      category: "Stochastic Methods",
      title: "Why Fixed Linear Growth Rates Lie: The Math Behind Monte Carlo Sims",
      slug: "stochastic-math-linear-fails",
      readTime: "7 min read",
      tags: ["Monte Carlo", "Risk Testing", "Probability"],
      summary: "Why predicting retirement balances at a static 6% or 8% yearly rate can result in premature insolvency, and how stochastic trials save portfolios.",
      content: (
        <div className="space-y-6 text-neutral-700 font-light leading-relaxed">
          <p>
            When financial tools project retirement plans, they commonly ask users to type an assumed portfolio annual rate of return—for example, "6%". The software then compiles the forecast linearly, adding exactly 6% every individual year. 
          </p>
          <p>
            In mathematical theory, this is neat and predictable. In genuine historical market reality, <strong>linear projections are a dangerous delusion</strong> that can result in localized insolvency.
          </p>

          <h4 className="text-sm font-semibold text-neutral-900 mt-6 md:text-base">1. The Menace of Sequence of Returns Risk (SRR)</h4>
          <p>
            If a portfolio returns average 6% compounded over 25 years, but suffers deep recessions (-15%, -8%) during the <strong>very first 3 years of retirement</strong>, the permanent capital damage is massive. Why? Because the retiree is simultaneously selling down depreciating assets to fund their living expenses. 
          </p>
          <p>
            Once capital is liquidated at market lows, it can never compound to participate in subsequent bull markets, even if the math "averages out" to 6% in the long run.
          </p>

          <h4 className="text-sm font-semibold text-neutral-900 mt-6 md:text-base">2. How Stochastic Modeling Solves the Blind Spots</h4>
          <p>
            Instead of pretending the future is a highway, <strong>Monte Carlo simulations ran in our sandboxed comparison engine</strong> run 10,000 distinct randomized trials. 
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li><strong>Standard Deviation Mapping:</strong> We define not just an average return, but standard deviations (volatility variables equivalent to stock and bond indices).</li>
            <li><strong>Probability Distribution:</strong> Out of 10,000 paths, we record exactly which percentage failed (ran out of cash) or flourished.</li>
            <li><strong>Stress-Testing:</strong> This reveals your "Probability of Success"—providing a highly realistic safety cushion.</li>
          </ul>
          <p>
            By shifting from linear spreadsheets to stochastic risk models, retirees can secure a buffer against unpredictable bear markets.
          </p>
        </div>
      )
    }
  ];

  const filteredArticles = articles.filter(art => 
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const headTagCode = `<!-- Copy and paste inside the <head> tag of your index.html file -->
<title>${seoTitle}</title>
<meta name="description" content="${seoDescription}" />

<!-- OpenGraph Metadata (LinkedIn / Twitter Preview Support) -->
<meta property="og:title" content="${seoTitle}" />
<meta property="og:description" content="${seoDescription}" />
<meta property="_og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(headTagCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-slide-in" id="education-seo-center-view">
      
      {/* Upper Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="bg-neutral-900 text-white font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-semibold">
              SEO & Authority Module
            </span>
            <span className="text-xs text-neutral-400 font-mono">• Financial Education Library</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight font-sans">
            Tax Authority Library & SEO Optimization
          </h2>
          <p className="text-neutral-500 text-xs font-light leading-relaxed">
            Boost authority with search-optimized articles outlining SECURE Act 2.0 and IRA constraints. Leverage our SERP Preview Simulator to audit meta tag formats before deploying to production.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Interactive Blog/Articles Directory */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-6">
            
            {/* Search and Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-neutral-700" />
                  <span>Authority Publications Directory</span>
                </h3>
                <p className="text-[11px] text-neutral-450 font-light">Interactive resource material for financial advisory SEO indexing.</p>
              </div>

              {/* Quick Search */}
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="text"
                  placeholder="Filter articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-1.5 focus:outline-hidden font-medium text-xs text-neutral-800"
                />
              </div>
            </div>

            {/* Catalog Grid */}
            <AnimatePresence mode="popLayout">
              {activeArticleId === null ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {filteredArticles.length === 0 ? (
                    <div className="text-center py-10 text-neutral-400">
                      <HelpCircle className="w-8 h-8 mx-auto stroke-1 mb-2 text-neutral-350" />
                      <p className="text-xs">No educational publications match your filter query.</p>
                    </div>
                  ) : (
                    filteredArticles.map(art => (
                      <div 
                        key={art.id}
                        onClick={() => setActiveArticleId(art.id)}
                        className="bg-neutral-50 hover:bg-neutral-100/60 p-5 rounded-2xl border border-neutral-200/50 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
                      >
                        <div className="space-y-2 max-w-lg">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-mono font-bold text-neutral-500 tracking-wider uppercase">
                              {art.category}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">• {art.readTime}</span>
                          </div>
                          <h4 className="text-sm font-bold text-neutral-900 group-hover:text-indigo-650 transition-colors">
                            {art.title}
                          </h4>
                          <p className="text-[11px] text-neutral-500 font-light leading-relaxed">
                            {art.summary}
                          </p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {art.tags.map(t => (
                              <span key={t} className="bg-white border rounded px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600 font-mono">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex-shrink-0 self-start sm:self-center bg-white p-2 rounded-xl border border-neutral-200 hover:border-neutral-300 transition-colors">
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              ) : (
                // Article Detail Reader
                (() => {
                  const art = articles.find(a => a.id === activeArticleId)!;
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      className="space-y-6"
                    >
                      {/* Back handle navigation */}
                      <button 
                        type="button"
                        onClick={() => setActiveArticleId(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border hover:bg-neutral-50 rounded-xl text-neutral-600 text-xs font-semibold cursor-pointer transition-all"
                      >
                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        <span>Back to Directory</span>
                      </button>

                      <div className="space-y-3 border-b border-neutral-100 pb-5">
                        <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-mono uppercase tracking-wider">
                          <span>{art.category}</span>
                          <span>•</span>
                          <span>{art.readTime}</span>
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 tracking-tight font-sans">
                          {art.title}
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {art.tags.map(t => (
                            <span key={t} className="bg-neutral-100/65 px-2 py-0.5 rounded text-[10px] text-neutral-600 font-mono">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Display Markdown parsed or customized React elements */}
                      <div className="prose prose-sm max-w-none text-neutral-700">
                        {art.content}
                      </div>

                      {/* Summary Key take-aways visual */}
                      <div className="bg-neutral-900 text-white rounded-3xl p-5 border border-neutral-800 space-y-3">
                        <h5 className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-bold flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Advisory Takeaways</span>
                        </h5>
                        <ul className="space-y-2 text-xs font-light text-neutral-300">
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>Verify SECURE Act 2.0 age rules based on exact birth years before logging mandatory checkouts.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>Traditional, SEP, and SIMPLE IRAs share compulsory starting points; Roth IRAs are original holder exempt.</span>
                          </li>
                        </ul>
                      </div>
                    </motion.div>
                  );
                })()
              )}
            </AnimatePresence>

          </div>

          {/* Cloudflare Pages / GitHub Pages Instructions Checklist */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-xs font-mono uppercase text-neutral-400 tracking-widest font-bold">
              Deployment Architecture (Cloudflare & GitHub)
            </h3>
            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              FinanceForge is compiled completely as a <strong>Client-Side SPA (TypeScript/React)</strong>. This means you do not need active Express database containers. You can host it completely 100% free with limitless scale.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-neutral-50 border rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-neutral-900 text-white font-mono text-[10px] rounded-full flex items-center justify-center font-bold">1</span>
                  <strong className="text-xs text-neutral-800">GitHub Pages Route</strong>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed font-light">
                  Push your repository connection online. Under settings, toggle GitHub Pages source to <em>GitHub Actions</em>. It will build and serve your static <code>dist/</code> folder globally in seconds under HTTPS.
                </p>
              </div>

              <div className="p-4 bg-neutral-50 border rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-neutral-900 text-white font-mono text-[10px] rounded-full flex items-center justify-center font-bold">2</span>
                  <strong className="text-xs text-neutral-800">Cloudflare Pages</strong>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed font-light">
                  Simply connect your repository. Choose <strong>Vite</strong> as the framework preset, set build script to <code>npm run build</code>, directory to <code>dist</code>, and assign a custom domain.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: SEO SandboxSERP Simulator */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-5">
            <div className="space-y-1">
              <h3 className="text-xs font-mono uppercase text-neutral-400 tracking-widest font-bold">
                Google SERP Simulator
              </h3>
              <p className="text-[11px] text-neutral-500 font-light">See and optimize how your app would render in organic Google search listings.</p>
            </div>

            {/* Title / Description Editors */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider font-mono">Page Meta Title</label>
                <input 
                  type="text"
                  maxLength={70}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full bg-neutral-50 border rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 focus:outline-hidden"
                />
                <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                  <span>Recomm: 50-60 chars</span>
                  <span className={seoTitle.length > 60 ? 'text-amber-600 font-bold' : ''}>
                    {seoTitle.length} characters
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider font-mono">Meta Description Snippet</label>
                <textarea 
                  rows={3}
                  maxLength={160}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className="w-full bg-neutral-50 border rounded-xl px-3 py-2 text-xs font-light text-neutral-800 focus:outline-hidden resize-none leading-relaxed"
                />
                <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                  <span>Recomm: 120-153 chars</span>
                  <span className={seoDescription.length > 153 ? 'text-amber-600 font-bold' : ''}>
                    {seoDescription.length} characters
                  </span>
                </div>
              </div>
            </div>

            {/* Toggle Simulator Device */}
            <div className="flex items-center gap-2 border-t pt-4">
              <button 
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] uppercase font-mono font-bold cursor-pointer transition-colors ${
                  previewDevice === 'desktop' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-neutral-50 text-neutral-500'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button 
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] uppercase font-mono font-bold cursor-pointer transition-colors ${
                  previewDevice === 'mobile' ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-neutral-50 text-neutral-500'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>

            {/* Simulated Google Listing Card */}
            <div className="bg-neutral-100 rounded-2xl p-4 border space-y-1.5 select-none overflow-hidden max-w-full">
              {previewDevice === 'desktop' ? (
                // Google Desktop View
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-light truncate">
                    <span className="bg-neutral-250 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold border shrink-0">F</span>
                    <span className="truncate">https://financeforge.app</span>
                    <span>›</span>
                    <span className="truncate">tax-planner</span>
                  </div>
                  <h4 className="text-sm font-semibold text-blue-800 hover:underline cursor-pointer leading-tight line-clamp-1">
                    {seoTitle}
                  </h4>
                  <p className="text-[11px] text-neutral-600 font-light leading-snug line-clamp-3">
                    <span className="text-neutral-400 font-mono text-[10px]">{new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})} — </span>
                    {seoDescription || "Please provide a meta description metadata payload."}
                  </p>
                </div>
              ) : (
                // Google Mobile View
                <div className="space-y-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs font-light text-neutral-600 shrink-0">
                    <div className="w-5 h-5 bg-neutral-200 rounded-full flex items-center justify-center font-bold text-[9px]">F</div>
                    <div className="flex flex-col text-[10px] leading-tight">
                      <span className="font-semibold text-neutral-800">FinanceForge</span>
                      <span className="text-neutral-400 text-[9px]">https://financeforge.app</span>
                    </div>
                  </div>
                  <h4 className="text-[13px] font-semibold text-blue-800 hover:underline cursor-pointer leading-tight line-clamp-2 pt-1">
                    {seoTitle}
                  </h4>
                  <p className="text-[11px] text-neutral-600 font-light leading-snug line-clamp-3">
                    {seoDescription || "Please provide a meta description metadata payload."}
                  </p>
                </div>
              )}
            </div>

            {/* Generated Code Snippet Card */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-neutral-400 font-semibold tracking-wider">Export Head Tags</span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="text-[10px] text-neutral-600 hover:text-black font-semibold flex items-center gap-1 font-mono hover:underline cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>COPY CODE</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-neutral-900 rounded-xl p-3 text-[10.5px] font-mono text-neutral-350 leading-relaxed border overflow-x-auto max-h-40 whitespace-pre">
                {headTagCode}
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
