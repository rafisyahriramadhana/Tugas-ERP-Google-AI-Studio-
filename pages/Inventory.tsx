import React, { useState } from 'react';
import { Product } from '../types';
import { Search, Filter, Plus, X, Save, AlertTriangle, MoreHorizontal, CheckCircle2, Trash2, Edit2, Package, AlertCircle, ArrowUpDown } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateStock: (productId: string, newStock: number) => void;
  onDeleteProduct: (productId: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onUpdateStock, onDeleteProduct }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Form State for Add Product
  const [formData, setFormData] = useState<Partial<Product>>({
    category: 'Food',
    unit: 'Pcs'
  });
  
  // Form State for Stock Adjustment
  const [adjustStockValue, setAdjustStockValue] = useState<number>(0);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'cost' || name === 'stock' || name === 'reorderPoint' 
        ? parseFloat(value) 
        : value
    }));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Data Integrity & Validation
    if (!formData.name || !formData.sku || !formData.price || !formData.cost) {
      showFeedback('error', "All fields marked with * are required.");
      return;
    }

    if (products.some(p => p.sku === formData.sku)) {
      showFeedback('error', `SKU '${formData.sku}' already exists.`);
      return;
    }

    if ((formData.price || 0) < 0 || (formData.cost || 0) < 0) {
      showFeedback('error', "Price and Cost cannot be negative.");
      return;
    }

    // 2. Business Logic Execution
    const newProduct: Product = {
      id: crypto.randomUUID(),
      name: formData.name,
      sku: formData.sku,
      category: formData.category || 'Food',
      unit: formData.unit || 'Pcs',
      price: formData.price || 0,
      cost: formData.cost || 0,
      stock: formData.stock || 0,
      reorderPoint: formData.reorderPoint || 10,
    };

    onAddProduct(newProduct);
    
    // 3. Reset & Feedback
    setIsAddModalOpen(false);
    setFormData({ category: 'Food', unit: 'Pcs' });
    showFeedback('success', `Product '${newProduct.name}' added successfully.`);
  };

  const openStockModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustStockValue(product.stock);
    setIsStockModalOpen(true);
    setActiveActionId(null);
  };

  const handleStockUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct && adjustStockValue >= 0) {
        onUpdateStock(selectedProduct.id, adjustStockValue);
        setIsStockModalOpen(false);
        setSelectedProduct(null);
        showFeedback('success', `Stock updated for ${selectedProduct.name}`);
    } else {
        showFeedback('error', "Invalid Stock Value");
    }
  };

  const handleDelete = (product: Product) => {
      if (window.confirm(`Are you sure you want to delete '${product.name}'?`)) {
          onDeleteProduct(product.id);
          setActiveActionId(null);
          showFeedback('success', `Deleted ${product.name}`);
      }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-8rem)] relative" onClick={() => setActiveActionId(null)}>
      
      {/* Toast Feedback */}
      {feedback && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
            feedback.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="font-bold text-sm">{feedback.message}</span>
        </div>
      )}

      {/* Header - Refined Design */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-xl z-10 rounded-t-2xl">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm">
            <Package size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">Stock Management</h2>
            <p className="text-xs text-slate-500 font-medium">Total {products.length} Items Available</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search product name or SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white transition-all font-medium placeholder:text-slate-400"
            />
          </div>
          <button className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-colors" title="Filter List">
            <Filter size={18} />
          </button>
          
          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Add Product Button - Prominent */}
          <button 
            onClick={(e) => {
                e.stopPropagation();
                setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>
      </div>

      {/* Table - Refined Layout & Typography */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/95 backdrop-blur border-b border-slate-200">Product Info</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/95 backdrop-blur border-b border-slate-200 whitespace-nowrap">SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/95 backdrop-blur border-b border-slate-200">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right bg-slate-50/95 backdrop-blur border-b border-slate-200 whitespace-nowrap">Cost (HPP)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right bg-slate-50/95 backdrop-blur border-b border-slate-200 whitespace-nowrap">Price</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur border-b border-slate-200">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center bg-slate-50/95 backdrop-blur border-b border-slate-200">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right bg-slate-50/95 backdrop-blur border-b border-slate-200"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
                <tr>
                    <td colSpan={8} className="py-24 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                            <div className="p-4 bg-slate-50 rounded-full">
                                <Search size={32} strokeWidth={1.5} className="opacity-50" />
                            </div>
                            <p className="font-medium">No products found matching "{searchTerm}"</p>
                            <button onClick={() => setSearchTerm('')} className="text-sm text-emerald-600 hover:underline">Clear Search</button>
                        </div>
                    </td>
                </tr>
            ) : filteredProducts.map((product) => {
              const isLowStock = product.stock <= product.reorderPoint;
              return (
                <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                        <img src={`https://picsum.photos/seed/${product.id}/100/100`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-bold text-slate-700 line-clamp-2" title={product.name}>{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono whitespace-nowrap">{product.sku}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-xs font-bold border border-slate-200">{product.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-right tabular-nums font-mono whitespace-nowrap">Rp {product.cost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right tabular-nums font-mono whitespace-nowrap">Rp {product.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-800 font-mono text-base">{product.stock}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{product.unit}</span>
                      </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isLowStock ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide whitespace-nowrap shadow-sm">
                        <AlertTriangle size={10} /> Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide whitespace-nowrap shadow-sm">
                        <CheckCircle2 size={10} /> In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionId(activeActionId === product.id ? null : product.id);
                        }}
                        className={`p-2 rounded-lg transition-all ${activeActionId === product.id ? 'bg-emerald-100 text-emerald-700 shadow-inner' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    
                    {/* Action Dropdown - Improved Animation & Shadow */}
                    {activeActionId === product.id && (
                        <div className="absolute right-8 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openStockModal(product); }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-3 font-medium transition-colors border-b border-slate-50"
                            >
                                <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-600"><ArrowUpDown size={14} /></div>
                                Adjust Stock
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(product); }}
                                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium transition-colors"
                            >
                                <div className="p-1.5 bg-red-50 rounded-md text-red-500"><Trash2 size={14} /></div>
                                Delete Item
                            </button>
                        </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90%] overflow-y-auto scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">New Product</h3>
                    <p className="text-xs text-slate-500">Enter product details for the master record.</p>
                  </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                {/* Basic Info */}
                <div className="col-span-full">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Basic Information</h4>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Product Name <span className="text-red-500">*</span></label>
                  <input required name="name" onChange={handleInputChange} placeholder="e.g. Premium Rice" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">SKU Code <span className="text-red-500">*</span></label>
                  <input required name="sku" onChange={handleInputChange} placeholder="e.g. RICE-005" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-sm" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Category <span className="text-red-500">*</span></label>
                  <select name="category" onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                    <option value="Food">Food</option>
                    <option value="Bev">Beverage</option>
                    <option value="Clean">Cleaning</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">Unit (UOM) <span className="text-red-500">*</span></label>
                   <select name="unit" onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Bag">Bag</option>
                    <option value="Box">Box</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Pack">Pack</option>
                   </select>
                </div>

                {/* Financials */}
                <div className="col-span-full mt-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Financials & Inventory</h4>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Cost (HPP) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                    <input required type="number" name="cost" onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" placeholder="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Selling Price <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                    <input required type="number" name="price" onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" placeholder="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Initial Stock</label>
                  <input type="number" name="stock" onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Low Stock Alert Limit</label>
                  <input type="number" name="reorderPoint" defaultValue={10} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" placeholder="10" />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 flex items-center gap-2 transform active:scale-95 transition-all">
                  <Save size={18} /> Save to Master Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isStockModalOpen && selectedProduct && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsStockModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-800">Adjust Stock Level</h3>
                    <p className="text-sm text-slate-500">Update inventory count for <span className="font-bold text-slate-700">{selectedProduct.name}</span></p>
                </div>
                <form onSubmit={handleStockUpdate} className="p-6">
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">New Quantity ({selectedProduct.unit})</label>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                <Package size={28} />
                            </div>
                            <input 
                                type="number" 
                                className="flex-1 px-4 py-4 border border-slate-200 rounded-2xl text-3xl font-mono font-bold text-slate-800 text-center focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                value={adjustStockValue}
                                onChange={(e) => setAdjustStockValue(parseInt(e.target.value) || 0)}
                                min="0"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 py-3.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transform active:scale-95 transition-all">
                            Confirm Update
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}
    </div>
  );
};