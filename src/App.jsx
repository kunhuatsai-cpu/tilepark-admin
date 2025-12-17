import React, { useState, useEffect, useCallback } from 'react';

// 🛑 Google Script 網址
const API_URL = "https://script.google.com/macros/s/AKfycbyq0KVfpLLIzRUJ5w_rFqZq4C8p97LJOGAU5OkWwts1012zB6-sJIehrtyNLjXepfm5/exec";

// --- 🛠️ 內建圖示 ---
const Icon = ({ path, size = 18, className = "", onClick }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    onClick={onClick}
  >
    {path}
  </svg>
);

const Icons = {
  Search: (props) => <Icon {...props} path={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>} />,
  RefreshCw: (props) => <Icon {...props} path={<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></>} />,
  Package: (props) => <Icon {...props} path={<><path d="m16.5 9.4-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></>} />,
  Clock: (props) => <Icon {...props} path={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />,
  FileText: (props) => <Icon {...props} path={<><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></>} />,
  X: (props) => <Icon {...props} path={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>} />,
  Lock: (props) => <Icon {...props} path={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />,
  Trash2: (props) => <Icon {...props} path={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>} />,
  Check: (props) => <Icon {...props} path={<polyline points="20 6 9 17 4 12"/>} />,
  Phone: (props) => <Icon {...props} path={<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>} />,
  LogOut: (props) => <Icon {...props} path={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>} />
};

// --- Components ---

// 手機版按鈕：狀態切換 (App 風格)
const MobileStatusToggle = ({ label, checked, onClick, colorClass }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`flex-1 py-3 px-2 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm shadow-sm border ${
      checked 
        ? `${colorClass} text-white border-transparent` 
        : "bg-white text-gray-400 border-gray-200"
    }`}
  >
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked ? 'border-white bg-white/20' : 'border-gray-300'}`}>
      {checked && <Icons.Check size={12} strokeWidth={4} />}
    </div>
    {label}
  </button>
);

// 電腦版按鈕：狀態切換 (精簡版)
const DesktopStatusToggle = ({ label, checked, onClick, colorClass }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold ${
      checked 
        ? `${colorClass} text-white border-transparent shadow-sm` 
        : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
    }`}
  >
    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${checked ? 'border-white' : 'border-gray-400'}`}>
      {checked && <Icons.Check size={8} strokeWidth={4} />}
    </div>
    {label}
  </button>
);

// 手機版卡片 (App 風格)
const MobileOrderCard = ({ order, onClick, onStatusChange, onDelete, isCompleted }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4 active:scale-[0.98] transition-transform relative overflow-hidden ${isCompleted ? 'opacity-70 bg-gray-50' : ''}`}
  >
    {/* 側邊顏色條 */}
    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCompleted ? 'bg-gray-300' : 'bg-[#c25e00]'}`}></div>

    <div className="flex justify-between items-start mb-3 pl-3">
      <div>
        <span className="text-[10px] font-mono text-gray-400 tracking-wider bg-gray-100 px-2 py-0.5 rounded-md">#{order.orderId}</span>
        <h3 className={`font-bold text-gray-800 text-lg mt-1 ${isCompleted ? 'line-through decoration-gray-400 text-gray-500' : ''}`}>{order.company}</h3>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
          <span className="bg-gray-100 px-1.5 rounded">{order.orderType}</span>
          <span>• {order.contact}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <a href={`tel:${order.phone}`} onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-100 hover:bg-green-100">
          <Icons.Phone size={14} />
        </a>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(order.orderId); }}
          className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
        >
          <Icons.Trash2 size={14} />
        </button>
      </div>
    </div>
    
    <div className="pl-3 space-y-2 mb-4">
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
        <Icons.Clock size={16} className="text-[#c25e00]" /> 
        <span className="font-bold">{order.deliveryDate ? order.deliveryDate.split('T')[0] : ''}</span>
        <span className="text-gray-400 text-xs ml-auto">{order.deliveryTime}</span>
      </div>
      <div className="text-sm text-gray-500 line-clamp-2 px-1">
        {order.parsedItems.join(', ')}
      </div>
    </div>

    {/* 底部操作區 */}
    <div className="flex gap-3 pl-3 pt-2">
      <MobileStatusToggle 
        label="確認庫存" 
        checked={order.isStockConfirmed} 
        onClick={() => onStatusChange(order.orderId, 'stock', !order.isStockConfirmed)}
        colorClass="bg-blue-500"
      />
      <MobileStatusToggle 
        label="已排單" 
        checked={order.isProcessed} 
        onClick={() => onStatusChange(order.orderId, 'process', !order.isProcessed)}
        colorClass="bg-purple-500"
      />
    </div>
  </div>
);

// 電腦版表格列
const DesktopOrderRow = ({ order, onClick, onStatusChange, onDelete, isCompleted }) => (
  <tr 
    className={`hover:bg-gray-50 transition-colors cursor-pointer group ${isCompleted ? 'bg-gray-50/50' : ''}`} 
    onClick={() => onClick(order)}
  >
    <td className={`p-4 font-mono font-medium text-[#c25e00] group-hover:text-[#a04d00] ${isCompleted ? 'opacity-50' : ''}`}>{order.orderId}</td>
    <td className={`p-4 ${isCompleted ? 'opacity-50' : ''}`}>
      <div className={`font-bold text-gray-800 ${isCompleted ? 'line-through decoration-gray-400' : ''}`}>{order.company}</div>
      <div className="text-xs text-gray-500">{order.contact} • {order.orderType}</div>
    </td>
    <td className={`p-4 ${isCompleted ? 'opacity-50' : ''}`}>
      <div className="text-gray-800 font-medium">{order.deliveryDate ? order.deliveryDate.split('T')[0] : ''}</div>
      <div className="text-xs text-gray-500">{order.deliveryTime}</div>
    </td>
    <td className="p-4">
      <div className="flex gap-2">
        <DesktopStatusToggle 
          label="已確認庫存" 
          checked={order.isStockConfirmed} 
          onClick={() => onStatusChange(order.orderId, 'stock', !order.isStockConfirmed)}
          colorClass="bg-blue-500"
        />
        <DesktopStatusToggle 
          label="已打單排單" 
          checked={order.isProcessed} 
          onClick={() => onStatusChange(order.orderId, 'process', !order.isProcessed)}
          colorClass="bg-purple-500"
        />
      </div>
    </td>
    <td className="p-4 text-right">
      <div className="flex justify-end items-center gap-3">
        <span className="text-gray-400 hover:text-[#c25e00] text-xs font-bold underline decoration-dotted underline-offset-4">詳情</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(order.orderId); }}
          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          title="刪除訂單"
        >
          <Icons.Trash2 size={16} />
        </button>
      </div>
    </td>
  </tr>
);

const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#222] text-white p-4 flex justify-between items-center shrink-0">
          <div>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest">ORDER DETAIL</p>
            <h2 className="text-xl font-bold font-mono tracking-wider">{order.orderId}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Icons.X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/50">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-800 text-lg">{order.company}</h3>
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">{order.orderType}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">訂購人</p>
                <p className="font-medium text-gray-700">{order.contact}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">電話</p>
                <a href={`tel:${order.phone}`} className="font-medium text-blue-600 hover:underline">{order.phone}</a>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-6">
            <h3 className="text-xs font-bold text-[#c25e00] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Icons.Package size={14}/> 訂購內容
            </h3>
            <div className="divide-y divide-gray-100">
              {order.parsedItems.length > 0 ? (
                order.parsedItems.map((itemStr, idx) => (
                  <div key={idx} className="py-3 text-sm text-gray-700 font-medium">
                    {itemStr}
                  </div>
                ))
              ) : (
                <div className="py-3 text-sm text-gray-400">無商品資料</div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-bold text-[#c25e00] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Icons.Clock size={14}/> 配送資訊
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">日期</span>
                <span className="font-bold text-gray-800">{order.deliveryDate ? order.deliveryDate.split('T')[0] : ''}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-500">時段</span>
                <span className="font-bold text-gray-800">{order.deliveryTime}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">地址</span>
                <span className="font-bold text-gray-800 break-words">{order.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    if (document.querySelector('script[src*="tailwindcss"]')) {
      setStyleLoaded(true);
    } else {
      const script = document.createElement('script');
      script.src = "https://cdn.tailwindcss.com";
      script.onload = () => setTimeout(() => setStyleLoaded(true), 500);
      document.head.appendChild(script);
    }
  }, []);

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(API_URL, { redirect: "follow" });
      if (!response.ok) throw new Error("網路連線錯誤");
      const data = await response.json();
      
      const processedData = data.map(item => ({
        ...item,
        parsedItems: item.items ? item.items.toString().split('\n') : [],
        company: item.company || '未知公司',
        orderId: item.orderId || '無單號',
        contact: item.contact || '未知聯絡人'
      }));

      setOrders(processedData);
      setFilteredOrders(processedData);
    } catch (error) {
      console.error("Fetch Error:", error);
      setErrorMsg("讀取失敗：請確認 Google Script 網址正確，且已重新部署「建立新版本」。");
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchOrders();
  }, [isLoggedIn, fetchOrders]);

  useEffect(() => {
    let result = orders;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o => 
        (o.company && o.company.toLowerCase().includes(term)) || 
        (o.orderId && o.orderId.toLowerCase().includes(term)) ||
        (o.contact && o.contact.toLowerCase().includes(term))
      );
    }
    if (activeTab === "active") result = result.filter(o => !o.isStockConfirmed || !o.isProcessed);
    else if (activeTab === "completed") result = result.filter(o => o.isStockConfirmed && o.isProcessed);

    setFilteredOrders(result);
  }, [searchTerm, orders, activeTab]);

  const activeList = filteredOrders.filter(o => !o.isStockConfirmed || !o.isProcessed);
  const completedList = filteredOrders.filter(o => o.isStockConfirmed && o.isProcessed);

  const handleStatusChange = async (orderId, field, newValue) => {
    setOrders(prev => prev.map(o => {
      if (o.orderId === orderId) {
        return field === 'stock' ? { ...o, isStockConfirmed: newValue } : { ...o, isProcessed: newValue };
      }
      return o;
    }));
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', orderId, field, value: newValue })
      });
    } catch (error) { alert("更新失敗"); fetchOrders(); }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`確定要刪除訂單 ${orderId} 嗎？此動作無法復原。`)) return;
    setOrders(prev => prev.filter(o => o.orderId !== orderId));
    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', orderId })
      });
    } catch (error) { alert("刪除失敗"); fetchOrders(); }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '8888') { setIsLoggedIn(true); setLoginError(""); } else { setLoginError("密碼錯誤"); setPassword(""); }
  };

  if (!styleLoaded) return <div className="min-h-screen flex items-center justify-center bg-[#222] text-gray-500"><div className="w-8 h-8 border-4 border-white/20 border-t-[#c25e00] rounded-full animate-spin"></div></div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#222] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/5 p-8 rounded-2xl backdrop-blur-sm border border-white/10 shadow-2xl animate-fade-in">
           <div className="flex flex-col items-center justify-center mb-8">
             <h1 className="text-3xl font-bold text-white tracking-[0.2em]">TILE PARK</h1>
             <div className="w-full h-0.5 bg-[#c25e00] my-2 max-w-[120px]"></div>
             <span className="text-sm text-gray-400 tracking-[0.5em]">TAIWAN</span>
           </div>
           <h2 className="text-white/80 text-center text-sm font-bold mb-6 tracking-[0.2em] font-mono">ADMIN ACCESS</h2>
           <form onSubmit={handleLogin} className="space-y-5">
             <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icons.Lock size={18} className="text-gray-500" /></div>
               <input type="password" placeholder="PASSWORD" className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#c25e00] text-center tracking-[0.5em] text-lg font-mono" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
             </div>
             {loginError && <div className="text-red-400 text-xs text-center font-bold animate-pulse bg-red-400/10 py-2 rounded">{loginError}</div>}
             <button type="submit" className="w-full bg-[#c25e00] text-white py-3 rounded-lg font-bold tracking-[0.2em] hover:bg-[#a04d00] transition-all shadow-lg active:scale-95 text-sm">LOGIN</button>
           </form>
        </div>
        <p className="text-gray-600 text-[10px] mt-8 tracking-[0.3em] font-mono">© 2025 TILE PARK ADMIN</p>
        <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#f8f9fa] md:bg-gray-50 font-sans text-gray-800 flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar (Desktop Only) */}
      <aside className="bg-[#222] text-white flex-shrink-0 flex flex-col md:w-64 z-20 hidden md:flex">
        <div className="p-6 flex items-center justify-start border-b border-gray-700 shrink-0">
           <div className="flex items-center gap-3">
             <div className="flex flex-col leading-none">
                <span className="font-bold text-white tracking-widest text-lg">TILE PARK</span>
                <span className="text-[10px] text-[#c25e00] tracking-[0.35em]">TAIWAN</span>
             </div>
             <div className="h-6 w-px bg-gray-600"></div>
             <span className="font-bold tracking-widest text-base text-gray-400">ADMIN</span>
           </div>
        </div>
        <nav className="p-4 flex-1">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#c25e00] text-white font-bold text-sm w-full shadow-sm"><Icons.FileText size={18} /> <span>訂單管理</span></button>
        </nav>
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">v3.0 Mobile App</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 bg-[#f8f9fa] md:bg-gray-100/50 relative">
        
        {/* Mobile Header (App Style) */}
        <header className="bg-white border-b border-gray-100 p-4 md:hidden flex justify-between items-center z-10 shadow-sm sticky top-0">
          <div className="flex flex-col leading-none">
             <span className="font-bold text-gray-900 tracking-widest text-base">TILE PARK</span>
             <span className="text-[9px] text-[#c25e00] tracking-[0.35em] font-bold">ADMIN</span>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="text-gray-400 hover:text-gray-600"><Icons.LogOut size={20} /></button>
        </header>

        {/* Desktop Header */}
        <header className="bg-white border-b border-gray-200 p-4 hidden md:flex flex-col gap-3 shrink-0 shadow-sm">
          <div className="flex justify-between items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">訂單列表 <span className="bg-[#c25e00]/10 text-[#c25e00] text-xs px-2 py-0.5 rounded-full font-mono">{filteredOrders.length}</span></h1>
            <div className="flex gap-2">
              <div className="relative w-64"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search size={16} /></span><input type="text" placeholder="搜尋..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#c25e00]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
              <button onClick={fetchOrders} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"><Icons.RefreshCw size={18} /></button>
              <button onClick={() => setIsLoggedIn(false)} className="ml-2 text-xs text-gray-400 hover:text-red-500 underline decoration-dotted">登出</button>
            </div>
          </div>
          <div className="flex gap-2">
            {[ { id: 'all', label: '全部' }, { id: 'active', label: '進行中' }, { id: 'completed', label: '已完成' } ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${activeTab === tab.id ? 'bg-[#222] text-white border-[#222]' : 'bg-white text-gray-500 border-gray-200'}`}>{tab.label}</button>
            ))}
          </div>
        </header>

        {/* Mobile Search & Tabs */}
        <div className="md:hidden px-4 py-3 bg-white border-b border-gray-100 flex flex-col gap-3 shadow-sm sticky top-[60px] z-10">
           <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search size={16} /></span>
             <input type="text" placeholder="搜尋單號、公司..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#c25e00]/10 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
           <div className="flex bg-gray-100 p-1 rounded-lg">
             {[ { id: 'all', label: '全部' }, { id: 'active', label: '進行中' }, { id: 'completed', label: '已完成' } ].map(tab => (
               <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>{tab.label}</button>
             ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-center text-sm border border-red-200">{errorMsg}</div>}
          
          {loading && orders.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#c25e00] rounded-full animate-spin mb-2"></div><p className="text-sm">連線中...</p></div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <tr><th className="p-4 w-32">單號</th><th className="p-4">公司</th><th className="p-4">送貨</th><th className="p-4">狀態</th><th className="p-4 text-right">操作</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeList.map((order) => <DesktopOrderRow key={order.orderId} order={order} onClick={setSelectedOrder} onStatusChange={handleStatusChange} onDelete={handleDeleteOrder} isCompleted={false} />)}
                    {activeTab === 'all' && activeList.length > 0 && completedList.length > 0 && (
                      <tr className="bg-gray-50/50"><td colSpan="5" className="p-3 text-center text-xs font-bold text-gray-400 border-t border-b border-gray-200/50">已完成訂單 ({completedList.length})</td></tr>
                    )}
                    {completedList.map((order) => <DesktopOrderRow key={order.orderId} order={order} onClick={setSelectedOrder} onStatusChange={handleStatusChange} onDelete={handleDeleteOrder} isCompleted={true} />)}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden pb-10">
                {activeList.map((order) => <MobileOrderCard key={order.orderId} order={order} onClick={() => setSelectedOrder(order)} onStatusChange={handleStatusChange} onDelete={handleDeleteOrder} isCompleted={false} />)}
                
                {activeTab === 'all' && activeList.length > 0 && completedList.length > 0 && (
                  <div className="mt-6 mb-4 flex items-center justify-center gap-3">
                    <div className="h-px bg-gray-200 w-full"></div>
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">歷史訂單</span>
                    <div className="h-px bg-gray-200 w-full"></div>
                  </div>
                )}

                {completedList.map((order) => <MobileOrderCard key={order.orderId} order={order} onClick={() => setSelectedOrder(order)} onStatusChange={handleStatusChange} onDelete={handleDeleteOrder} isCompleted={true} />)}
              </div>
            </>
          )}
        </div>
      </main>

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}