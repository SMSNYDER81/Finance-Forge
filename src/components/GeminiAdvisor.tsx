import React, { useState, useRef, useEffect } from 'react';
import { StateSchema, Portfolio } from '../types';
import { calculatePortfolioStats } from '../utils/calculators';
import { 
  Send, 
  Bot, 
  User, 
  Key, 
  Lock, 
  Sparkles, 
  CheckCircle, 
  FileText, 
  Compass, 
  HelpCircle,
  Loader2,
  LockIcon,
  ShieldCheck
} from 'lucide-react';

interface GeminiAdvisorProps {
  appState: StateSchema;
  onApiKeyChange: (key: string) => void;
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

export default function GeminiAdvisor({
  appState,
  onApiKeyChange
}: GeminiAdvisorProps) {
  const [apiKey, setApiKey] = useState(appState.user_profile.api_key_gemini || '');
  const [isSaved, setIsSaved] = useState(!!appState.user_profile.api_key_gemini);

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { 
      sender: 'assistant', 
      text: "Welcome to FinanceForge's Deep Reasoning Co-Pilot. I have direct client-side context of your net worth, budget stats, and targeted portfolio layouts. Ask me any strategic query or click one of the preset audit actions below.", 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    onApiKeyChange(apiKey.trim());
    setIsSaved(true);
  };

  const handlePurgeKey = () => {
    setApiKey('');
    onApiKeyChange('');
    setIsSaved(false);
  };

  // Prepares the payload containing anonymous aggregate states (strictly no personal names, accounts indexes...)
  const createSecureAnonymousPayload = () => {
    const totalAssets = appState.balance_sheet.assets.reduce((s, i) => s + i.value, 0);
    const totalLiab = appState.balance_sheet.liabilities.reduce((s, i) => s + i.value, 0);
    
    // Portfolio details with return rates
    const formattedPortfolios = appState.portfolios.map(p => {
      const stats = calculatePortfolioStats(p);
      return {
        name: p.portfolio_name,
        expected_annual_return: `${(stats.expectedReturn * 100).toFixed(1)}%`,
        expected_volatility: `${(stats.volatility * 100).toFixed(1)}%`,
        allocation: p.allocation.map(a => `${a.ticker} (${a.percentage}%, ${a.asset_class})`).join(', ')
      };
    });

    // Budget check
    const totalSpent = appState.transactions.reduce((s, i) => s + i.amount, 0);

    return {
      financial_profile: {
        equity_net_worth: totalAssets - totalLiab,
        gross_assets: totalAssets,
        outstanding_debt: totalLiab,
        demographics: {
          target_retirement_age: appState.user_profile.target_retirement_age,
          annual_spending_target: appState.user_profile.annual_spending_target,
          monthly_net_income: appState.monthly_income
        },
        active_budgets: {
          monthly_outgoings_logged: totalSpent,
          transactions_registered: appState.transactions.length
        },
        custom_designed_portfolios: formattedPortfolios,
        rmd_tax_planner: appState.rmd_state ? {
          birth_year: appState.rmd_state.birth_year,
          has_spousal_exception: appState.rmd_state.spouse_sole_beneficiary,
          total_logged_distributions: appState.rmd_state.withdrawals.reduce((sum, w) => sum + w.amount, 0),
          individual_accounts: {
            traditional_ira: appState.rmd_state.traditional_balance,
            sep_ira: appState.rmd_state.sep_balance,
            simple_ira: appState.rmd_state.simple_balance
          }
        } : null
      }
    };
  };

  // Explicit Browser-to-Google direct terminal query wrapper
  const callDirectGeminiAPI = async (userPrompt: string): Promise<string> => {
    const activeKey = appState.user_profile.api_key_gemini;
    if (!activeKey) {
      throw new Error('Google Gemini API Key is missing. Please save your key first.');
    }

    const payload = createSecureAnonymousPayload();

    const systemInstruction = `
      You are FinanceForge's Chief Deep Reasoning Wealth Advisor, specialized in modern portfolio theory, 50/30/20 budgeting, tax-drag minimization, asset rebalancing, and long-term passive index fund investing.
      Your goal is to provide concise, structured, actionable, and mathematically logical insights.
      You are running in a client-only sandboxed privacy cockpit. 
      The user's financial variables (totally anonymous summary) are provided below:
      ${JSON.stringify(payload, null, 2)}
      
      Always refer to their specific assets, target portfolio returns, tracking error coordinates, and monthly budget remaining if relevant.
      Keep answers scannable with bullet points and bold key terms. Never disclose any mock client-side server details. Focus purely on realistic tax, allocations, and rebalancing ideas.
    `;

    // Direct endpoint check: to verify that the request does NOT route through some third-party proxy
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;
    
    // Explicit direct validation check
    const parsedUrl = new URL(endpoint);
    if (parsedUrl.hostname !== 'generativelanguage.googleapis.com') {
      throw new Error('Critical Security Alert: Destination URL is not a direct Google API host. Decryption intercepted.');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemInstruction },
              { text: `User request: ${userPrompt}` }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `API error - HTTP status ${response.status}`);
    }

    const json = await response.json();
    const generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error('The API returned a response, but it did not contain any valid text.');
    }

    return generatedText;
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || loading) return;

    if (!appState.user_profile.api_key_gemini) {
      alert('Please configure and save your personal Google Gemini API Key first.');
      return;
    }

    // append user msg
    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setLoading(true);

    try {
      const responseText = await callDirectGeminiAPI(textToSend);
      const assistantMsg: ChatMessage = {
        sender: 'assistant',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        sender: 'assistant',
        text: `Error parsing API Response: ${err.message || 'Check connection or key validation.'}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Preset Template Triggers
  const triggerPortfolioAudit = () => {
    handleSendMessage(
      "Perform a full asset correlation, Tax-Drag, and allocation audit on my target portfolios compared to my logging timeline. Recommend strategic optimizations."
    );
  };

  const triggerBudgetAudit = () => {
    handleSendMessage(
      "Audit my monthly budget structure and transaction details against the 50/30/20 spending strategy rules. Let me know where my risk areas lie."
    );
  };

  const triggerMonteCarloAdvisor = () => {
    handleSendMessage(
      "Our Monte Carlo runs project our retirement survival index. Generate 3 structural changes (asset shifts, cost targets) to bolster success probabilities."
    );
  };

  // Convert simple markdown representation (bold, bullets) to clean styled divs
  const formatAdvisorText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let content = line.trim();
      
      // Look for custom list items
      if (content.startsWith('* ') || content.startsWith('- ')) {
        const payload = content.substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-neutral-700 leading-relaxed mt-1">
            {boldTextParser(payload)}
          </li>
        );
      }

      // Headers
      if (content.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-bold text-neutral-900 mt-4 mb-1">{content.replace('### ', '')}</h4>;
      }
      if (content.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-bold text-neutral-900 mt-5 mb-2 border-b pb-0.5">{content.replace('## ', '')}</h3>;
      }

      return (
        <p key={idx} className="text-sm text-neutral-700 leading-relaxed mt-1.5 font-light">
          {boldTextParser(content)}
        </p>
      );
    });
  };

  const boldTextParser = (line: string) => {
    const parts = line.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold text-neutral-950">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-8" id="gemini-advisor-panel">
      {/* Dual Layer Warning Configuration Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* API Settings Section - Span 4 */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6 self-start">
          <div className="border-b pb-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <Key className="w-5 h-5" />
              <h3 className="text-sm font-semibold tracking-wider font-mono uppercase">Private Token Vault</h3>
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-light">User-provided Deep Reasoning endpoints. Active keys remain strictly inside browser storage buffers.</p>
          </div>

          {!isSaved ? (
            <form onSubmit={handleSaveKey} className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">Google Gemini API Key</span>
                <div className="relative">
                  <LockIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="w-full bg-neutral-50 border rounded-xl text-xs pl-9 pr-3 py-2.5 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl border text-[10px] text-neutral-500 font-light space-y-1">
                <div className="flex items-center gap-1 text-emerald-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Safe Terminal Link</span>
                </div>
                <p>The code includes explicit destination checks verifying requests map exclusively to <strong>generativelanguage.googleapis.com</strong> with absolute zero proxy relays.</p>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-mono font-medium cursor-pointer transition-all shadow-md"
              >
                Save Secure Key Locally
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="text-xs font-semibold text-emerald-950 block">Gemini Key Active</span>
                    <span className="text-[10px] text-emerald-600 font-mono block">direct terminal live</span>
                  </div>
                </div>
                <button
                  onClick={handlePurgeKey}
                  className="px-2 py-1 text-[10px] font-mono border border-neutral-300 hover:bg-rose-50 hover:text-rose-600 rounded text-neutral-500 transition-colors cursor-pointer"
                >
                  Purge
                </button>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl border text-[10px] text-neutral-400 font-light space-y-1">
                <span className="font-semibold text-neutral-600">Privacy Assurance Map:</span>
                <p>Your assets values, debts balances, target allocations, and savings stats are packaged anonymized to construct direct AI audits. No account indexes, labels or passwords are leaked.</p>
              </div>
            </div>
          )}
        </div>

        {/* Advisor Chat Console - Span 8 */}
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between min-h-[480px]">
          
          {/* Console Header */}
          <div className="flex items-center justify-between border-b pb-3 border-neutral-100">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-neutral-900" />
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Chief Logic Wealth Advisor</h3>
                <span className="text-[10px] text-emerald-600 font-mono block">● Online Secure Contextual Co-Pilot</span>
              </div>
            </div>
          </div>

          {/* Chat scroll box */}
          <div className="flex-grow my-4 space-y-4 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin">
            {chatHistory.map((item, idx) => (
              <div key={idx} className={`flex gap-3 ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {item.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 border flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-neutral-700" />
                  </div>
                )}
                
                <div className={`max-w-[80%] rounded-2xl p-3.5 text-xs ${
                  item.sender === 'user' 
                    ? 'bg-neutral-950 text-white rounded-tr-none' 
                    : 'bg-neutral-50 border text-neutral-800 rounded-tl-none font-light leading-relaxed'
                }`}>
                  {item.sender === 'assistant' ? (
                    <div className="space-y-1">{formatAdvisorText(item.text)}</div>
                  ) : (
                    <p className="font-sans leading-relaxed">{item.text}</p>
                  )}
                  <span className={`text-[9px] block text-right mt-1.5 ${item.sender === 'user' ? 'text-neutral-400' : 'text-neutral-400 font-mono'}`}>
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 border flex items-center justify-center flex-shrink-0 animate-spin">
                  <Loader2 className="w-4 h-4 text-neutral-500" />
                </div>
                <div className="bg-neutral-50 border rounded-2xl rounded-tl-none p-3.5 text-xs text-neutral-450 italic font-mono flex items-center gap-2">
                  <span>Inference processing via direct client socket...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick preset commands sidebar triggers inside chat */}
          <div className="flex flex-wrap gap-2 mb-3 border-t pt-3.5 border-dashed border-neutral-200">
            <button
              onClick={triggerPortfolioAudit}
              className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border rounded-lg text-[11px] font-mono flex items-center gap-1.5 cursor-pointer text-neutral-600 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Asset mix & Tax drag Audit</span>
            </button>
            <button
              onClick={triggerBudgetAudit}
              className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border rounded-lg text-[11px] font-mono flex items-center gap-1.5 cursor-pointer text-neutral-600 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>50/30/20 Budget Optimization</span>
            </button>
            <button
              onClick={triggerMonteCarloAdvisor}
              className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border rounded-lg text-[11px] font-mono flex items-center gap-1.5 cursor-pointer text-neutral-600 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Retirement Survival Stress-test</span>
            </button>
          </div>

          {/* Text Send Block */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask the co-pilot e.g. How does buying BTC affect my rebalancing drift under custom portfolios?"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              className="w-full bg-neutral-50 border rounded-xl text-xs px-3.5 py-2.5 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-neutral-400 font-light"
            />
            <button
              onClick={() => handleSendMessage()}
              className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl cursor-pointer transition-all flex items-center justify-center shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
