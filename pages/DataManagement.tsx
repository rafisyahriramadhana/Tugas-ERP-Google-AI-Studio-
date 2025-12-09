import React, { useState, useRef } from 'react';
import { Product, Transaction, StagedTransaction } from '../types';
import { analyzeUploadedDocument } from '../services/geminiService';
import { Upload, FileText, Download, CheckCircle, AlertTriangle, Trash2, Loader2, Database, Package, FileSpreadsheet } from 'lucide-react';

interface DataManagementProps {
  products: Product[];
  transactions: Transaction[];
  onImportTransactions: (staged: StagedTransaction[]) => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ products, transactions, onImportTransactions }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stagedData, setStagedData] = useState<StagedTransaction[]>([]);
  const [dynamicHeaders, setDynamicHeaders] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // Helper to format snake_case to Title Case (e.g., "gaji_pokok" -> "Gaji Pokok")
  const formatHeader = (header: string): string => {
    return header
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Smart Validation based on column name heuristics
  const smartValidate = (row: any, headers: string[]): { status: 'VALID' | 'ERROR', error?: string } => {
    for (const key of headers) {
      const value = row[key];
      const lowerKey = key.toLowerCase();

      // Check for empty required fields (ID, Name, SKU)
      if ((lowerKey.includes('id') || lowerKey.includes('name') || lowerKey.includes('nama') || lowerKey.includes('sku')) && (!value || value.toString().trim() === '')) {
        return { status: 'ERROR', error: `${formatHeader(key)} is required` };
      }

      // Check numeric fields (Amount, Price, Cost, Gaji, Salary)
      if (lowerKey.includes('amount') || lowerKey.includes('price') || lowerKey.includes('gaji') || lowerKey.includes('salary') || lowerKey.includes('total')) {
        const num = parseFloat(value ? value.toString().replace(/[^0-9.-]+/g,"") : "0");
        if (isNaN(num) || num < 0) {
          return { status: 'ERROR', error: `Invalid number in ${formatHeader(key)}` };
        }
      }

      // Check date fields
      if (lowerKey.includes('date') || lowerKey.includes('tanggal')) {
        if (!value || isNaN(Date.parse(value))) {
          return { status: 'ERROR', error: `Invalid date in ${formatHeader(key)}` };
        }
      }
    }
    return { status: 'VALID' };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsProcessing(true);
    setStagedData([]);
    setDynamicHeaders(null);

    try {
      if (file.type.includes('image')) {
        // AI OCR Mode (Receipts/Invoices)
        const base64 = await fileToBase64(file);
        const result = await analyzeUploadedDocument(base64, file.type);
        
        if (result.error) {
          alert("AI Analysis Failed: " + result.error);
        } else {
            // Map AI result to fixed StagedTransaction for consistency in ledger
            const isValid = result.total && result.date;
            
            const newStaged: StagedTransaction = {
                id: crypto.randomUUID(),
                source: 'AI_OCR',
                date: result.date || new Date().toISOString(),
                supplierOrCustomer: result.supplier || 'Unknown Supplier',
                totalAmount: result.total || 0,
                itemsSummary: result.items ? result.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ') : 'Unknown Items',
                status: isValid ? 'VALID' : 'ERROR',
                validationError: isValid ? undefined : 'AI could not extract Total or Date',
                rawParams: result
            };
            setStagedData([newStaged]);
            setDynamicHeaders(null); // Use default fixed columns for OCR
        }
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Dynamic CSV Parsing
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim() !== '');
        
        if (lines.length < 2) {
            alert("CSV file is empty or missing headers");
            return;
        }

        // 1. Extract Headers dynamically
        const headers = lines[0].split(',').map(h => h.trim());
        setDynamicHeaders(headers);

        // 2. Parse Rows
        const newItems: StagedTransaction[] = lines.slice(1).map(line => {
            const values = line.split(',');
            const rawRow: Record<string, string> = {};
            
            headers.forEach((header, index) => {
                // Handle cases where commas are in quoted strings simply for this demo, 
                // or just standard split if simple CSV.
                rawRow[header] = values[index]?.trim();
            });

            // 3. Run Smart Validation
            const validation = smartValidate(rawRow, headers);

            // 4. Heuristic Mapping for Ledger (Try to find 'amount' and 'date' for the main ERP flow)
            // If not found, defaults are used, but raw data is preserved for display.
            const amountKey = headers.find(h => h.toLowerCase().includes('amount') || h.toLowerCase().includes('total') || h.toLowerCase().includes('gaji') || h.toLowerCase().includes('price'));
            const dateKey = headers.find(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('tanggal'));
            const descKey = headers.find(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('desc') || h.toLowerCase().includes('nama') || h.toLowerCase().includes('supplier'));

            return {
                id: crypto.randomUUID(),
                source: 'CSV_IMPORT',
                date: dateKey ? rawRow[dateKey] : new Date().toISOString(),
                supplierOrCustomer: descKey ? rawRow[descKey] : 'Batch Import',
                totalAmount: amountKey ? parseFloat(rawRow[amountKey]) || 0 : 0,
                itemsSummary: 'CSV Record',
                status: validation.status,
                validationError: validation.error,
                rawParams: rawRow
            };
        });

        setStagedData(newItems);
      }
    } catch (error) {
      console.error(error);
      alert("Error processing file. Please check format.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCommit = () => {
    const validData = stagedData.filter(d => d.status === 'VALID');
    if (validData.length === 0) {
        alert("No valid data to commit.");
        return;
    }
    // Proceed
    onImportTransactions(validData);
    setStagedData(prev => prev.filter(d => d.status !== 'VALID'));
    alert(`${validData.length} records successfully processed.`);
  };

  const handleRemoveStaged = (id: string) => {
    setStagedData(prev => prev.filter(t => t.id !== id));
  };

  // --- RENDER HELPERS ---

  // Determines which columns to show: Dynamic or Fixed
  const isDynamic = dynamicHeaders !== null && dynamicHeaders.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Header Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-8 py-4 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'import' 
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Data Ingestion (Import)
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-8 py-4 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'export' 
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Data Extraction (Export)
          </button>
        </div>
      </div>

      <div className="p-8 flex-1">
        {activeTab === 'import' ? (
          <div className="space-y-8">
            {/* Upload Zone */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative group">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isProcessing}
              />
              {isProcessing ? (
                <div className="flex flex-col items-center animate-pulse">
                    <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800">Analyzing Data Structure...</h3>
                    <p className="text-sm text-slate-500">Applying intelligent validation rules</p>
                </div>
              ) : (
                <>
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Upload Data File</h3>
                    <p className="text-slate-500 max-w-sm mb-4">
                        Supports <strong>Dynamic CSV</strong> (Any Headers) or <strong>Images</strong> (Receipts/Invoices).
                    </p>
                    <div className="flex gap-2 text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                        <span className="flex items-center gap-1"><FileSpreadsheet size={14}/> CSV</span>
                        <span className="flex items-center gap-1"><FileText size={14}/> OCR</span>
                    </div>
                </>
              )}
            </div>

            {/* Smart Import Table */}
            {stagedData.length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white sticky left-0 z-20">
                        <div className="flex items-center gap-3">
                            <Database size={18} className="text-indigo-500" />
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Preview & Validation</h3>
                                <p className="text-xs text-slate-500">
                                    {isDynamic 
                                        ? `Detected ${dynamicHeaders?.length} columns from ${stagedData[0].source}` 
                                        : 'Standard ERP Transaction Format'}
                                </p>
                            </div>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                                {stagedData.length} Records
                            </span>
                        </div>
                        <button 
                            onClick={handleCommit}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <CheckCircle size={16} />
                            Commit Valid Records
                        </button>
                    </div>
                    
                    {/* Responsive Table Container */}
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-sm border-collapse min-w-max">
                            <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-4 w-16 text-center border-r border-slate-200 sticky left-0 bg-slate-100 z-10 shadow-sm">No.</th>
                                    
                                    {/* Dynamic Headers Rendering */}
                                    {isDynamic ? (
                                        dynamicHeaders!.map((header) => (
                                            <th key={header} className="p-4 border-r border-slate-200 whitespace-nowrap min-w-[150px]">
                                                {formatHeader(header)}
                                            </th>
                                        ))
                                    ) : (
                                        // Fixed Headers for OCR/Standard
                                        <>
                                            <th className="p-4 w-32 border-r border-slate-200">Source</th>
                                            <th className="p-4 w-32 border-r border-slate-200">Date</th>
                                            <th className="p-4 w-64 border-r border-slate-200">Description</th>
                                            <th className="p-4 border-r border-slate-200">Details</th>
                                            <th className="p-4 w-32 text-right border-r border-slate-200">Amount</th>
                                        </>
                                    )}

                                    <th className="p-4 w-48 text-center border-r border-slate-200 sticky right-[80px] bg-slate-100 z-10 shadow-sm">Status Validasi</th>
                                    <th className="p-4 w-20 text-center sticky right-0 bg-slate-100 z-10 shadow-sm">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {stagedData.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50 group">
                                        <td className="p-4 text-center font-mono text-slate-400 border-r border-slate-100 align-top sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-sm">
                                          {index + 1}
                                        </td>

                                        {/* Dynamic Row Rendering */}
                                        {isDynamic ? (
                                            dynamicHeaders!.map((header) => {
                                                const val = item.rawParams[header];
                                                // Simple heuristics for formatting
                                                const lowerHeader = header.toLowerCase();
                                                const isMoney = lowerHeader.includes('gaji') || lowerHeader.includes('price') || lowerHeader.includes('amount') || lowerHeader.includes('total');
                                                const isDate = lowerHeader.includes('date') || lowerHeader.includes('tanggal');

                                                return (
                                                    <td key={header} className="p-4 border-r border-slate-100 align-top">
                                                        <div className="break-words max-w-xs whitespace-normal">
                                                            {isMoney && val && !isNaN(parseFloat(val.replace(/[^0-9.-]+/g,"")))
                                                                ? `Rp ${parseFloat(val.replace(/[^0-9.-]+/g,"")).toLocaleString('id-ID')}`
                                                                : (isDate ? val : val)
                                                            }
                                                        </div>
                                                    </td>
                                                );
                                            })
                                        ) : (
                                            // Fixed Rows for OCR
                                            <>
                                                <td className="p-4 border-r border-slate-100 align-top">
                                                    <span className="text-xs px-2 py-1 rounded font-medium bg-purple-100 text-purple-700">AI Scan</span>
                                                </td>
                                                <td className="p-4 border-r border-slate-100 align-top font-mono text-xs">{item.date}</td>
                                                <td className="p-4 border-r border-slate-100 align-top font-medium">{item.supplierOrCustomer}</td>
                                                <td className="p-4 border-r border-slate-100 align-top text-xs text-slate-500">{item.itemsSummary}</td>
                                                <td className="p-4 border-r border-slate-100 align-top text-right font-mono font-medium">
                                                    Rp {item.totalAmount.toLocaleString('id-ID')}
                                                </td>
                                            </>
                                        )}

                                        <td className="p-4 text-center align-top border-r border-slate-100 sticky right-[80px] bg-white group-hover:bg-slate-50 z-10 shadow-sm">
                                            {item.status === 'VALID' ? (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
                                                    <CheckCircle size={12} /> OK, Ready
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100 whitespace-nowrap">
                                                      <AlertTriangle size={12} /> ERROR
                                                  </div>
                                                  <span className="text-[10px] text-red-600 font-medium max-w-[120px] leading-tight">
                                                    {item.validationError}
                                                  </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center align-top sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-sm">
                                            <button 
                                                onClick={() => handleRemoveStaged(item.id)}
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remove Item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
          </div>
        ) : (
           // Export Tab Content (Unchanged)
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="border border-slate-200 rounded-xl p-6 bg-white hover:border-emerald-500 transition-colors group">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Package size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Inventory Data</h3>
                <p className="text-slate-500 text-sm mb-6">
                    Export full product list including SKU, Cost, Price, and current Stock levels for audit or backup.
                </p>
                <button 
                    onClick={() => console.log('Export Inventory')}
                    className="w-full py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                    <Download size={16} /> Download CSV
                </button>
             </div>

             <div className="border border-slate-200 rounded-xl p-6 bg-white hover:border-emerald-500 transition-colors group">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <FileText size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Transaction Ledger</h3>
                <p className="text-slate-500 text-sm mb-6">
                    Export all historical transactions including taxes, dates, and item details for financial reporting.
                </p>
                <button 
                    onClick={() => console.log('Export Ledger')}
                    className="w-full py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                    <Download size={16} /> Download CSV
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};