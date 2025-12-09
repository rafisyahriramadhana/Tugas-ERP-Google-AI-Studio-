import React, { useState } from 'react';
import { Product } from '../types';
import { Search, Filter, Plus, X, Save, AlertTriangle, MoreHorizontal, CheckCircle2, Trash2, Edit2, Package } from 'lucide-react';

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
  
  // Form State for Add Product
  const [formData, setFormData] = useState<Partial<Product>>({
    category: 'Food',
    unit: 'Pcs'
  });
  const [error, setError] = useState<string | null>(null);
  
  // Form State for Stock Adjustment
  const [adjustStockValue, setAdjustStockValue] = useState<number>(0);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'cost' || name === 'stock' || name === 'reorderPoint' 
        ? parseFloat(value) 
        : value
    }));
    setError(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Data Integrity & Validation
    if (!formData.name || !formData.sku || !formData.price || !formData.cost) {
      setError("All fields marked with * are required.");
      return;
    }

    if (products.some(p => p.sku === formData.sku)) {
      setError(`SKU '${formData.sku}' already exists. SKU must be unique.`);
      return;
    }

    if ((formData.price || 0) < 0 || (formData.cost || 0) < 0) {
      setError("Price and Cost cannot be negative.");
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
    alert(`Product '${newProduct.name}' added successfully to Master Data.`);
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
        // Simple feedback
        // alert(`Stock updated for ${selectedProduct.name}`); 
    } else {
        alert("Invalid Stock Value");
    }
  };

  const handleDelete = (product: Product) => {
      if (window.confirm(`Are you sure you want to delete '${product.name}'? This action cannot be undone and will affect historical reports.`)) {
          onDeleteProduct(product.id);
          setActiveActionId(null);
      }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-8rem)] relative" onClick={() => setActiveActionId(null)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <h2 className="text-lg font-bold text-slate-800">Stock Management</h2>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{products.length} Items</span>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search inventory..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Filter size={16} /> Filter
          </button>
          
          {/* Add Product Button */}
          <button 
            onClick={(e) => {
                e.stopPropagation();
                setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm transition-all active:scale-95"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Cost</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Price</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Unit</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Stock</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map((product) => {
              const isLowStock = product.stock <= product.reorderPoint;
              return (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden">
                        <img src={`https://picsum.photos/seed/${product.id}/50/50`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-slate-800">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">{product.sku}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="px-2 py-1 rounded bg-slate-100 text-xs">{product.category}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">Rp {product.cost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800 text-right">Rp {product.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-center">{product.unit || 'Pcs'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center font-mono">{product.stock}</td>
                  <td className="px-6 py-4 text-center">
                    {isLowStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle size={12} /> Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={12} /> OK
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionId(activeActionId === product.id ? null : product.id);
                        }}
                        className={`p-2 rounded-full transition-colors ${activeActionId === product.id ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    
                    {/* Action Dropdown */}
                    {activeActionId === product.id && (
                        <div className="absolute right-8 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <button 
                                onClick={(e) => { e.stopPropagation(); openStockModal(product); }}
                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2"
                            >
                                <Edit2 size={16} /> Adjust Stock
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(product); }}
                                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Delete Product
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90%] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">Add New Product</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Product Name *</label>
                  <input required name="name" onChange={handleInputChange} placeholder="e.g. Premium Rice" className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">SKU (Unique ID) *</label>
                  <input required name="sku" onChange={handleInputChange} placeholder="e.g. RICE-005" className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-mono" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Category *</label>
                  <select name="category" onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    <option value="Food">Food</option>
                    <option value="Bev">Beverage</option>
                    <option value="Clean">Cleaning</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-semibold text-slate-700">Unit (UOM) *</label>
                   <select name="unit" onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Bag">Bag (Karung)</option>
                    <option value="Box">Box (Dus)</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Pack">Pack</option>
                   </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Cost (HPP) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                    <input required type="number" name="cost" onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Selling Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                    <input required type="number" name="price" onChange={handleInputChange} className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Initial Stock</label>
                  <input type="number" name="stock" onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Reorder Point</label>
                  <input type="number" name="reorderPoint" defaultValue={10} onChange={handleInputChange} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="10" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 flex items-center gap-2">
                  <Save size={18} /> Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isStockModalOpen && selectedProduct && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setIsStockModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Adjust Stock Level</h3>
                    <p className="text-sm text-slate-500">Update inventory count for {selectedProduct.name}</p>
                </div>
                <form onSubmit={handleStockUpdate} className="p-6">
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Current Quantity ({selectedProduct.unit})</label>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                <Package size={24} />
                            </div>
                            <input 
                                type="number" 
                                className="flex-1 p-3 border border-slate-200 rounded-xl text-2xl font-mono text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={adjustStockValue}
                                onChange={(e) => setAdjustStockValue(parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-900/20">
                            Update Stock
                        </button>
                    </div>
                </form>
            </div>
          </div>
      )}
    </div>
  );
};