import React, { useState, useEffect, useCallback } from 'react';

// 🛑 Google Script 網址 - ⚠️ 請務必確認此網址與您最新的「部署網址」一致
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastUpdated, setLastUpdated] = useState("");

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

  // 🛠️ 終極抗快取 Fetch 邏輯
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. 三重抗快取參數：確保網址在 Google 伺服器眼中是全新的
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      const cacheBuster = `t=${timestamp}&r=${random}&_cache_free=${timestamp}`;
      const finalUrl = API_URL.includes('?') ? `${API_URL}&${cacheBuster}` : `${API_URL}?${cacheBuster}`;
      
      // 2. 加入更嚴格的快取控制請求標頭
      const response = await fetch(finalUrl, { 
        method: 'GET',
        cache: 'no-store', // 瀏覽器層級不存儲
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        redirect: "follow" 
      });
      
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
      setLastUpdated(new Date().toLocaleTimeString());
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
        <style>{`
          .animate-fade-in { animation: fadeIn 0.5s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
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
                setOrders([]); // 🛠️ 關鍵：先歸零清空舊資料，確保重新抓取
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
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
                      <th className="p-4">單號</th>
                      <th className="p-4">客戶 / 聯絡人</th>
                      <th className="p-4">送貨日期</th>
                      <th className="p-4">內容摘要</th>
                      <th className="p-4 text-right">詳情</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((order, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                        <td className="p-4 font-mono font-bold text-[#c25e00]">{order.orderId}</td>
                        <td className="p-4 font-bold text-gray-800">{order.company}</td>
                        <td className="p-4">{order.deliveryDate ? order.deliveryDate.split('T')[0] : ''}</td>
                        <td className="p-4 text-gray-400 text-xs truncate max-w-[150px]">{order.parsedItems[0] || '無'}</td>
                        <td className="p-4 text-right"><span className="text-xs text-gray-300 underline underline-offset-4 font-bold">VIEW</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden pb-10">
                {filteredOrders.map((order, idx) => (
                  <OrderCard key={idx} order={order} onClick={() => setSelectedOrder(order)} />
                ))}
              </div>
              
              {filteredOrders.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                   <Icons.FileText size={48} className="mb-4 opacity-20" />
                   <p className="font-bold">目前查無訂單，請確認試算表是否有資料。</p>
                   <p className="text-xs mt-2">若是剛下單，請等待約 10 秒後再按重新整理。</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}