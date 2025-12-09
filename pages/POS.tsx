import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, CartItem, Transaction } from '../types';
import { generatePOSRecommendations } from '../services/geminiService';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, ShoppingCart, Package, Sparkles, Loader2, AlertCircle, CheckCircle2, RotateCcw, AlertTriangle, ScanBarcode } from 'lucide-react';

interface POSProps {
  products: Product[];
  onCompleteTransaction: (transaction: Transaction) => void;
}

type PaymentMethod = 'CASH' | 'QRIS' | 'DEBIT';

const ANOMALY_THRESHOLD = 2000000; // Rp 2.000.000 threshold for anomaly warning

export const POS: React.FC<POSProps> = ({ products, onCompleteTransaction }) => {
  // --- STATE MANAGEMENT ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // AI State
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Refs for UX
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- DERIVED STATE (CALCULATIONS) ---
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);

  const { subtotal, tax, total, totalItems } = useMemo(() => {
    const _sub = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const _tax = _sub * 0.11; // PPN 11%
    const _tot = _sub + _tax;
    const _items = cart.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal: _sub, tax: _tax, total: _tot, totalItems: _items };
  }, [cart]);

  const change = useMemo(() => {
    if (paymentMethod !== 'CASH') return 0;
    const received = parseFloat(cashReceived) || 0;
    return Math.max(0, received - total);
  }, [paymentMethod, cashReceived, total]);

  const isPaymentValid = useMemo(() => {
    if (cart.length === 0) return false;
    if (paymentMethod === 'CASH') {
      const received = parseFloat(cashReceived) || 0;
      return received >= total;
    }
    return true;
  }, [cart, paymentMethod, cashReceived, total]);

  const isAnomaly = total > ANOMALY_THRESHOLD;

  // --- AI RECOMMENDATION SYSTEM ---
  useEffect(() => {
    const fetchRecs = async () => {
        if (cart.length === 0) {
            setRecommendations([]);
            return;
        }
        setLoadingRecs(true);
        try {
            const recNames = await generatePOSRecommendations(cart, products);
            const recProducts = products.filter(p => recNames.includes(p.name));
            setRecommendations(recProducts);
        } catch (e) {
            console.error("Failed to fetch recommendations");
        } finally {
            setLoadingRecs(false);
        }
    };

    const timeoutId = setTimeout(fetchRecs, 2000); 
    return () => clearTimeout(timeoutId);
  }, [cart.map(c => c.id).join(','), products]);

  // --- FEEDBACK SYSTEM ---
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  // --- CORE LOGIC: ADD TO CART ---
  const getStockStatus = (product: Product) => {
    const cartItem = cart.find(i => i.id === product.id);
    const inCart = cartItem ? cartItem.quantity : 0;
    const available = product.stock - inCart;
    return { available, isOutOfStock: available <= 0, inCart };
  };

  const handleAddToCart = (product: Product) => {
    const { available } = getStockStatus(product);
    
    // 1. Stock Validation
    if (available <= 0) {
        showFeedback('error', `Out of stock! Only ${product.stock} available.`);
        return; 
    }

    // 2. State Update
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    // 3. UX Feedback
    // If scanning, we might not want a toast for every beep, but for clicks it's nice.
    // Keeping it subtle.
  };

  // --- CORE LOGIC: BARCODE SCANNER SIMULATION ---
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
        // "Scan" Logic: Find exact match for SKU first
        const exactMatch = products.find(p => p.sku.toLowerCase() === searchTerm.toLowerCase());
        
        if (exactMatch) {
            handleAddToCart(exactMatch);
            setSearchTerm(''); // Clear "scanner" buffer
            showFeedback('success', `Added ${exactMatch.name}`);
        } else {
            // If no exact SKU, try finding exact name
            const nameMatch = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase());
            if (nameMatch) {
                handleAddToCart(nameMatch);
                setSearchTerm('');
                showFeedback('success', `Added ${nameMatch.name}`);
            } else {
                showFeedback('error', 'Product not found');
            }
        }
    }
  };

  // --- CORE LOGIC: UPDATE & REMOVE ---
  const handleUpdateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (delta > 0) {
        const product = products.find(p => p.id === id);
        if (product && item.quantity >= product.stock) {
            showFeedback('error', 'Max stock reached');
            return;
        }
    }

    setCart(prev => {
        return prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item; 
            }
            return item;
        });
    });
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    if (window.confirm("Are you sure you want to clear the current order?")) {
        setCart([]);
        setCashReceived('');
        setPaymentMethod('CASH');
    }
  };

  // --- CORE LOGIC: CHECKOUT ---
  const handleProcessPayment = async () => {
    if (!isPaymentValid || isProcessing) return;

    if (isAnomaly) {
        if (!window.confirm(`⚠️ ANOMALY DETECTED ⚠️\n\nTotal transaction is Rp ${total.toLocaleString()}.\nAre you sure this is correct?`)) {
            return;
        }
    }

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate Latency

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: [...cart],
      subtotal,
      tax,
      total,
      paymentMethod
    };
    
    onCompleteTransaction(transaction);
    
    setCart([]);
    setCashReceived('');
    setPaymentMethod('CASH');
    setRecommendations([]);
    setIsProcessing(false);
    showFeedback('success', `Change: Rp ${change.toLocaleString()}`);
  };

  // --- UI HELPERS ---
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] relative">
      
      {/* Toast Feedback Overlay */}
      {feedback && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
            feedback.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="font-bold text-sm">{feedback.message}</span>
        </div>
      )}

      {/* LEFT COLUMN: Product Catalog */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder="Scan Barcode or Search..."
              className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ScanBarcode size={20} />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
                const { isOutOfStock, available, inCart } = getStockStatus(product);
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    disabled={isOutOfStock}
                    className={`bg-white p-3 rounded-2xl border transition-all text-left flex flex-col group h-full relative ${
                        isOutOfStock 
                            ? 'border-slate-100 opacity-60 cursor-not-allowed grayscale' 
                            : 'border-slate-200 hover:border-emerald-500 hover:shadow-lg hover:-translate-y-1'
                    }`}
                  >
                    <div className="aspect-square bg-slate-100 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
                        <img 
                            src={`https://picsum.photos/seed/${product.id}/200/200`} 
                            alt={product.name} 
                            className="w-full h-full object-cover"
                        />
                        {/* Status Overlays */}
                        {isOutOfStock && (
                            <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center backdrop-blur-[2px]">
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">SOLD OUT</span>
                            </div>
                        )}
                        {!isOutOfStock && inCart > 0 && (
                            <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                                {inCart}
                            </div>
                        )}
                        {!isOutOfStock && available <= product.reorderPoint && (
                            <div className="absolute bottom-2 left-2 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 shadow-sm">
                                <AlertTriangle size={10} /> {available} Left
                            </div>
                        )}
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{product.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mb-2">{product.sku}</p>
                    
                    <div className="mt-auto flex justify-between items-end">
                      <div className="flex flex-col">
                         <span className="text-[10px] text-slate-400">Price</span>
                         <span className="font-bold text-emerald-600">Rp {product.price.toLocaleString()}</span>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                          isOutOfStock ? 'bg-slate-100 text-slate-300' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white'
                      }`}>
                        <Plus size={18} strokeWidth={3} />
                      </div>
                    </div>
                  </button>
                );
            })}
          </div>
        </div>

        {/* AI Recommendations */}
        {cart.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-t border-indigo-100 p-3 min-h-[100px]">
                <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs uppercase tracking-wide mb-2">
                    <Sparkles size={14} className="text-indigo-600" />
                    Smart Upsell Suggestions
                    {loadingRecs && <Loader2 size={12} className="animate-spin text-indigo-400" />}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                    {recommendations.length > 0 ? recommendations.map(rec => (
                        <button
                            key={rec.id}
                            onClick={() => handleAddToCart(rec)}
                            className="flex items-center gap-2 bg-white border border-indigo-100 rounded-lg p-1.5 pr-3 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all min-w-[180px] group"
                        >
                            <div className="w-8 h-8 rounded-md bg-slate-100 overflow-hidden shrink-0">
                                <img src={`https://picsum.photos/seed/${rec.id}/50/50`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">{rec.name}</p>
                                <p className="text-[10px] text-emerald-600 font-medium">Rp {rec.price.toLocaleString()}</p>
                            </div>
                            <div className="bg-indigo-50 text-indigo-600 p-1 rounded group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Plus size={10} strokeWidth={3} />
                            </div>
                        </button>
                    )) : (
                        !loadingRecs && <p className="text-xs text-slate-400 italic pl-1">Analyzing cart for suggestions...</p>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* RIGHT COLUMN: Transaction Cart */}
      <div className="w-full lg:w-[400px] bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-full z-10">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <div>
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <ShoppingCart className="text-emerald-600" size={20} /> Current Order
              </h3>
              <p className="text-xs text-slate-500 font-medium">Trans ID: <span className="font-mono">#{crypto.randomUUID().slice(0,8)}</span></p>
          </div>
          {cart.length > 0 && (
              <button 
                onClick={handleClearCart}
                className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                  <RotateCcw size={12} /> Clear
              </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Package size={32} className="opacity-50" />
              </div>
              <p className="font-medium">Cart is empty</p>
              <p className="text-sm opacity-75">Scan barcode or tap items to add</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-3 group">
                <div className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                    <img src={`https://picsum.photos/seed/${item.id}/100/100`} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{item.name}</h4>
                      <button onClick={() => handleRemoveFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                      </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">@ Rp {item.price.toLocaleString()}</p>
                  
                  <div className="flex justify-between items-end">
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                        <button onClick={() => handleUpdateQuantity(item.id, -1)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-slate-700 hover:shadow-sm transition-all disabled:opacity-50" disabled={item.quantity <= 1}>
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-8 text-center tabular-nums">{item.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(item.id, 1)} className="p-1.5 rounded-md hover:bg-white text-slate-500 hover:text-emerald-600 hover:shadow-sm transition-all">
                          <Plus size={12} />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-emerald-600 tabular-nums">Rp {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Anomaly Warning */}
        {isAnomaly && (
            <div className="mx-4 mb-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 animate-in slide-in-from-bottom-2">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <div>
                    <p className="text-xs font-bold text-amber-800 uppercase">High Value Transaction</p>
                    <p className="text-xs text-amber-700 mt-0.5">Total exceeds typical limits. Verify quantities.</p>
                </div>
            </div>
        )}

        {/* Payment & Totals Section */}
        <div className="bg-white border-t border-slate-200 p-5 rounded-b-2xl shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)] z-20">
          
          {/* Calculations */}
          <div className="space-y-2 text-sm mb-5 text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal ({totalItems} items)</span>
              <span className="font-medium font-mono">Rp {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (PPN 11%)</span>
              <span className="font-medium font-mono">Rp {tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-100 mt-2">
              <span>Total Payable</span>
              <span className="font-mono text-emerald-600">Rp {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button 
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 ${
                    paymentMethod === 'CASH' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1' 
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                }`}
            >
              <Banknote size={20} className="mb-1" />
              <span className="text-[10px] font-bold uppercase">Cash</span>
            </button>
            <button 
                onClick={() => setPaymentMethod('QRIS')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 ${
                    paymentMethod === 'QRIS' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1' 
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                }`}
            >
              <QrCode size={20} className="mb-1" />
              <span className="text-[10px] font-bold uppercase">QRIS</span>
            </button>
            <button 
                onClick={() => setPaymentMethod('DEBIT')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 ${
                    paymentMethod === 'DEBIT' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1' 
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                }`}
            >
              <CreditCard size={20} className="mb-1" />
              <span className="text-[10px] font-bold uppercase">Debit</span>
            </button>
          </div>

          {/* Cash Input & Change */}
          {paymentMethod === 'CASH' && (
              <div className="mb-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                      <input 
                        type="number" 
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="Enter Cash Amount"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                      />
                  </div>
                  <div className="flex justify-between items-center bg-slate-800 text-slate-200 p-3 rounded-xl">
                      <span className="text-xs font-bold uppercase tracking-wide">Change</span>
                      <span className={`font-mono font-bold ${change < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          Rp {change.toLocaleString()}
                      </span>
                  </div>
              </div>
          )}

          {/* Pay Button */}
          <button 
            disabled={cart.length === 0 || isProcessing || !isPaymentValid}
            onClick={handleProcessPayment}
            className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${
                cart.length === 0 || !isPaymentValid
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
            }`}
          >
            {isProcessing ? (
                <>
                    <Loader2 size={20} className="animate-spin" /> Processing...
                </>
            ) : (
                <>
                    Confirm Payment
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};