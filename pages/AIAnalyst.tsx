import React, { useState, useRef, useEffect } from 'react';
import { FinancialSummary, Transaction, Product, ChatMessage } from '../types';
import { askFinancialAnalyst } from '../services/geminiService';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAnalystProps {
  summary: FinancialSummary;
  transactions: Transaction[];
  products: Product[];
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({ summary, transactions, products }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "**Hello, Professor.** I am your AI Virtual CFO. \n\nI have analyzed your live sales data, inventory levels, and profit margins. You can ask me to:\n- Forecast demand for specific products\n- Detect anomalies in transaction logs\n- Suggest cost-cutting measures",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!process.env.API_KEY) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'model',
        text: "API Key is missing. Please set the `API_KEY` environment variable.",
        timestamp: new Date()
      }]);
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare context
    const context = JSON.stringify({
      monthSummary: summary,
      recentTransactions: transactions.slice(-10), // only last 10 to save tokens
      inventoryWarning: products.filter(p => p.stock < p.reorderPoint).map(p => ({ name: p.name, stock: p.stock }))
    });

    const responseText = await askFinancialAnalyst(userMsg.text, context);

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Bot size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Virtual CFO Agent</h2>
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
              Powered by Gemini 2.5 Flash
            </div>
          </div>
        </div>
        <Sparkles className="text-emerald-200 opacity-50" size={40} />
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none prose prose-sm prose-emerald'
              }`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
                <div className={`text-[10px] mt-2 opacity-60 ${msg.role === 'user' ? 'text-slate-300' : 'text-slate-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="flex items-center gap-3 ml-11">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-2">
                   <Loader2 size={16} className="animate-spin text-emerald-500" />
                   <span className="text-xs text-slate-500">Thinking...</span>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me to analyze trends, predict stock needs, or audit transaction logs..."
            className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm text-slate-700 placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-3">
          AI can make mistakes. Please verify important financial decisions.
        </p>
      </div>
    </div>
  );
};