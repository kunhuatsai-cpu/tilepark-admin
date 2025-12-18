import React, { useState, useEffect, useCallback } from 'react';

// 🛑 Google Script 網址 - 確保這是您的最新部署網址 (exec 結尾)
const API_URL = "https://script.google.com/macros/s/AKfycbyq0KVfpLLIzRUJ5w_rFqZq4C8p97LJOGAU5OkWwts1012zB6-sJIehrtyNLjXepfm5/exec";

// --- 🛠️ 內建圖示 (SVG Components) ---
const Icon = ({ path, size = 18, className = "" }) => (
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
  Trash2: (props) => <Icon {...props} path={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>} />,
  CheckCircle: (props) => <Icon {...props} path={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>} />,
  Truck: (props) => <Icon {...props} path={<><rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>} />,
  Loader: (props) => <Icon {...props} path={<><path d="M21 12a9 9 0 1 1-6.219-8.56" /></>} />,
  Check: (props) => <Icon {...props} path={<><polyline points="20 6 9 17 4 12" /></>} />,
  Copy: (props) => <Icon {...props} path={<><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>} />
};

// --- Sub-Components ---

const StatusBadge = ({ status }) => {
  let colorClass = "bg-green-100 text-green-800 border-green-200";
  if (status === '已確認庫存') colorClass = "bg-teal-100 text-teal-800 border-teal-200";
  if (status === '已排單出貨') colorClass = "bg-blue-100 text-blue-800 border-blue-200";

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold border ${colorClass} whitespace-nowrap transition-colors duration-300`}>
      {status || '已接收'}
    </span>
  );
};

const OrderCard = ({ order, isSelected, onSelect, onClick }) => (
  <div 
    className={`bg-white p-4 rounded-lg shadow-sm border mb-3 transition-colors relative ${isSelected ? 'border-[#c25e00] ring-1 ring-[#c25e00] bg-orange-50' : 'border-gray-200'}`}
  >
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-3">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(order.orderId);
          }}
          className="w-5 h-5 rounded border-gray-300 text-[#c25e00] focus:ring-[#c25e00]"
        />
        <div className="flex flex-col" onClick={onClick}>
          <span className="font-mono text-xs text-[#c25e00] font-bold">#{order.orderId}</span>
          <h3 className="font-bold text-gray-800 text-base">{order.company}</h3>
        </div>
      </div>
      <div onClick={onClick}>
        <StatusBadge status={order.status} />
      </div>
    </div>
    
    <div onClick={onClick} className="text-sm text-gray-600 space-y-1.5 mb-3 bg-gray-50 p-2 rounded border border-gray-100 cursor-pointer">
      <div className="flex items-center gap-2">
        <Icons.Clock size={14} className="text-gray-400" /> 
        <span className="font-medium">{order.deliveryDate ? order.deliveryDate.split('T')[0] : ''}</span>
        <span className="text-gray-400 text-xs">({order.deliveryTime})</span>
      </div>
      <div className="flex items-start gap-2">
        <Icons.Package size={14} className="text-gray-400 mt-0.5" /> 
        <span className="line-clamp-2">{order.parsedItems.join(', ')}</span>
      </div>
    </div>

    <div onClick={onClick} className="flex justify-between items-center text-xs text-gray-400 font-medium cursor-pointer">
      <span>{order.contact}</span>
      <span>{order.timestamp ? new Date(order.timestamp).toLocaleDateString() : ''}</span>
    </div>
  </div>
);

const OrderDetailModal = ({ order, onClose, onUpdateStatus, onDelete, isProcessing }) => {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  // 判斷當前勾選狀態
  const isStockConfirmed = order.status === '已確認庫存' || order.status === '已排單出貨';
  const isShipped = order.status === '已排單出貨';

  // 📋 一鍵複製功能
  const handleCopy = () => {
    const lines = [
      `【TILE PARK 訂單確認】`,
      `單號：${order.orderId}`,
      `客戶：${order.company} (${order.contact})`,
      `送貨：${order.deliveryDate ? order.deliveryDate.split('T')[0] : ''} ${order.deliveryTime}`,
      `地址：${order.address}`,
      ``,
      `訂購內容：`,
      ...(order.parsedItems.length > 0 ? order.parsedItems : ['(無內容)']),
      ``,
      `目前狀態：${order.status}`,
      `-----------------------`
    ];
    const textToCopy = lines.join('\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => console.error('Copy failed', err));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#222] text-white p-4 flex justify-between items-center shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-mono">ORDER ID</p>
            <h2 className="text-xl font-bold font-mono tracking-wider">{order.orderId}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
                {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
                {copied ? '已複製' : '複製卡片'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Icons.X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* 1. 狀態與操作區 */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">訂單流程:</span>
              <StatusBadge status={order.status} />
              <span className="text-xs text-gray-400 font-mono ml-auto">Synced: {new Date().toLocaleDateString()}</span>
            </div>
            
            {/* 🌟 勾選操作區 (Checkbox Area) */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 flex flex-col sm:flex-row gap-4 sm:gap-8 shadow-inner">
                <label className={`flex items-center gap-3 cursor-pointer select-none transition-opacity flex-1 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all shadow-sm ${isStockConfirmed ? 'bg-teal-500 border-teal-500' : 'bg-white border-gray-300 hover:border-teal-400'}`}>
                        {isStockConfirmed && <Icons.Check size={20} className="text-white" strokeWidth={3} />}
                    </div>
                    <div>
                        <span className={`block font-bold ${isStockConfirmed ? 'text-teal-700' : 'text-gray-700'}`}>已確認庫存</span>
                        <span className="text-xs text-gray-400">Step 1: 確認商品無誤</span>
                    </div>
                    <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isStockConfirmed} 
                        onChange={() => !isStockConfirmed && onUpdateStatus([order.orderId], '已確認庫存')}
                        disabled={isProcessing || isStockConfirmed}
                    />
                </label>

                <div className="hidden sm:block w-px bg-gray-300 h-10 self-center"></div>
                <div className="sm:hidden w-full h-px bg-gray-200"></div>

                <label className={`flex items-center gap-3 cursor-pointer select-none transition-opacity flex-1 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <div className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-all shadow-sm ${isShipped ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300 hover:border-blue-400'}`}>
                        {isShipped && <Icons.Check size={20} className="text-white" strokeWidth={3} />}
                    </div>
                    <div>
                        <span className={`block font-bold ${isShipped ? 'text-blue-700' : 'text-gray-700'}`}>已排單出貨</span>
                        <span className="text-xs text-gray-400">Step 2: 安排物流配送</span>
                    </div>
                    <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isShipped} 
                        onChange={() => !isShipped && onUpdateStatus([order.orderId], '已排單出貨')}
                        disabled={isProcessing || isShipped}
                    />
                </label>
            </div>
          </div>

          {/* 2. 詳細資訊區 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <section>
              <h3 className="text-xs font-bold text-[#c25e00] uppercase tracking-widest mb-3 border-b border-[#c25e00]/20 pb-1">客戶資訊</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="text-gray-400 w-16 inline-block">公司:</span> <span className="font-bold">{order.company}</span></p>
                <p><span className="text-gray-400 w-16 inline-block">聯絡人:</span> {order.contact}</p>
                <p><span className="text-gray-400 w-16 inline-block">電話:</span> <a href={`tel:${order.phone}`} className="text-blue-600 hover:underline">{order.phone}</a></p>
                <p><span className="text-gray-400 w-16 inline-block">類型:</span> {order.orderType}</p>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold text-[#c25e00] uppercase tracking-widest mb-3 border-b border-[#c25e00]/20 pb-1">配送資訊</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="text-gray-400 w-16 inline-block">日期:</span> <span className="font-bold">{order.deliveryDate ? order.deliveryDate.split('T')[0] : ''}</span></p>
                <p><span className="text-gray-400 w-16 inline-block">時段:</span> {order.deliveryTime}</p>
                <p><span className="text-gray-400 w-16 inline-block">地址:</span> {order.address}</p>
              </div>
            </section>
          </div>

          <section className="mb-8">
            <h3 className="text-xs font-bold text-[#c25e00] uppercase tracking-widest mb-3 border-b border-[#c25e00]/20 pb-1">訂購商品</h3>
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-500 font-medium">
                  <tr><th className="p-3">品項內容 (品名 / 數量 / 備註)</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.parsedItems && order.parsedItems.length > 0 ? (
                    order.parsedItems.map((itemStr, idx) => (
                      <tr key={idx} className="hover:bg-gray-100">
                        <td className="p-3 font-medium text-gray-800">{itemStr}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td className="p-3 text-gray-400">無商品資料</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. 底部刪除區 (Danger Zone) */}
          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button 
                onClick={() => {
                    if (window.confirm('確定要刪除此訂單嗎？此操作無法復原。')) {
                        onDelete([order.orderId]);
                        onClose();
                    }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
                <Icons.Trash2 size={16} />
                刪除此訂單
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

const FloatingActionBar = ({ count, onDelete, onUpdateStatus, isProcessing }) => (
  <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-md border border-gray-200 shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 md:gap-4 z-40 animate-slide-up max-w-[95vw]">
    {isProcessing ? (
      <div className="flex items-center gap-2 px-4 py-2 text-[#c25e00] font-bold">
        <Icons.Loader size={18} className="animate-spin" />
        <span>同步處理中...</span>
      </div>
    ) : (
      <>
        <span className="text-xs md:text-sm font-bold text-gray-600 border-r border-gray-200 pr-3 mr-1 whitespace-nowrap">
          已選 <span className="text-[#c25e00]">{count}</span> 筆
        </span>
        
        <button 
          onClick={() => onUpdateStatus(null, '已確認庫存')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
        >
          <Icons.CheckCircle size={16} />
          <span className="hidden md:inline">確認庫存</span>
          <span className="md:hidden">庫存</span>
        </button>

        <button 
          onClick={() => onUpdateStatus(null, '已排單出貨')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <Icons.Truck size={16} />
          <span className="hidden md:inline">排單出貨</span>
          <span className="md:hidden">出貨</span>
        </button>

        <div className="w-px h-4 bg-gray-300 mx-1"></div>

        <button 
          onClick={() => onDelete()} // 批量刪除不傳參數，會使用 selectedIds
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
        >
          <Icons.Trash2 size={16} />
          <span className="hidden md:inline">刪除</span>
        </button>
      </>
    )}
  </div>
);

// --- Main App Component ---

export default function AdminDashboard() {
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set()); 
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    // 檢查是否已載入 Tailwind，若無則動態加入 CDN (解決上傳後排版跑掉問題)
    if (!document.querySelector('script[src*="tailwindcss"]')) {
      const script = document.createElement('script');
      script.src = "https://cdn.tailwindcss.com";
      script.onload = () => setStyleLoaded(true);
      document.head.appendChild(script);
    } else {
      setStyleLoaded(true);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      const cacheBuster = `t=${timestamp}&r=${random}&_cache_free=${timestamp}`;
      const finalUrl = API_URL.includes('?') ? `${API_URL}&${cacheBuster}` : `${API_URL}?${cacheBuster}`;
      
      const response = await fetch(finalUrl, { 
        method: 'GET',
        cache: 'no-store',
        redirect: "follow" 
      });
      
      if (!response.ok) throw new Error("網路連線錯誤");
      const data = await response.json();
      
      const processedData = data.map(item => ({
        ...item,
        parsedItems: item.items ? item.items.toString().split('\n') : [],
        company: item.company || '未知公司',
        orderId: item.orderId || '無單號',
        contact: item.contact || '未知聯絡人',
        status: item.status || '已接收' 
      }));

      setOrders(processedData);
      setFilteredOrders(processedData);
      setLastUpdated(new Date().toLocaleTimeString());
      setSelectedIds(new Set()); 
    } catch (error) {
      console.error("Fetch Error:", error);
      setErrorMsg("讀取失敗：請檢查 Google Script 是否已正確發佈並設為「所有人」。");
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
    setFilteredOrders(result);
  }, [searchTerm, orders]);

  // 後端通訊邏輯
  const sendCommandToBackend = async (payload) => {
    setIsProcessing(true);
    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (err) {
        console.error("Backend Sync Error:", err);
        alert("同步至試算表失敗，請檢查網路或 Script 設定。");
        return false;
    } finally {
        setIsProcessing(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '8888') {
      setIsLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("密碼錯誤");
      setPassword("");
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(filteredOrders.map(o => o.orderId));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  // 修改：支援單筆刪除
  const handleDelete = async (ids) => {
    const idsToDelete = ids || Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    // 若未傳入 ids，代表是批量刪除，需要詢問
    // 若傳入 ids，代表是詳情頁刪除，已經詢問過了
    if (!ids && !window.confirm(`確定要刪除這 ${idsToDelete.length} 筆訂單嗎？此操作將同步刪除試算表資料。`)) return;
    
    const success = await sendCommandToBackend({
        action: 'delete',
        ids: idsToDelete
    });

    if (success) {
        // 從 orders 中移除
        const newOrders = orders.filter(o => !idsToDelete.includes(o.orderId));
        setOrders(newOrders);
        
        // 如果是批量刪除，清空勾選
        if (!ids) setSelectedIds(new Set());

        setTimeout(fetchOrders, 1000); 
    }
  };

  const handleStatusUpdate = async (specificIds, newStatus) => {
    const idsToUpdate = specificIds || Array.from(selectedIds);
    if (idsToUpdate.length === 0) return;

    const success = await sendCommandToBackend({
        action: 'updateStatus',
        status: newStatus,
        ids: idsToUpdate
    });

    if (success) {
        const newOrders = orders.map(o => {
            if (idsToUpdate.includes(o.orderId)) {
                return { ...o, status: newStatus };
            }
            return o;
        });
        setOrders(newOrders);
        
        if (!specificIds) setSelectedIds(new Set()); 
        
        if (selectedOrder && idsToUpdate.includes(selectedOrder.orderId)) {
            setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }

        setTimeout(fetchOrders, 1000);
    }
  };

  if (!styleLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#222]">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#c25e00] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#222] flex flex-col items-center justify-center p-4 font-sans text-gray-800">
        <div className="w-full max-w-sm bg-white/5 p-8 rounded-2xl backdrop-blur-sm border border-white/10 shadow-2xl animate-fade-in">
          <div className="flex flex-col items-center justify-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-[0.2em]">TILE PARK</h1>
            <div className="w-full h-0.5 bg-[#c25e00] my-2 max-w-[120px]"></div>
            <span className="text-sm text-gray-400 tracking-[0.5em]">TAIWAN</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icons.Lock size={18} className="text-gray-500" />
              </div>
              <input 
                type="password" 
                placeholder="PASSWORD"
                className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#c25e00] text-center tracking-[0.5em] text-lg font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {loginError && <div className="text-red-400 text-xs text-center font-bold">{loginError}</div>}
            <button type="submit" className="w-full bg-[#c25e00] text-white py-3 rounded-lg font-bold tracking-[0.2em] hover:bg-[#a04d00] transition-all">LOGIN</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gray-50 font-sans text-gray-800 flex flex-col md:flex-row overflow-hidden">
      
      <aside className="bg-[#222] text-white flex-shrink-0 flex flex-col md:w-64 z-20 shadow-lg md:shadow-none">
        <div className="p-4 md:p-6 border-b border-gray-700">
          <div className="flex flex-col leading-none">
            <span className="font-bold text-white tracking-widest text-lg">TILE PARK</span>
            <span className="text-[10px] text-[#c25e00] tracking-[0.35em] mt-1">ADMIN</span>
          </div>
        </div>
        
        <nav className="p-4 flex-1">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#c25e00] text-white font-bold text-sm w-full transition-transform active:scale-95">
            <Icons.FileText size={18} /> 
            <span>訂單管理</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-700 text-[10px] text-gray-500 font-mono">
          Last Sync: {lastUpdated || "Never"}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 relative">
        <header className="bg-white border-b border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 z-10 shadow-sm">
          <div className="w-full sm:w-auto flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800">訂單列表</h1>
            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-mono">{filteredOrders.length}</span>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <div className="relative flex-1 sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icons.Search size={16} />
              </span>
              <input 
                type="text" 
                placeholder="搜尋單號或公司..." 
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#c25e00] transition-all font-sans"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                setOrders([]); 
                fetchOrders();
              }} 
              className={`p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all active:scale-95 ${loading ? 'animate-spin text-[#c25e00]' : ''}`}
              title="強制同步試算表最新資料"
            >
              <Icons.RefreshCw size={18} />
            </button>
            <button onClick={() => setIsLoggedIn(false)} className="text-gray-400 hover:text-red-500 p-2"><Icons.X size={18}/></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-24"> 
          {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-center text-sm border border-red-200">{errorMsg}</div>}

          {loading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-[#c25e00] rounded-full animate-spin mb-4"></div>
              <p className="text-sm tracking-widest font-bold">正在強制同步試算表資料，請稍候...</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left font-sans">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          onChange={toggleSelectAll}
                          checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length}
                          className="w-4 h-4 rounded border-gray-300 text-[#c25e00] focus:ring-[#c25e00]"
                        />
                      </th>
                      <th className="p-4">單號</th>
                      <th className="p-4">狀態</th>
                      <th className="p-4">客戶 / 聯絡人</th>
                      <th className="p-4">送貨日期</th>
                      <th className="p-4">內容摘要</th>
                      <th className="p-4 text-right">詳情</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((order, idx) => {
                      const isSelected = selectedIds.has(order.orderId);
                      return (
                        <tr 
                          key={idx} 
                          className={`transition-colors cursor-pointer ${isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleSelect(order.orderId)}
                              className="w-4 h-4 rounded border-gray-300 text-[#c25e00] focus:ring-[#c25e00]"
                            />
                          </td>
                          <td className="p-4 font-mono font-bold text-[#c25e00]">{order.orderId}</td>
                          <td className="p-4"><StatusBadge status={order.status} /></td>
                          <td className="p-4 font-bold text-gray-800">{order.company}</td>
                          <td className="p-4">{order.deliveryDate ? order.deliveryDate.split('T')[0] : ''}</td>
                          <td className="p-4 text-gray-400 text-xs truncate max-w-[150px]">{order.parsedItems[0] || '無'}</td>
                          <td className="p-4 text-right"><span className="text-xs text-gray-300 underline underline-offset-4 font-bold">VIEW</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden">
                {filteredOrders.map((order, idx) => (
                  <OrderCard 
                    key={idx} 
                    order={order} 
                    isSelected={selectedIds.has(order.orderId)}
                    onSelect={toggleSelect}
                    onClick={() => setSelectedOrder(order)} 
                  />
                ))}
              </div>
              
              {filteredOrders.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <Icons.FileText size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">目前查無訂單，請確認試算表是否有資料。</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <FloatingActionBar 
          count={selectedIds.size} 
          isProcessing={isProcessing}
          onDelete={() => handleDelete()}
          onUpdateStatus={handleStatusUpdate}
        />
      )}

      {selectedOrder && (
        <OrderDetailModal 
            order={selectedOrder} 
            onClose={() => setSelectedOrder(null)} 
            onUpdateStatus={handleStatusUpdate}
            onDelete={handleDelete}
            isProcessing={isProcessing}
        />
      )}

      {/* Tailwind Utility for Animations (Usually in CSS, but putting here if needed for inline styles) */}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      `}</style>
    </div>
  );
}