/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component, useRef } from 'react';
import { SalesManager } from './Sales';
import { 
  Search, 
  Plus, 
  Check,
  Edit,
  Trash2,
  LayoutDashboard, 
  FileText, 
  LogOut, 
  LogIn,
  UserPlus, 
  Loader2,
  Package,
  Wrench,
  Grid3X3,
  FileUp,
  Download,
  Upload,
  Menu,
  X,
  ShieldCheck,
  Database,
  Truck,
  Calculator,
  Home,
  Mail,
  Save,
  Image,
  Globe,
  ExternalLink,
  Activity,
  ArrowRight
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  getDocFromServer,
  where
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { db, auth } from './firebase';
import { Tile, Good, Tool, Category, BookedItem, Tab, UserRole, UserDoc, UserStatus } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to convert number to words
function numberToWords(num: number): string {
  if (num === 0) return 'Zero taka only';
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  let nStr = num.toString();
  if (nStr.length > 9) return 'OVERFLOW';
  const n = ('000000000' + nStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  
  const result = (str.trim() + ' taka only').toLowerCase();
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// Helper to check if a URL should open in a new tab (iframe blockers)
function shouldOpenInNewTab(url: string): boolean {
  if (!url) return false;
  const blockers = [
     'google.com', 'sanipexgroup.com', 'tubadzin.pl/en', 'arpaceramiche.it/en'
  ];
  return blockers.some(domain => url.toLowerCase().includes(domain));
}

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error) message = `Firestore Error: ${parsed.error}`;
      } catch (e) {
        message = this.state.error?.message || message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Error</h2>
            <p className="text-gray-600 mb-8">{message}</p>
            <Button onClick={() => window.location.reload()} variant="primary" className="w-full">
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Constants ---
const BLUE_COLOR = '#4285F4';

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className,
  disabled,
  type = 'button',
  title
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
}) => {
  const variants = {
    primary: 'bg-[#0f172a] text-white hover:bg-slate-800 shadow-sm',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        'rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({ 
  label, 
  value, 
  defaultValue,
  onChange, 
  placeholder, 
  type = 'text',
  className,
  required,
  name,
  step,
  list,
  options
}: { 
  label?: string; 
  value?: string | number; 
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder?: string;
  type?: string;
  className?: string;
  required?: boolean;
  name?: string;
  step?: string;
  list?: string;
  options?: string[];
}) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      type={type}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      step={step}
      list={list}
      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
    />
    {list && options && (
      <datalist id={list}>
        {options.map((opt, i) => (
          <option key={i} value={opt} />
        ))}
      </datalist>
    )}
  </div>
);

const TableHeader = ({ children, className, align = 'left' }: { children: React.ReactNode; className?: string; align?: 'left' | 'center' | 'right' }) => (
  <th className={cn(
    "px-4 py-3 text-sm font-normal text-gray-900 uppercase bg-slate-200 border-b-2 border-slate-400 sticky top-0 z-10",
    align === 'center' && 'text-center',
    align === 'right' && 'text-right',
    className
  )}>
    {children}
  </th>
);

function ViewQuote({ quotes, isSuperAdmin, isSupremeAdmin, onDelete, onDownload, onEdit, onBulkDelete }: { 
  quotes: any[], 
  isSuperAdmin: boolean, 
  isSupremeAdmin: boolean,
  onDelete: (id: string) => void,
  onDownload: (quote: any) => void,
  onEdit: (quote: any) => void,
  onBulkDelete?: (ids: string[]) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const filtered = quotes.filter(q => 
    (q.quoteInfo?.ref || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.quoteInfo?.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.quoteInfo?.to || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(q => q.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-white border border-gray-200 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                {selectedIds.length}
              </div>
              <span className="text-sm font-medium text-gray-600">Items Selected</span>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setSelectedIds([])}
                className="text-gray-600"
              >
                Deselect All
              </Button>
              {(isSuperAdmin || isSupremeAdmin) && onBulkDelete && (
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={() => onBulkDelete(selectedIds)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Selected
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSelectAll}
              className={cn(
                "w-5 h-5 rounded border transition-all flex items-center justify-center",
                selectedIds.length === filtered.length && filtered.length > 0
                  ? "bg-[#0f172a] border-[#0f172a] text-white"
                  : "border-gray-300 bg-white hover:border-blue-400"
              )}
            >
              {selectedIds.length === filtered.length && filtered.length > 0 && <Check className="w-3 h-3" />}
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Saved Quotations</h2>
              <p className="text-gray-500 text-xs sm:text-sm">Manage and view all generated quotes</p>
            </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setViewMode('gallery')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'gallery' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
              title="Gallery View"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
              title="List View"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by Ref, Client or Name..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {viewMode === 'gallery' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map((quote) => (
            <div key={quote.id} className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer relative" onClick={() => setSelectedQuote(quote)}>
              {/* Selection Checkbox */}
              <div 
                className={cn(
                  "absolute top-4 left-4 z-10 w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                  selectedIds.includes(quote.id)
                    ? "bg-[#0f172a] border-[#0f172a] text-white opacity-100"
                    : "bg-white/80 border-white shadow-sm opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => toggleSelect(quote.id, e)}
              >
                {selectedIds.includes(quote.id) && <Check className="w-4 h-4" />}
              </div>

              {/* Preview Area */}
              <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden border-b border-gray-100 p-3 sm:p-4 flex flex-col gap-2">
                <div className="w-full h-full bg-white shadow-sm rounded-sm p-2 text-[4px] overflow-hidden select-none pointer-events-none flex flex-col border border-gray-200">
                  {/* Mini Document Preview */}
                  <div className="flex justify-between items-center mb-1 border-b border-gray-100 pb-0.5">
                    <div className="font-bold text-[5px] text-blue-600">QUOTATION</div>
                    <div className="text-gray-400 scale-75 origin-right font-mono">{quote.quoteInfo?.ref}</div>
                  </div>
                  
                  <div className="flex justify-between mb-1 text-[3px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="font-bold">To:</div>
                      <div className="text-gray-600 truncate w-20">{quote.quoteInfo?.to}</div>
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                      <div className="font-bold">Date:</div>
                      <div className="text-gray-600">{quote.quoteInfo?.date}</div>
                    </div>
                  </div>

                  <div className="flex-1 border border-gray-50 rounded-sm overflow-hidden">
                    <div className="grid grid-cols-6 bg-gray-50 text-[3px] font-bold p-0.5 border-b border-gray-100">
                      <div className="col-span-3">Item</div>
                      <div className="text-center">Qty</div>
                      <div className="text-center">Rate</div>
                      <div className="text-right">Total</div>
                    </div>
                    <div className="flex flex-col">
                      {(quote.quoteItems || []).slice(0, 8).map((item: any, i: number) => (
                        <div key={i} className="grid grid-cols-6 text-[2.5px] p-0.5 border-b border-gray-50 last:border-0">
                          <div className="col-span-3 truncate">{item.name || item.code}</div>
                          <div className="text-center">{item.qtyPcs}</div>
                          <div className="text-center">{item.unitPrice}</div>
                          <div className="text-right font-bold">{item.totalPrice}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-1 flex justify-end">
                    <div className="w-16 h-2 bg-blue-50 rounded-sm flex items-center justify-between px-1">
                      <div className="text-[3px] font-bold">Total:</div>
                      <div className="text-[3px] font-bold text-blue-600">{quote.totalAmount}</div>
                    </div>
                  </div>
                </div>
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDownload(quote); }}
                    className="p-3 bg-white text-blue-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                    title="Download PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  {(isSuperAdmin || isSupremeAdmin) && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(quote); }}
                        className="p-3 bg-white text-amber-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(quote.id); }}
                        className="p-3 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Info Area */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-mono">{quote.quoteInfo?.ref}</span>
                    <span className="text-[10px] text-gray-400">{quote.quoteInfo?.date}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 truncate mb-1">{quote.quoteInfo?.client}</h3>
                  <p className="text-xs text-gray-500 truncate">{quote.quoteInfo?.to}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Total Amount</span>
                  <span className="font-bold text-gray-900">{quote.totalAmount?.toLocaleString()} BDT</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-auto max-h-[60vh] md:max-h-[70vh] overscroll-contain">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
              <tr>
                <th className="p-4 w-12 border-b border-gray-200">
                  <button 
                    onClick={toggleSelectAll}
                    className={cn(
                      "w-5 h-5 rounded border transition-all flex items-center justify-center",
                      selectedIds.length === filtered.length && filtered.length > 0
                        ? "bg-[#0f172a] border-[#0f172a] text-white"
                        : "border-gray-300 bg-white hover:border-blue-400"
                    )}
                  >
                    {selectedIds.length === filtered.length && filtered.length > 0 && <Check className="w-3 h-3" />}
                  </button>
                </th>
                <th className="p-4 font-normal text-gray-700 border-b border-gray-200">Ref No</th>
                <th className="p-4 font-normal text-gray-700 border-b border-gray-200">Date</th>
                <th className="p-4 font-normal text-gray-700 border-b border-gray-200">Client</th>
                <th className="p-4 font-normal text-gray-700 border-b border-gray-200">To</th>
                <th className="p-4 font-normal text-gray-700 text-right border-b border-gray-200">Total Amount</th>
                <th className="p-4 font-normal text-gray-700 text-center border-b border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((quote) => (
                <tr key={quote.id} className={cn(
                  "border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer",
                  selectedIds.includes(quote.id) && "bg-blue-50/50"
                )} onClick={() => setSelectedQuote(quote)}>
                  <td className="p-4" onClick={(e) => toggleSelect(quote.id, e)}>
                    <div className={cn(
                      "w-5 h-5 rounded border transition-all flex items-center justify-center",
                      selectedIds.includes(quote.id)
                        ? "bg-[#0f172a] border-[#0f172a] text-white"
                        : "border-gray-300 bg-white"
                    )}>
                      {selectedIds.includes(quote.id) && <Check className="w-3 h-3" />}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs font-bold text-blue-600">{quote.quoteInfo?.ref}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{quote.quoteInfo?.date}</td>
                  <td className="p-4 font-medium text-gray-900">{quote.quoteInfo?.client}</td>
                  <td className="p-4 text-sm text-gray-600">{quote.quoteInfo?.to}</td>
                  <td className="p-4 text-right font-normal text-gray-900">{quote.totalAmount?.toLocaleString()} BDT</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => onDownload(quote)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {(isSuperAdmin || isSupremeAdmin) && (
                        <>
                          <button 
                            onClick={() => onEdit(quote)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDelete(quote.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Large View Modal */}
      <AnimatePresence>
        {selectedQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedQuote(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Quotation Preview</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-mono">{selectedQuote.quoteInfo?.ref}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="primary" size="sm" onClick={() => { onDownload(selectedQuote); setSelectedQuote(null); }}>
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                  <button 
                    onClick={() => setSelectedQuote(null)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100 custom-scrollbar">
                <div id="quotation-preview-content" className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] text-gray-900 flex flex-col">
                  {/* Header */}
                  <div id="quotation-header" className="bg-black relative overflow-hidden w-full">
                    {selectedQuote.quoteHeader?.headerImage ? (
                      <img 
                        src={selectedQuote.quoteHeader.headerImage} 
                        alt="Header" 
                        className="w-full h-auto block min-h-[100px]" 
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="p-6 flex items-center gap-4 min-h-[100px] text-white">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                          <span className="text-black font-black text-xl">{selectedQuote.quoteHeader?.logoText || 'BD'}</span>
                        </div>
                        <div>
                          <h1 className="text-xl font-black tracking-widest uppercase">{selectedQuote.quoteHeader?.companyName || 'BAROBI DESIGN'}</h1>
                        </div>
                      </div>
                    )}
                  </div>

                  <div id="quotation-body" className="p-8 sm:p-12 pt-8 space-y-8 flex-1">
                    {/* Title & Ref */}
                    <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                      <h2 className="text-3xl font-black text-blue-600 tracking-tight">QUOTATION</h2>
                      <p className="text-sm font-mono font-bold">{selectedQuote.quoteInfo?.ref}</p>
                    </div>

                    {/* Info */}
                  <div className="grid grid-cols-2 gap-12 text-sm">
                    <div className="space-y-4">
                      <div>
                        <div className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-1">Bill To</div>
                        <div className="font-black text-lg">{selectedQuote.quoteInfo?.to}</div>
                        <div className="text-gray-600">{selectedQuote.quoteInfo?.attn}</div>
                      </div>
                      <div>
                        <div className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-1">Client</div>
                        <div className="font-bold">{selectedQuote.quoteInfo?.client}</div>
                      </div>
                    </div>
                    <div className="space-y-4 text-right">
                      <div>
                        <div className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-1">Date</div>
                        <div className="font-bold">{selectedQuote.quoteInfo?.date}</div>
                      </div>
                      <div>
                        <div className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-1">Project Details</div>
                        <div className="text-gray-600">{selectedQuote.quoteInfo?.projectDetails}</div>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="flex-1 overflow-auto max-h-[50vh] overscroll-contain border rounded-lg">
                    <table className="w-full border-collapse min-w-[600px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                          <th className="p-3 text-left w-12">Sl</th>
                          <th className="p-3 text-left">Description</th>
                          <th className="p-3 text-center w-20">Qty</th>
                          <th className="p-3 text-right w-32">Rate</th>
                          <th className="p-3 text-right w-32">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {(selectedQuote.quoteItems || []).map((item: any, i: number) => (
                          <tr key={i} className="border-b border-gray-200">
                            <td className="p-3 align-top">{i + 1}</td>
                            <td className="p-3 align-top">
                              <div className="font-bold text-gray-900">{item.name || item.code}</div>
                              <div className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{item.description}</div>
                              {item.imageUrl && (
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.name} 
                                  className="mt-2 w-32 h-20 object-cover rounded border border-gray-100" 
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </td>
                            <td className="p-3 text-center align-top">{item.qtyPcs}</td>
                            <td className="p-3 text-right align-top">{item.unitPrice?.toLocaleString()}</td>
                            <td className="p-3 text-right align-top font-normal">{item.totalPrice?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td colSpan={4} className="p-4 text-right font-normal uppercase tracking-wider text-xs">Grand Total</td>
                          <td className="p-4 text-right font-normal text-lg text-blue-600">{selectedQuote.totalAmount?.toLocaleString()} BDT</td>
                        </tr>
                      </tfoot>
                    </table>
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 italic text-sm text-blue-800">
                      <span className="font-bold uppercase text-[10px] tracking-widest block mb-1 not-italic opacity-50">In Words</span>
                      {numberToWords(selectedQuote.totalAmount || 0)}
                    </div>
                  </div>

                  {/* Footer (Terms & Signature) */}
                  <div id="quotation-last-page-content" className="grid grid-cols-2 gap-12 pt-12 border-t border-gray-100">
                    <div className="space-y-4">
                      <div className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Terms & Conditions</div>
                      <div className="text-[10px] text-gray-500 whitespace-pre-wrap leading-relaxed">
                        {selectedQuote.quoteTerms}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-end space-y-8">
                      <div className="text-right space-y-1">
                        <div className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-4">Authorized Signature</div>
                        <div className="h-12 border-b border-gray-300 w-48 ml-auto" />
                        <div className="text-xs font-bold whitespace-pre-wrap mt-2">{selectedQuote.quoteSignature}</div>
                      </div>
                    </div>
                  </div>
                  </div>
                  
                  {/* Footer (Black bar) */}
                  <div id="quotation-footer" className="mt-auto bg-black text-white text-[10px] text-center overflow-hidden h-[100px] flex flex-col justify-center">
                    {selectedQuote.quoteFooter?.footerImage ? (
                      <img 
                        src={selectedQuote.quoteFooter.footerImage} 
                        alt="Footer" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="p-6 space-y-1">
                        <p className="font-bold">{selectedQuote.quoteFooter?.officeAddress}</p>
                        <p>{selectedQuote.quoteFooter?.contactInfo}</p>
                        <p className="font-bold">{selectedQuote.quoteFooter?.registeredAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="col-span-full p-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-medium text-gray-900">No saved quotations found</h3>
          <p className="text-gray-500">Try searching with a different keyword or create a new quote.</p>
        </div>
      )}
    </div>
  );
}

const UserRoleTable = ({ 
  title, 
  users, 
  onUpdateRole, 
  onUpdateStatus, 
  onUpdateExpiry, 
  onDelete, 
  currentUser,
  roleColor
}: { 
  title: string, 
  users: any[], 
  onUpdateRole: (id: string, role: UserRole) => void,
  onUpdateStatus: (id: string, status: string) => void,
  onUpdateExpiry: (id: string, date: string) => void,
  onDelete: (id: string) => void,
  currentUser: any,
  roleColor: string
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 px-2">
      <div className={cn("w-2 h-6 rounded-full bg-current", roleColor)} />
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
        {users.length}
      </span>
    </div>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-auto max-h-[60vh] md:max-h-[70vh] overscroll-contain">
      <table className="w-full border-separate border-spacing-0 min-w-[1000px]">
        <thead>
          <tr>
            <TableHeader align="center">SL</TableHeader>
            <TableHeader>User Info</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader align="center">Role & Status</TableHeader>
            <TableHeader align="center">Expiry Date</TableHeader>
            <TableHeader align="center">Actions</TableHeader>
          </tr>
        </thead>
        <tbody>
          {users.map((u, index) => (
            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
              <TableCell align="center" style={{ color: BLUE_COLOR }} className="font-mono text-xs">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <LogIn className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{u.displayName}</span>
                      {u.email === 'bijoymahmudmunna@gmail.com' && (
                        <span className="bg-purple-100 text-purple-700 text-[8px] font-normal px-1.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-0.5">
                          <ShieldCheck className="w-2 h-2" /> SUPREME
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full w-fit font-normal uppercase",
                      u.status === 'approved' ? "bg-green-100 text-green-700" :
                      u.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {u.status}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-gray-600">{u.email}</TableCell>
              <TableCell align="center">
                <div className="flex flex-col gap-2">
                  <select
                    value={u.email === 'bijoymahmudmunna@gmail.com' ? 'supreme_admin' : u.role}
                    disabled={['bijoymahmudmunna@gmail.com'].includes(u.email)}
                    onChange={(e) => onUpdateRole(u.id, e.target.value as UserRole)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="guest">Guest</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="supreme_admin">Administrator</option>
                  </select>
                  <select
                    value={u.status}
                    disabled={['bijoy.mm112@gmail.com'].includes(u.email)}
                    onChange={(e) => onUpdateStatus(u.id, e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </TableCell>
              <TableCell align="center">
                <div className="flex flex-col gap-2">
                  <input 
                    type="date"
                    value={u.expiryDate || ''}
                    disabled={['bijoy.mm112@gmail.com'].includes(u.email)}
                    onChange={(e) => onUpdateExpiry(u.id, e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  {u.expiryDate && (
                    <span className={cn(
                      "text-[10px] font-normal uppercase",
                      new Date(u.expiryDate) < new Date() ? "text-red-500" : "text-green-600"
                    )}>
                      {new Date(u.expiryDate) < new Date() ? 'Expired' : 'Active'}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell align="center">
                <button
                  disabled={['bijoymahmudmunna@gmail.com'].includes(u.email) || u.id === currentUser?.uid}
                  onClick={() => onDelete(u.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </TableCell>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="p-8 text-center text-gray-400 italic text-sm">
                No users found in this category
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const TableCell = ({ children, className, align = 'left', style }: { children?: React.ReactNode; className?: string; align?: 'left' | 'center' | 'right'; style?: React.CSSProperties }) => (
  <td 
    style={style}
    className={cn(
      "px-4 py-3 text-sm text-gray-800 border border-slate-300 font-normal",
      align === 'center' && 'text-center',
      align === 'right' && 'text-right',
      className
    )}
  >
    {children}
  </td>
);

const MavxonLogo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-1", className)}>
    <span className="text-[#FBBF24] font-black tracking-tighter">mav</span>
    <span className="text-[#3B82F6] font-black tracking-tighter">xon</span>
    <span className="text-white font-bold ml-1 text-xs">IMS</span>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const quoteRef = React.useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!quoteRef.current) return;
    const loadingToast = toast.loading('Preparing PDF generation...');
    
    // Save original scroll position
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    let originalOverflow = '';
    let originalHeight = '';
    const originalSrcs = new Map<HTMLImageElement, string>();

    try {
      // Scroll to top for better html2canvas reliability
      window.scrollTo(0, 0);
      
      // Ensure the element is visible and scrolled into view
      quoteRef.current.scrollIntoView();
      
      // Temporarily remove constraints for capture
      originalOverflow = quoteRef.current.style.overflow;
      originalHeight = quoteRef.current.style.height;
      quoteRef.current.style.overflow = 'visible';
      quoteRef.current.style.height = 'auto';

      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Pre-process images to base64 to avoid html2canvas CORS issues on custom domains
      const images = Array.from(quoteRef.current.querySelectorAll('img')) as HTMLImageElement[];
      
      for (const img of images) {
        if (img.src && !img.src.startsWith('data:')) {
          originalSrcs.set(img, img.src);
          try {
            img.src = await urlToBase64(img.src);
          } catch (e) {
            console.warn("Failed to convert image to base64 for PDF", e);
          }
        }
      }

      const header = quoteRef.current.querySelector('#quotation-header') as HTMLElement;
      const body = quoteRef.current.querySelector('#quotation-body') as HTMLElement;
      const lastPage = quoteRef.current.querySelector('#quotation-last-page-content') as HTMLElement;
      const footer = quoteRef.current.querySelector('#quotation-footer') as HTMLElement;

      if (!header || !body || !lastPage || !footer) {
        toast.dismiss(loadingToast);
        toast.error('Missing quotation elements for PDF generation.');
        quoteRef.current.style.overflow = originalOverflow;
        quoteRef.current.style.height = originalHeight;
        window.scrollTo(scrollX, scrollY);
        return;
      }

      toast.loading('Capturing content...', { id: loadingToast });

      const canvasOptions = {
        scale: 1, // Use scale 1 for maximum reliability
        useCORS: true,
        allowTaint: false, // Must be false to prevent SecurityError on toDataURL
        logging: true,
        backgroundColor: '#ffffff',
        imageTimeout: 90000,
        onclone: (clonedDoc: Document) => {
          // Fix oklch/oklab issues more aggressively
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            const htmlEl = el as HTMLElement;
            // Force colors to standard hex/rgb to avoid html2canvas crash
            if (htmlEl.classList.contains('text-blue-600')) htmlEl.style.color = '#2563eb';
            if (htmlEl.classList.contains('text-blue-500')) htmlEl.style.color = '#3b82f6';
            if (htmlEl.classList.contains('text-gray-900')) htmlEl.style.color = '#111827';
            if (htmlEl.classList.contains('text-gray-600')) htmlEl.style.color = '#4b5563';
            if (htmlEl.classList.contains('text-gray-500')) htmlEl.style.color = '#6b7280';
            if (htmlEl.classList.contains('text-red-600')) htmlEl.style.color = '#dc2626';
            if (htmlEl.classList.contains('bg-blue-600')) htmlEl.style.backgroundColor = '#2563eb';
            if (htmlEl.classList.contains('bg-gray-900')) htmlEl.style.backgroundColor = '#111827';
            if (htmlEl.classList.contains('bg-gray-50')) htmlEl.style.backgroundColor = '#f9fafb';
            if (htmlEl.classList.contains('bg-black')) htmlEl.style.backgroundColor = '#000000';
            if (htmlEl.classList.contains('bg-blue-50')) htmlEl.style.backgroundColor = '#eff6ff';
            if (htmlEl.classList.contains('border-gray-100')) htmlEl.style.borderColor = '#f3f4f6';
            if (htmlEl.classList.contains('border-gray-200')) htmlEl.style.borderColor = '#e5e7eb';
            
            // Generic replacement for any oklch or oklab in computed styles
            const style = htmlEl.style;
            if (style) {
              if (style.color && (style.color.includes('okl') || style.color.includes('var'))) style.color = '#1f2937';
              if (style.backgroundColor && (style.backgroundColor.includes('okl') || style.backgroundColor.includes('var'))) style.backgroundColor = '#ffffff';
              if (style.borderColor && (style.borderColor.includes('okl') || style.borderColor.includes('var'))) style.borderColor = '#d1d5db';
              
              if (style.cssText && (style.cssText.includes('oklch') || style.cssText.includes('oklab'))) {
                style.cssText = style.cssText.replace(/oklch\([^)]+\)/g, '#3b82f6').replace(/oklab\([^)]+\)/g, '#3b82f6');
              }
            }
          });

          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach(tag => {
            // Remove any CSS lines containing oklch or oklab entirely to prevent html2canvas parser crash
            tag.innerHTML = tag.innerHTML.replace(/[^;{}]*okl(ch|ab)[^;{}]*;/g, '');
            tag.innerHTML = tag.innerHTML.replace(/[^;{}]*okl(ch|ab)[^;{}]*}/g, '}');
            
            // Blanket replacement for any stragglers
            tag.innerHTML = tag.innerHTML.replace(/okl(ch|ab)\([^)]+\)/g, 'rgb(0,0,0)');
            // Extreme blanket replace just the word to prevent crash
            tag.innerHTML = tag.innerHTML.replace(/okl(ch|ab)/g, 'rgb');
          });

          // Force essential PDF styles
          const pdfStyle = clonedDoc.createElement('style');
          pdfStyle.innerHTML = `
            * { 
              font-family: 'Times New Roman', Times, serif !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            /* Hide UI elements */
            button, .group-hover\\:opacity-100, input[type="file"], .page-break-marker, .animate-bounce, .page-break-indicator { 
              display: none !important; 
            }
            
            /* Ensure background colors are captured */
            #quotation-header { background-color: #000000 !important; color: white !important; min-height: 100px !important; width: 100% !important; display: block !important; }
            #quotation-footer { background-color: #000000 !important; color: white !important; display: block !important; width: 100% !important; height: 100px !important; }
            
            /* Table adjustments for PDF */
            table { border-collapse: collapse !important; width: 100% !important; border: 1px solid #d1d5db !important; }
            th, td { 
              border: 1px solid #d1d5db !important; 
              padding: 8px !important; 
              text-align: center !important;
              vertical-align: middle !important;
              font-size: 10px !important;
              background-color: transparent !important;
            }
            th { background-color: #f3f4f6 !important; font-weight: bold !important; }
            
            /* Layout fixes */
            #quotation-body { padding: 40px !important; display: block !important; height: auto !important; width: 100% !important; background: white !important; }
            #quotation-last-page-content { padding: 20px !important; padding-top: 0 !important; display: block !important; height: auto !important; width: 100% !important; background: white !important; }
            
            /* Text adjustments */
            .text-red-600 { color: #dc2626 !important; }
            .font-bold { font-weight: 700 !important; }
            .uppercase { text-transform: uppercase !important; }
            .underline { text-decoration: underline !important; }
          `;
          clonedDoc.head.appendChild(pdfStyle);
        }
      };

      // Capture each part with error handling for each
      const capturePart = async (el: HTMLElement, name: string) => {
        try {
          // Ensure element is visible before capture
          const originalStyle = el.style.display;
          el.style.display = 'block';
          const canvas = await html2canvas(el, canvasOptions);
          el.style.display = originalStyle;
          return canvas;
        } catch (err) {
          console.error(`Failed to capture ${name}:`, err);
          throw new Error(`Failed to capture ${name}. Please try again.`);
        }
      };

      const headerCanvas = await capturePart(header, 'Header');
      const bodyCanvas = await capturePart(body, 'Body');
      const lastPageCanvas = await capturePart(lastPage, 'Terms/Signature');
      const footerCanvas = await capturePart(footer, 'Footer');

      toast.loading('Building PDF pages...', { id: loadingToast });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pdfWidth - (margin * 2);

      const headerImgData = headerCanvas.toDataURL('image/png');
      const bodyImgData = bodyCanvas.toDataURL('image/png');
      const lastPageImgData = lastPageCanvas.toDataURL('image/png');
      const footerImgData = footerCanvas.toDataURL('image/png');

      const headerHeight = (headerCanvas.height * pdfWidth) / headerCanvas.width;
      const footerHeight = (footerCanvas.height * pdfWidth) / footerCanvas.width;
      
      // Calculate body height in PDF units
      const bodyFullHeight = (bodyCanvas.height * contentWidth) / bodyCanvas.width;
      const lastPageHeight = (lastPageCanvas.height * contentWidth) / lastPageCanvas.width;

      const availableHeightPerPage = pdfHeight - headerHeight - footerHeight - (margin * 2);
      const maxSliceHeightCanvas = (availableHeightPerPage * bodyCanvas.width) / contentWidth;

      // Get manual page break positions
      const markers = Array.from(body.querySelectorAll('.page-break-marker')) as HTMLElement[];
      const bodyRect = body.getBoundingClientRect();
      const manualBreaks = markers.map(m => {
        const mRect = m.getBoundingClientRect();
        const relativeY = mRect.top - bodyRect.top;
        return (relativeY * bodyCanvas.height) / bodyRect.height;
      });

      // Add the end of the body as a final break point
      manualBreaks.push(bodyCanvas.height);
      const sortedBreaks = Array.from(new Set(manualBreaks)).sort((a, b) => a - b);
      
      let lastPoint = 0;
      let pageNumber = 1;

      while (lastPoint < bodyCanvas.height) {
        if (pageNumber > 1) pdf.addPage();

        // 1. Add Header (Full width)
        pdf.addImage(headerImgData, 'PNG', 0, 0, pdfWidth, headerHeight);

        // 2. Determine next break point
        const nextManualBreak = sortedBreaks.find(b => b > lastPoint + 10);
        
        let nextBreak;
        if (nextManualBreak && (nextManualBreak - lastPoint) <= maxSliceHeightCanvas) {
          nextBreak = nextManualBreak;
        } else {
          nextBreak = Math.min(lastPoint + maxSliceHeightCanvas, bodyCanvas.height);
        }

        const sliceHeightCanvas = nextBreak - lastPoint;
        const sliceHeightPDF = (sliceHeightCanvas * contentWidth) / bodyCanvas.width;

        // 3. Add Body Slice
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = bodyCanvas.width;
        sliceCanvas.height = sliceHeightCanvas;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            bodyCanvas,
            0, lastPoint,
            bodyCanvas.width, sliceHeightCanvas,
            0, 0,
            sliceCanvas.width, sliceCanvas.height
          );
          const sliceImgData = sliceCanvas.toDataURL('image/png');
          pdf.addImage(sliceImgData, 'PNG', margin, headerHeight + margin, contentWidth, sliceHeightPDF);
        }

        // 4. Add Footer (Full width at bottom)
        pdf.addImage(footerImgData, 'PNG', 0, pdfHeight - footerHeight, pdfWidth, footerHeight);

        // 5. Handle Last Page Content (Terms, Signature)
        if (nextBreak >= bodyCanvas.height - 5) {
          const remainingSpaceOnLastPage = availableHeightPerPage - sliceHeightPDF;
          const buffer = quoteItems.length === 0 ? 5 : 30;
          const gap = quoteItems.length === 0 ? 5 : 15;
          
          if (!forceTermsToNewPage && remainingSpaceOnLastPage >= lastPageHeight + buffer + gap) {
            pdf.addImage(lastPageImgData, 'PNG', margin, headerHeight + margin + sliceHeightPDF + gap, contentWidth, lastPageHeight);
          } else {
            pdf.addPage();
            pdf.addImage(headerImgData, 'PNG', 0, 0, pdfWidth, headerHeight);
            pdf.addImage(lastPageImgData, 'PNG', margin, headerHeight + margin, contentWidth, lastPageHeight);
            pdf.addImage(footerImgData, 'PNG', 0, pdfHeight - footerHeight, pdfWidth, footerHeight);
          }
        }

        lastPoint = nextBreak;
        pageNumber++;
      }

      pdf.save(`Quotation_${quoteInfo.ref || Date.now()}.pdf`);
      toast.dismiss(loadingToast);
      toast.success('PDF generated successfully!');
      // Restore styles and scroll
      if (quoteRef.current) {
        quoteRef.current.style.overflow = originalOverflow;
        quoteRef.current.style.height = originalHeight;
      }
      for (const [img, src] of originalSrcs.entries()) {
        img.src = src;
      }
      window.scrollTo(scrollX, scrollY);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('PDF Generation Error:', error);
      toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Restore styles and scroll on error too
      if (quoteRef.current) {
        quoteRef.current.style.overflow = originalOverflow;
        quoteRef.current.style.height = originalHeight;
      }
      for (const [img, src] of originalSrcs.entries()) {
        img.src = src;
      }
      window.scrollTo(scrollX, scrollY);
    }
  };
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    type: 'danger' | 'warning' 
  } | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('landing');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [marketingFilter, setMarketingFilter] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [goods, setGoods] = useState<Good[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [bookedItems, setBookedItems] = useState<BookedItem[]>([]);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [currentUserDoc, setCurrentUserDoc] = useState<UserDoc | null>(null);

  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [selectedGoods, setSelectedGoods] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedBookedItems, setSelectedBookedItems] = useState<string[]>([]);
  const [savedQuotes, setSavedQuotes] = useState<any[]>([]);

  const [showAddModal, setShowAddModal] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<{ category: Category; item: any } | null>(null);

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    tiles.forEach(t => t.brand && brands.add(t.brand));
    goods.forEach(g => g.brand && brands.add(g.brand));
    bookedItems.forEach(b => b.brand && brands.add(b.brand));
    return Array.from(brands).sort();
  }, [tiles, goods, bookedItems]);

  const uniqueSizes = useMemo(() => {
    const sizes = new Set<string>();
    tiles.forEach(t => t.size && sizes.add(t.size));
    bookedItems.forEach(b => b.size && sizes.add(b.size));
    return Array.from(sizes).sort();
  }, [tiles, bookedItems]);

  const uniqueNames = useMemo(() => {
    const names = new Set<string>();
    tiles.forEach(t => t.name && names.add(t.name));
    bookedItems.forEach(b => b.name && names.add(b.name));
    return Array.from(names).sort();
  }, [tiles, bookedItems]);

  const uniqueMarketingPersons = useMemo(() => {
    const persons = new Set<string>();
    bookedItems.forEach(b => !b.deleted && b.marketingPerson && persons.add(b.marketingPerson));
    return Array.from(persons).sort();
  }, [bookedItems]);

  const uniqueClientNames = useMemo(() => {
    const clients = new Set<string>();
    bookedItems.forEach(b => b.clientName && clients.add(b.clientName));
    return Array.from(clients).sort();
  }, [bookedItems]);

  const uniqueQuoteTo = useMemo(() => {
    const toSet = new Set<string>();
    savedQuotes.forEach(q => q.quoteInfo?.to && toSet.add(q.quoteInfo.to));
    return Array.from(toSet).sort();
  }, [savedQuotes]);

  const uniqueQuoteAttn = useMemo(() => {
    const attnSet = new Set<string>();
    savedQuotes.forEach(q => q.quoteInfo?.attn && attnSet.add(q.quoteInfo.attn));
    return Array.from(attnSet).sort();
  }, [savedQuotes]);

  const uniqueQuoteClient = useMemo(() => {
    const clientSet = new Set<string>();
    savedQuotes.forEach(q => q.quoteInfo?.client && clientSet.add(q.quoteInfo.client));
    return Array.from(clientSet).sort();
  }, [savedQuotes]);

  const uniqueQuoteProject = useMemo(() => {
    const projectSet = new Set<string>();
    savedQuotes.forEach(q => q.quoteInfo?.projectDetails && projectSet.add(q.quoteInfo.projectDetails));
    return Array.from(projectSet).sort();
  }, [savedQuotes]);

  // Quotation Builder State
  const [quoteHeader, setQuoteHeader] = useState({
    logoText: 'BD',
    companyName: 'BAROBI DESIGN',
    headerImage: ''
  });
  const [quoteInfo, setQuoteInfo] = useState({
    to: '',
    attn: '',
    client: '',
    date: new Date().toLocaleDateString('en-GB'),
    ref: '',
    projectDetails: '',
    address: ''
  });
  const [quoteTerms, setQuoteTerms] = useState(`Delivery Time: Subject to availability in stock, the product will be delivered within 7 working days and will take between 14 to 16 weeks from the date of receiving advance payment.
Supply may be delayed due to natural disasters and political unrest in the country.
Payment Terms: Advance 100% payment with work order
Offer validity: 30 days from the date of the offer.
VAT / AIT: The price quoted includes AIT and VAT.
Scope of Work: Supply Only.
Note: The Prices quoted are special project prices applicable to this project. The price offered may change if the Government Duty / Tax policy or foreign exchange rate changes during the contract period.

Any changes in the actual quantities to be supplied will result in a variation of the value.

We trust you find the quote satisfactory and look forward to your business.
Please contact us in case of any clarification.`);

  const [quoteSignature, setQuoteSignature] = useState(`Asaduzzaman Khan Aony
Manager, Business Development & Sales
Barobi Design
Email: aony@bsgrouponline.com; sales@bsgrouponline.com
Mobile: +88 01670 266 023; +88 01896 459 103`);
  const [forceTermsToNewPage, setForceTermsToNewPage] = useState(false);

  const [quoteColumns, setQuoteColumns] = useState([
    { id: 'sl', label: 'Sl', width: 'w-12', type: 'sl' },
    { id: 'image', label: 'Digital image', width: '', type: 'image' },
    { id: 'brand', label: 'Brand & C.O.O', width: '', type: 'text' },
    { id: 'name', label: 'Name', width: '', type: 'name' },
    { id: 'description', label: 'Description', width: '', type: 'text' },
    { id: 'qty', label: 'Qnty (sft)', width: 'w-16', type: 'qty' },
    { id: 'unitPrice', label: 'Unit Price (sft)', width: 'w-24', type: 'unitPrice' },
    { id: 'vat_ain', label: 'VAT/AIT', width: 'w-24', type: 'vat_ain' },
    { id: 'amount', label: 'Amount', width: 'w-24', type: 'amount' }
  ]);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [quoteFooter, setQuoteFooter] = useState({
    officeAddress: 'Office Address: House No. 95, Road No. 06, Block - C, Banani, Dhaka-1213, Bangladesh. Tel: +88 02 9821286',
    contactInfo: 'Fax: +88 02 9844107, E-mail: barobidesign@bsgrouponline.com , website:www.barobidesign.com.bd',
    registeredAddress: 'Registered Address: 140 Shantibag, Shantinagar, Motijheel, Dhaka-1217, Bangladesh.',
    footerImage: ''
  });
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [newColumnPosition, setNewColumnPosition] = useState('end');
  const [quotePageCount, setQuotePageCount] = useState(1);
  const [quoteCurrentPage, setQuoteCurrentPage] = useState(1);
  const bodyRef = useRef<HTMLDivElement>(null);

  const isSupremeAdmin = ['bijoymahmudmunna@gmail.com'].includes(user?.email || '') || currentUserDoc?.role === 'supreme_admin';
  const isSuperAdmin = isSupremeAdmin || currentUserDoc?.role === 'super_admin';
  const isAdmin = isSuperAdmin || currentUserDoc?.role === 'admin';
  
  const isExpired = useMemo(() => {
    if (isSuperAdmin) return false;
    if (!currentUserDoc?.expiryDate) return false;
    try {
      const expiry = new Date(currentUserDoc.expiryDate);
      const now = new Date();
      return now > expiry;
    } catch (e) {
      return false;
    }
  }, [currentUserDoc, isSuperAdmin]);

  const isFullyApproved = isSuperAdmin || (currentUserDoc?.status === 'approved' && !isExpired && currentUserDoc?.role !== 'guest');
  const isApproved = isFullyApproved || ['landing', 'stock', 'home'].includes(activeTab);

  useEffect(() => {
    if (activeTab !== 'quote' || !bodyRef.current) return;

    const calculatePages = () => {
      if (!bodyRef.current) return;
      const header = document.getElementById('quotation-header');
      const footer = document.getElementById('quotation-footer');
      const lastPage = document.getElementById('quotation-last-page-content');
      const body = bodyRef.current;

      if (!header || !footer || !lastPage) return;

      // If no items, it should always be 1 page
      if (quoteItems.length === 0) {
        setQuotePageCount(1);
        return;
      }

      const headerHeight = header.offsetHeight;
      const footerHeight = footer.offsetHeight;
      const bodyHeight = body.scrollHeight;
      const lastPageHeight = lastPage.scrollHeight;
      
      // A4 height in pixels (approximate based on 210mm width)
      const a4HeightPx = (297 / 210) * body.offsetWidth;
      const availableHeightPerPage = a4HeightPx - headerHeight - footerHeight;
      
      // Calculate how many pages the body takes
      const bodyPages = Math.ceil(bodyHeight / availableHeightPerPage) || 1;
      const lastBodyPageContentHeight = bodyHeight % availableHeightPerPage || (bodyHeight > 0 ? availableHeightPerPage : 0);
      const remainingSpace = availableHeightPerPage - lastBodyPageContentHeight;
      
      // Match PDF logic for buffer and gap
      const buffer = quoteItems.length === 0 ? 5 : 30;
      const gap = quoteItems.length === 0 ? 5 : 15;
      
      let totalPages = bodyPages;
      if (forceTermsToNewPage || remainingSpace < lastPageHeight + buffer + gap) {
        totalPages++;
      }
      setQuotePageCount(totalPages);
    };

    const observer = new ResizeObserver(calculatePages);
    observer.observe(bodyRef.current);
    
    // Also observe header and footer in case they change
    const header = document.getElementById('quotation-header');
    const footer = document.getElementById('quotation-footer');
    if (header) observer.observe(header);
    if (footer) observer.observe(footer);

    calculatePages();

    return () => observer.disconnect();
  }, [activeTab, quoteItems, quoteColumns, quoteTerms, quoteSignature, quoteHeader, quoteFooter]);

  // Handle scroll to update current page
  useEffect(() => {
    if (activeTab !== 'quote') return;

    const handleScroll = () => {
      const body = bodyRef.current;
      if (!body) return;

      const header = document.getElementById('quotation-header');
      const footer = document.getElementById('quotation-footer');
      if (!header || !footer) return;

      const headerHeight = header.offsetHeight;
      const footerHeight = footer.offsetHeight;
      const a4HeightPx = (297 / 210) * body.offsetWidth;
      const availableHeightPerPage = a4HeightPx - headerHeight - footerHeight;

      const scrollTop = window.scrollY;
      const quoteTop = body.getBoundingClientRect().top + window.scrollY;
      const relativeScroll = Math.max(0, scrollTop - quoteTop + headerHeight);
      
      const currentPage = Math.ceil(relativeScroll / availableHeightPerPage) || 1;
      setQuoteCurrentPage(Math.min(currentPage, quotePageCount));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, quotePageCount]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [sidebarLinks, setSidebarLinks] = useState([
    { name: 'Google', url: 'https://www.google.com', icon: 'Search' },
    { name: 'Facebook', url: 'https://www.facebook.com', icon: 'Globe' },
    { name: 'YouTube', url: 'https://www.youtube.com', icon: 'Globe' },
    { name: 'Pinterest', url: 'https://www.pinterest.com', icon: 'Globe' },
    { name: 'Mavxon', url: 'https://mavxon.com', icon: 'Globe' }
  ]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Fetch Sidebar Links
  useEffect(() => {
    if (!user || !isApproved) return;
    const unsub = onSnapshot(doc(db, 'settings', 'sidebar_links'), (doc) => {
      if (doc.exists()) {
        setSidebarLinks(doc.data().links || []);
      }
    });
    return () => unsub();
  }, [user, isApproved]);

  const saveSidebarLinks = async (links: any[]) => {
    try {
      await setDoc(doc(db, 'settings', 'sidebar_links'), { links });
    } catch (error) {
      console.error("Error saving sidebar links:", error);
      toast.error("Failed to save links.");
    }
  };

  const handleAddLink = () => {
    if (!newLinkName || !newLinkUrl) {
      toast.error("Please fill all fields");
      return;
    }
    const url = newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`;
    const updatedLinks = [...sidebarLinks, { name: newLinkName, url, icon: 'Globe' }];
    setSidebarLinks(updatedLinks);
    saveSidebarLinks(updatedLinks);
    setNewLinkName('');
    setNewLinkUrl('');
    toast.success("Link added!");
  };

  const handleDeleteLink = (index: number) => {
    const updatedLinks = sidebarLinks.filter((_, i) => i !== index);
    setSidebarLinks(updatedLinks);
    saveSidebarLinks(updatedLinks);
    toast.success("Link removed!");
  };

  const getIcon = (iconName: string, url?: string) => {
    if (url) {
      try {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        const domain = new URL(fullUrl).hostname;
        return (
          <img 
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
            className="w-5 h-5 rounded-sm object-contain" 
            alt=""
            referrerPolicy="no-referrer"
          />
        );
      } catch (e) {
        // Fallback to default icons if URL is invalid
      }
    }
    switch (iconName) {
      case 'Search': return <Search className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  // Fetch Quote Settings
  useEffect(() => {
    if (!user || !isApproved) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'quote');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.header) setQuoteHeader(data.header);
          if (data.footer) setQuoteFooter(data.footer);
          if (data.terms) setQuoteTerms(data.terms);
          if (data.signature) setQuoteSignature(data.signature);
        }
      } catch (error) {
        console.error("Error fetching quote settings:", error);
      }
    };
    fetchSettings();
  }, [user, isApproved]);

  const saveQuoteSettings = async () => {
    if (!isSuperAdmin) return;
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'quote'), {
        header: quoteHeader,
        footer: quoteFooter,
        terms: quoteTerms,
        signature: quoteSignature
      });
      toast.success("Quote settings saved successfully!");
    } catch (error) {
      console.error("Error saving quote settings:", error);
      toast.error("Failed to save settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const calculateItemAmount = (item: any) => {
    const qtyCol = quoteColumns.find(c => c.type === 'qty');
    const priceCol = quoteColumns.find(c => c.type === 'unitPrice');
    const vatCol = quoteColumns.find(c => c.type === 'vat_ain');
    if (!qtyCol || !priceCol) return 0;
    const qty = Number(item[qtyCol.id] || 0);
    const price = Number(item[priceCol.id] || 0);
    const vat = vatCol ? Number(item[vatCol.id] || 0) : 0;
    const amount = qty * (price + vat);
    return isNaN(amount) ? 0 : amount;
  };

  const calculateTotalAmount = () => {
    return quoteItems.reduce((sum, item) => sum + calculateItemAmount(item), 0);
  };

  const addQuoteRow = () => {
    setQuoteItems([...quoteItems, { 
      id: Date.now(), 
      sl: String(quoteItems.length + 1), 
      image: '', 
      brand: '', 
      name: '', 
      description: '', 
      qty: '0', 
      unitPrice: '0',
      hideSuggestions: false,
      hasPageBreakAfter: false
    }]);
  };

  const generateNextRef = async () => {
    const today = new Date();
    const dateStr = today.getDate().toString().padStart(2, '0') + 
                    (today.getMonth() + 1).toString().padStart(2, '0') + 
                    today.getFullYear().toString();
    
    try {
      const counterRef = doc(db, 'settings', 'quote_counter');
      const counterSnap = await getDoc(counterRef);
      let nextNum = 1;
      
      if (counterSnap.exists()) {
        const data = counterSnap.data();
        if (data.lastDate === dateStr) {
          nextNum = (data.lastNum || 0) + 1;
        }
      }
      
      return `BD-${dateStr}${nextNum}`;
    } catch (error) {
      console.error("Error generating ref:", error);
      const today = new Date();
      const dateStr = today.getDate().toString().padStart(2, '0') + 
                      (today.getMonth() + 1).toString().padStart(2, '0') + 
                      today.getFullYear().toString();
      return `BD-${dateStr}1`;
    }
  };

  const saveQuoteToHistory = async () => {
    if (quoteItems.length === 0) {
      toast.error("Quotation is empty.");
      return;
    }
    
    try {
      let ref = quoteInfo.ref;

      if (isEditingQuote && editingQuoteId) {
        // Handle versioning for edits
        // Check if ref already has (N)
        const versionMatch = ref.match(/\((\d+)\)$/);
        if (versionMatch) {
          const currentVersion = parseInt(versionMatch[1]);
          ref = ref.replace(/\(\d+\)$/, `(${currentVersion + 1})`);
        } else {
          ref = `${ref}(1)`;
        }

        const quoteData = {
          quoteInfo: { ...quoteInfo, ref },
          quoteItems,
          quoteTerms,
          quoteSignature,
          totalAmount: calculateTotalAmount(),
          updatedAt: new Date(),
          updatedBy: user?.email,
          updatedByName: user?.displayName
        };

        await updateDoc(doc(db, 'savedQuotes', editingQuoteId), quoteData);
        toast.success("Quotation updated successfully!");
      } else {
        // New quote logic
        const today = new Date();
        const dateStr = today.getDate().toString().padStart(2, '0') + 
                        (today.getMonth() + 1).toString().padStart(2, '0') + 
                        today.getFullYear().toString();
        
        const counterRef = doc(db, 'settings', 'quote_counter');
        const counterSnap = await getDoc(counterRef);
        let nextNum = 1;
        
        if (counterSnap.exists()) {
          const data = counterSnap.data();
          if (data.lastDate === dateStr) {
            nextNum = (data.lastNum || 0) + 1;
          }
        }
        
        ref = `BD-${dateStr}${nextNum}`;
        
        const quoteData = {
          quoteInfo: { ...quoteInfo, ref },
          quoteItems,
          quoteTerms,
          quoteSignature,
          totalAmount: calculateTotalAmount(),
          createdAt: new Date(),
          createdBy: user?.email,
          createdByName: user?.displayName
        };
        
        await addDoc(collection(db, 'savedQuotes'), quoteData);
        await setDoc(counterRef, { lastDate: dateStr, lastNum: nextNum });
        toast.success("Quotation saved successfully!");
      }
      
      setQuoteInfo(prev => ({ ...prev, ref }));
      setIsEditingQuote(false);
      setEditingQuoteId(null);
    } catch (error) {
      console.error("Error saving quote:", error);
      toast.error("Failed to save quotation.");
    }
  };

  const saveAndDownloadQuote = async () => {
    await saveQuoteToHistory();
    setTimeout(() => {
      downloadPDF();
    }, 800);
  };

  const loadQuoteForView = (quote: any, isEdit = false) => {
    let info = { ...quote.quoteInfo };
    if (isEdit) {
      const refMatch = info.ref.match(/(.*)\((\d+)\)$/);
      if (refMatch) {
        const baseRef = refMatch[1];
        const rev = parseInt(refMatch[2]) + 1;
        info.ref = `${baseRef}(${rev})`;
      } else {
        info.ref = `${info.ref}(1)`;
      }
    }
    setQuoteInfo(info);
    setQuoteItems(quote.quoteItems);
    setQuoteTerms(quote.quoteTerms);
    setQuoteSignature(quote.quoteSignature);
    setEditingQuoteId(quote.id);
    setActiveTab('quote');
  };

  const handleClearQuote = () => {
    setConfirmAction({
      title: 'Clear Quotation',
      message: 'Are you sure you want to clear all quotation data? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        const nextRef = await generateNextRef();
        setQuoteInfo({
          to: '',
          attn: '',
          client: '',
          date: new Date().toLocaleDateString('en-GB'),
          ref: nextRef,
          projectDetails: '',
          address: '',
          sub: ''
        });
        setQuoteItems([]);
        setConfirmAction(null);
      }
    });
  };

  const removeQuoteRow = (id: number) => {
    setQuoteItems(quoteItems.filter(item => item.id !== id));
  };

  const addQuoteColumn = () => {
    if (newColumnLabel.trim()) {
      const newCol = { 
        id: newColumnType === 'text' ? `col_${Date.now()}` : newColumnType, 
        label: newColumnLabel.trim(), 
        width: '',
        type: newColumnType
      };
      
      let newCols = [...quoteColumns];
      if (newColumnPosition === 'end') {
        newCols.push(newCol);
      } else {
        const index = parseInt(newColumnPosition);
        newCols.splice(index, 0, newCol);
      }
      
      setQuoteColumns(newCols);
      setNewColumnLabel('');
      setNewColumnType('text');
      setNewColumnPosition('end');
      setShowAddColumnModal(false);
    }
  };

  const removeQuoteColumn = (id: string) => {
    setQuoteColumns(quoteColumns.filter(col => col.id !== id));
  };

  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [selectedItemToBook, setSelectedItemToBook] = useState<any | null>(null);
  const [modalQtySft, setModalQtySft] = useState<string>('');
  const [modalQtyPcs, setModalQtyPcs] = useState<string>('');

  const bookSearchResults = useMemo(() => {
    if (!bookSearchQuery.trim()) return [];
    const query = bookSearchQuery.toLowerCase();
    const allItems = [
      ...tiles.map(t => ({ ...t, type: 'tile' })),
      ...goods.map(g => ({ ...g, type: 'good', name: g.brand + ' ' + g.code, size: 'N/A' }))
    ];
    return allItems.filter(item => 
      (item as any).name?.toLowerCase().includes(query) || 
      (item as any).code?.toLowerCase().includes(query) ||
      (item as any).brand?.toLowerCase().includes(query)
    );
  }, [bookSearchQuery, tiles, goods]);

  const marketingPersons = useMemo(() => {
    const persons = new Set(bookedItems.filter(b => !b.deleted).map(item => item.marketingPerson).filter(Boolean));
    return Array.from(persons).sort();
  }, [bookedItems]);

  const [masterSubTab, setMasterSubTab] = useState<'tiles' | 'goods' | 'tools'>('tiles');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);

  // Clear search box state when switching active tabs or subtabs
  useEffect(() => {
    setShowSearchBox(false);
    setSearchQuery('');
  }, [activeTab, masterSubTab]);

  // Prevent unauthorized tab access
  useEffect(() => {
    if (isAuthReady && user) {
      if (activeTab === 'master' && !isAdmin) {
        setActiveTab('landing');
      }
      if (activeTab === 'users' && !isSupremeAdmin) {
        setActiveTab('landing');
      }
      if (activeTab === 'master_sheet' && !isSuperAdmin) {
        setActiveTab('landing');
      }
    }
  }, [activeTab, isAdmin, isSuperAdmin, isSupremeAdmin, isAuthReady, user]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', u.uid);
        try {
          const userSnap = await getDocFromServer(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (u.email === 'bijoymahmudmunna@gmail.com' && userData.role !== 'supreme_admin') {
              await updateDoc(userRef, { role: 'supreme_admin' });
              userData.role = 'supreme_admin';
            }
            setCurrentUserDoc({ id: userSnap.id, ...userData } as UserDoc);
          } else {
            // Check if it's a hardcoded super admin
    const isFirstSupremeAdmin = ['bijoymahmudmunna@gmail.com'].includes(u.email || '');
    if (isFirstSupremeAdmin) {
      const newDoc = {
        email: u.email,
        displayName: u.displayName || 'Unknown User',
        photoURL: u.photoURL || '',
        role: 'supreme_admin' as UserRole,
        status: 'approved' as UserStatus,
        createdAt: new Date()
      };
      await setDoc(userRef, newDoc);
      setCurrentUserDoc({ id: u.uid, ...newDoc });
    } else {
      const isPasswordProvider = u.providerData.some(p => p.providerId === 'password');
      const newDoc = {
        email: u.email,
        displayName: u.displayName || 'Unknown User',
        photoURL: u.photoURL || '',
        role: (isPasswordProvider ? 'user' : 'guest') as UserRole,
        status: (isPasswordProvider ? 'pending' : 'approved') as UserStatus,
        createdAt: new Date()
      };
      await setDoc(userRef, newDoc);
      setCurrentUserDoc({ id: u.uid, ...newDoc });
    }
          }
        } catch (err) {
          console.error("Error syncing user:", err);
        }
      } else {
        setCurrentUserDoc(null);
      }
      setIsAuthReady(true);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleRequestAccess = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const newDoc = {
        email: user.email,
        displayName: user.displayName || 'Unknown User',
        photoURL: user.photoURL || '',
        role: 'user' as UserRole,
        status: 'pending' as UserStatus,
        createdAt: new Date()
      };
      await setDoc(userRef, newDoc);
      setCurrentUserDoc({ id: user.uid, ...newDoc });
      showStatus('success', 'Access request sent successfully!');
    } catch (err: any) {
      console.error("Request access error:", err);
      showStatus('error', `Failed to send request: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // User listener
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Listen to current user's document
    const unsubMe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setCurrentUserDoc({ id: snap.id, ...snap.data() } as UserDoc);
      }
    }, (error) => {
      console.error("Error listening to user doc:", error);
    });

    // Listen to all users ONLY if super admin
    let unsubAll: (() => void) | null = null;
    if (isSuperAdmin) {
      unsubAll = onSnapshot(collection(db, 'users'), (snap) => {
        const usersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc));
        setUsers(usersData);
      }, (error) => {
        console.error("Error listening to all users:", error);
        handleFirestoreError(error, OperationType.GET, 'users');
      });
    }

    return () => {
      unsubMe();
      if (unsubAll) unsubAll();
    };
  }, [isAuthReady, user, isSuperAdmin]);

  // Firestore test connection
  useEffect(() => {
    if (isAuthReady && user) {
      const testConnection = async () => {
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
          if (error instanceof Error && error.message.includes('the client is offline')) {
            console.error("Please check your Firebase configuration.");
          }
        }
      };
      testConnection();
    }
  }, [isAuthReady, user]);

  // Auto-generate Ref on load
  useEffect(() => {
    if (isAuthReady && user && !quoteInfo.ref && activeTab === 'quote') {
      const setInitialRef = async () => {
        const ref = await generateNextRef();
        setQuoteInfo(prev => ({ ...prev, ref }));
      };
      setInitialRef();
    }
  }, [isAuthReady, user, activeTab]);

  // Data listeners
  useEffect(() => {
    if (!isAuthReady || !user || !isApproved) return;

    const unsubTiles = onSnapshot(query(collection(db, 'tiles'), orderBy('name')), (snap) => {
      setTiles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tile)));
    }, (err) => {
      console.error("Tiles error:", err);
      handleFirestoreError(err, OperationType.GET, 'tiles');
    });

    const unsubGoods = onSnapshot(query(collection(db, 'goods'), orderBy('code')), (snap) => {
      setGoods(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Good)));
    }, (err) => {
      console.error("Goods error:", err);
      handleFirestoreError(err, OperationType.GET, 'goods');
    });

    const unsubTools = onSnapshot(query(collection(db, 'tools'), orderBy('details')), (snap) => {
      setTools(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tool)));
    }, (err) => {
      console.error("Tools error:", err);
      handleFirestoreError(err, OperationType.GET, 'tools');
    });

    const unsubBooked = onSnapshot(query(collection(db, 'bookedItems'), orderBy('name')), (snap) => {
      setBookedItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookedItem)));
    }, (err) => {
      console.error("Booked error:", err);
      handleFirestoreError(err, OperationType.GET, 'bookedItems');
    });

    const unsubSavedQuotes = onSnapshot(query(collection(db, 'savedQuotes'), orderBy('createdAt', 'desc')), (snap) => {
      setSavedQuotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Saved Quotes error:", err);
      handleFirestoreError(err, OperationType.GET, 'savedQuotes');
    });

    return () => {
      unsubTiles();
      unsubGoods();
      unsubTools();
      unsubBooked();
      unsubSavedQuotes();
    };
  }, [isAuthReady, user, isApproved]);

  const handleInlineEditSave = async (category: Category, id: string) => {
    if (!editData) return;
    
    const data = { ...editData };
    
    // Auto-calculate Tile fields if needed
    if (category === 'tiles') {
      const sizeStr = String(data.size || '');
      const diaBariPcs = Number(data.diaBariPcs || 0);
      const bonorupaPcs = Number(data.bonorupaPcs || 0);
      const bananiPcs = Number(data.bananiPcs || 0);

      const calculateSft = (s: string, p: number) => {
        const parts = s.toLowerCase().split('x');
        if (parts.length !== 2) return 0;
        const w = parseFloat(parts[0]);
        const h = parseFloat(parts[1]);
        if (isNaN(w) || isNaN(h)) return 0;
        return Number((p * (w / 30.48) * (h / 30.48)).toFixed(2));
      };

      data.diaBariSft = calculateSft(sizeStr, diaBariPcs);
      data.bonorupaSft = calculateSft(sizeStr, bonorupaPcs);
      data.bananiSft = calculateSft(sizeStr, bananiPcs);
      
      data.totalSft = Number((data.diaBariSft + data.bonorupaSft + data.bananiSft).toFixed(2));
      data.totalPcs = diaBariPcs + bonorupaPcs + bananiPcs;
    }

    try {
      const oldItem = (category === 'tiles' ? tiles : goods).find(i => i.id === id);
      const oldName = (oldItem as any)?.name;
      const oldCode = (oldItem as any)?.code;

      await updateDoc(doc(db, category, id), data);

      // Sync bookedItems if name or code changed
      if (category === 'tiles' || category === 'goods') {
        const newName = (data as any).name;
        const newCode = (data as any).code;

        if ((newName && newName !== oldName) || (newCode && newCode !== oldCode)) {
          const batch = writeBatch(db);
          const bookedToUpdate = bookedItems.filter(b => 
            (oldName && b.name === oldName) || (oldCode && b.code === oldCode)
          );

          bookedToUpdate.forEach(b => {
            const update: any = {};
            if (newName && b.name === oldName) update.name = newName;
            if (newCode && b.code === oldCode) update.code = newCode;
            batch.update(doc(db, 'bookedItems', b.id), update);
          });

          if (bookedToUpdate.length > 0) {
            await batch.commit();
          }
        }
      }

      setEditingId(null);
      setEditData(null);
      setHighlightedRow(null);
      showStatus('success', 'Item updated successfully.');
      const itemName = (data as any)?.name || (data as any)?.code || (data as any)?.details || id;
      sendNotification('edit', category, itemName, data);
    } catch (err: any) {
      console.error("Update error:", err);
      showStatus('error', `Failed to update item: ${err.message}`);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      if (authMode === 'signup') {
        if (!authEmail || !authPassword || !authName) {
           throw new Error("Please fill in all fields.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const u = userCredential.user;
        
        // Update profile
        await updateProfile(u, { displayName: authName });
        
        // Immediately create user doc with 'user' role for registration
        const userRef = doc(db, 'users', u.uid);
        const newDoc = {
          email: u.email,
          displayName: authName,
          photoURL: '',
          role: 'user' as UserRole,
          status: 'pending' as UserStatus,
          createdAt: new Date()
        };
        await setDoc(userRef, newDoc);
        setCurrentUserDoc({ id: u.uid, ...newDoc });
        toast.success("Registration successful! Waiting for approval.");
      } else {
        if (!authEmail || !authPassword) {
          throw new Error("Please enter email and password.");
        }
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      console.error("Email auth error:", error);
      setAuthError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login error:", error);
      let message = "There was a problem signing in.";
      if (error.code === 'auth/popup-blocked') {
        message = "Your browser blocked the popup. Please allow popups and try again.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = "Sign in attempt was cancelled. Please try again.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized in Firebase console. Please check Firebase settings.";
      } else {
        message = `Error: ${error.message}`;
      }
      setAuthError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
    
    // Compress image to stay under Firestore 1MB limit
    if (file.type.startsWith('image/')) {
      return compressImage(base64);
    }
    return base64;
  };

  const urlToBase64 = async (url: string): Promise<string> => {
    if (!url || url.startsWith('data:')) return url;
    
    const fetchAsBase64 = async (fetchUrl: string) => {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      if (blob.type.startsWith('image/')) {
        return compressImage(base64);
      }
      return base64;
    };

    try {
      return await fetchAsBase64(url);
    } catch (error) {
      console.warn("Direct fetch failed, trying CORS proxy...", error);
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        return await fetchAsBase64(proxyUrl);
      } catch (proxyError) {
        console.error("Error converting URL to Base64 via proxy:", proxyError);
        return url;
      }
    }
  };

  const handleBackup = () => {
    const data = {
      tiles,
      goods,
      tools,
      bookedItems,
      savedQuotes,
      sidebarLinks,
      quoteHeader,
      quoteTerms,
      quoteSignature,
      quoteFooter,
      quoteColumns,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mavxon_ims_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('success', 'FULL SYSTEM BACKUP DOWNLOADED SUCCESSFULLY.');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmAction({
      title: 'RESTORE DATA',
      message: 'This will add all items from the backup file to your current system. This may overwrite some settings. Continue?',
      type: 'warning',
      onConfirm: async () => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = JSON.parse(evt.target?.result as string);
            const batch = writeBatch(db);
            
            // Restore Inventory Items
            if (data.tiles) {
              data.tiles.forEach((t: any) => {
                const { id, ...rest } = t;
                batch.set(doc(collection(db, 'tiles')), { ...rest, createdAt: new Date() });
              });
            }
            if (data.goods) {
              data.goods.forEach((g: any) => {
                const { id, ...rest } = g;
                batch.set(doc(collection(db, 'goods')), { ...rest, createdAt: new Date() });
              });
            }
            if (data.tools) {
              data.tools.forEach((t: any) => {
                const { id, ...rest } = t;
                batch.set(doc(collection(db, 'tools')), { ...rest, createdAt: new Date() });
              });
            }
            if (data.bookedItems) {
              data.bookedItems.forEach((b: any) => {
                const { id, ...rest } = b;
                batch.set(doc(collection(db, 'bookedItems')), { ...rest, createdAt: new Date() });
              });
            }

            // Restore Saved Quotes
            if (data.savedQuotes) {
              data.savedQuotes.forEach((q: any) => {
                const { id, ...rest } = q;
                batch.set(doc(collection(db, 'savedQuotes')), { ...rest, createdAt: new Date() });
              });
            }

            // Restore Settings
            if (data.sidebarLinks) {
              batch.set(doc(db, 'settings', 'sidebar_links'), { links: data.sidebarLinks });
            }
            if (data.quoteHeader || data.quoteTerms || data.quoteSignature || data.quoteFooter || data.quoteColumns) {
              const quoteSettings: any = {};
              if (data.quoteHeader) quoteSettings.header = data.quoteHeader;
              if (data.quoteTerms) quoteSettings.terms = data.quoteTerms;
              if (data.quoteSignature) quoteSettings.signature = data.quoteSignature;
              if (data.quoteFooter) quoteSettings.footer = data.quoteFooter;
              if (data.quoteColumns) quoteSettings.columns = data.quoteColumns;
              batch.set(doc(db, 'settings', 'quote'), quoteSettings);
            }

            await batch.commit();
            showStatus('success', 'DATA RESTORED SUCCESSFULLY.');
          } catch (err: any) {
            console.error("Restore error:", err);
            showStatus('error', `RESTORE FAILED: ${err.message}`);
          }
        };
        reader.readAsText(file);
        setConfirmAction(null);
      }
    });
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        let counts = { tiles: 0, goods: 0, tools: 0 };
        let totalProcessed = 0;

        // Process each sheet
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(ws);
          
          const normalizedSheetName = sheetName.toLowerCase();
          console.log(`Processing sheet: ${sheetName}`, data.length, "rows found");

          if (normalizedSheetName.includes('tile')) {
            for (const row of data as any[]) {
              try {
                const sizeStr = String(row['SIZE'] || row['Size'] || row['size'] || '');
                const diaBariPcs = Number(row['PCS'] || row['Pcs'] || 0);
                const bonorupaPcs = Number(row['PCS_1'] || row['PCS'] || 0);
                const bananiPcs = Number(row['PCS_2'] || row['PCS'] || 0);

                const calculateSft = (s: string, p: number) => {
                  const parts = s.toLowerCase().split('x');
                  if (parts.length !== 2) return 0;
                  const w = parseFloat(parts[0]);
                  const h = parseFloat(parts[1]);
                  if (isNaN(w) || isNaN(h)) return 0;
                  return Number((p * (w / 30.48) * (h / 30.48)).toFixed(2));
                };

                const diaBariSft = calculateSft(sizeStr, diaBariPcs);
                const bonorupaSft = calculateSft(sizeStr, bonorupaPcs);
                const bananiSft = calculateSft(sizeStr, bananiPcs);

                await addDoc(collection(db, 'tiles'), {
                  name: String(row['NAME'] || row['Name'] || row['name'] || ''),
                  size: sizeStr,
                  brand: String(row['BRAND'] || row['Brand'] || row['brand'] || ''),
                  totalSft: Number((diaBariSft + bonorupaSft + bananiSft).toFixed(2)),
                  totalPcs: diaBariPcs + bonorupaPcs + bananiPcs,
                  diaBariSft: diaBariSft,
                  diaBariPcs: diaBariPcs,
                  diaBariRemark: String(row['REMARK'] || row['Remark'] || ''),
                  bonorupaSft: bonorupaSft,
                  bonorupaPcs: bonorupaPcs,
                  bonorupaRemark: String(row['REMARK_1'] || row['REMARK'] || ''),
                  bananiSft: bananiSft,
                  bananiPcs: bananiPcs,
                  bananiRemark: String(row['REMARK_2'] || row['REMARK'] || ''),
                  imageUrl: String(row['IMAGE'] || row['Image'] || row['image'] || '')
                });
                counts.tiles++;
                totalProcessed++;
              } catch (e) { console.error("Error adding tile:", e); }
            }
          } else if (normalizedSheetName.includes('good')) {
            for (const row of data as any[]) {
              try {
                await addDoc(collection(db, 'goods'), {
                  brand: String(row['BRAND'] || row['Brand'] || row['brand'] || ''),
                  code: String(row['CODE'] || row['Code'] || row['code'] || ''),
                  description: String(row['DISCRIPTION'] || row['Description'] || row['description'] || ''),
                  dokhinkhan: Number(row['DOKHINKHAN'] || row['Dokhinkhan'] || 0),
                  dokhinkhanRemark: String(row['REMARK'] || row['Remark'] || ''),
                  bonorupa: Number(row['BONORUPA'] || row['Bonorupa'] || 0),
                  bonorupaRemark: String(row['REMARK_1'] || row['REMARK'] || ''),
                  banani: Number(row['BANANI'] || row['Banani'] || 0),
                  bananiRemark: String(row['REMAEK'] || row['REMARK_2'] || row['REMARK'] || ''),
                  imageUrl: String(row['IMAGE'] || row['Image'] || row['image'] || '')
                });
                counts.goods++;
                totalProcessed++;
              } catch (e) { console.error("Error adding good:", e); }
            }
          } else if (normalizedSheetName.includes('tool')) {
            for (const row of data as any[]) {
              try {
                await addDoc(collection(db, 'tools'), {
                  details: String(row['DETAILS'] || row['Details'] || row['details'] || ''),
                  qty: Number(row['QTY'] || row['Qty'] || row['qty'] || 0),
                  issueToDate: String(row['ISSUE TO & DATE'] || row['issue to & date'] || ''),
                  states: String(row['STATES'] || row['States'] || row['states'] || ''),
                  imageUrl: String(row['IMAGE'] || row['Image'] || row['image'] || '')
                });
                counts.tools++;
                totalProcessed++;
              } catch (e) { console.error("Error adding tool:", e); }
            }
          }
        }
        
        if (totalProcessed === 0) {
          alert('No matching data found. Please ensure your sheet names contain "Tiles", "Goods", or "Tools".');
        } else {
          alert(`Import successful!\n- Tiles: ${counts.tiles}\n- Goods: ${counts.goods}\n- Tools: ${counts.tools}`);
        }
      } catch (err) {
        console.error("Import error:", err);
        alert('Failed to import Excel data. Please check the file format and your internet connection.');
      } finally {
        setImporting(false);
        e.target.value = ''; // Reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  // Redirect unauthorized users from restricted tabs
  useEffect(() => {
    if (activeTab === 'master_sheet' && !isSuperAdmin) {
      setActiveTab('master');
    }
    if (activeTab === 'users' && !isSupremeAdmin) {
      setActiveTab('master');
    }
  }, [activeTab, isSuperAdmin, isSupremeAdmin]);

  useEffect(() => {
    // Hide splash screen after 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const sendNotification = async (action: 'edit' | 'delete', category: string, itemName: string, details: any) => {
    try {
      const isMaster = activeTab === 'master' || activeTab === 'master_sheet';
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action, 
          category, 
          itemName, 
          details: { 
            ...details, 
            isMasterSheet: isMaster,
            userEmail: user?.email,
            userName: user?.displayName
          } 
        }),
      });
      const result = await response.json();
      if (!result.success) {
        console.warn("Notification API returned failure:", result.error || result.message);
      } else {
        console.log("Notification sent successfully:", result.message || "OK");
      }
    } catch (err) {
      console.error("Notification fetch error:", err);
    }
  };

  const handleDeleteItem = async (collectionName: string, id: string) => {
    const item = [...tiles, ...goods, ...tools, ...bookedItems].find(i => i.id === id);
    const itemName = (item as any)?.name || (item as any)?.code || (item as any)?.details || id;

    setConfirmAction({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item from the active inventory? It will still be visible in the Master Sheet.',
      type: 'danger',
      onConfirm: async () => {
        try {
          const isMaster = activeTab === 'master' || activeTab === 'master_sheet';
          const isAlreadyDeleted = (item as any)?.deleted;

          if (isMaster && isAlreadyDeleted) {
            await deleteDoc(doc(db, collectionName, id));
            showStatus('success', 'Item permanently deleted from Master Sheet.');
            sendNotification('delete', collectionName, itemName, { id, permanent: true });
          } else {
            await updateDoc(doc(db, collectionName, id), { deleted: true });
            
            // Sync bookedItems if a product is deleted
            if (collectionName === 'tiles' || collectionName === 'goods') {
              const product = (collectionName === 'tiles' ? tiles : goods).find(i => i.id === id);
              const productName = (product as any)?.name;
              const productCode = (product as any)?.code;

              const batch = writeBatch(db);
              const bookedToDelete = bookedItems.filter(b => 
                (productName && b.name === productName) || (productCode && b.code === productCode)
              );

              bookedToDelete.forEach(b => {
                batch.update(doc(db, 'bookedItems', b.id), { deleted: true });
              });

              if (bookedToDelete.length > 0) {
                await batch.commit();
              }
            }

            showStatus('success', 'Item moved to Master Sheet (Deleted).');
            sendNotification('delete', collectionName, itemName, { id });
          }
        } catch (err: any) {
          console.error("Delete error:", err);
          showStatus('error', `Failed to remove item: ${err.message}`);
        }
        setConfirmAction(null);
      }
    });
  };

  const handleClearAll = async (collectionName: string) => {
    setConfirmAction({
      title: `Clear All ${collectionName}`,
      message: `Are you sure you want to remove ALL items in ${collectionName} from active inventory? They will still be visible in the Master Sheet.`,
      type: 'danger',
      onConfirm: async () => {
        setClearing(collectionName);
        try {
          const q = query(collection(db, collectionName), where('deleted', '!=', true));
          const snapshot = await getDocs(q);
          
          const batch = writeBatch(db);
          snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { deleted: true });
          });

          // Sync bookedItems if products are cleared
          if (collectionName === 'tiles' || collectionName === 'goods') {
            const productNames = snapshot.docs.map(d => (d.data() as any).name).filter(Boolean);
            const productCodes = snapshot.docs.map(d => (d.data() as any).code).filter(Boolean);

            const bookedToDelete = bookedItems.filter(b => 
              (b.name && productNames.includes(b.name)) || (b.code && productCodes.includes(b.code))
            );

            bookedToDelete.forEach(b => {
              batch.update(doc(db, 'bookedItems', b.id), { deleted: true });
            });
          }
          
          await batch.commit();
          showStatus('success', `All items in ${collectionName} have been removed from active inventory.`);
          sendNotification('delete', collectionName, 'All Items', { count: snapshot.size });
          if (collectionName === 'tiles') setSelectedTiles([]);
          if (collectionName === 'goods') setSelectedGoods([]);
          if (collectionName === 'tools') setSelectedTools([]);
          if (collectionName === 'bookedItems') setSelectedBookedItems([]);
        } catch (err: any) {
          console.error("Clear all error:", err);
          showStatus('error', `Failed to clear ${collectionName}: ${err.message}`);
        } finally {
          setClearing(null);
          setConfirmAction(null);
        }
      }
    });
  };

  const handleDeleteSelected = async (collectionName: string) => {
    const selectedIds = 
      collectionName === 'tiles' ? selectedTiles :
      collectionName === 'goods' ? selectedGoods :
      collectionName === 'bookedItems' ? selectedBookedItems :
      selectedTools;

    if (selectedIds.length === 0) return;

    setConfirmAction({
      title: `Delete Selected Items`,
      message: `Are you sure you want to remove ${selectedIds.length} selected items from active inventory? They will still be visible in the Master Sheet.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const isMaster = activeTab === 'master' || activeTab === 'master_sheet';
          const batch = writeBatch(db);
          
          let permanentCount = 0;
          let softDeleteCount = 0;

          selectedIds.forEach(id => {
            const item = [...tiles, ...goods, ...tools, ...bookedItems].find(i => i.id === id);
            if (isMaster && (item as any)?.deleted) {
              batch.delete(doc(db, collectionName, id));
              permanentCount++;
            } else {
              batch.update(doc(db, collectionName, id), { deleted: true });
              softDeleteCount++;
            }
          });

          // Sync bookedItems if products are deleted (soft delete only)
          if (collectionName === 'tiles' || collectionName === 'goods') {
            const products = (collectionName === 'tiles' ? tiles : goods).filter(i => selectedIds.includes(i.id));
            const productNames = products.map(p => (p as any).name).filter(Boolean);
            const productCodes = products.map(p => (p as any).code).filter(Boolean);

            const bookedToDelete = bookedItems.filter(b => 
              (b.name && productNames.includes(b.name)) || (b.code && productCodes.includes(b.code))
            );

            bookedToDelete.forEach(b => {
              batch.update(doc(db, 'bookedItems', b.id), { deleted: true });
            });
          }

          await batch.commit();
          
          if (collectionName === 'tiles') setSelectedTiles([]);
          if (collectionName === 'goods') setSelectedGoods([]);
          if (collectionName === 'tools') setSelectedTools([]);
          if (collectionName === 'bookedItems') setSelectedBookedItems([]);
          
          const msg = permanentCount > 0 
            ? `${permanentCount} items permanently deleted, ${softDeleteCount} items moved to Master Sheet.`
            : `${selectedIds.length} items removed from active inventory.`;
            
          showStatus('success', msg);
          sendNotification('delete', collectionName, 'Multiple Items', { 
            count: selectedIds.length, 
            permanentCount,
            softDeleteCount,
            ids: selectedIds 
          });
        } catch (err: any) {
          console.error("Delete selected error:", err);
          showStatus('error', `Failed to remove selected items: ${err.message}`);
        }
        setConfirmAction(null);
      }
    });
  };

  const toggleSelect = (collectionName: string, id: string) => {
    if (collectionName === 'tiles') {
      setSelectedTiles(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else if (collectionName === 'goods') {
      setSelectedGoods(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else if (collectionName === 'bookedItems') {
      setSelectedBookedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedTools(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
  };

  const toggleSelectAll = (collectionName: string, allIds: string[]) => {
    if (collectionName === 'tiles') {
      setSelectedTiles(prev => prev.length === allIds.length ? [] : allIds);
    } else if (collectionName === 'goods') {
      setSelectedGoods(prev => prev.length === allIds.length ? [] : allIds);
    } else if (collectionName === 'bookedItems') {
      setSelectedBookedItems(prev => prev.length === allIds.length ? [] : allIds);
    } else {
      setSelectedTools(prev => prev.length === allIds.length ? [] : allIds);
    }
  };

  const activeTiles = useMemo(() => tiles.filter(t => !t.deleted), [tiles]);
  const activeGoods = useMemo(() => goods.filter(g => !g.deleted), [goods]);
  const activeTools = useMemo(() => tools.filter(t => !t.deleted), [tools]);

  // Filtering
  const filteredTiles = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const source = activeTab === 'master_sheet' ? tiles : activeTiles;
    return source.filter(t => (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (t.brand || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [tiles, activeTiles, searchQuery, activeTab]);

  const filteredGoods = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const source = activeTab === 'master_sheet' ? goods : activeGoods;
    return source.filter(g => (g.code || '').toLowerCase().includes(searchQuery.toLowerCase()) || (g.brand || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [goods, activeGoods, searchQuery, activeTab]);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const source = activeTab === 'master_sheet' ? tools : activeTools;
    return source.filter(t => (t.details || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [tools, activeTools, searchQuery, activeTab]);

  const displayTiles = useMemo(() => {
    if (activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '')) return filteredTiles;
    if (activeTab === 'master') return activeTiles;
    return tiles;
  }, [activeTab, showSearchBox, searchQuery, filteredTiles, activeTiles, tiles]);

  const displayGoods = useMemo(() => {
    if (activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '')) return filteredGoods;
    if (activeTab === 'master') return activeGoods;
    return goods;
  }, [activeTab, showSearchBox, searchQuery, filteredGoods, activeGoods, goods]);

  const displayTools = useMemo(() => {
    if (activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '')) return filteredTools;
    if (activeTab === 'master') return activeTools;
    return tools;
  }, [activeTab, showSearchBox, searchQuery, filteredTools, activeTools, tools]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {showSplash ? (
        <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center animate-in fade-in duration-1000 text-center px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <MavxonLogo className="scale-[2.5] mb-12" />
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-xl md:text-2xl font-bold text-gray-400 tracking-[0.2em] uppercase">Inventory Management System</h2>
              
              <div className="flex items-center justify-center gap-2 pt-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      ) : null}

      <div className="min-h-screen bg-gray-50 flex flex-col relative">
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              zIndex: 9999,
            },
          }}
        />
      
      {/* Floating Back to App Bubble */}
      {externalUrl && (
        <button 
          onClick={() => setExternalUrl(null)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-white border-2 border-blue-600 rounded-full shadow-2xl z-[100] flex items-center justify-center hover:scale-110 transition-transform animate-bounce overflow-hidden"
          title="Back to App"
        >
          <MavxonLogo className="scale-125" />
        </button>
      )}

      {/* External Browser Iframe */}
      {externalUrl && (
        <div className="fixed inset-0 z-[90] bg-white flex flex-col">
          <div className="bg-gray-100 p-2 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600 truncate max-w-md">{externalUrl}</span>
            </div>
            <button 
              onClick={() => setExternalUrl(null)}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative">
            <iframe 
              src={externalUrl} 
              className="w-full h-full border-none"
              title="External Browser"
            />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
              <MavxonLogo className="scale-150" />
            </div>
          </div>
        </div>
      )}

      {/* Right Sidebar */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 p-2 bg-white border-l border-y border-gray-200 rounded-l-2xl shadow-xl">
        <div className="text-[8px] font-bold text-gray-400 text-center mb-1">LINKS</div>
        {sidebarLinks.map((link, idx) => {
          const openInNewTab = shouldOpenInNewTab(link.url);
          if (openInNewTab) {
            return (
              <a
                key={`${link.name}-${idx}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-xl border border-gray-100 shadow-sm transition-all group relative"
                title={link.name}
              >
                {getIcon(link.icon, link.url)}
                <span className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                  {link.name}
                </span>
              </a>
            );
          }
          return (
            <button
              key={`${link.name}-${idx}`}
              onClick={() => setExternalUrl(link.url)}
              className="w-10 h-10 flex items-center justify-center bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-xl border border-gray-100 shadow-sm transition-all group relative"
              title={link.name}
            >
              {getIcon(link.icon, link.url)}
              <span className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                {link.name}
              </span>
            </button>
          );
        })}
        {isSupremeAdmin && (
          <>
            <div className="h-px bg-gray-200 my-1 mx-1" />
            <button
              onClick={() => setShowLinkModal(true)}
              className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl border border-gray-100 shadow-sm transition-all group relative"
              title="Manage Links"
            >
              <Plus className="w-4 h-4" />
              <span className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                Add/Edit Links
              </span>
            </button>
          </>
        )}
      </div>

      {/* Manage Links Modal */}
      <AnimatePresence>
        {showLinkModal && isSupremeAdmin && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Manage Sidebar Links</h3>
                </div>
                <button onClick={() => setShowLinkModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Add New Link */}
                <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Add New Link</div>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      placeholder="Name (e.g. Google)" 
                      className="px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newLinkName}
                      onChange={(e) => setNewLinkName(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="URL (e.g. google.com)" 
                      className="px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleAddLink}
                    className="w-full py-2 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Link
                  </button>
                </div>

                {/* Existing Links List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Current Links</div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {sidebarLinks.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm italic">No links added yet</div>
                    ) : (
                      sidebarLinks.map((link, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-all group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 shadow-sm">
                              {getIcon(link.icon, link.url)}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-bold text-sm text-gray-900 truncate">{link.name}</div>
                              <div className="text-[10px] text-gray-500 truncate">{link.url}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteLink(idx)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setShowLinkModal(false)}
                  className="px-6 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className={cn("flex", !user && isAuthReady ? "h-screen overflow-hidden bg-cover bg-center bg-no-repeat" : "min-h-screen bg-slate-50")} style={!user && isAuthReady ? { backgroundImage: 'url("/user_photo.jpg")' } : {}}>
        {!user && isAuthReady && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-0" />
        )}
        {/* Sidebar (Desktop) */}
        {user && isApproved && (
          <aside className="w-56 bg-[#0f172a] text-white flex-col hidden md:flex fixed h-full z-50 shadow-2xl border-r border-slate-800">
            <div className="h-16 px-6 flex items-center border-b border-slate-800">
              <a href="https://www.facebook.com/mavxon" target="_blank" rel="noopener noreferrer" className="flex items-center hover:opacity-80 transition-all group w-fit h-full">
                <div className="flex items-center bg-white/5 h-10 px-3 rounded-lg border border-white/10 group-hover:border-white/20 transition-all">
                  <span className="text-[#FBBF24] font-black text-2xl tracking-tighter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">mav</span>
                  <span className="text-[#3B82F6] font-black text-2xl tracking-tighter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">xon</span>
                  <span className="text-white font-bold ml-2 text-xs tracking-widest mt-1">IMS</span>
                </div>
              </a>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
              <button
                onClick={() => setActiveTab('landing')}
                className={cn(
                  "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                  activeTab === 'landing' ? "bg-white text-[#0f172a] font-bold shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Home className="w-5 h-5 text-emerald-400" /> Home
              </button>

              {isFullyApproved && (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => setActiveTab('master')}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                        activeTab === 'master' ? "bg-white text-[#0f172a] font-bold shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Grid3X3 className="w-5 h-5 text-blue-400" /> ADD PRODUCT
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('booked')}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                      activeTab === 'booked' ? "bg-white text-[#0f172a] font-bold shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <FileText className="w-5 h-5 text-amber-400" /> Booked Item
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('stock')}
                className={cn(
                  "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                  activeTab === 'stock' ? "bg-white text-[#0f172a] font-bold shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Database className="w-5 h-5 text-rose-400" /> Stock Item
              </button>

              {isFullyApproved && (
                <>
                  <button
                    onClick={() => setActiveTab('quote')}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                      activeTab === 'quote' ? "bg-white text-[#0f172a] font-bold shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Calculator className="w-5 h-5 text-purple-400" /> Make Quote
                  </button>
                  <button
                    onClick={() => setActiveTab('view_quote')}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                      activeTab === 'view_quote' ? "bg-white text-[#0f172a] font-bold shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Search className="w-5 h-5 text-cyan-400" /> View Quote
                  </button>
                  <button
                    onClick={() => setActiveTab('sales')}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                      activeTab === 'sales' ? "bg-white text-[#0f172a] font-bold shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <FileText className="w-5 h-5 text-indigo-400" /> Sales / Invoice
                  </button>
                </>
              )}
              {(isSuperAdmin || isSupremeAdmin) && (
                <button
                  onClick={() => setActiveTab('master_sheet')}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                    activeTab === 'master_sheet' ? "bg-white text-[#0f172a] font-bold shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Database className="w-5 h-5 text-pink-400" /> Master Sheet
                </button>
              )}
              {isSupremeAdmin && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                    activeTab === 'users' ? "bg-white text-[#0f172a] font-bold shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <ShieldCheck className="w-5 h-5 text-teal-400" /> Users
                </button>
              )}
            </nav>
            
            {/* Sidebar Footer (Backup/Restore) */}
            {isAdmin && (
              <div className="p-4 border-t border-slate-800 space-y-2">
                <button 
                  onClick={handleBackup} 
                  className="w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  <Download className="w-4 h-4" /> Backup Data
                </button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestore}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <button 
                    className="w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-all text-left"
                  >
                    <Upload className="w-4 h-4" /> Restore Data
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Main Content Wrapper */}
        <div className={cn("flex-1 flex flex-col min-h-screen transition-all", user && isApproved ? "md:ml-56" : "")}>
          {/* Header (Mobile + Desktop User Info) */}
          {user && isApproved && (
            <header className="sticky top-0 z-40 w-full bg-[#0f172a] border-b border-slate-800 shadow-sm text-white">
            <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
              {/* Mobile Logo & Menu Toggle */}
              <div className="flex items-center gap-3 md:hidden">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-gray-300 hover:bg-white/10 rounded-lg"
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                <div className="flex items-center bg-white/5 h-10 px-2 rounded-lg border border-white/10">
                  <span className="text-[#FBBF24] font-black tracking-tighter">mav</span>
                  <span className="text-[#3B82F6] font-black tracking-tighter">xon</span>
                  <span className="text-white font-bold text-[10px] ml-1">IMS</span>
                </div>
                <div className="h-4 w-px bg-slate-700 mx-1"></div>
                <h2 className="text-sm font-bold text-white tracking-tight truncate max-w-[100px] sm:max-w-[150px]">
                  {activeTab === 'landing' && 'Home'}
                  {activeTab === 'search' && 'Search'}
                  {activeTab === 'master' && 'Product Inventory'}
                  {activeTab === 'booked' && 'Booked Item'}
                  {activeTab === 'stock' && 'Stock Item'}
                  {activeTab === 'quote' && 'Make Quote'}
                  {activeTab === 'view_quote' && 'View Quote'}
                  {activeTab === 'master_sheet' && 'Master Sheet'}
                  {activeTab === 'users' && 'Users'}
                  {activeTab === 'sales' && 'Sales / Invoice'}
                </h2>
              </div>

              {/* Desktop Header Left (Active Tab & Search) */}
              <div className="hidden md:flex items-center gap-6">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {activeTab === 'landing' && 'Home'}
                  {activeTab === 'search' && 'Search'}
                  {activeTab === 'master' && 'Product Inventory'}
                  {activeTab === 'booked' && 'Booked Item'}
                  {activeTab === 'stock' && 'Stock Item'}
                  {activeTab === 'quote' && 'Make Quote'}
                  {activeTab === 'view_quote' && 'View Quote'}
                  {activeTab === 'master_sheet' && 'Master Sheet'}
                  {activeTab === 'users' && 'Users'}
                  {activeTab === 'sales' && 'Sales / Invoice'}
                </h2>
                
            {user && isApproved && (
              <button 
                onClick={() => setShowSearchBox(!showSearchBox)}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2",
                  showSearchBox ? "bg-white text-[#0f172a]" : "text-gray-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <Search className="w-5 h-5" />
                <span className="text-sm font-medium">Search</span>
              </button>
            )}
          </div>

          {/* Header Right (User Info & Actions) */}
          <div className="flex items-center gap-3 ml-auto">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-semibold text-white">{user.displayName}</span>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                    isSupremeAdmin ? "text-purple-400" : 
                    isSuperAdmin ? "text-indigo-400" : 
                    isAdmin ? "text-blue-400" : 
                    currentUserDoc?.role === 'guest' ? "text-orange-400" : "text-gray-400"
                  )}>
                    {isSupremeAdmin ? <><ShieldCheck className="w-3 h-3" /> Administrator</> : 
                     isSuperAdmin ? <><ShieldCheck className="w-3 h-3" /> Super Admin</> : 
                     isAdmin ? <><ShieldCheck className="w-3 h-3" /> Admin</> : 
                     currentUserDoc?.role === 'guest' ? 'Guest' : 'User'}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} title="Logout" className="rounded-full w-10 h-10 p-0 border-slate-700 overflow-hidden text-gray-300 hover:bg-white/10 hover:text-white">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=' + (user.displayName?.[0] || 'U');
                      }}
                    />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ) : (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleLogin} 
                disabled={isLoggingIn}
                className="bg-white text-[#0f172a] hover:bg-gray-100 min-w-[120px]"
              >
                {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {isLoggingIn ? 'Logging in...' : 'Admin Login'}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 bg-white"
            >
              <div className="p-4 space-y-2">
                <button
                  onClick={() => { setActiveTab('landing'); setIsMenuOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl font-medium flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                    activeTab === 'landing' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Home className="w-5 h-5 text-emerald-500" /> Home
                </button>
                {isFullyApproved && (
                  <button
                    onClick={() => { setActiveTab('search'); setIsMenuOpen(false); }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-sm text-left",
                      activeTab === 'search' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <Search className="w-5 h-5 text-sky-500" /> Search
                  </button>
                )}
                {isFullyApproved && (
                  <>
                    {isAdmin && (
                      <button
                        onClick={() => { setActiveTab('master'); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl font-medium flex items-center justify-start gap-3 uppercase tracking-wider text-sm text-left",
                          activeTab === 'master' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                        )}
                      >
                        <Grid3X3 className="w-5 h-5 text-blue-500" /> ADD PRODUCT
                      </button>
                    )}
                    <button
                      onClick={() => { setActiveTab('booked'); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-sm text-left",
                        activeTab === 'booked' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <FileText className="w-5 h-5 text-amber-500" /> Booked Item
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setActiveTab('stock'); setIsMenuOpen(false); }}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-sm",
                    activeTab === 'stock' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Database className="w-5 h-5" /> Stock Item
                </button>

                {isFullyApproved && (
                  <>
                    <button
                      onClick={() => { setActiveTab('quote'); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-sm",
                        activeTab === 'quote' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <Calculator className="w-5 h-5" /> Make Quote
                    </button>
                    <button
                      onClick={() => { setActiveTab('view_quote'); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-sm",
                        activeTab === 'view_quote' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <Search className="w-5 h-5" /> View Quote
                    </button>
                    <button
                      onClick={() => { setActiveTab('sales'); setIsMenuOpen(false); }}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-sm",
                        activeTab === 'sales' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <FileText className="w-5 h-5" /> Sales / Invoice
                    </button>
                  </>
                )}
                {(isSuperAdmin || isSupremeAdmin) && (
                  <button
                    onClick={() => { setActiveTab('master_sheet'); setIsMenuOpen(false); }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-sm",
                      activeTab === 'master_sheet' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <Database className="w-5 h-5" /> Master Sheet
                  </button>
                )}
                {isSupremeAdmin && (
                  <button
                    onClick={() => { setActiveTab('users'); setIsMenuOpen(false); }}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-sm",
                      activeTab === 'users' ? "bg-[#0f172a] text-white font-bold" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <ShieldCheck className="w-5 h-5" /> Users
                  </button>
                )}
                {isAdmin && (
                  <>
                    <div className="h-px bg-gray-200 my-2" />
                    <button 
                      onClick={handleBackup} 
                      className="w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-xs text-gray-500 hover:bg-gray-50"
                    >
                      <Download className="w-5 h-5" /> BACKUP DATA
                    </button>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestore}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <button className="w-full px-4 py-3 rounded-xl font-medium flex items-center gap-3 uppercase tracking-wider text-xs text-gray-500 text-left hover:bg-gray-50">
                        <Upload className="w-5 h-5" /> RESTORE DATA
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    )}

      <main className={cn("flex-1 w-full mx-auto pb-24 space-y-6 relative", user && isApproved ? "max-w-[1600px] p-4 sm:p-6" : "")}>
        {/* Global Search Page Background */}
        {user && isApproved && activeTab === 'search' && (
          <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <img 
               src="/global_bg.jpg" 
               alt="" 
               className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
          </div>
        )}
        {/* Login Required Message */}
        {!user && isAuthReady && (
          <div className="h-screen flex items-center justify-center p-4 relative z-10 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-[#064e3b]/95 backdrop-blur-md p-10 sm:p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] w-full max-w-md text-center flex flex-col items-center border border-white/10"
            >
              <h2 className="text-2xl font-bold text-white mb-8">{authMode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>

              <form onSubmit={handleEmailAuth} className="w-full space-y-6 mb-8 text-left">
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Full Name</label>
                    <div className="relative border-b border-white/20 pb-2 flex items-center gap-3">
                      <LayoutDashboard className="w-4 h-4 text-white/40" />
                      <input 
                        type="text" 
                        placeholder="Your name" 
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full bg-transparent text-white placeholder:text-white/20 outline-none text-sm" 
                        required={authMode === 'signup'}
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Email Address</label>
                  <div className="relative border-b border-white/20 pb-2 flex items-center gap-3">
                    <Mail className="w-4 h-4 text-white/40" />
                    <input 
                      type="email" 
                      placeholder="E-mail address" 
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-transparent text-white placeholder:text-white/20 outline-none text-sm" 
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Password</label>
                  <div className="relative border-b border-white/20 pb-2 flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-white/40" />
                    <input 
                      type="password" 
                      placeholder="Password" 
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-transparent text-white placeholder:text-white/20 outline-none text-sm" 
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-white text-[#064e3b] hover:bg-white/90 py-4 rounded-full font-bold text-lg transition-all shadow-xl disabled:opacity-70 flex items-center justify-center gap-3 active:scale-95"
                >
                  {isLoggingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : (authMode === 'signup' ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />)}
                  {isLoggingIn ? (authMode === 'signup' ? 'Creating...' : 'Signing in...') : (authMode === 'signup' ? 'Sign up' : 'Log in')}
                </button>
              </form>

              <div className="w-full flex items-center gap-4 mb-8">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">or continue with</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <button 
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 py-3 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Google Account
              </button>

              <div className="mt-8 space-y-6">
                <p className="text-[10px] text-white/50 leading-relaxed max-w-[240px]">
                  By using this application you agree with terms of use and privacy policy
                </p>
                
                <p className="text-sm font-medium text-white/80">
                  {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"} 
                  <button 
                    onClick={() => {
                      setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                      setAuthError(null);
                    }} 
                    className="text-white font-bold hover:underline ml-1"
                  >
                    {authMode === 'signup' ? 'Log in' : 'Sign up'}
                  </button>
                </p>
              </div>

              {authError && (
                <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-200 text-xs font-medium">
                  {authError}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Pending/Rejected/No Access Message */}
        {user && !isApproved && isAuthReady && (
          <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-gray-200 p-8 sm:p-12 rounded-3xl text-center space-y-6 shadow-sm max-w-2xl mx-auto my-12"
            >
            <div className="space-y-4">
              {isExpired ? (
                <>
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="w-10 h-10 text-red-600" />
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-gray-900">
                    Subscription <span className="text-red-600">Expired</span>
                  </h1>
                  <div className="space-y-4">
                    <p className="text-gray-600 max-w-md mx-auto">Your subscription has ended. Please contact the administrator to renew your access.</p>
                  </div>
                </>
              ) : !currentUserDoc ? (
                <>
                  <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-gray-900">
                    Access <span className="text-red-600">Restricted</span>
                  </h1>
                  <p className="text-gray-600 max-w-md mx-auto">Your account is not registered in our system. Please send a request to the administrator to gain access.</p>
                  <Button onClick={handleRequestAccess} variant="primary" size="lg" className="px-8 py-6 text-lg rounded-2xl shadow-lg shadow-blue-200">
                    <Plus className="w-5 h-5" /> Send Access Request
                  </Button>
                </>
              ) : currentUserDoc.status === 'pending' ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
                     <Loader2 className="w-10 h-10 text-yellow-600 animate-spin" />
                  </div>
                  <h1 className="text-3xl font-black text-gray-900">Registration <span className="text-yellow-600">Pending</span></h1>
                  <p className="text-gray-600 max-w-sm text-center">Your account is waiting for administrator approval. You can currently only view <b>Home</b> and <b>Stock Item</b>.</p>
                </div>
              ) : (
                  <>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-gray-900">
                      Access <span className="text-red-600">Restricted</span>
                    </h1>
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <X className="w-10 h-10 text-red-600" />
                    </div>
                    <p className="text-gray-600 max-w-md mx-auto">Your access request has been <span className="font-bold text-red-600">REJECTED</span>. Please contact the administrator if you believe this is a mistake.</p>
                  </>
                )}
              
              <div className="flex flex-col items-center gap-2 pt-8 border-t border-gray-100 mt-8">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Contact Admin</p>
                <a href="tel:+8801682799198" className="text-xl font-bold text-blue-600 hover:underline flex items-center gap-2">
                  +8801682799198
                </a>
                <a href="mailto:Bijoy.mm112@gmail.com" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Bijoy.mm112@gmail.com
                </a>
              </div>
              
              <div className="pt-6">
                <Button onClick={handleLogout} variant="outline" size="sm" className="text-gray-500 rounded-xl px-4 py-2 flex items-center gap-2">
                  {user && user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-5 h-5 rounded-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  Logout
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

        {/* Status Messages */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "fixed top-20 right-4 z-50 p-4 rounded-xl shadow-lg border max-w-md",
                statusMessage.type === 'success' ? "bg-green-50 border-green-200 text-green-800" : 
                statusMessage.type === 'info' ? "bg-blue-50 border-blue-200 text-blue-800" :
                "bg-red-50 border-red-200 text-red-800"
              )}
            >
              <div className="flex items-center gap-3">
                {statusMessage.type === 'success' ? <Package className="w-5 h-5" /> : 
                 statusMessage.type === 'info' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                 <LogOut className="w-5 h-5" />}
                <p className="font-medium">{statusMessage.text}</p>
                <button onClick={() => setStatusMessage(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Messages */}

        {user && isApproved && (
          <div className="space-y-12">
            
            {showSearchBox && (
                    <div className="max-w-xl mx-auto">
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search items by name, code or brand..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl shadow-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-lg font-medium text-slate-900 placeholder:text-slate-400"
                        />
                      </div>
                    </div>
            )}
            {(activeTab === 'master' && isAdmin || activeTab === 'master_sheet' && isSuperAdmin) && (
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
              <button
                onClick={() => setMasterSubTab('tiles')}
                className={cn(
                  "px-6 py-2 rounded-lg font-medium transition-all cursor-pointer",
                  masterSubTab === 'tiles' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                All Tiles
              </button>
              <button
                onClick={() => setMasterSubTab('goods')}
                className={cn(
                  "px-6 py-2 rounded-lg font-medium transition-all cursor-pointer",
                  masterSubTab === 'goods' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                All Goods
              </button>
              <button
                onClick={() => setMasterSubTab('tools')}
                className={cn(
                  "px-6 py-2 rounded-lg font-medium transition-all cursor-pointer",
                  masterSubTab === 'tools' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                All Tools
              </button>
            </div>
          )}

          {/* User Management Section */}
          {activeTab === 'users' && isSupremeAdmin && (
            <section className="space-y-12">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-[#0f172a]" />
                  User Management
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {users.length} Total
                  </span>
                </h2>
              </div>

              {/* Administrators Table */}
              <UserRoleTable 
                title="Administrators" 
                roleColor="text-purple-600"
                users={users.filter(u => u.role === 'supreme_admin' || u.email === 'bijoymahmudmunna@gmail.com')} 
                onUpdateRole={async (id, role) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { role });
                    showStatus('success', 'Role updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update role');
                  }
                }}
                onUpdateStatus={async (id, status) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { status });
                    showStatus('success', 'Status updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update status');
                  }
                }}
                onUpdateExpiry={async (id, expiryDate) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { expiryDate });
                    showStatus('success', 'Expiry date updated');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update expiry');
                  }
                }}
                onDelete={async (id) => {
                  setConfirmAction({
                    title: 'Delete User',
                    message: 'Are you sure you want to delete this user?',
                    type: 'danger',
                    onConfirm: async () => {
                      try {
                        await deleteDoc(doc(db, 'users', id));
                        showStatus('success', 'User deleted');
                      } catch (err: any) {
                        showStatus('error', 'Failed to delete user');
                      }
                      setConfirmAction(null);
                    }
                  });
                }}
                currentUser={user}
              />

              {/* Super Admins Table */}
              <UserRoleTable 
                title="Super Admins" 
                roleColor="text-[#0f172a]"
                users={users.filter(u => u.role === 'super_admin' && u.email !== 'bijoymahmudmunna@gmail.com')} 
                onUpdateRole={async (id, role) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { role });
                    showStatus('success', 'Role updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update role');
                  }
                }}
                onUpdateStatus={async (id, status) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { status });
                    showStatus('success', 'Status updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update status');
                  }
                }}
                onUpdateExpiry={async (id, expiryDate) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { expiryDate });
                    showStatus('success', 'Expiry date updated');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update expiry');
                  }
                }}
                onDelete={async (id) => {
                  setConfirmAction({
                    title: 'Delete User',
                    message: 'Are you sure you want to delete this user?',
                    type: 'danger',
                    onConfirm: async () => {
                      try {
                        await deleteDoc(doc(db, 'users', id));
                        showStatus('success', 'User deleted');
                      } catch (err: any) {
                        showStatus('error', 'Failed to delete user');
                      }
                      setConfirmAction(null);
                    }
                  });
                }}
                currentUser={user}
              />

              {/* Admins Table */}
              <UserRoleTable 
                title="Admins" 
                roleColor="text-green-600"
                users={users.filter(u => u.role === 'admin' && u.email !== 'bijoymahmudmunna@gmail.com')} 
                onUpdateRole={async (id, role) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { role });
                    showStatus('success', 'Role updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update role');
                  }
                }}
                onUpdateStatus={async (id, status) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { status });
                    showStatus('success', 'Status updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update status');
                  }
                }}
                onUpdateExpiry={async (id, expiryDate) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { expiryDate });
                    showStatus('success', 'Expiry date updated');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update expiry');
                  }
                }}
                onDelete={async (id) => {
                  setConfirmAction({
                    title: 'Delete User',
                    message: 'Are you sure you want to delete this user?',
                    type: 'danger',
                    onConfirm: async () => {
                      try {
                        await deleteDoc(doc(db, 'users', id));
                        showStatus('success', 'User deleted');
                      } catch (err: any) {
                        showStatus('error', 'Failed to delete user');
                      }
                      setConfirmAction(null);
                    }
                  });
                }}
                currentUser={user}
              />

              {/* Users Table */}
              <UserRoleTable 
                title="Regular Users" 
                roleColor="text-gray-600"
                users={users.filter(u => u.role === 'user' && u.email !== 'bijoymahmudmunna@gmail.com')} 
                onUpdateRole={async (id, role) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { role });
                    showStatus('success', 'Role updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update role');
                  }
                }}
                onUpdateStatus={async (id, status) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { status });
                    showStatus('success', 'Status updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update status');
                  }
                }}
                onUpdateExpiry={async (id, expiryDate) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { expiryDate });
                    showStatus('success', 'Expiry date updated');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update expiry');
                  }
                }}
                onDelete={async (id) => {
                  setConfirmAction({
                    title: 'Delete User',
                    message: 'Are you sure you want to delete this user?',
                    type: 'danger',
                    onConfirm: async () => {
                      try {
                        await deleteDoc(doc(db, 'users', id));
                        showStatus('success', 'User deleted');
                      } catch (err: any) {
                        showStatus('error', 'Failed to delete user');
                      }
                      setConfirmAction(null);
                    }
                  });
                }}
                currentUser={user}
              />

              {/* Guests Table */}
              <UserRoleTable 
                title="Guests (Public Access)" 
                roleColor="text-orange-600"
                users={users.filter(u => u.role === 'guest' && u.email !== 'bijoymahmudmunna@gmail.com')} 
                onUpdateRole={async (id, role) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { role });
                    showStatus('success', 'Role updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update role');
                  }
                }}
                onUpdateStatus={async (id, status) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { status });
                    showStatus('success', 'Status updated successfully');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update status');
                  }
                }}
                onUpdateExpiry={async (id, expiryDate) => {
                  try {
                    await updateDoc(doc(db, 'users', id), { expiryDate });
                    showStatus('success', 'Expiry date updated');
                  } catch (err: any) {
                    showStatus('error', 'Failed to update expiry');
                  }
                }}
                onDelete={async (id) => {
                  setConfirmAction({
                    title: 'Delete User',
                    message: 'Are you sure you want to delete this user?',
                    type: 'danger',
                    onConfirm: async () => {
                      try {
                        await deleteDoc(doc(db, 'users', id));
                        showStatus('success', 'User deleted');
                      } catch (err: any) {
                        showStatus('error', 'Failed to delete user');
                      }
                      setConfirmAction(null);
                    }
                  });
                }}
                currentUser={user}
              />

              {/* Email Configuration Test Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <Mail className="w-6 h-6 text-[#0f172a]" />
                  <h3 className="text-lg font-bold text-gray-900">Email Configuration Test</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Use this tool to verify if your email notifications are correctly configured. 
                    This will attempt to send a test email to <span className="font-semibold text-gray-900">bijoymahmudmunna@gmail.com</span> using the credentials set in the platform settings.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#0f172a] mt-0.5" />
                    <div className="text-xs text-blue-800 space-y-1">
                      <p className="font-bold uppercase">Required Settings (⚙️ Menu):</p>
                      <ul className="list-disc list-inside space-y-0.5 opacity-90">
                        <li><strong>EMAIL_USER:</strong> Your Gmail address</li>
                        <li><strong>EMAIL_PASS:</strong> Your 16-character Gmail App Password</li>
                        <li><strong>EMAIL_SERVICE:</strong> gmail (default)</li>
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        showStatus('info', 'Sending test email...');
                        const response = await fetch('/api/test-email');
                        const result = await response.json();
                        if (result.success) {
                          showStatus('success', 'Test email sent! Please check your inbox.');
                        } else {
                          showStatus('error', `Failed: ${result.error}`);
                        }
                      } catch (err) {
                        showStatus('error', 'Network error while sending test email.');
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0f172a] text-white font-semibold rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-sm shadow-slate-200"
                  >
                    <Mail className="w-4 h-4" />
                    Send Test Email
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'view_quote' && (
            <div className="w-full overflow-x-auto pb-8">
              <ViewQuote 
                quotes={savedQuotes} 
                isSuperAdmin={isSuperAdmin} 
                isSupremeAdmin={isSupremeAdmin}
              onDelete={async (id) => {
                setConfirmAction({
                  title: 'Delete Quotation',
                  message: 'Are you sure you want to delete this quotation? This action cannot be undone.',
                  type: 'danger',
                  onConfirm: async () => {
                    try {
                      await deleteDoc(doc(db, 'savedQuotes', id));
                      toast.success("Quotation deleted.");
                    } catch (error) {
                      console.error("Delete error:", error);
                      toast.error("Failed to delete quotation.");
                    }
                    setConfirmAction(null);
                  }
                });
              }}
              onDownload={(quote) => {
                loadQuoteForView(quote, false);
                toast.success("Loading quotation for download...");
                setTimeout(() => {
                  downloadPDF();
                }, 1000);
              }}
              onEdit={(quote) => {
                loadQuoteForView(quote, true);
                setIsEditingQuote(true);
                toast.success("Loading quotation for editing...");
              }}
              onBulkDelete={async (ids) => {
                setConfirmAction({
                  title: 'Delete Multiple Quotations',
                  message: `Are you sure you want to delete ${ids.length} selected quotations? This action cannot be undone.`,
                  type: 'danger',
                  onConfirm: async () => {
                    try {
                      const deletePromises = ids.map(id => deleteDoc(doc(db, 'savedQuotes', id)));
                      await Promise.all(deletePromises);
                      toast.success(`${ids.length} quotations deleted.`);
                    } catch (error) {
                      console.error("Bulk delete error:", error);
                      toast.error("Failed to delete some quotations.");
                    }
                    setConfirmAction(null);
                  }
                });
              }}
            />
            </div>
          )}

          {/* Tiles Section */}
          {(((activeTab === 'master' && isAdmin || activeTab === 'master_sheet' && isSuperAdmin) && masterSubTab === 'tiles') || (activeTab === 'search' && showSearchBox && searchQuery.trim() !== '' && isFullyApproved && filteredTiles.length > 0)) && (
            <section className="space-y-4">
              <div className={cn(
                "flex items-center justify-between",
                activeTab === 'search' && "bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-white/40 shadow-sm relative z-10"
              )}>
                <h2 className={cn(
                  "text-2xl flex items-center gap-2",
                  activeTab === 'search' ? "font-black text-black" : "font-bold text-gray-900"
                )}>
                  <Grid3X3 className={cn("w-6 h-6", activeTab === 'search' ? "text-black" : "text-[#0f172a]")} />
                  {(activeTab === 'master' || activeTab === 'master_sheet') ? 'All Tiles' : 'Tiles Results'}
                  <span className={cn(
                    "px-2 py-1 rounded-full",
                    activeTab === 'search' ? "text-xs font-black text-white bg-black shadow-lg" : "text-sm font-normal text-gray-500 bg-gray-100"
                  )}>
                    {(activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '') ? filteredTiles : tiles).length}
                  </span>
                </h2>
                <div className="flex gap-2">
                  {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && (
                    <div className="flex items-center gap-2">
                      {selectedTiles.length > 0 && (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDeleteSelected('tiles')}
                        >
                          Delete Selected ({selectedTiles.length})
                        </Button>
                      )}
                      {activeTab === 'master' && (
                        <div className="flex items-center gap-2">
                          <div className="relative">
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleImportExcel}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={importing}
                        />
                        <Button variant="outline" size="sm" disabled={importing}>
                          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                          Import Excel
                        </Button>
                      </div>
                      <Button onClick={() => setShowAddModal('tiles')} variant="ghost" className="text-blue-600">
                        <Plus className="w-4 h-4" /> Add New Item
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
              <div className={cn(
                "rounded-2xl shadow-xl border overflow-auto max-h-[60vh] md:max-h-[70vh] overscroll-contain",
                activeTab === 'search' ? "bg-white/80 backdrop-blur-xl border-white/60 shadow-2xl" : "bg-white border-gray-200"
              )}>
                <table className="w-full border-separate border-spacing-0 min-w-[1200px]">
                  <thead>
                    <tr>
                      <TableHeader className={cn("w-10", activeTab === 'search' && "bg-slate-200/50")}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedTiles.length > 0 && selectedTiles.length === displayTiles.length}
                          onChange={() => toggleSelectAll('tiles', displayTiles.map(t => t.id))}
                        />
                      </TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>SL</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Image</TableHeader>
                      <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Name</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Size</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Brand</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Total (SFT)</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Total (PCS)</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Dia-Bari (SFT)</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>PCS</TableHeader>
                      <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Remark</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Bonorupa (SFT)</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>PCS_1</TableHeader>
                      <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Remark_1</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Banani (SFT)</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>PCS_2</TableHeader>
                      <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Remark_2</TableHeader>
                      {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && !!highlightedRow && <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Action</TableHeader>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayTiles.map((tile, index) => {
                      const isEditing = editingId === tile.id;
                      const currentBookings = bookedItems.filter(b => b.name === tile.name);
                      const bookedSft = currentBookings.reduce((sum, b) => sum + (b.qtySft || 0), 0);
                      const bookedPcs = currentBookings.reduce((sum, b) => sum + (b.qtyPcs || 0), 0);
                      const stockSft = Math.round(tile.totalSft - bookedSft);
                      const stockPcs = Math.round(tile.totalPcs - bookedPcs);
                      const isOutOfStock = stockSft <= 0 || stockPcs <= 0;
                      const getCellColor = (val: number) => {
                         if (Math.round(val) <= 0) return 'text-red-700 font-black';
                         return activeTab === 'search' ? 'text-blue-800 font-black' : 'text-[#4285F4]';
                      };

                      return (
                        <tr 
                          key={tile.id} 
                          onClick={() => setHighlightedRow(tile.id)}
                          className={cn(
                            "transition-colors cursor-pointer", 
                            activeTab === 'search' ? "hover:bg-white/40" : "hover:bg-gray-50",
                            selectedTiles.includes(tile.id) && "bg-blue-50/50",
                            highlightedRow === tile.id && (activeTab === 'search' ? "bg-blue-100/50 ring-2 ring-blue-300 ring-inset" : "bg-yellow-50 ring-2 ring-yellow-200 ring-inset")
                          )}
                        >
                          <TableCell className="border-slate-300">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                              checked={selectedTiles.includes(tile.id)}
                              onChange={() => toggleSelect('tiles', tile.id)}
                              disabled={!isAdmin}
                            />
                          </TableCell>
                          <TableCell align="center" className="font-mono text-xs text-gray-800 font-normal border-slate-300">{index + 1}</TableCell>
                          <TableCell align="center" className="border-slate-300">
                            {isEditing ? (
                              <div className="flex flex-col gap-1 items-center min-w-[120px]">
                                {editData.imageUrl && (
                                  <img 
                                    src={editData.imageUrl} 
                                    alt="Preview" 
                                    className="w-10 h-10 object-cover rounded shadow mb-1 border border-gray-200"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error'; }}
                                  />
                                )}
                                <input 
                                  type="text" 
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-[10px]" 
                                  placeholder="Image URL"
                                  value={editData.imageUrl || ''} 
                                  onChange={e => setEditData({ ...editData, imageUrl: e.target.value })}
                                />
                                <div className="text-[9px] text-gray-500 font-normal uppercase my-0.5">OR</div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-[9px] file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const base64 = await fileToBase64(file);
                                        setEditData({ ...editData, imageUrl: base64 });
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            ) : tile.imageUrl ? (
                              <div className="relative group">
                                <img 
                                  src={tile.imageUrl} 
                                  alt={tile.name} 
                                  className="w-12 h-12 object-cover rounded-lg border-2 border-white cursor-zoom-in hover:scale-110 transition-transform mx-auto shadow-md" 
                                  referrerPolicy="no-referrer"
                                  onClick={() => setPreviewImage(tile.imageUrl)}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center mx-auto border border-white/40">
                                <Grid3X3 className="w-6 h-6 text-gray-700" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className={cn("text-gray-800 border-slate-300", activeTab === 'search' ? "font-normal" : "font-medium")}>
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.name} 
                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : tile.name}
                          </TableCell>
                          <TableCell align="center" className="text-gray-800 font-normal border-slate-300">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.size} 
                                onChange={e => setEditData({ ...editData, size: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : tile.size}
                          </TableCell>
                          <TableCell align="center" className="text-gray-800 font-normal border-slate-300">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.brand} 
                                onChange={e => setEditData({ ...editData, brand: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : tile.brand}
                          </TableCell>
                          <TableCell align="center" className={cn("font-normal border-slate-300", isOutOfStock ? "bg-red-700 text-white" : getCellColor(tile.totalSft))}>
                            {isOutOfStock ? 0 : Math.round(tile.totalSft || 0)}
                          </TableCell>
                          <TableCell align="center" className={cn("font-normal border-slate-300", isOutOfStock ? "bg-red-700 text-white" : getCellColor(tile.totalPcs))}>
                            {isOutOfStock ? 0 : Math.round(tile.totalPcs || 0)}
                          </TableCell>
                          <TableCell align="center" className={cn("border-slate-300", getCellColor(tile.diaBariSft))}>{Math.round(tile.diaBariSft || 0)}</TableCell>
                          <TableCell align="center" className={cn("border-slate-300", getCellColor(tile.diaBariPcs))}>
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-full h-full min-w-[80px] min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.diaBariPcs} 
                                onChange={e => setEditData({ ...editData, diaBariPcs: Number(e.target.value) || 0 })}
                              />
                            ) : Math.round(tile.diaBariPcs || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 italic">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.diaBariRemark} 
                                onChange={e => setEditData({ ...editData, diaBariRemark: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : tile.diaBariRemark}
                          </TableCell>
                          <TableCell align="center" className={cn("border-slate-300", getCellColor(tile.bonorupaSft))}>{Math.round(tile.bonorupaSft || 0)}</TableCell>
                          <TableCell align="center" className={cn("border-slate-300", getCellColor(tile.bonorupaPcs))}>
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-full h-full min-w-[80px] min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.bonorupaPcs} 
                                onChange={e => setEditData({ ...editData, bonorupaPcs: Number(e.target.value) || 0 })}
                              />
                            ) : Math.round(tile.bonorupaPcs || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-gray-800 font-normal italic border-slate-300">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.bonorupaRemark} 
                                onChange={e => setEditData({ ...editData, bonorupaRemark: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : tile.bonorupaRemark}
                          </TableCell>
                          <TableCell align="center" className={cn("border-slate-300", getCellColor(tile.bananiSft))}>{Math.round(tile.bananiSft || 0)}</TableCell>
                          <TableCell align="center" className={cn("border-slate-300", getCellColor(tile.bananiPcs))}>
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-full h-full min-w-[80px] min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.bananiPcs} 
                                onChange={e => setEditData({ ...editData, bananiPcs: Number(e.target.value) || 0 })}
                              />
                            ) : Math.round(tile.bananiPcs || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-gray-800 font-normal italic border-slate-300">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.bananiRemark} 
                                onChange={e => setEditData({ ...editData, bananiRemark: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : tile.bananiRemark}
                          </TableCell>
                           {(((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && (highlightedRow === tile.id || isEditing)) && (
                             <TableCell>
                               <div className="flex gap-2">
                                 {isEditing ? (
                                   <>
                                     <Button 
                                       variant="primary" 
                                       size="sm" 
                                       onClick={() => handleInlineEditSave('tiles', tile.id)}
                                     >
                                       Save
                                     </Button>
                                     <Button 
                                       variant="secondary" 
                                       size="sm" 
                                       onClick={() => { setEditingId(null); setEditData(null); setHighlightedRow(null); }}
                                     >
                                       Cancel
                                     </Button>
                                   </>
                                 ) : (
                                   <>
                                     {activeTab === 'master' && (
                                       <Button 
                                         variant="outline" 
                                         size="sm" 
                                         className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                         onClick={() => { setEditingId(tile.id); setEditData({ ...tile }); }}
                                       >
                                         Edit
                                       </Button>
                                     )}
                                     <Button 
                                       variant="outline" 
                                       size="sm" 
                                       className="text-red-600 border-red-200 hover:bg-red-50"
                                       onClick={() => handleDeleteItem('tiles', tile.id)}
                                     >
                                       Delete
                                     </Button>
                                   </>
                                 )}
                               </div>
                             </TableCell>
                           )}
                           {(((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && (highlightedRow !== tile.id && !isEditing)) && (
                             <TableCell>&nbsp;</TableCell>
                           )}
                        </tr>
                      );
                    })}
                    {displayTiles.length === 0 && (
                      <tr>
                        <td colSpan={18} className="px-4 py-12 text-center text-gray-500">
                          No tiles found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Goods Section */}
          {(((activeTab === 'master' && isAdmin || activeTab === 'master_sheet' && isSuperAdmin) && masterSubTab === 'goods') || (activeTab === 'search' && showSearchBox && searchQuery.trim() !== '' && isFullyApproved && filteredGoods.length > 0)) && (
            <section className="space-y-4">
              <div className={cn(
                "flex items-center justify-between",
                activeTab === 'search' && "bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-white/40 shadow-sm relative z-10"
              )}>
                <h2 className={cn(
                  "text-2xl flex items-center gap-2",
                  activeTab === 'search' ? "font-black text-black" : "font-bold text-gray-900"
                )}>
                  <Package className={cn("w-6 h-6", activeTab === 'search' ? "text-black" : "text-[#0f172a]")} />
                  {(activeTab === 'master' || activeTab === 'master_sheet') ? 'All Goods' : 'Goods Results'}
                  <span className={cn(
                    "px-3 py-1 rounded-full",
                    activeTab === 'search' ? "text-xs font-black text-white bg-black shadow-lg" : "text-sm font-normal text-gray-500 bg-gray-100"
                  )}>
                    {(activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '') ? filteredGoods : goods).length}
                  </span>
                </h2>
                <div className="flex gap-2">
                  {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && (
                    <div className="flex items-center gap-2">
                      {selectedGoods.length > 0 && (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDeleteSelected('goods')}
                        >
                          Delete Selected ({selectedGoods.length})
                        </Button>
                      )}
                      {activeTab === 'master' && (
                        <Button onClick={() => setShowAddModal('goods')} variant="ghost" className="text-blue-600">
                          <Plus className="w-4 h-4" /> Add New Item
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className={cn(
                "rounded-2xl shadow-xl border overflow-auto max-h-[60vh] md:max-h-[70vh] overscroll-contain",
                activeTab === 'search' ? "bg-white/80 backdrop-blur-xl border-white/60 shadow-2xl" : "bg-white border-gray-200"
              )}>
                <table className="w-full border-separate border-spacing-0 min-w-[1000px]">
                  <thead>
                    <tr>
                      <TableHeader className={cn("w-10", activeTab === 'search' && "bg-slate-200/50")}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedGoods.length > 0 && selectedGoods.length === displayGoods.length}
                          onChange={() => toggleSelectAll('goods', displayGoods.map(g => g.id))}
                        />
                      </TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>SL</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Image</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Brand</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Code</TableHeader>
                      <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Description</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Total (PCS)</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Bonorupa</TableHeader>
                      <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Remark_1</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Banani</TableHeader>
                      <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Remark_2</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Dokhinkhan</TableHeader>
                      <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Remark</TableHeader>

                      {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Action</TableHeader>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayGoods.map((good, index) => {
                      const isEditing = editingId === good.id;
                      const currentBookings = bookedItems.filter(b => b.code === good.code);
                      const bookedPcs = currentBookings.reduce((sum, b) => sum + (b.qtyPcs || 0), 0);
                      const totalPcs = Math.round((good.dokhinkhan || 0) + (good.bonorupa || 0) + (good.banani || 0));
                      const stockPcs = Math.round(totalPcs - bookedPcs);
                      const isOutOfStock = stockPcs <= 0;
                      const getCellColor = (val: number) => {
                        if (Math.round(val) <= 0) return 'text-red-700 font-black';
                        return activeTab === 'search' ? 'text-blue-800 font-black' : 'text-[#4285F4]';
                      };

                      return (
                        <tr 
                          key={good.id} 
                          onClick={() => setHighlightedRow(good.id)}
                          className={cn(
                            "transition-colors cursor-pointer", 
                            activeTab === 'search' ? "hover:bg-white/40" : "hover:bg-gray-50",
                            selectedGoods.includes(good.id) && "bg-blue-50/50",
                            highlightedRow === good.id && (activeTab === 'search' ? "bg-blue-100/50 ring-2 ring-blue-300 ring-inset" : "bg-yellow-50 ring-2 ring-yellow-200 ring-inset")
                          )}
                        >
                          <TableCell className="border-slate-300">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                              checked={selectedGoods.includes(good.id)}
                              onChange={() => toggleSelect('goods', good.id)}
                              disabled={!isAdmin}
                            />
                          </TableCell>
                          <TableCell align="center" className="font-mono text-xs text-gray-800 font-normal border-slate-300">{index + 1}</TableCell>
                          <TableCell align="center" className="border-slate-300">
                            {isEditing ? (
                              <div className="flex flex-col gap-1 items-center min-w-[120px]">
                                {editData.imageUrl && (
                                  <img 
                                    src={editData.imageUrl} 
                                    alt="Preview" 
                                    className="w-10 h-10 object-cover rounded shadow mb-1 border border-gray-200"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error'; }}
                                  />
                                )}
                                <input 
                                  type="text" 
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-[10px]" 
                                  placeholder="Image URL"
                                  value={editData.imageUrl || ''} 
                                  onChange={e => setEditData({ ...editData, imageUrl: e.target.value })}
                                />
                                <div className="text-[9px] text-gray-500 font-normal uppercase my-0.5">OR</div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-[9px] file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const base64 = await fileToBase64(file);
                                        setEditData({ ...editData, imageUrl: base64 });
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            ) : good.imageUrl ? (
                              <img 
                                src={good.imageUrl} 
                                alt={good.code} 
                                className="w-12 h-12 object-cover rounded-lg border-2 border-white hover:scale-110 transition-transform cursor-zoom-in mx-auto shadow-md" 
                                referrerPolicy="no-referrer"
                                onClick={() => setPreviewImage(good.imageUrl)}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center mx-auto border border-white/40">
                                <Package className="w-6 h-6 text-gray-700" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell align="center" className="text-gray-800 font-normal border-slate-300">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.brand} 
                                onChange={e => setEditData({ ...editData, brand: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : good.brand}
                          </TableCell>
                          <TableCell align="center" className="font-mono text-blue-800 font-normal border-slate-300">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.code} 
                                onChange={e => setEditData({ ...editData, code: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : good.code}
                          </TableCell>
                          <TableCell className={cn("text-gray-800 border-slate-300 whitespace-normal break-words max-w-[300px]", activeTab === 'search' ? "font-normal" : "")}>
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.description} 
                                onChange={e => setEditData({ ...editData, description: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : good.description}
                          </TableCell>
                          <TableCell align="center" className={cn("font-normal border-slate-300", isOutOfStock ? "bg-red-700 text-white" : getCellColor(totalPcs))}>
                            {isOutOfStock ? 0 : (totalPcs || 0)}
                          </TableCell>
                          <TableCell align="center" className={cn("border-slate-300", getCellColor(good.bonorupa))}>
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.bonorupa} 
                                onChange={e => setEditData({ ...editData, bonorupa: Number(e.target.value) || 0 })}
                              />
                            ) : Math.round(good.bonorupa || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 italic">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.bonorupaRemark} 
                                onChange={e => setEditData({ ...editData, bonorupaRemark: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : good.bonorupaRemark}
                          </TableCell>
                          <TableCell align="center" className={cn("border-slate-300 font-normal", getCellColor(good.banani))}>
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.banani} 
                                onChange={e => setEditData({ ...editData, banani: Number(e.target.value) || 0 })}
                              />
                            ) : Math.round(good.banani || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-gray-800 font-normal italic border-slate-300">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.bananiRemark} 
                                onChange={e => setEditData({ ...editData, bananiRemark: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : good.bananiRemark}
                          </TableCell>
                          <TableCell align="center" className={cn("border-slate-300 font-normal", getCellColor(good.dokhinkhan))}>
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.dokhinkhan} 
                                onChange={e => setEditData({ ...editData, dokhinkhan: Number(e.target.value) || 0 })}
                              />
                            ) : Math.round(good.dokhinkhan || 0)}
                          </TableCell>
                          <TableCell className="text-xs text-gray-800 font-normal italic border-slate-300">
                            {isEditing ? (
                              <input 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.dokhinkhanRemark} 
                                onChange={e => setEditData({ ...editData, dokhinkhanRemark: e.target.value })}
                              />
                            ) : good.dokhinkhanRemark}
                          </TableCell>
                          {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && (highlightedRow === good.id || isEditing) && (
                            <TableCell>
                              <div className="flex gap-2">
                                {isEditing ? (
                                  <>
                                    <Button 
                                      variant="primary" 
                                      size="sm" 
                                      onClick={() => handleInlineEditSave('goods', good.id)}
                                    >
                                      Save
                                    </Button>
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      onClick={() => { setEditingId(null); setEditData(null); setHighlightedRow(null); }}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    {activeTab === 'master' && (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => { setEditingId(good.id); setEditData({ ...good }); }}
                                      >
                                        Edit
                                      </Button>
                                    )}
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleDeleteItem('goods', good.id)}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && highlightedRow !== good.id && !isEditing && (
                            <TableCell>&nbsp;</TableCell>
                          )}
                        </tr>
                      );
                    })}
                    {displayGoods.length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-4 py-12 text-center text-gray-500">
                          No goods found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Tools Section */}
          {(((activeTab === 'master' && isAdmin || activeTab === 'master_sheet' && isSuperAdmin) && masterSubTab === 'tools') || (activeTab === 'search' && showSearchBox && searchQuery.trim() !== '' && isFullyApproved && filteredTools.length > 0)) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Wrench className="w-6 h-6 text-[#0f172a]" />
                  {(activeTab === 'master' || activeTab === 'master_sheet') ? 'All Tools' : 'Tools Results'}
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {(activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '') ? filteredTools : tools).length}
                  </span>
                </h2>
                <div className="flex gap-2">
                  {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && (
                    <div className="flex items-center gap-2">
                      {selectedTools.length > 0 && (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDeleteSelected('tools')}
                        >
                          Delete Selected ({selectedTools.length})
                        </Button>
                      )}
                      {activeTab === 'master' && (
                        <Button onClick={() => setShowAddModal('tools')} variant="ghost" className="text-blue-600">
                          <Plus className="w-4 h-4" /> Add New Item
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-auto max-h-[60vh] md:max-h-[70vh] overscroll-contain">
                <table className="w-full border-separate border-spacing-0 min-w-[1000px]">
                  <thead>
                    <tr>
                      <TableHeader className="w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedTools.length > 0 && selectedTools.length === displayTools.length}
                          onChange={() => toggleSelectAll('tools', displayTools.map(t => t.id))}
                        />
                      </TableHeader>
                      <TableHeader align="center">SL</TableHeader>
                      <TableHeader align="center">Image</TableHeader>
                      <TableHeader>Details</TableHeader>
                      <TableHeader align="center">Qty</TableHeader>
                       <TableHeader align="center">Issue To & Date</TableHeader>
                      <TableHeader align="center">Status</TableHeader>
                      {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && <TableHeader>Action</TableHeader>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayTools.map((tool, index) => {
                      const isEditing = editingId === tool.id;
                      return (
                        <tr 
                          key={tool.id} 
                          onClick={() => setHighlightedRow(tool.id)}
                          className={cn(
                            "transition-colors cursor-pointer", 
                            selectedTools.includes(tool.id) && "bg-blue-50/50",
                            highlightedRow === tool.id && "bg-yellow-50 ring-2 ring-yellow-200 ring-inset"
                          )}
                        >
                          <TableCell>
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                              checked={selectedTools.includes(tool.id)}
                              onChange={() => toggleSelect('tools', tool.id)}
                              disabled={!isAdmin}
                            />
                          </TableCell>
                          <TableCell align="center" style={{ color: BLUE_COLOR }} className="font-mono text-xs">{index + 1}</TableCell>
                          <TableCell align="center">
                            {isEditing ? (
                              <div className="flex flex-col gap-1 items-center min-w-[120px]">
                                {editData.imageUrl && (
                                  <img 
                                    src={editData.imageUrl} 
                                    alt="Preview" 
                                    className="w-10 h-10 object-cover rounded shadow mb-1 border border-gray-200"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error'; }}
                                  />
                                )}
                                <input 
                                  type="text" 
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-[10px]" 
                                  placeholder="Image URL"
                                  value={editData.imageUrl || ''} 
                                  onChange={e => setEditData({ ...editData, imageUrl: e.target.value })}
                                />
                                <div className="text-[9px] text-gray-500 font-normal uppercase my-0.5">OR</div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-[9px] file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const base64 = await fileToBase64(file);
                                        setEditData({ ...editData, imageUrl: base64 });
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            ) : tool.imageUrl ? (
                              <img 
                                src={tool.imageUrl} 
                                alt={tool.details} 
                                className="w-12 h-12 object-cover rounded-lg border border-gray-200 hover:scale-110 transition-transform cursor-zoom-in mx-auto" 
                                referrerPolicy="no-referrer"
                                onClick={() => setPreviewImage(tool.imageUrl)}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                                <Wrench className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.details} 
                                onChange={e => setEditData({ ...editData, details: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : tool.details}
                          </TableCell>
                          <TableCell align="center" className={cn("font-semibold", Math.round(tool.qty || 0) <= 0 ? "text-red-600" : "text-[#4285F4]")}>
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.qty} 
                                onChange={e => setEditData({ ...editData, qty: Number(e.target.value) || 0 })}
                              />
                            ) : Math.round(tool.qty || 0)}
                          </TableCell>
                          <TableCell align="center" className="text-gray-600">
                            {isEditing ? (
                              <textarea 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.issueToDate} 
                                onChange={e => setEditData({ ...editData, issueToDate: e.target.value })}
                                onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                              />
                            ) : tool.issueToDate}
                          </TableCell>
                          <TableCell align="center">
                            {isEditing ? (
                              <select 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.states} 
                                onChange={e => setEditData({ ...editData, states: e.target.value as any })}
                              >
                                <option value="Good">Good</option>
                                <option value="Damaged">Damaged</option>
                                <option value="Lost">Lost</option>
                              </select>
                            ) : (
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                tool.states === 'Good' ? "bg-green-100 text-green-700" :
                                tool.states === 'Damaged' ? "bg-red-100 text-red-700" :
                                "bg-gray-100 text-gray-600"
                              )}>
                                {tool.states}
                              </span>
                            )}
                          </TableCell>
                          {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && (highlightedRow === tool.id || isEditing) && (
                            <TableCell>
                              <div className="flex gap-2">
                                {isEditing ? (
                                  <>
                                    <Button 
                                      variant="primary" 
                                      size="sm" 
                                      onClick={() => handleInlineEditSave('tools', tool.id)}
                                    >
                                      Save
                                    </Button>
                                    <Button 
                                      variant="secondary" 
                                      size="sm" 
                                      onClick={() => { setEditingId(null); setEditData(null); setHighlightedRow(null); }}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    {activeTab === 'master' && (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => { setEditingId(tool.id); setEditData({ ...tool }); }}
                                      >
                                        Edit
                                      </Button>
                                    )}
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => handleDeleteItem('tools', tool.id)}
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {((isAdmin && activeTab === 'master') || (isSupremeAdmin && activeTab === 'master_sheet')) && highlightedRow !== tool.id && !isEditing && (
                            <TableCell>&nbsp;</TableCell>
                          )}
                        </tr>
                      );
                    })}
                    {displayTools.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                          No tools found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Booked Items Section */}
          {(activeTab === 'booked' || (activeTab === 'search' && showSearchBox && searchQuery.trim() !== '' && isFullyApproved && bookedItems.filter(b => {
              if (b.deleted) return false;
              const matchesSearch = ((b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (b.code || '').toLowerCase().includes(searchQuery.toLowerCase()));
              const matchesMarketing = marketingFilter === 'all' ? true : b.marketingPerson === marketingFilter;
              return matchesSearch && matchesMarketing;
          }).length > 0)) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-[#0f172a]" />
                  {activeTab === 'booked' ? 'Booked Items' : 'Booked Results'}
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {bookedItems.filter(b => {
                      if (b.deleted) return false;
                      const matchesSearch = (activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '')) ? ((b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (b.code || '').toLowerCase().includes(searchQuery.toLowerCase())) : true;
                      const matchesMarketing = marketingFilter === 'all' ? true : b.marketingPerson === marketingFilter;
                      return matchesSearch && matchesMarketing;
                    }).length}
                  </span>
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Marketing:</label>
                    <select 
                      value={marketingFilter}
                      onChange={(e) => setMarketingFilter(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="all">All Persons</option>
                      {marketingPersons.map(person => (
                        <option key={person} value={person}>{person}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                    <>
                      {selectedBookedItems.length > 0 && (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => handleDeleteSelected('bookedItems')}
                        >
                          Delete ({selectedBookedItems.length})
                        </Button>
                      )}
                      <Button onClick={() => setShowAddModal('bookedItems')} variant="ghost" className="text-blue-600">
                        <Plus className="w-4 h-4" /> Add New Item
                      </Button>
                    </>
                  )}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-auto max-h-[60vh] md:max-h-[70vh] overscroll-contain">
                <table className="w-full border-separate border-spacing-0 min-w-[1200px]">
                  <thead>
                    <tr>
                      <TableHeader className="w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedBookedItems.length > 0 && selectedBookedItems.length === bookedItems.filter(b => {
                            if (b.deleted) return false;
                            const matchesSearch = (activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '')) ? ((b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (b.code || '').toLowerCase().includes(searchQuery.toLowerCase())) : true;
                            const matchesMarketing = marketingFilter === 'all' ? true : b.marketingPerson === marketingFilter;
                            return matchesSearch && matchesMarketing;
                          }).length}
                          onChange={() => toggleSelectAll('bookedItems', bookedItems.filter(b => {
                            if (b.deleted) return false;
                            const matchesSearch = (activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '')) ? ((b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (b.code || '').toLowerCase().includes(searchQuery.toLowerCase())) : true;
                            const matchesMarketing = marketingFilter === 'all' ? true : b.marketingPerson === marketingFilter;
                            return matchesSearch && matchesMarketing;
                          }).map(b => b.id))}
                        />
                      </TableHeader>
                      <TableHeader align="center">SL</TableHeader>
                      <TableHeader align="center">Image</TableHeader>
                      <TableHeader>Tile/Item Name</TableHeader>
                      <TableHeader align="center">Size</TableHeader>
                      <TableHeader align="center">Code</TableHeader>
                      <TableHeader align="center">Brand</TableHeader>
                      <TableHeader align="center">Quantity (sft)</TableHeader>
                      <TableHeader align="center">Quantity (pcs)</TableHeader>
                      <TableHeader>Client Name</TableHeader>
                      <TableHeader>Marketing Person</TableHeader>
                      <TableHeader>Remark</TableHeader>
                      {isAdmin && (!!highlightedRow || editingId !== null) && <TableHeader>Action</TableHeader>}
                    </tr>
                  </thead>
                  <tbody>
                    {bookedItems.filter(b => {
                      if (b.deleted) return false;
                      const matchesSearch = (activeTab === 'search' || (showSearchBox && searchQuery.trim() !== '')) ? ((b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (b.code || '').toLowerCase().includes(searchQuery.toLowerCase())) : true;
                      const matchesMarketing = marketingFilter === 'all' ? true : b.marketingPerson === marketingFilter;
                      return matchesSearch && matchesMarketing;
                    }).map((item, index) => {
                      const isEditing = editingId === item.id;
                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => setHighlightedRow(item.id)}
                          className={cn(
                            "hover:bg-gray-50 transition-colors cursor-pointer", 
                            selectedBookedItems.includes(item.id) && "bg-blue-50/50",
                            highlightedRow === item.id && "bg-yellow-50 ring-2 ring-yellow-200 ring-inset"
                          )}
                        >
                          <TableCell>
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                              checked={selectedBookedItems.includes(item.id)}
                              onChange={() => toggleSelect('bookedItems', item.id)}
                              disabled={!isAdmin}
                            />
                          </TableCell>
                          <TableCell align="center" style={{ color: BLUE_COLOR }} className="font-mono text-xs">{index + 1}</TableCell>
                          <TableCell align="center">
                            {isEditing ? (
                              <div className="flex flex-col gap-1 items-center min-w-[120px]">
                                {editData.imageUrl && (
                                  <img 
                                    src={editData.imageUrl} 
                                    alt="Preview" 
                                    className="w-10 h-10 object-cover rounded shadow mb-1 border border-gray-200"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error'; }}
                                  />
                                )}
                                <input 
                                  type="text" 
                                  className="w-full px-1 py-1 border border-gray-300 rounded text-[10px]" 
                                  placeholder="Image URL"
                                  value={editData.imageUrl || ''} 
                                  onChange={e => setEditData({ ...editData, imageUrl: e.target.value })}
                                />
                                <div className="text-[9px] text-gray-500 font-normal uppercase my-0.5">OR</div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-[9px] file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      try {
                                        const base64 = await fileToBase64(file);
                                        setEditData({ ...editData, imageUrl: base64 });
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            ) : item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="w-12 h-12 object-cover rounded-lg border border-gray-200 hover:scale-110 transition-transform cursor-zoom-in mx-auto" 
                                referrerPolicy="no-referrer"
                                onClick={() => setPreviewImage(item.imageUrl)}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {isEditing ? (
                              <input 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.name} 
                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                              />
                            ) : item.name}
                          </TableCell>
                          <TableCell align="center">
                            {isEditing ? (
                              <input 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.size} 
                                onChange={e => setEditData({ ...editData, size: e.target.value })}
                              />
                            ) : item.size}
                          </TableCell>
                          <TableCell align="center" className="font-mono text-[#4285F4]">
                            {isEditing ? (
                              <input 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.code} 
                                onChange={e => setEditData({ ...editData, code: e.target.value })}
                              />
                            ) : item.code}
                          </TableCell>
                          <TableCell align="center">
                            {isEditing ? (
                              <input 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.brand} 
                                onChange={e => setEditData({ ...editData, brand: e.target.value })}
                              />
                            ) : item.brand}
                          </TableCell>
                          <TableCell align="center" className="font-semibold text-[#4285F4]">
                            {isEditing ? (
                              <input 
                                type="number"
                                step="0.01"
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={isNaN(editData.qtySft) ? '' : editData.qtySft} 
                                onChange={e => {
                                  const sft = parseFloat(e.target.value);
                                  const newData = { ...editData, qtySft: sft };
                                  
                                  // Sync with PCS
                                  if (editData.size && editData.size.toLowerCase().includes('x')) {
                                    const parts = editData.size.toLowerCase().split('x');
                                    const w = parseFloat(parts[0]);
                                    const h = parseFloat(parts[1]);
                                    if (!isNaN(w) && !isNaN(h)) {
                                      const unitSft = (w / 30.48) * (h / 30.48);
                                      newData.qtyPcs = Math.round(sft / unitSft);
                                    }
                                  }
                                  setEditData(newData);
                                }}
                              />
                            ) : Math.round(item.qtySft)}
                          </TableCell>
                          <TableCell align="center" className="font-semibold text-[#4285F4]">
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-center text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={isNaN(editData.qtyPcs) ? '' : editData.qtyPcs} 
                                onChange={e => {
                                  const pcs = parseInt(e.target.value);
                                  const newData = { ...editData, qtyPcs: pcs };
                                  
                                  // Sync with SFT
                                  if (editData.size && editData.size.toLowerCase().includes('x')) {
                                    const parts = editData.size.toLowerCase().split('x');
                                    const w = parseFloat(parts[0]);
                                    const h = parseFloat(parts[1]);
                                    if (!isNaN(w) && !isNaN(h)) {
                                      const unitSft = (w / 30.48) * (h / 30.48);
                                      newData.qtySft = Number((pcs * unitSft).toFixed(2));
                                    }
                                  }
                                  setEditData(newData);
                                }}
                              />
                            ) : Math.round(item.qtyPcs || 0)}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <input 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.clientName} 
                                onChange={e => setEditData({ ...editData, clientName: e.target.value })}
                              />
                            ) : item.clientName}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <input 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.marketingPerson} 
                                onChange={e => setEditData({ ...editData, marketingPerson: e.target.value })}
                              />
                            ) : item.marketingPerson}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 italic">
                            {isEditing ? (
                              <input 
                                className="w-full h-full min-h-[44px] px-4 py-3 bg-blue-50/50 border-2 border-transparent focus:border-blue-500 outline-none m-0 text-inherit text-sm resize-none rounded-none editing-input-active" 
                                value={editData.remark} 
                                onChange={e => setEditData({ ...editData, remark: e.target.value })}
                              />
                            ) : item.remark}
                          </TableCell>
                          {isAdmin && (highlightedRow === item.id || editingId === item.id) && (
                            <TableCell>
                              {(highlightedRow === item.id || isEditing) ? (
                                <div className="flex gap-2">
                                  {isEditing ? (
                                    <>
                                      <Button 
                                        variant="primary" 
                                        size="sm" 
                                        onClick={() => handleInlineEditSave('bookedItems', item.id)}
                                      >
                                        Save
                                      </Button>
                                      <Button 
                                        variant="secondary" 
                                        size="sm" 
                                        onClick={() => { setEditingId(null); setEditData(null); setHighlightedRow(null); }}
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => { setEditingId(item.id); setEditData({ ...item }); }}
                                      >
                                        Edit
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleDeleteItem('bookedItems', item.id)}
                                      >
                                        Delete
                                      </Button>
                                    </>
                                  )}
                                </div>
                              ) : null}
                            </TableCell>
                          )}
                        </tr>
                      );
                    })}
                    {(activeTab === 'search' ? bookedItems.filter(b => (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (b.code || '').toLowerCase().includes(searchQuery.toLowerCase())) : bookedItems).length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-4 py-12 text-center text-gray-500">
                          No booked items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Stock Items Section */}
          {(activeTab === 'stock' || (activeTab === 'search' && showSearchBox && searchQuery.trim() !== '' && [
              ...tiles.filter(t => !t.deleted).map(t => ({ ...t, type: 'tile' })), 
              ...goods.filter(g => !g.deleted).map(g => ({ ...g, type: 'good', name: g.brand + ' ' + g.code, size: 'N/A' }))
            ].filter(item => 
              (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item.size || '').toLowerCase().includes(searchQuery.toLowerCase())
            ).length > 0)) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-black flex items-center gap-2">
                  <Database className="w-6 h-6 text-black" />
                  {activeTab === 'stock' ? 'Stock Items' : 'Stock Results'}
                  <span className="text-xs font-black text-white bg-[#0f172a] px-3 py-1 rounded-full shadow-lg ml-2">
                    {(() => {
                      const combinedItems = [
                        ...tiles.filter(t => !t.deleted).map(t => ({ ...t, type: 'tile' })), 
                        ...goods.filter(g => !g.deleted).map(g => ({ ...g, type: 'good', name: g.brand + ' ' + g.code, size: 'N/A' }))
                      ];
                      const itemsWithStock = combinedItems.map(item => {
                        const bookedForThis = bookedItems.filter(b => b.code === (item as any).code || b.name === (item as any).name);
                        const bookedSft = bookedForThis.reduce((sum, b) => sum + (b.qtySft || 0), 0);
                        const bookedPcs = bookedForThis.reduce((sum, b) => sum + (b.qtyPcs || 0), 0);
                        const totalSft = (item as any).totalSft || 0;
                        const totalPcs = (item as any).type === 'tile' ? ((item as any).totalPcs || 0) : (((item as any).dokhinkhan || 0) + ((item as any).bonorupa || 0) + ((item as any).banani || 0));
                        const stockSft = Math.max(0, Math.round(totalSft - bookedSft) || 0);
                        const stockPcs = Math.max(0, Math.round(totalPcs - bookedPcs) || 0);
                        return { ...item, stockSft, stockPcs };
                      });
                      return itemsWithStock.filter(item => {
                        if (item.stockSft <= 0 && item.stockPcs <= 0) return false;
                        if (!(activeTab === 'search' || (showSearchBox && searchQuery.trim() !== ''))) return true;
                        const q = searchQuery.toLowerCase();
                        return (item as any).name?.toLowerCase().includes(q) || (item as any).code?.toLowerCase().includes(q) || (item as any).brand?.toLowerCase().includes(q);
                      }).length;
                    })()}
                  </span>
                </h2>
              </div>
              <div className={cn(
                "rounded-2xl shadow-2xl border-2 overflow-auto max-h-[60vh] md:max-h-[70vh] overscroll-contain",
                activeTab === 'search' ? "bg-white/50 backdrop-blur-3xl border-white/60" : "bg-white border-gray-200"
              )}>
                <table className="w-full border-separate border-spacing-0 min-w-[1000px]">
                  <thead>
                    <tr>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>SL</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Image</TableHeader>
                      <TableHeader className={cn(activeTab === 'search' && "bg-slate-200/50")}>Tile/Item Name</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Size</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Code</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Brand</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Quantity (sft)</TableHeader>
                      <TableHeader align="center" className={cn(activeTab === 'search' && "bg-slate-200/50")}>Quantity (pcs)</TableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const combinedItems = [
                        ...tiles.filter(t => !t.deleted).map(t => ({ ...t, type: 'tile' })), 
                        ...goods.filter(g => !g.deleted).map(g => ({ ...g, type: 'good', name: g.brand + ' ' + g.code, size: 'N/A' }))
                      ];
                      
                      const itemsWithStock = combinedItems.map(item => {
                        const bookedForThis = bookedItems.filter(b => b.code === (item as any).code || b.name === (item as any).name);
                        const bookedSft = bookedForThis.reduce((sum, b) => sum + (b.qtySft || 0), 0);
                        const bookedPcs = bookedForThis.reduce((sum, b) => sum + (b.qtyPcs || 0), 0);

                        const totalSft = (item as any).totalSft || 0;
                        const totalPcs = (item as any).type === 'tile' ? (item as any).totalPcs : ((item as any).bonorupa + (item as any).banani);

                        const stockSft = Math.max(0, Math.round(totalSft - bookedSft));
                        const stockPcs = Math.max(0, Math.round(totalPcs - bookedPcs));

                        return { ...item, stockSft, stockPcs };
                      });

                      return itemsWithStock
                        .filter(item => {
                          // Hide items with 0 stock in both SFT and PCS
                          if (item.stockSft <= 0 && item.stockPcs <= 0) return false;
                          
                          if (!(activeTab === 'search' || (showSearchBox && searchQuery.trim() !== ''))) return true;
                          const q = searchQuery.toLowerCase();
                          return (item as any).name?.toLowerCase().includes(q) || (item as any).code?.toLowerCase().includes(q) || (item as any).brand?.toLowerCase().includes(q);
                        })
                        .map((item, index) => (
                          <tr 
                            key={item.id} 
                            onClick={() => setHighlightedRow(item.id)}
                            className={cn(
                              "transition-colors cursor-pointer",
                              activeTab === 'search' ? "hover:bg-white/40" : "hover:bg-gray-50",
                              highlightedRow === item.id && (activeTab === 'search' ? "bg-blue-100/50 ring-2 ring-blue-300 ring-inset" : "bg-yellow-50 ring-2 ring-yellow-200 ring-inset")
                            )}
                          >
                            <TableCell align="center" style={{ color: BLUE_COLOR }} className="font-mono text-xs text-gray-800 font-normal border-slate-300">{index + 1}</TableCell>
                            <TableCell align="center" className="border-slate-300">
                              {item.imageUrl ? (
                                <img 
                                  src={item.imageUrl} 
                                  alt={(item as any).name} 
                                  className="w-12 h-12 object-cover rounded-lg border-2 border-white mx-auto cursor-zoom-in hover:scale-110 transition-transform shadow-md" 
                                  referrerPolicy="no-referrer"
                                  onClick={() => setPreviewImage(item.imageUrl)}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-white/50 rounded-lg flex items-center justify-center mx-auto border border-white/40">
                                  <Package className="w-6 h-6 text-gray-700" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-normal text-gray-800 border-slate-300 text-sm">{(item as any).name}</TableCell>
                            <TableCell align="center" className="font-normal text-gray-800 border-slate-300">{(item as any).size}</TableCell>
                            <TableCell align="center" className="font-mono text-blue-800 font-normal border-slate-300">{(item as any).code || (item as any).brand}</TableCell>
                            <TableCell align="center" className="font-normal text-gray-800 border-slate-300">{(item as any).brand}</TableCell>
                            <TableCell align="center" className={cn("font-normal text-lg border-slate-300", (item.stockSft || 0) <= 0 ? "text-red-700" : "text-blue-900")}>{item.stockSft || 0}</TableCell>
                            <TableCell align="center" className={cn("font-normal text-lg border-slate-300", (item.stockPcs || 0) <= 0 ? "text-red-700" : "text-blue-900")}>{item.stockPcs || 0}</TableCell>
                          </tr>
                        ));
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'landing' && (
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-white">
               {/* Background Image with Overlay */}
               <div className="absolute inset-0 z-0">
                 <img 
                    src="/home_bg.jpg" 
                    alt="Background" 
                    className="w-full h-full object-cover opacity-90"
                    referrerPolicy="no-referrer"
                 />
                 <div className="absolute inset-0 bg-white/10" />
               </div>

               {/* Atmospheric Background for Glass Effect */}
               <div className="absolute inset-0 pointer-events-none z-0">
                 <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px]" />
                 <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-yellow-400/20 rounded-full blur-[120px]" />
               </div>

               <div className="relative z-10 flex flex-col items-center py-20 animate-in fade-in zoom-in-95 duration-1000">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center"
                  >
                    <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight text-center max-w-3xl leading-tight drop-shadow-[0_2px_10px_rgba(255,255,255,1)]">
                       Welcome to <br />
                       <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-[#B45309] drop-shadow-md">Inventory Management System</span>
                    </h1>
                    <p className="text-gray-900 mt-6 text-center max-w-md text-lg sm:text-xl font-bold bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/40 shadow-sm transition-all">
                       Manage your stock, products, and sales all in one place with professional precision.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 mt-12">
                       <button 
                         onClick={() => setActiveTab('stock')} 
                         className="px-10 py-5 bg-white/40 backdrop-blur-xl border border-white/40 text-[#0f172a] font-bold rounded-2xl shadow-xl hover:bg-white/60 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
                       >
                          Get Started
                    </button>
                    {isFullyApproved && (
                      <button 
                        onClick={() => setActiveTab('search')} 
                        className="px-10 py-5 bg-white/40 backdrop-blur-xl border border-white/40 text-[#0f172a] font-bold rounded-2xl shadow-xl hover:bg-white/60 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
                      >
                        <Search className="w-5 h-5" />
                        Global Search
                      </button>
                    )}
                  </div>
                  </motion.div>
               </div>
            </div>
          )}

          {activeTab === 'quote' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-[#0f172a]" />
                  GET QUOTE
                </h2>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleClearQuote}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 border-red-200 text-red-600 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-4"
                  >
                    <Trash2 className="w-4 h-4" /> Clear All
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => setIsEditingQuote(!isEditingQuote)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs sm:text-sm px-2 sm:px-4"
                  >
                    {isEditingQuote ? <Check className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                    {isEditingQuote ? 'Finish' : 'Edit Quote'}
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={saveAndDownloadQuote} 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs sm:text-sm px-2 sm:px-4"
                  >
                    <Download className="w-4 h-4" /> {isEditingQuote ? 'Update & Download' : 'Save & Download'}
                  </Button>
                </div>
              </div>

              {/* Quotation Document Style */}
              <div className="relative mx-auto w-full max-w-[210mm] overflow-x-auto pb-8">
                <div className="min-w-[210mm]">
                  {/* Floating Page Indicator & Navigation */}
                <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-2 items-end">
                  {quotePageCount > 1 && (
                    <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-xl p-2 flex flex-col gap-1">
                      {Array.from({ length: quotePageCount }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const body = bodyRef.current;
                            if (!body) return;
                            const header = document.getElementById('quotation-header');
                            const footer = document.getElementById('quotation-footer');
                            if (!header || !footer) return;
                            
                            const headerHeight = header.offsetHeight;
                            const footerHeight = footer.offsetHeight;
                            const a4HeightPx = (297 / 210) * body.offsetWidth;
                            const availableHeightPerPage = a4HeightPx - headerHeight - footerHeight;
                            
                            window.scrollTo({
                              top: body.getBoundingClientRect().top + window.scrollY - headerHeight + (i * availableHeightPerPage),
                              behavior: 'smooth'
                            });
                          }}
                          className={cn(
                            "w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all",
                            quoteCurrentPage === i + 1 ? "bg-[#0f172a] text-white" : "hover:bg-gray-100 text-gray-600"
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="bg-[#0f172a] text-white px-4 py-2 rounded-full shadow-2xl font-bold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PAGE {quoteCurrentPage} OF {quotePageCount}
                  </div>
                </div>

                <div ref={quoteRef} className="bg-white shadow-xl border border-gray-200 overflow-hidden flex flex-col w-full min-h-[297mm] relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  {/* Page Break Indicators (UI only) */}
                  {Array.from({ length: quotePageCount - 1 }).map((_, i) => {
                    const body = bodyRef.current;
                    if (!body) return null;
                    const header = document.getElementById('quotation-header');
                    const footer = document.getElementById('quotation-footer');
                    if (!header || !footer) return null;
                    
                    const headerHeight = header.offsetHeight;
                    const footerHeight = footer.offsetHeight;
                    const a4HeightPx = (297 / 210) * body.offsetWidth;
                    const availableHeightPerPage = a4HeightPx - headerHeight - footerHeight;
                    
                    return (
                      <div 
                        key={i}
                        className="page-break-indicator absolute left-0 right-0 border-t-2 border-dashed border-blue-200 pointer-events-none z-50 flex items-center justify-center"
                        style={{ 
                          top: `${headerHeight + ((i + 1) * availableHeightPerPage)}px` 
                        }}
                      >
                        <span className="bg-blue-50 text-blue-400 text-[10px] px-2 py-0.5 rounded-full -mt-3 font-bold uppercase tracking-widest shadow-sm border border-blue-100">
                          PAGE {i + 1} END / PAGE {i + 2} START
                        </span>
                      </div>
                    );
                  })}

                  {/* Header */}
                  <div id="quotation-header" className="bg-black relative group overflow-hidden w-full">
                  {quoteHeader.headerImage ? (
                    <img 
                      src={quoteHeader.headerImage} 
                      alt="Header" 
                      className="w-full h-auto block min-h-[100px]" 
                      referrerPolicy="no-referrer" 
                      crossOrigin="anonymous"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="p-6 flex items-center gap-4 min-h-[120px]">
                      <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                        <span className="text-black font-black text-2xl">{quoteHeader.logoText}</span>
                      </div>
                      <div>
                        <h1 className="text-2xl font-black tracking-widest uppercase">{quoteHeader.companyName}</h1>
                      </div>
                    </div>
                  )}
                  
                  {isEditingQuote && isSuperAdmin && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 p-4 z-20">
                      <div className="flex flex-col gap-2 flex-1 max-w-xs">
                        <input 
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white" 
                          placeholder="Logo Text"
                          value={quoteHeader.logoText}
                          onChange={(e) => setQuoteHeader({...quoteHeader, logoText: e.target.value})}
                        />
                        <input 
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white" 
                          placeholder="Company Name"
                          value={quoteHeader.companyName}
                          onChange={(e) => setQuoteHeader({...quoteHeader, companyName: e.target.value})}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setQuoteHeader({...quoteHeader, headerImage: reader.result as string});
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Button size="sm" variant="secondary" className="w-full text-[10px]">
                            <Image className="w-3 h-3 mr-1" /> {quoteHeader.headerImage ? 'Change Image' : 'Upload Image'}
                          </Button>
                        </div>
                        {quoteHeader.headerImage && (
                          <Button 
                            size="sm" 
                            variant="danger" 
                            onClick={() => setQuoteHeader({...quoteHeader, headerImage: ''})}
                            className="text-[10px]"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Clear Image
                          </Button>
                        )}
                        <Button size="sm" variant="primary" onClick={saveQuoteSettings} disabled={isSavingSettings} className="text-[10px]">
                          {isSavingSettings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                          Save Settings
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div id="quotation-body" ref={bodyRef} className="p-12 space-y-8 flex-1">
                  <div className="text-center border-b-2 border-gray-100 pb-4">
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-800">QUOTATION</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-12 text-sm">
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <span className="font-bold w-12">To:</span>
                        {isEditingQuote ? (
                          <>
                            <input 
                              name="quote_to"
                              list="uniqueQuoteTo"
                              className="flex-1 bg-gray-50 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1" 
                              value={quoteInfo.to}
                              onChange={(e) => setQuoteInfo({...quoteInfo, to: e.target.value})}
                            />
                            <datalist id="uniqueQuoteTo">
                              {uniqueQuoteTo.map((opt, i) => <option key={i} value={opt} />)}
                            </datalist>
                          </>
                        ) : (
                          <span className="text-gray-700">{quoteInfo.to}</span>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="font-bold w-12">Attn:</span>
                        {isEditingQuote ? (
                          <>
                            <input 
                              name="quote_attn"
                              list="uniqueQuoteAttn"
                              className="flex-1 bg-gray-50 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1" 
                              value={quoteInfo.attn}
                              onChange={(e) => setQuoteInfo({...quoteInfo, attn: e.target.value})}
                            />
                            <datalist id="uniqueQuoteAttn">
                              {uniqueQuoteAttn.map((opt, i) => <option key={i} value={opt} />)}
                            </datalist>
                          </>
                        ) : (
                          <span className="text-gray-700">{quoteInfo.attn}</span>
                        )}
                      </div>
                      <div className="flex gap-2 items-center pt-4">
                        <span className="font-bold">Client:</span>
                        {isEditingQuote ? (
                          <>
                            <input 
                              name="quote_client"
                              list="uniqueQuoteClient"
                              className="flex-1 bg-gray-50 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1" 
                              value={quoteInfo.client}
                              onChange={(e) => setQuoteInfo({...quoteInfo, client: e.target.value})}
                            />
                            <datalist id="uniqueQuoteClient">
                              {uniqueQuoteClient.map((opt, i) => <option key={i} value={opt} />)}
                            </datalist>
                          </>
                        ) : (
                          <span className="text-gray-700">{quoteInfo.client}</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        <span className="font-bold">Date:</span>
                        {isEditingQuote ? (
                          <input 
                            name="quote_date"
                            className="bg-gray-50 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-right" 
                            value={quoteInfo.date}
                            onChange={(e) => setQuoteInfo({...quoteInfo, date: e.target.value})}
                          />
                        ) : (
                          <span className="text-gray-700">{quoteInfo.date}</span>
                        )}
                      </div>
                      <div className="flex justify-end gap-2 items-center">
                        <span className="font-bold">Ref:</span>
                        {isEditingQuote ? (
                          <input 
                            name="quote_ref"
                            className="bg-gray-50 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-right disabled:opacity-50" 
                            value={quoteInfo.ref}
                            disabled={!isSuperAdmin && !isSupremeAdmin}
                            onChange={(e) => setQuoteInfo({...quoteInfo, ref: e.target.value})}
                          />
                        ) : (
                          <span className="text-gray-700">{quoteInfo.ref}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex gap-2 items-center">
                      <span className="font-bold">Project Details:</span>
                      {isEditingQuote ? (
                        <>
                          <input 
                            name="quote_project"
                            list="uniqueQuoteProject"
                            className="flex-1 bg-gray-50 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1" 
                            value={quoteInfo.projectDetails}
                            onChange={(e) => setQuoteInfo({...quoteInfo, projectDetails: e.target.value})}
                          />
                          <datalist id="uniqueQuoteProject">
                            {uniqueQuoteProject.map((opt, i) => <option key={i} value={opt} />)}
                          </datalist>
                        </>
                      ) : (
                        <span className="text-gray-700">{quoteInfo.projectDetails}</span>
                      )}
                    </div>
                    {isEditingQuote ? (
                      <textarea 
                        className="w-full bg-gray-50 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-gray-700" 
                        value={quoteInfo.address}
                        onChange={(e) => setQuoteInfo({...quoteInfo, address: e.target.value})}
                      />
                    ) : (
                      <p className="text-gray-700">{quoteInfo.address}</p>
                    )}
                  </div>

                  {/* Table */}
                  <div className="space-y-4">
                    <div className="overflow-auto border border-gray-300 rounded-lg max-h-[400px] md:max-h-none overscroll-contain">
                      <table className="w-full text-xs border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-300">
                            {quoteColumns.map((col) => (
                              <th key={col.id} className={cn("p-3 border-r border-gray-300 text-center relative group", col.width)}>
                                {isEditingQuote ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <input 
                                      className="bg-transparent border-none focus:ring-0 text-center font-bold w-full" 
                                      value={col.label}
                                      onChange={(e) => {
                                        const newCols = quoteColumns.map(c => c.id === col.id ? {...c, label: e.target.value} : c);
                                        setQuoteColumns(newCols);
                                      }}
                                    />
                                    <button 
                                      onClick={() => removeQuoteColumn(col.id)}
                                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  col.label
                                )}
                              </th>
                            ))}
                            {isEditingQuote && <th className="p-3 w-10"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {quoteItems.map((item, idx) => (
                            <React.Fragment key={item.id}>
                              <tr className="border-b border-gray-300 last:border-0">
                                {quoteColumns.map((col) => (
                                  <td key={col.id} className="border-r border-gray-300 text-center relative p-0">
                                    {isEditingQuote ? (
                                      col.id === 'image' ? (
                                        <div className="w-16 h-16 bg-gray-50 rounded mx-auto border border-gray-200 flex items-center justify-center overflow-hidden my-2">
                                          {item.image ? (
                                            <img src={item.image} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                                          ) : (
                                            <span className="text-[8px] text-gray-400">Image</span>
                                          )}
                                        </div>
                                      ) : col.type === 'amount' ? (
                                        <div className="p-3">{calculateItemAmount(item).toLocaleString()}</div>
                                      ) : col.type === 'name' ? (
                                        <div className="relative h-full">
                                          <textarea 
                                            className="bg-transparent border-none focus:ring-0 text-center w-full h-full min-h-[60px] p-3 resize-none block" 
                                            value={(item as any)[col.id] || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              const newItems = quoteItems.map(it => it.id === item.id ? {...it, [col.id]: val, hideSuggestions: false} : it);
                                              setQuoteItems(newItems);
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <textarea 
                                          className="bg-transparent border-none focus:ring-0 text-center w-full h-full min-h-[60px] p-3 resize-none block" 
                                          value={(item as any)[col.id] || ''}
                                          onChange={(e) => {
                                            const newItems = quoteItems.map(it => it.id === item.id ? {...it, [col.id]: e.target.value} : it);
                                            setQuoteItems(newItems);
                                          }}
                                        />
                                      )
                                    ) : (
                                      col.id === 'image' ? (
                                        <div className="w-16 h-16 bg-gray-50 rounded mx-auto border border-gray-200 flex items-center justify-center overflow-hidden my-2">
                                          {item.image ? (
                                            <img src={item.image} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                                          ) : (
                                            <span className="text-[8px] text-gray-400">Image</span>
                                          )}
                                        </div>
                                      ) : col.type === 'amount' ? (
                                        <div className="p-3">{calculateItemAmount(item).toLocaleString()}</div>
                                      ) : (
                                        <div className="p-3 whitespace-pre-wrap">{(item as any)[col.id]}</div>
                                      )
                                    )}
                                  </td>
                                ))}
                                {isEditingQuote && (
                                  <td className="p-3 text-center">
                                    <div className="flex flex-col gap-2 items-center">
                                      <button 
                                        onClick={() => removeQuoteRow(item.id)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Remove Row"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const newItems = quoteItems.map(it => it.id === item.id ? {...it, hasPageBreakAfter: !it.hasPageBreakAfter} : it);
                                          setQuoteItems(newItems);
                                        }}
                                        className={cn("transition-colors", item.hasPageBreakAfter ? "text-blue-600" : "text-gray-300 hover:text-blue-400")}
                                        title="Toggle Page Break After"
                                      >
                                        <FileText className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                              
                              {item.hasPageBreakAfter && (
                                <tr className="page-break-marker no-print">
                                  <td colSpan={quoteColumns.length + (isEditingQuote ? 1 : 0)} className="p-0">
                                    <div className="h-8 bg-blue-50 border-y border-blue-200 flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                      <FileText className="w-3 h-3" /> Page Break
                                    </div>
                                  </td>
                                </tr>
                              )}
                              
                              {/* Product Suggestions Row */}
                              {isEditingQuote && (item as any).name && (item as any).name.length > 1 && !(item as any).hideSuggestions && (
                                <tr className="bg-blue-50/30">
                                  <td colSpan={quoteColumns.length + (isEditingQuote ? 1 : 0)} className="p-0 border-b border-gray-300">
                                    <div className="p-4">
                                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Search className="w-3 h-3" /> Product Suggestions
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {[...tiles, ...goods, ...tools]
                                          .filter(p => {
                                            const pName = (p as any).name || (p as any).details || (p as any).code || '';
                                            const itemName = (item as any).name || '';
                                            return pName.toLowerCase().includes(itemName.toLowerCase());
                                          })
                                          .slice(0, 4)
                                          .map(p => {
                                            const pName = (p as any).name || (p as any).details || (p as any).code || '';
                                            const pBrand = (p as any).brand || '';
                                            const pCode = (p as any).code || '';
                                            const pSize = (p as any).size || '';
                                            const pImage = (p as any).imageUrl || '';
                                            const pDesc = (p as any).description || (p as any).details || '';
                                            const pTotalSft = (p as any).totalSft || '';
                                            const pTotalPcs = (p as any).totalPcs || '';

                                            return (
                                              <button
                                                key={p.id}
                                                className="flex items-center gap-3 p-2 bg-white border border-blue-100 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group"
                                                onClick={() => {
                                                  const newItems = quoteItems.map(it => it.id === item.id ? {
                                                    ...it,
                                                    name: pName,
                                                    size: pSize,
                                                    brand: pBrand,
                                                    code: pCode,
                                                    totalSft: pTotalSft,
                                                    totalPcs: pTotalPcs,
                                                    image: pImage,
                                                    description: pDesc,
                                                    hideSuggestions: true
                                                  } : it);
                                                  setQuoteItems(newItems);
                                                }}
                                              >
                                                <div className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded border border-gray-100 overflow-hidden">
                                                  {pImage ? (
                                                    <img 
                                                      src={pImage} 
                                                      className="w-full h-full object-cover" 
                                                      referrerPolicy="no-referrer" 
                                                      crossOrigin="anonymous"
                                                      onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                      }}
                                                    />
                                                  ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">No Image</div>
                                                  )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-bold text-xs text-gray-900 truncate">{pName}</div>
                                                  <div className="grid grid-cols-3 gap-x-2 text-[9px] text-gray-500 mt-0.5">
                                                    <span className="truncate">Brand: <span className="text-gray-700">{pBrand || '-'}</span></span>
                                                    <span className="truncate">Size: <span className="text-gray-700">{pSize || '-'}</span></span>
                                                    <span className="truncate">Code: <span className="text-gray-700">{pCode || '-'}</span></span>
                                                    <span className="truncate">Sft: <span className="text-gray-700">{pTotalSft || '-'}</span></span>
                                                    <span className="truncate">Pcs: <span className="text-gray-700">{pTotalPcs || '-'}</span></span>
                                                  </div>
                                                </div>
                                                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <Plus className="w-3 h-3 text-blue-600" />
                                                </div>
                                              </button>
                                            );
                                          })
                                        }
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                          
                          {/* Total Rows */}
                          {quoteItems.length > 0 && (
                            <>
                              <tr className="bg-gray-50 font-bold">
                                <td colSpan={quoteColumns.length - 1} className="p-3 border-r border-gray-300 text-right">
                                  TOTAL AMOUNT:
                                </td>
                                <td className="p-3 text-center">
                                  {calculateTotalAmount().toLocaleString()}
                                </td>
                                {isEditingQuote && <td></td>}
                              </tr>
                              <tr className="bg-white">
                                <td colSpan={quoteColumns.length + (isEditingQuote ? 1 : 0)} className="p-3 text-left text-sm">
                                  <span className="font-bold">IN WORD: </span>
                                  {numberToWords(calculateTotalAmount())}
                                </td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {isEditingQuote && (
                      <div className="flex gap-3">
                        <Button variant="secondary" size="sm" onClick={addQuoteRow} className="flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Add Row
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setShowAddColumnModal(true)} className="flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Add Column
                        </Button>
                      </div>
                  )}
                </div>

                <div id="quotation-last-page-content" className="p-12 pt-0 space-y-6">
                    {/* Terms & Conditions */}
                    <div className="text-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                        <h3 className="font-bold">Terms & Conditions</h3>
                        {isEditingQuote && (
                          <button 
                            onClick={() => setForceTermsToNewPage(!forceTermsToNewPage)}
                            className={cn(
                              "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors",
                              forceTermsToNewPage ? "bg-[#0f172a] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                          >
                            <FileText className="w-3 h-3" />
                            {forceTermsToNewPage ? "Forced to New Page" : "Auto Page Flow"}
                          </button>
                        )}
                      </div>
                      {isEditingQuote ? (
                        <textarea 
                          className="w-full bg-gray-50 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-gray-700 min-h-[200px] resize-none" 
                          value={quoteTerms}
                          onChange={(e) => setQuoteTerms(e.target.value)}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                          {quoteTerms.split('\n').map((line, i) => {
                            if (line.includes('VAT / AIT:')) {
                              const [label, ...rest] = line.split(':');
                              return (
                                <p key={i} className="text-red-600 font-bold">
                                  {label}
                                  {rest.length > 0 ? ` : ${rest.join(':')}` : ''}
                                </p>
                              );
                            }
                            if (line.startsWith('Terms & Conditions') || line.startsWith('Delivery Time') || line.startsWith('Payment Terms') || line.startsWith('Offer validity') || line.startsWith('Scope of Work') || line.startsWith('Note')) {
                              const [label, ...rest] = line.split(':');
                              return (
                                <p key={i}>
                                  <span className="font-bold">{label}</span>
                                  {rest.length > 0 ? ` : ${rest.join(':')}` : ''}
                                </p>
                              );
                            }
                            return <p key={i}>{line}</p>;
                          })}
                        </div>
                      )}
                    </div>

                    {/* Signature */}
                    <div className="text-xs pt-8 flex justify-end">
                      <div className="w-1/2 text-right">
                        {isEditingQuote ? (
                          <textarea 
                            className="w-full bg-gray-50 border-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-gray-700 min-h-[100px] resize-none text-right" 
                            value={quoteSignature}
                            onChange={(e) => setQuoteSignature(e.target.value)}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-gray-800">
                            {quoteSignature.split('\n').map((line, i) => (
                              <p key={i} className={cn(i === 0 ? "font-bold text-sm" : "font-bold text-[11px]")}>
                                {line}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Footer */}
                  <div id="quotation-footer" className="bg-black text-white text-[11px] text-center mt-auto relative group overflow-hidden w-full h-[100px] flex flex-col justify-center">
                  {quoteFooter.footerImage ? (
                    <img 
                      src={quoteFooter.footerImage} 
                      alt="Footer" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                      crossOrigin="anonymous"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="p-6 space-y-1">
                      <p className="font-bold">{quoteFooter.officeAddress}</p>
                      <p>{quoteFooter.contactInfo}</p>
                      <p className="font-bold">{quoteFooter.registeredAddress}</p>
                    </div>
                  )}
                  
                  {isEditingQuote && isSuperAdmin && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 p-4 z-20">
                      <div className="flex flex-col gap-2 flex-1 max-w-xs">
                        <input 
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white" 
                          placeholder="Office Address"
                          value={quoteFooter.officeAddress}
                          onChange={(e) => setQuoteFooter({...quoteFooter, officeAddress: e.target.value})}
                        />
                        <input 
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white" 
                          placeholder="Contact Info"
                          value={quoteFooter.contactInfo}
                          onChange={(e) => setQuoteFooter({...quoteFooter, contactInfo: e.target.value})}
                        />
                        <input 
                          className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white" 
                          placeholder="Registered Address"
                          value={quoteFooter.registeredAddress}
                          onChange={(e) => setQuoteFooter({...quoteFooter, registeredAddress: e.target.value})}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setQuoteFooter({...quoteFooter, footerImage: reader.result as string});
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <Button size="sm" variant="secondary" className="w-full text-[10px]">
                            <Image className="w-3 h-3 mr-1" /> {quoteFooter.footerImage ? 'Change Image' : 'Upload Image'}
                          </Button>
                        </div>
                        {quoteFooter.footerImage && (
                          <Button 
                            size="sm" 
                            variant="danger" 
                            onClick={() => setQuoteFooter({...quoteFooter, footerImage: ''})}
                            className="text-[10px]"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Clear Image
                          </Button>
                        )}
                        <Button size="sm" variant="primary" onClick={saveQuoteSettings} disabled={isSavingSettings} className="text-[10px]">
                          {isSavingSettings ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                          Save Settings
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {activeTab === 'sales' && (
          <SalesManager
            user={user}
            isAdmin={isAdmin}
            tiles={tiles}
            goods={goods}
            tools={tools}
            quoteHeader={quoteHeader}
            quoteFooter={quoteFooter}
          />
        )}
      </div>
    )}
  </main>

      {/* Add Column Modal */}
      <AnimatePresence>
        {showAddColumnModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddColumnModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold mb-4">Add New Column</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Column Label</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Weight, Material, etc."
                    value={newColumnLabel}
                    onChange={(e) => setNewColumnLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addQuoteColumn()}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Column Type</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newColumnType}
                    onChange={(e) => setNewColumnType(e.target.value)}
                  >
                    <option value="text">General Text</option>
                    <option value="qty">Quantity (for calculation)</option>
                    <option value="unitPrice">Unit Price (for calculation)</option>
                    <option value="vat_ain">VAT & AIN (for calculation)</option>
                    <option value="amount">Amount (calculated)</option>
                    <option value="sl">Serial Number</option>
                    <option value="image">Digital Image</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newColumnPosition}
                    onChange={(e) => setNewColumnPosition(e.target.value)}
                  >
                    <option value="end">At the end</option>
                    {quoteColumns.map((col, idx) => (
                      <option key={col.id} value={idx}>Before {col.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowAddColumnModal(false)}>Cancel</Button>
                  <Button variant="primary" className="flex-1" onClick={addQuoteColumn}>Add Column</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-zoom-out"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl"
            >
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}

        {confirmAction && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmAction(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmAction.title}</h3>
              <p className="text-gray-600 mb-6">{confirmAction.message}</p>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1" 
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant={confirmAction.type === 'danger' ? 'danger' : 'primary'} 
                  className="flex-1" 
                  onClick={confirmAction.onConfirm}
                >
                  Confirm
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {(showAddModal || editingItem) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowAddModal(null); setEditingItem(null); setSelectedItemToBook(null); setBookSearchQuery(''); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 capitalize">
                  {editingItem ? 'Edit' : 'Add New Item'} {(showAddModal || editingItem?.category)?.slice(0, -1)}
                </h3>
                <button onClick={() => { setShowAddModal(null); setEditingItem(null); setSelectedItemToBook(null); setBookSearchQuery(''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
               <div className="p-6 overflow-y-auto">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data: Record<string, any> = Object.fromEntries(formData.entries());
                    const category = showAddModal || editingItem?.category;
                    if (!category) return;

                    // Handle image file
                    const imageFile = formData.get('imageFile') as File;
                    if (imageFile && imageFile.size > 0) {
                      try {
                        data.imageUrl = await fileToBase64(imageFile);
                      } catch (err) {
                        console.error("Image conversion error:", err);
                      }
                    }

                    // Handle image URL (download to base64)
                    if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('http')) {
                      try {
                        data.imageUrl = await urlToBase64(data.imageUrl);
                      } catch (err) {
                        console.error("Image URL conversion error:", err);
                      }
                    }
                    delete data.imageFile;

                    // Convert numeric fields
                    Object.keys(data).forEach(key => {
                      const val = data[key];
                      if (typeof val === 'string' && val !== '' && !isNaN(Number(val))) {
                        data[key] = Number(val);
                      }
                    });

                    // Auto-calculate Tile fields
                    if (category === 'tiles') {
                      const sizeStr = String(data.size || '');
                      const diaBariPcs = Number(data.diaBariPcs || 0);
                      const bonorupaPcs = Number(data.bonorupaPcs || 0);
                      const bananiPcs = Number(data.bananiPcs || 0);

                      const calculateSft = (s: string, p: number) => {
                        const parts = s.toLowerCase().split('x');
                        if (parts.length !== 2) return 0;
                        const w = parseFloat(parts[0]);
                        const h = parseFloat(parts[1]);
                        if (isNaN(w) || isNaN(h)) return 0;
                        return Number((p * (w / 30.48) * (h / 30.48)).toFixed(2));
                      };

                      data.diaBariSft = calculateSft(sizeStr, diaBariPcs);
                      data.bonorupaSft = calculateSft(sizeStr, bonorupaPcs);
                      data.bananiSft = calculateSft(sizeStr, bananiPcs);
                      
                      // total sft = diabari sft + bonorupa sft + banani sft
                      data.totalSft = Number((data.diaBariSft + data.bonorupaSft + data.bananiSft).toFixed(2));
                      // total pcs = diabari pcs + bonorupa pcs + banani pcs
                      data.totalPcs = diaBariPcs + bonorupaPcs + bananiPcs;
                    }

                    // Stock validation for bookedItems
                    if (category === 'bookedItems') {
                      const sourceItem = [...tiles, ...goods].find(i => 
                        ((i as any).code === data.code && data.code !== '') || 
                        (i as any).name === data.name
                      );
                      
                      if (sourceItem) {
                        const isTile = 'totalSft' in sourceItem;
                        const totalSft = isTile ? (sourceItem as any).totalSft : 0;
                        const totalPcs = isTile ? (sourceItem as any).totalPcs : (((sourceItem as any).dokhinkhan || 0) + ((sourceItem as any).bonorupa || 0) + ((sourceItem as any).banani || 0));
                        
                        // Other bookings for this item
                        const otherBookings = bookedItems.filter(b => 
                          b.id !== (editingItem?.item.id) && 
                          ((b.code === data.code && data.code !== '') || b.name === data.name)
                        );
                        
                        const bookedSft = otherBookings.reduce((sum, b) => sum + (b.qtySft || 0), 0);
                        const bookedPcs = otherBookings.reduce((sum, b) => sum + (b.qtyPcs || 0), 0);
                        
                        const availableSft = Number((totalSft - bookedSft).toFixed(2));
                        const availablePcs = totalPcs - bookedPcs;
                        
                        // Round available stock for comparison to match what user sees
                        const roundedAvailableSft = Math.round(availableSft);
                        const roundedAvailablePcs = Math.round(availablePcs);
                        
                        const inputQtySft = Number(data.qtySft || 0);
                        const inputQtyPcs = Number(data.qtyPcs || 0);
                        
                        const isShortageSft = inputQtySft > roundedAvailableSft;
                        const isShortagePcs = inputQtyPcs > roundedAvailablePcs;

                        if (isShortageSft || isShortagePcs) {
                          const shortSft = Math.max(0, inputQtySft - roundedAvailableSft);
                          const shortPcs = Math.max(0, inputQtyPcs - roundedAvailablePcs);
                          
                          let errorMsg = "Shortage detected: ";
                          if (shortSft > 0) errorMsg += `${shortSft} SFT `;
                          if (shortPcs > 0) errorMsg += `${shortPcs} PCS `;
                          
                          showStatus('error', errorMsg);
                          return; // Stop submission
                        }
                      }
                    }

                    try {
                      if (editingItem) {
                        await updateDoc(doc(db, category, editingItem.item.id), data);
                        showStatus('success', 'Item updated successfully.');
                      } else {
                        await addDoc(collection(db, category), data);
                        showStatus('success', 'Item added successfully.');
                      }
                      setShowAddModal(null);
                      setEditingItem(null);
                      setSelectedItemToBook(null);
                      setBookSearchQuery('');
                      setModalQtySft('');
                      setModalQtyPcs('');
                      setModalQtySft('');
                      setModalQtyPcs('');
                    } catch (err: any) {
                      console.error("Save error:", err);
                      showStatus('error', `Failed to save item: ${err.message}`);
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {(showAddModal === 'tiles' || editingItem?.category === 'tiles') && (
                    <>
                      <Input label="Name" name="name" required defaultValue={editingItem?.item.name} placeholder="Item name" list="uniqueNames" options={uniqueNames} />
                      <Input label="Size (cm)" name="size" required defaultValue={editingItem?.item.size} placeholder="e.g. 60x60" list="uniqueSizes" options={uniqueSizes} />
                      <Input label="Brand" name="brand" required defaultValue={editingItem?.item.brand} placeholder="Brand name" list="uniqueBrands" options={uniqueBrands} />
                      <Input label="Dia-Bari PCS" name="diaBariPcs" type="number" defaultValue={editingItem?.item.diaBariPcs} />
                      <Input label="Dia-Bari Remark" name="diaBariRemark" defaultValue={editingItem?.item.diaBariRemark} />
                      <Input label="Bonorupa PCS_1" name="bonorupaPcs" type="number" defaultValue={editingItem?.item.bonorupaPcs} />
                      <Input label="Bonorupa Remark_1" name="bonorupaRemark" defaultValue={editingItem?.item.bonorupaRemark} />
                      <Input label="Banani PCS_2" name="bananiPcs" type="number" defaultValue={editingItem?.item.bananiPcs} />
                      <Input label="Banani Remark_2" name="bananiRemark" defaultValue={editingItem?.item.bananiRemark} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">Image File</label>
                        <input type="file" name="imageFile" accept="image/*" className="text-sm" />
                      </div>
                      <Input label="OR Image URL" name="imageUrl" defaultValue={editingItem?.item.imageUrl} placeholder="https://..." />
                    </>
                  )}

                  {(showAddModal === 'goods' || editingItem?.category === 'goods') && (
                    <>
                      <Input label="Brand" name="brand" defaultValue={editingItem?.item.brand} placeholder="Brand name" list="uniqueBrands" options={uniqueBrands} />
                      <Input label="Code" name="code" required defaultValue={editingItem?.item.code} placeholder="XXXX-XXXX" />
                      <Input label="Description" name="description" defaultValue={editingItem?.item.description} className="sm:col-span-2" />
                      <Input label="Bonorupa Qty" name="bonorupa" type="number" defaultValue={editingItem?.item.bonorupa} />
                      <Input label="Bonorupa Remark" name="bonorupaRemark" defaultValue={editingItem?.item.bonorupaRemark} />
                      <Input label="Banani Qty_1" name="banani" type="number" defaultValue={editingItem?.item.banani} />
                      <Input label="Banani Remark_1" name="bananiRemark" defaultValue={editingItem?.item.bananiRemark} />
                      <Input label="Dokhinkhan Qty" name="dokhinkhan" type="number" defaultValue={editingItem?.item.dokhinkhan} />
                      <Input label="Dokhinkhan Remark" name="dokhinkhanRemark" defaultValue={editingItem?.item.dokhinkhanRemark} />
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Image File</label>
                        <input type="file" name="imageFile" accept="image/*" className="text-sm" />
                      </div>
                      <Input label="OR Image URL" name="imageUrl" defaultValue={editingItem?.item.imageUrl} className="sm:col-span-2" placeholder="https://..." />
                    </>
                  )}

                  {(showAddModal === 'bookedItems' || editingItem?.category === 'bookedItems') && (
                    <>
                      {!editingItem && !selectedItemToBook ? (
                        <div className="sm:col-span-2 space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              type="text"
                              placeholder="Search by name, code or brand..."
                              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              value={bookSearchQuery}
                              onChange={(e) => setBookSearchQuery(e.target.value)}
                              autoFocus
                            />
                          </div>
                          
                          <div className="max-h-[400px] overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100">
                            {bookSearchResults.length > 0 ? (
                              bookSearchResults.map((item: any) => (
                                <div 
                                  key={item.id} 
                                  className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group"
                                  onClick={() => {
                                    setSelectedItemToBook(item);
                                    setBookSearchQuery('');
                                    setModalQtySft('');
                                    setModalQtyPcs('');
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    {item.imageUrl ? (
                                      <img 
                                        src={item.imageUrl} 
                                        alt={item.name} 
                                        className="w-10 h-10 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:scale-110 transition-transform" 
                                        referrerPolicy="no-referrer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewImage(item.imageUrl);
                                        }}
                                      />
                                    ) : (
                                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Package className="w-5 h-5 text-gray-400" />
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-medium text-gray-900">{item.name || item.code}</div>
                                      <div className="text-xs text-gray-500">{item.brand} • {item.size || item.code}</div>
                                    </div>
                                  </div>
                                  <div className="w-8 h-8 rounded-full border-2 border-blue-100 flex items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-all group-hover:scale-110">
                                    <Check className="w-5 h-5 text-blue-500" />
                                  </div>
                                </div>
                              ))
                            ) : bookSearchQuery.trim() !== '' ? (
                              <div className="p-8 text-center text-gray-500">No items found matching "{bookSearchQuery}"</div>
                            ) : (
                              <div className="p-8 text-center text-gray-500 italic">Start typing to search items...</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {selectedItemToBook && (
                            <div className="sm:col-span-2 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                {selectedItemToBook.imageUrl ? (
                                  <img 
                                    src={selectedItemToBook.imageUrl} 
                                    alt={selectedItemToBook.name} 
                                    className="w-12 h-12 object-cover rounded-lg border border-blue-200 cursor-zoom-in hover:scale-110 transition-transform" 
                                    referrerPolicy="no-referrer"
                                    onClick={() => setPreviewImage(selectedItemToBook.imageUrl)}
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-blue-200">
                                    <Package className="w-6 h-6 text-blue-400" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-blue-900">{selectedItemToBook.name || selectedItemToBook.code}</div>
                                  <div className="text-sm text-blue-700">{selectedItemToBook.brand} • {selectedItemToBook.size || selectedItemToBook.code}</div>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => setSelectedItemToBook(null)}
                                className="p-2 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                              
                              {/* Hidden inputs to pass data to form */}
                              <input type="hidden" name="name" value={selectedItemToBook.name || selectedItemToBook.code} />
                              <input type="hidden" name="size" value={selectedItemToBook.size || ''} />
                              <input type="hidden" name="code" value={selectedItemToBook.code || ''} />
                              <input type="hidden" name="brand" value={selectedItemToBook.brand || ''} />
                              <input type="hidden" name="imageUrl" value={selectedItemToBook.imageUrl || ''} />
                            </div>
                          )}
                          
                          {editingItem && (
                            <>
                              <Input label="Tile/Item Name" name="name" required defaultValue={editingItem?.item.name} list="uniqueNames" options={uniqueNames} />
                              <Input label="Size" name="size" defaultValue={editingItem?.item.size} list="uniqueSizes" options={uniqueSizes} />
                              <Input label="Code" name="code" defaultValue={editingItem?.item.code} />
                              <Input label="Brand" name="brand" defaultValue={editingItem?.item.brand} list="uniqueBrands" options={uniqueBrands} />
                            </>
                          )}
                          
                          <Input 
                            label="Quantity (sft)" 
                            name="qtySft" 
                            type="number" 
                            value={modalQtySft}
                            defaultValue={editingItem?.item.qtySft}
                            step="0.01" 
                            onChange={(e) => {
                              const sft = e.target.value;
                              setModalQtySft(sft);
                              
                              // Sync with PCS
                              const item = selectedItemToBook || editingItem?.item;
                              if (item && item.size && item.size.toLowerCase().includes('x')) {
                                const parts = item.size.toLowerCase().split('x');
                                const w = parseFloat(parts[0]);
                                const h = parseFloat(parts[1]);
                                if (!isNaN(w) && !isNaN(h)) {
                                  const unitSft = (w / 30) * (h / 30);
                                  const pcs = Math.round(parseFloat(sft) / unitSft);
                                  setModalQtyPcs(isNaN(pcs) ? '' : String(pcs));
                                }
                              }
                            }}
                          />
                          <Input 
                            label="Quantity (pcs)" 
                            name="qtyPcs" 
                            type="number" 
                            value={modalQtyPcs}
                            defaultValue={editingItem?.item.qtyPcs}
                            onChange={(e) => {
                              const pcs = e.target.value;
                              setModalQtyPcs(pcs);
                              
                              // Sync with SFT
                              const item = selectedItemToBook || editingItem?.item;
                              if (item && item.size && item.size.toLowerCase().includes('x')) {
                                const parts = item.size.toLowerCase().split('x');
                                const w = parseFloat(parts[0]);
                                const h = parseFloat(parts[1]);
                                if (!isNaN(w) && !isNaN(h)) {
                                  const unitSft = (w / 30) * (h / 30);
                                  const sft = (parseFloat(pcs) * unitSft).toFixed(2);
                                  setModalQtySft(isNaN(parseFloat(sft)) ? '' : sft);
                                }
                              }
                            }}
                          />
                          <Input label="Client Name" name="clientName" defaultValue={editingItem?.item.clientName} list="uniqueClientNames" options={uniqueClientNames} />
                          <Input label="Marketing Person" name="marketingPerson" defaultValue={editingItem?.item.marketingPerson} list="uniqueMarketingPersons" options={uniqueMarketingPersons} />
                          <Input label="Remark" name="remark" defaultValue={editingItem?.item.remark} className="sm:col-span-2" />
                          
                          {!selectedItemToBook && editingItem && (
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                              <label className="text-sm font-medium text-gray-700">Image File</label>
                              <input type="file" name="imageFile" accept="image/*" className="text-sm" />
                            </div>
                          )}
                          
                          {editingItem && (
                            <Input label="OR Image URL" name="imageUrl" defaultValue={editingItem?.item.imageUrl} className="sm:col-span-2" placeholder="https://..." />
                          )}
                        </>
                      )}
                    </>
                  )}

                  {(showAddModal === 'tools' || editingItem?.category === 'tools') && (
                    <>
                      <Input label="Details" name="details" required defaultValue={editingItem?.item.details} placeholder="e.g. Joint Float" className="sm:col-span-2" />
                      <Input label="Quantity" name="qty" type="number" required defaultValue={editingItem?.item.qty} />
                      <Input label="Issue To & Date" name="issueToDate" defaultValue={editingItem?.item.issueToDate} placeholder="e.g. 1PC Anik 11-09-25" />
                      <Input label="States" name="states" defaultValue={editingItem?.item.states} placeholder="e.g. Good condition" />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">Image File</label>
                        <input type="file" name="imageFile" accept="image/*" className="text-sm" />
                      </div>
                      <Input label="OR Image URL" name="imageUrl" defaultValue={editingItem?.item.imageUrl} placeholder="https://..." />
                    </>
                  )}

                  <div className="sm:col-span-2 pt-4 flex gap-3">
                    {((showAddModal === 'bookedItems' && (selectedItemToBook || editingItem)) || showAddModal !== 'bookedItems' || editingItem) && (
                      <Button type="submit" className="flex-1">{editingItem ? 'Update Item' : 'Save Item'}</Button>
                    )}
                    <Button onClick={() => { setShowAddModal(null); setEditingItem(null); setSelectedItemToBook(null); setBookSearchQuery(''); }} variant="secondary" className="flex-1">Cancel</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="sticky bottom-0 z-40 bg-[#0f172a] border-t border-slate-800 h-16 mt-auto text-white flex items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 w-full">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4 text-[10px] sm:text-xs text-gray-400">
            <div className="flex-1 text-left hidden md:block">
              Developed by <span className="font-semibold text-white">Bijoy Mahmud Munna</span>
            </div>
            <div className="flex-1 text-center font-medium flex items-center justify-center gap-4">
              <a href="https://www.facebook.com/mavxon" target="_blank" rel="noopener noreferrer" className="hover:text-[#FBBF24] transition-colors">www.mavxon.com</a>
              <span className="text-gray-700">|</span>
              <a href="mailto:Bijoy.mm112@gmail.com" className="hover:text-[#3B82F6] transition-colors">Bijoy.mm112@gmail.com</a>
            </div>
            <div className="flex-1 text-right">
              &copy; 2026 <a href="https://www.facebook.com/mavxon" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity inline-flex items-center">
                <span className="text-[#FBBF24] font-black tracking-tighter">mav</span>
                <span className="text-[#3B82F6] font-black tracking-tighter">xon</span>
              </a> <span className="text-white font-bold ml-1">IMS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </div>
  </div>
</ErrorBoundary>
  );
}
