import React, { useState, useEffect, useCallback } from 'react';

// 🛑 Google Script 網址
const API_URL = "https://script.google.com/macros/s/AKfycbyq0KVfpLLIzRUJ5w_rFqZq4C8p97LJOGAU5OkWwts1012zB6-sJIehrtyNLjXepfm5/exec";

// --- 🛠️ 內建圖示 ---
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
  Lock: (props) => <Icon {...props} path={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />
};

// --- Components ---

const StatusBadge = () => (
  <span className="px-2 py-1 rounded-full text-[10px] md:text-xs font-bold border bg-green-100 text-green-800 border-green-200 whitespace-nowrap">
    已接收
  </span>
);

const OrderCard = ({ order, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3 cursor-pointer active:bg-gray-50 transition-colors"
  >
    <div className="flex justify-between items-start mb-2">
      <div className="flex flex-col">
        <span className="font-mono text-xs text-[#c25e00] font-bold">#{order.orderId}</span>
        <h3 className="font-bold text-gray-800 text-base">{order.company}</h3>
      </div>
      <StatusBadge />
    </div>
    
    <div className="text-sm text-gray-600 space-y-1.5 mb-3 bg-gray-50 p-2 rounded border border-gray-100">
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

    <div className="flex justify-between items-center text-xs text-gray-400 font-medium">
      <span>{order.contact}</span>
      <span>{order.timestamp ? new Date(order.timestamp).toLocaleDateString() : ''}</span>
    </div>
  </div>
);

const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#222] text-white p-4 flex justify-between items-center shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-mono">ORDER ID</p>
            <h2 className="text-xl font-bold font-mono tracking-wider">{order.orderId}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Icons.X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="flex flex-wrap gap-4 justify-between items-center mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-500">狀態:</span>
              <StatusBadge />
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700">
                列印單據
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <section>
              <h3 className="text-xs font-bold text-[#c25e00] uppercase tracking-widest mb-3 border-b border-[#c25e00]/20 pb-1">客戶資訊</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-400 w-16 inline-block">公司:</span> <span className="font-bold">{order.company}</span></p>
                <p><span className="text-gray-400 w-16 inline-block">聯絡人:</span> {order.contact}</p>
                <p><span className="text-gray-400 w-16 inline-block">電話:</span> <a href={`tel:${order.phone}`} className="text-blue-600 hover:underline">{order.phone}</a></p>
                <p><span className="text-gray-400 w-16 inline-block">類型:</span> {order.orderType}</p>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold text-[#c25e00] uppercase tracking-widest mb-3 border-b border-[#c25e00]/20 pb-1">配送資訊</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-400 w-16 inline-block">日期:</span> <span className="font-bold">{order.deliveryDate ? order.deliveryDate.split('T')[0] : ''}</span></p>
                <p><span className="text-gray-400 w-16 inline-block">時段:</span> {order.deliveryTime}</p>
                <p><span className="text-gray-400 w-16 inline-block">地址:</span> {order.address}</p>
              </div>
            </section>
          </div>

          <section>
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
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [styleLoaded, setStyleLoaded] = useState(false);
  
  // --- 登入相關狀態 ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // 自動注入 Tailwind CSS
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

  // 🛠️ 修正：使用 useCallback 包裝，解決 useEffect 依賴警告
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

  // 🛠️ 修正：只在登入成功後觸發一次讀取
  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
    }
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

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '8888') {
      setIsLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("密碼錯誤，請重新輸入");
      setPassword("");
    }
  };

  if (!styleLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#222] text-gray-500">
        <div className="flex flex-col items-center gap-2">
           <div className="w-8 h-8 border-4 border-white/20 border-t-[#c25e00] rounded-full animate-spin"></div>
           <p className="text-sm text-gray-400 tracking-widest">LOADING SYSTEM...</p>
        </div>
      </div>
    );
  }

  // --- 登入畫面 ---
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
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Icons.Lock size={18} className="text-gray-500" />
               </div>
               <input 
                 type="password" 
                 placeholder="PASSWORD"
                 className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-[#c25e00] focus:ring-1 focus:ring-[#c25e00] transition-colors text-center tracking-[0.5em] text-lg font-mono"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 autoFocus
               />
             </div>
             
             {loginError && (
               <div className="text-red-400 text-xs text-center font-bold animate-pulse bg-red-400/10 py-2 rounded">
                 {loginError}
               </div>
             )}
             
             <button 
               type="submit"
               className="w-full bg-[#c25e00] text-white py-3 rounded-lg font-bold tracking-[0.2em] hover:bg-[#a04d00] transition-all shadow-lg active:scale-95 text-sm"
             >
               LOGIN
             </button>
           </form>
        </div>
        <p className="text-gray-600 text-[10px] mt-8 tracking-[0.3em] font-mono">© 2025 TILE PARK ADMIN</p>
        
        <style>{`
          .animate-fade-in { animation: fadeIn 0.5s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    );
  }

  // --- 後台主畫面 ---
  return (
    <div className="h-screen w-full bg-gray-50 font-sans text-gray-800 flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar / Mobile Header */}
      <aside className="bg-[#222] text-white flex-shrink-0 flex flex-col md:w-64 z-20 shadow-lg md:shadow-none">
        <div className="p-3 md:p-6 flex items-center justify-between md:justify-start border-b border-gray-700 shrink-0">
           <div className="flex items-center gap-3">
             <div className="flex flex-col leading-none">
                <span className="font-bold text-white tracking-widest text-base md:text-lg">TILE PARK</span>
                <span className="text-[10px] text-[#c25e00] tracking-[0.35em]">TAIWAN</span>
             </div>
             <div className="h-6 w-px bg-gray-600 hidden sm:block"></div>
             <span className="font-bold tracking-widest text-sm md:text-base text-gray-400 hidden sm:block">ADMIN</span>
           </div>
        </div>
        
        <nav className="p-2 md:p-4 md:flex-1 overflow-x-auto md:overflow-visible flex md:block gap-2 no-scrollbar shrink-0">
          <button className="flex items-center gap-3 px-4 py-2 md:py-3 rounded md:rounded-lg bg-[#c25e00] text-white font-bold text-sm whitespace-nowrap md:w-full transition-transform active:scale-95 shadow-sm">
            <Icons.FileText size={18} /> 
            <span>訂單管理</span>
          </button>
        </nav>

        <div className="hidden md:block p-4 border-t border-gray-700 text-xs text-gray-500 text-center md:text-left shrink-0">
          v1.5 TextLogo
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 bg-gray-100/50 relative">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 p-3 md:p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 z-10 shadow-sm">
          <div className="w-full sm:w-auto flex justify-between items-center">
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              訂單列表 
              <span className="bg-[#c25e00]/10 text-[#c25e00] text-xs px-2 py-0.5 rounded-full font-mono">
                {filteredOrders.length}
              </span>
            </h1>
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <div className="relative flex-1 sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icons.Search size={16} />
              </span>
              <input 
                type="text" 
                placeholder="搜尋單號、公司..." 
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c25e00]/30 focus:border-[#c25e00] text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={fetchOrders} 
              className={`p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all active:scale-95 ${loading ? 'animate-spin text-[#c25e00]' : ''}`}
            >
              <Icons.RefreshCw size={18} />
            </button>
            {/* 登出按鈕 */}
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="ml-2 text-xs text-gray-400 hover:text-red-500 underline decoration-dotted"
            >
              登出
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 custom-scrollbar">
          {errorMsg && (
             <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-center text-sm border border-red-200">
               {errorMsg}
             </div>
          )}

          {loading && orders.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400">
               <div className="w-8 h-8 border-4 border-gray-200 border-t-[#c25e00] rounded-full animate-spin mb-2"></div>
               <p className="text-sm">連線試算表中...</p>
             </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-4 w-32 whitespace-nowrap">單號</th>
                      <th className="p-4">訂購公司 / 聯絡人</th>
                      <th className="p-4">送貨資訊</th>
                      <th className="p-4">訂購摘要</th>
                      <th className="p-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((order, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => setSelectedOrder(order)}>
                        <td className="p-4 font-mono font-medium text-[#c25e00] group-hover:text-[#a04d00]">{order.orderId}</td>
                        <td className="p-4">
                          <div className="font-bold text-gray-800">{order.company}</div>
                          <div className="text-xs text-gray-500">{order.contact} • {order.orderType}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-800 font-medium">{order.deliveryDate ? order.deliveryDate.split('T')[0] : ''}</div>
                          <div className="text-xs text-gray-500">{order.deliveryTime}</div>
                        </td>
                        <td className="p-4 text-gray-500 text-xs truncate max-w-[200px]">
                           {order.parsedItems && order.parsedItems[0]} 
                           {order.parsedItems.length > 1 && `... (+${order.parsedItems.length-1})`}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-gray-400 hover:text-[#c25e00] text-xs font-bold underline decoration-dotted underline-offset-4">查看詳情</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && !loading && (
                  <div className="p-12 text-center text-gray-400 text-sm">目前沒有任何訂單記錄</div>
                )}
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden pb-10">
                {filteredOrders.map((order, idx) => (
                  <OrderCard key={idx} order={order} onClick={() => setSelectedOrder(order)} />
                ))}
                {filteredOrders.length === 0 && !loading && (
                  <div className="p-12 text-center text-gray-400 text-sm">目前沒有任何訂單記錄</div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {/* 隱藏卷軸 CSS */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}