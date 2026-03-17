import React, { useState, useEffect } from 'react';
import { Search, FileUp, ArrowLeft, Package, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from './types';
import { HighlightText } from './components/HighlightText';
import { cn } from './lib/utils';

import initialData from './initialData.json';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'import'>('search');
  const [isImporting, setIsImporting] = useState(false);

  // Load data from localStorage or initialData on mount
  useEffect(() => {
    const savedData = localStorage.getItem('save_web_products');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setProducts(parsed);
      } catch (e) {
        console.error('Failed to parse saved products', e);
      }
    } else if (initialData && initialData.length > 0) {
      // If no local storage, use the embedded data
      setProducts(initialData as Product[]);
    }
  }, []);

  // Filter products when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.codigo.toString().toLowerCase().includes(term) ||
        p.descricao.toLowerCase().includes(term)
    );
    setFilteredProducts(filtered.slice(0, 100)); // Limit results for performance
  }, [searchTerm, products]);

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
        })).filter(p => p.codigo || p.descricao);

        saveProducts(mappedData);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const saveProducts = (data: Product[]) => {
    setProducts(data);
    localStorage.setItem('save_web_products', JSON.stringify(data));
    setIsImporting(false);
    setActiveTab('search');
    alert(`${data.length} mercadorias importadas com sucesso!`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {/* Header precisely matching the image */}
      <header className="bg-[#FF6B00] flex flex-col z-10 shadow-lg">
        <div className="h-6 bg-[#FF6B00]" />
        <div className="h-[3px] bg-white w-full opacity-90" />
        
        <div className="px-4 py-2 flex items-center justify-between bg-[#FF6B00]">
          <div className="flex items-center gap-3">
            {/* Custom Logo Approximation */}
            <div className="w-16 h-16 rounded-full border-[5px] border-[#1B5E20] bg-white flex items-center justify-center relative shadow-md">
              <div className="absolute inset-0 rounded-full border-2 border-white z-20" />
              <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-[#E64A19] text-5xl font-black italic leading-none select-none" style={{ textShadow: '1px 1px 0px white' }}>A</span>
                <div className="absolute top-1/2 left-0 w-full flex flex-col gap-[2px] -translate-y-1/2 opacity-40">
                  <div className="h-[2px] bg-[#1B5E20] w-full" />
                  <div className="h-[2px] bg-[#1B5E20] w-full" />
                  <div className="h-[2px] bg-[#1B5E20] w-full" />
                </div>
              </div>
            </div>

            {/* Stylized Text */}
            <div className="flex items-baseline text-white drop-shadow-md">
              <span className="font-script text-6xl italic -rotate-6 mr-1">SAVE</span>
              <span className="text-3xl font-bold lowercase tracking-tighter">web</span>
              <span className="text-5xl font-extrabold uppercase tracking-tighter ml-4 font-sans">MOBILE</span>
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

      {/* Banner */}
      <div className="bg-[#E8E8E8] py-2 px-4 border-b border-gray-300">
        <p className="text-center font-bold text-gray-700 text-sm uppercase tracking-wider">
          CONSULTA MERCADORIAS POR DESCRIÇÃO
        </p>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'search' ? (
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar por código ou descrição..."
                className="w-full bg-white border-2 border-gray-300 rounded-lg py-3 pl-12 pr-4 focus:border-[#FF6B00] focus:outline-none shadow-sm transition-all text-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-hidden border border-gray-200 rounded-lg bg-white shadow-sm flex flex-col">
              <div className="grid grid-cols-[100px_1fr] bg-gray-100 border-b border-gray-200 font-bold text-xs uppercase tracking-wider text-gray-600">
                <div className="p-3 border-r border-gray-200">Código</div>
                <div className="p-3">Descrição Mercadoria</div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedProduct(product)}
                      className={cn(
                        "grid grid-cols-[100px_1fr] border-b border-gray-100 cursor-pointer hover:bg-orange-50 transition-colors active:bg-orange-100",
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      )}
                    >
                      <div className="p-3 border-r border-gray-100 font-mono text-sm text-gray-600">
                        <HighlightText text={product.codigo.toString()} highlight={searchTerm} />
                      </div>
                      <div className="p-3 text-sm font-medium">
                        <HighlightText text={product.descricao} highlight={searchTerm} />
                      </div>
                    </div>
                  ))
                ) : searchTerm ? (
                  <div className="p-8 text-center text-gray-500 italic">
                    Nenhuma mercadoria encontrada.
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                    <Info size={48} className="opacity-20" />
                    <p>Digite algo para iniciar a busca</p>
                    <p className="text-xs">Base de dados: {products.length} itens</p>
                  </div>
                )}
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

            <div className="mt-8 text-left bg-white p-4 rounded-lg border border-gray-200 w-full max-w-sm">
              <h3 className="font-bold text-sm text-gray-600 uppercase mb-2">Instruções:</h3>
              <ul className="text-sm text-gray-500 space-y-1 list-disc pl-4">
                <li>A planilha deve estar no formato .xlsx ou .csv</li>
                <li>Deve conter as colunas "codigo" e "descricao"</li>
                <li>A importação substituirá a base de dados atual</li>
                <li>O app funciona totalmente offline após a importação</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 p-3 text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
          JOÃO PAULO - FILIAL 172 CASCAVEL
        </p>
      </footer>

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
    </div>
  );
}
