import React, { useState, useEffect, useDeferredValue } from 'react';
import { Search, FileUp, ArrowLeft, Package, Info, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { get, set, del } from 'idb-keyval';
import { Product } from './types';
import { HighlightText } from './components/HighlightText';
import { cn } from './lib/utils';

import initialData from './initialData.json';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedComplemento, setSelectedComplemento] = useState<string | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [availableComplementos, setAvailableComplementos] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'import'>('search');
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const DB_KEY = 'save_web_products_v2';

  // Load data from IndexedDB or initialData on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const savedData = await get<Product[]>(DB_KEY);
        if (savedData && Array.isArray(savedData)) {
          setProducts(savedData);
        } else if (initialData && initialData.length > 0) {
          setProducts(initialData as Product[]);
        }
      } catch (e) {
        console.error('Failed to load products from IndexedDB', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter products when search term changes
  useEffect(() => {
    if (!deferredSearchTerm.trim()) {
      setFilteredProducts([]);
      setAvailableComplementos([]);
      setSelectedComplemento(null);
      return;
    }

    const searchWords = deferredSearchTerm.toLowerCase().split(' ').filter(w => w.length > 0);
    
    // First pass: Filter by search words (AND logic)
    let filtered = products.filter((p) => {
      const combinedText = `${p.codigo} ${p.descricao} ${p.complemento || ''}`.toLowerCase();
      return searchWords.every(word => combinedText.includes(word));
    });

    // Extract unique complementos from the search results (before applying the complemento filter)
    const complementos = Array.from(new Set(
      filtered
        .map(p => p.complemento)
        .filter((c): c is string => !!c && c.trim().length > 0)
    )).sort();
    
    setAvailableComplementos(complementos);

    // Second pass: Filter by selected complemento chip
    if (selectedComplemento) {
      filtered = filtered.filter(p => p.complemento === selectedComplemento);
    }

    setFilteredProducts(filtered.slice(0, 100)); // Limit results for performance
  }, [deferredSearchTerm, products, selectedComplemento]);

  // Reset selected complemento when search term changes significantly
  useEffect(() => {
    setSelectedComplemento(null);
  }, [deferredSearchTerm]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const csvData = event.target?.result as string;
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const mappedData = results.data.map((row: any) => ({
              codigo: row.codigo || row.CODIGO || row.Código || '',
              descricao: row.descricao || row.DESCRICAO || row.Descrição || '',
              complemento: row.complemento || row.COMPLEMENTO || row.Complemento || '',
            })).filter(p => p.codigo || p.descricao);
            
            saveProducts(mappedData);
          }
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const mappedData = jsonData.map((row: any) => ({
          codigo: row.codigo || row.CODIGO || row.Código || '',
          descricao: row.descricao || row.DESCRICAO || row.Descrição || '',
          complemento: row.complemento || row.COMPLEMENTO || row.Complemento || '',
        })).filter(p => p.codigo || p.descricao);

        saveProducts(mappedData);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const saveProducts = async (data: Product[]) => {
    try {
      setProducts(data);
      await set(DB_KEY, data);
      setIsImporting(false);
      setActiveTab('search');
      alert(`${data.length} mercadorias importadas com sucesso!`);
    } catch (e) {
      console.error('Error saving to IndexedDB', e);
      alert('Erro ao salvar os dados. Verifique o espaço disponível.');
      setIsImporting(false);
    }
  };

  const clearData = async () => {
    if (window.confirm('Tem certeza que deseja apagar TODAS as mercadorias? Esta ação não pode ser desfeita.')) {
      setProducts([]);
      await del(DB_KEY);
      setFilteredProducts([]);
      alert('Base de dados limpa com sucesso!');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5] font-sans text-gray-900 overflow-hidden">
      {/* Header precisely matching the image */}
      <header className="bg-[#FF6B00] flex flex-col z-10 shadow-lg">
        <div className="h-6 bg-[#FF6B00]" />
        <div className="h-[3px] bg-white w-full opacity-90" />
        
        <div className="px-4 py-2 flex items-center justify-between bg-[#FF6B00]">
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Accurate SVG Recreation of the Angeloni Logo */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                {/* Outer Green Ring */}
                <circle cx="50" cy="50" r="48" fill="#2E7D32" />
                <circle cx="50" cy="50" r="44" fill="white" />
                
                {/* Inner Silver Gradient Circle */}
                <defs>
                  <radialGradient id="silverGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="30%">
                    <stop offset="0%" stopColor="#E0E0E0" />
                    <stop offset="100%" stopColor="#9E9E9E" />
                  </radialGradient>
                  <linearGradient id="gloss" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="42" fill="url(#silverGrad)" />
                
                {/* Glossy Overlay */}
                <path d="M15 35 Q 50 15 85 35 L 85 50 Q 50 30 15 50 Z" fill="url(#gloss)" />

                {/* The Orange "A" */}
                <text 
                  x="50" 
                  y="68" 
                  fontFamily="Arial Black, sans-serif" 
                  fontSize="65" 
                  fontWeight="900" 
                  fill="#FF6D00" 
                  stroke="white" 
                  strokeWidth="3" 
                  textAnchor="middle"
                  className="italic"
                >
                  A
                </text>

                {/* The 3 Green Stripes in the middle */}
                <rect x="22" y="42" width="56" height="16" fill="white" stroke="#2E7D32" strokeWidth="0.5" />
                <line x1="24" y1="46" x2="76" y2="46" stroke="#2E7D32" strokeWidth="2" />
                <line x1="24" y1="50" x2="76" y2="50" stroke="#2E7D32" strokeWidth="2" />
                <line x1="24" y1="54" x2="76" y2="54" stroke="#2E7D32" strokeWidth="2" />
              </svg>
            </div>

            {/* Stylized Text - Responsive sizes */}
            <div className="flex items-baseline text-white drop-shadow-md">
              <span className="font-script text-4xl sm:text-6xl italic -rotate-6 mr-1">SAVE</span>
              <span className="text-xl sm:text-3xl font-bold lowercase tracking-tighter">web</span>
              <span className="font-script text-4xl sm:text-6xl italic -rotate-6 ml-2 sm:ml-4">MOBILE</span>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab(activeTab === 'search' ? 'import' : 'search')}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all active:scale-90"
          >
            {activeTab === 'search' ? <FileUp size={28} className="text-white" /> : <Search size={28} className="text-white" />}
          </button>
        </div>

        <div className="h-[3px] bg-white w-full opacity-90" />
      </header>

      {/* Banner - Responsive text */}
      <div className="bg-[#FF6B00] py-2 px-4 border-b border-orange-700 flex items-center gap-2">
        <div className="w-3 h-3 bg-white shadow-sm shrink-0" />
        <p className="font-bold text-white text-sm sm:text-lg uppercase tracking-wider leading-tight">
          CONSULTA MERCADORIAS POR DESCRIÇÃO
        </p>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'search' ? (
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
            {/* Search Bar - Responsive text and icon */}
            <div className="relative">
              <input
                type="text"
                placeholder=""
                className="w-full bg-white border border-gray-300 rounded-xl py-2 sm:py-3 pl-10 sm:pl-12 pr-4 focus:border-[#FF6B00] focus:outline-none shadow-inner text-base sm:text-xl placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 sm:w-7 sm:h-7" />
            </div>

            {/* Complemento Chips */}
            {availableComplementos.length > 1 && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Filtrar Complemento:</p>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    onClick={() => setSelectedComplemento(null)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border",
                      !selectedComplemento 
                        ? "bg-[#FF6B00] text-white border-[#FF6B00] shadow-md" 
                        : "bg-white text-gray-600 border-gray-300"
                    )}
                  >
                    TODOS
                  </button>
                  {availableComplementos.map((comp) => (
                    <button
                      key={comp}
                      onClick={() => setSelectedComplemento(comp === selectedComplemento ? null : comp)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border",
                        selectedComplemento === comp
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      )}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results Table - Responsive columns */}
            <div className="flex-1 overflow-hidden border border-gray-400 rounded-2xl bg-white shadow-md flex flex-col">
              <div className="grid grid-cols-[70px_1fr_90px] sm:grid-cols-[100px_1fr_120px] bg-gradient-to-b from-[#E0E0E0] to-[#C0C0C0] border-b border-gray-400 font-bold text-sm sm:text-lg text-gray-800">
                <div className="p-2 sm:p-3 border-r border-gray-400 text-center">Código</div>
                <div className="p-2 sm:p-3 border-r border-gray-400 text-center">Descrição</div>
                <div className="p-2 sm:p-3 text-center">Compl.</div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400 gap-4">
                    <Loader2 className="animate-spin" size={48} />
                    <p className="text-xl font-medium">Carregando base de dados...</p>
                  </div>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedProduct(product)}
                      className={cn(
                        "grid grid-cols-[70px_1fr_90px] sm:grid-cols-[100px_1fr_120px] border-b border-gray-300 cursor-pointer transition-colors active:bg-orange-200",
                        idx % 2 === 0 ? "bg-[#FFE4B5]" : "bg-white"
                      )}
                    >
                      <div className="p-2 border-r border-gray-300 font-bold text-sm sm:text-lg text-center text-gray-900 flex items-center justify-center">
                        <HighlightText text={product.codigo.toString()} highlight={searchTerm} />
                      </div>
                      <div className="p-2 border-r border-gray-300 text-xs sm:text-base font-medium text-gray-800 uppercase flex items-center overflow-hidden">
                        <HighlightText text={product.descricao} highlight={searchTerm} />
                      </div>
                      <div className="p-2 text-[10px] sm:text-sm font-bold text-blue-800 uppercase flex items-center justify-center text-center">
                        <HighlightText text={product.complemento || '-'} highlight={searchTerm} />
                      </div>
                    </div>
                  ))
                ) : searchTerm ? (
                  <div className="p-8 text-center text-gray-500 italic text-xl">
                    Nenhuma mercadoria encontrada.
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-4">
                    <Info size={64} className="opacity-10" />
                    <p className="text-xl">Digite algo para iniciar a busca</p>
                    <p className="text-sm">Base de dados: {products.length} itens</p>
                  </div>
                )}
                
                {/* Footer text removed from here */}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center gap-6">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-[#FF6B00]">
              <FileUp size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Importar Planilha</h2>
              <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                Selecione um arquivo Excel (.xlsx) ou CSV com as colunas <b>codigo</b> e <b>descricao</b>.
              </p>
            </div>
            
            <label className="cursor-pointer bg-[#FF6B00] text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-[#E66000] transition-all active:scale-95 flex items-center gap-2">
              <FileUp size={20} />
              {isImporting ? 'Processando...' : 'Selecionar Arquivo'}
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isImporting}
              />
            </label>
            
            <button
              onClick={clearData}
              disabled={products.length === 0}
              className={cn(
                "mt-2 text-red-600 font-bold flex items-center gap-2 p-2 rounded-lg transition-all active:scale-95",
                products.length === 0 ? "opacity-30 grayscale cursor-not-allowed" : "hover:bg-red-50"
              )}
            >
              LIMPAR BASE DE DADOS
            </button>

            <div className="mt-8 text-left bg-white p-4 rounded-lg border border-gray-200 w-full max-w-sm">
              <h3 className="font-bold text-sm text-gray-600 uppercase mb-2">Instruções:</h3>
              <ul className="text-sm text-gray-500 space-y-1 list-disc pl-4">
                <li>A planilha deve estar no formato .xlsx ou .csv</li>
                <li>Deve conter as colunas "codigo", "descricao" e "complemento"</li>
                <li>A importação substituirá a base de dados atual</li>
                <li>O app funciona totalmente offline após a importação</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/50 z-20"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-30 shadow-2xl overflow-hidden flex flex-col"
              style={{ height: '50%' }}
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3" />
              
              <div className="px-6 pb-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Detalhes da Mercadoria</h2>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 bg-gray-100 rounded-full text-gray-500"
                  >
                    <ArrowLeft size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Código</p>
                    <p className="text-4xl font-black text-[#FF6B00] font-mono tracking-tighter">
                      {selectedProduct.codigo}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Descrição</p>
                    <p className="text-xl font-medium text-gray-800 leading-tight">
                      {selectedProduct.descricao}
                    </p>
                  </div>

                  {selectedProduct.complemento && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Complemento</p>
                      <p className="text-xl font-bold text-blue-700 uppercase">
                        {selectedProduct.complemento}
                      </p>
                    </div>
                  )}

                  <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                      <p className="text-sm font-bold text-green-600">Disponível Offline</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Filial</p>
                      <p className="text-sm font-bold text-gray-700">172 - Cascavel</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="w-full bg-[#FF6B00] text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all"
                  >
                    VOLTAR PARA LISTA
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fixed Footer - Responsive text */}
      <footer className="bg-[#FF6B00] py-2 px-4 border-t border-orange-700 flex items-center justify-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <p className="font-bold text-white text-sm sm:text-lg uppercase tracking-wider text-center">
          JOÃO PAULO - FILIAL 172 CASCAVEL
        </p>
      </footer>
    </div>
  );
}
