import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { AIAnalyst } from './pages/AIAnalyst';
import { DataManagement } from './pages/DataManagement';
import { AppView, Product, Transaction, FinancialSummary, StagedTransaction } from './types';

// Mock Data Initialization
const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Premium Rice 5kg', category: 'Food', price: 65000, cost: 50000, stock: 24, reorderPoint: 10, sku: 'RICE-001', unit: 'Bag' },
  { id: '2', name: 'Cooking Oil 2L', category: 'Food', price: 35000, cost: 28000, stock: 8, reorderPoint: 15, sku: 'OIL-002', unit: 'Bottle' },
  { id: '3', name: 'Mineral Water 600ml', category: 'Bev', price: 4000, cost: 2500, stock: 150, reorderPoint: 50, sku: 'WTR-003', unit: 'Bottle' },
  { id: '4', name: 'Instant Noodle Pack', category: 'Food', price: 3500, cost: 2200, stock: 85, reorderPoint: 40, sku: 'NDL-004', unit: 'Pack' },
  { id: '5', name: 'Dish Soap 800ml', category: 'Clean', price: 15000, cost: 11000, stock: 12, reorderPoint: 5, sku: 'SOAP-005', unit: 'Bottle' },
  { id: '6', name: 'Sugar 1kg', category: 'Food', price: 14500, cost: 12000, stock: 30, reorderPoint: 10, sku: 'SGR-006', unit: 'Pack' },
  { id: '7', name: 'Coffee Mix Pack', category: 'Bev', price: 12000, cost: 9000, stock: 45, reorderPoint: 20, sku: 'COF-007', unit: 'Pack' },
  { id: '8', name: 'Toothpaste Large', category: 'Clean', price: 18000, cost: 13000, stock: 3, reorderPoint: 10, sku: 'TP-008', unit: 'Tube' },
];

const INITIAL_SUMMARY: FinancialSummary = {
  revenue: 15400000,
  cogs: 9800000,
  grossProfit: 5600000,
  expenses: 2100000, // Rent, electricity, etc.
  netProfit: 3500000
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>(INITIAL_SUMMARY);

  // Business Logic: Automasi Pencatatan Transaksi & Pelaporan
  const handleTransactionComplete = (transaction: Transaction) => {
    // 1. Add Transaction to Journal
    setTransactions(prev => [...prev, transaction]);

    // 2. Update Inventory (Reduction Logic)
    let transactionCost = 0;
    
    const updatedProducts = products.map(product => {
      const soldItem = transaction.items.find(item => item.id === product.id);
      if (soldItem) {
        // Calculate COGS based on Product Master Cost (Standard Costing method for simplicity in this tier)
        transactionCost += product.cost * soldItem.quantity;
        return { ...product, stock: product.stock - soldItem.quantity };
      }
      return product;
    });
    setProducts(updatedProducts);

    // 3. Update Financials (Strict Accounting Logic)
    // Revenue = Subtotal (Net Sales). Tax is a liability, not revenue.
    const newRevenue = transaction.subtotal; 
    const newGrossProfit = newRevenue - transactionCost;
    
    // Net Profit = Gross Profit - Expenses (assuming Expenses didn't change for this specific sales transaction)
    // In a full ERP, expenses are separate ledger entries. Here we update the running total.
    
    setSummary(prev => ({
      ...prev,
      revenue: prev.revenue + newRevenue,
      cogs: prev.cogs + transactionCost,
      grossProfit: prev.grossProfit + newGrossProfit,
      netProfit: prev.netProfit + newGrossProfit 
    }));
  };

  const handleImportTransactions = (stagedTransactions: StagedTransaction[]) => {
    // Convert StagedTransaction to "History" or simple record
    let totalImportValue = 0;
    stagedTransactions.forEach(st => {
        totalImportValue += st.totalAmount;
    });

    setSummary(prev => ({
        ...prev,
        expenses: prev.expenses + totalImportValue,
        netProfit: prev.netProfit - totalImportValue
    }));
  };

  // Business Logic for Master Data Management
  const handleAddProduct = (newProduct: Product) => {
    // [Audit Trail] Log creation
    console.log(`[AUDIT] Product Created: ${newProduct.sku} - ${newProduct.name} by User: Prof. Accountant at ${new Date().toISOString()}`);
    setProducts(prev => [newProduct, ...prev]);
  };

  const handleUpdateStock = (productId: string, newStock: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        // [Audit Trail] Log stock adjustment
        console.log(`[AUDIT] Stock Adjustment for ${p.sku}: ${p.stock} -> ${newStock} by User: Prof. Accountant at ${new Date().toISOString()}`);
        return { ...p, stock: newStock };
      }
      return p;
    }));
  };

  const handleDeleteProduct = (productId: string) => {
     setProducts(prev => {
       const product = prev.find(p => p.id === productId);
       if (product) {
         // [Audit Trail] Log deletion
         console.log(`[AUDIT] Product Deleted: ${product.sku} by User: Prof. Accountant at ${new Date().toISOString()}`);
       }
       return prev.filter(p => p.id !== productId);
     });
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard summary={summary} transactions={transactions} products={products} />;
      case AppView.POS:
        return <POS products={products} onCompleteTransaction={handleTransactionComplete} />;
      case AppView.INVENTORY:
        return <Inventory products={products} onAddProduct={handleAddProduct} onUpdateStock={handleUpdateStock} onDeleteProduct={handleDeleteProduct} />;
      case AppView.AI_ANALYST:
        return <AIAnalyst summary={summary} transactions={transactions} products={products} />;
      case AppView.DATA_MANAGEMENT:
        return <DataManagement products={products} transactions={transactions} onImportTransactions={handleImportTransactions} />;
      default:
        return <Dashboard summary={summary} transactions={transactions} products={products} />;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;