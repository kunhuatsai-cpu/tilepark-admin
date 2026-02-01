import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UI } from './components/Icons';
import StatusBadge from './components/StatusBadge';
import ErrorBoundary from './components/ErrorBoundary';
import StocktakeModal from './components/StocktakeModal';
import OrderDetailModal from './components/OrderDetailModal';
import { Utils } from './utils/helpers';
import { API_URL } from './utils/constants';
import { verifyPassword } from './utils/security';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState("");
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [stocktakeLog, setStocktakeLog] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState("");
    const [activeTab, setActiveTab] = useState('received');

    const [currentView, setCurrentView] = useState('orders');
    const [invSearchText, setInvSearchText] = useState("");
    const [invSearchQty, setInvSearchQty] = useState("");
    const [stocktakeTarget, setStocktakeTarget] = useState(null);

    const lastOrderCountRef = useRef(0);
    const isFirstLoadRef = useRef(true);

    const sendBrowserNotification = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'https://lh3.googleusercontent.com/d/1N9nrujoaGkFpdGhsBRgOs_WE-RgQEhU2' });
        }
    };

    const fetchAllData = useCallback(async () => {
        setLoading(true); setApiError(null);
        try {
            const res = await fetch(`${API_URL}?action=getData&t=${Date.now()}`, { redirect: 'follow' });
            const result = await res.json();
            if (result.error) throw new Error(result.error);

            const newOrders = result.orders || [];
            setOrders(newOrders);
            setInventory(result.inventory || []);

            // Smart Redirect Logic
            if (isFirstLoadRef.current) {
                const newCount = newOrders.filter(o => !o.status).length;
                const todayStr = Utils.getTodayStr();
                const todayCount = newOrders.filter(o => o.status === '已排單出貨' && o.deliveryDate === todayStr).length;

                if (newCount > 0) {
                    setActiveTab('received');
                } else if (todayCount > 0) {
                    setActiveTab('today');
                } else {
                    setActiveTab('all');
                }

                lastOrderCountRef.current = newOrders.length;
                isFirstLoadRef.current = false;
            } else if (newOrders.length > lastOrderCountRef.current) {
                const diff = newOrders.length - lastOrderCountRef.current;
                sendBrowserNotification("🔔 新訂單通知", `收到 ${diff} 筆 Tile Park 新訂單，請盡快處理！`);
                lastOrderCountRef.current = newOrders.length;
            }

            const resLog = await fetch(`${API_URL}?action=getStocktakeLog&t=${Date.now()}`, { redirect: 'follow' });
            const resultLog = await resLog.json();
            if (resultLog.log) setStocktakeLog(resultLog.log);

            setLastUpdated(new Date().toLocaleTimeString());
        } catch (error) { console.error("Fetch Error:", error); setApiError("無法讀取雲端數據"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchAllData();
            const interval = setInterval(() => {
                fetchAllData();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [isLoggedIn, fetchAllData]);

    useEffect(() => {
        let res = orders;
        const todayStr = Utils.getTodayStr();

        if (activeTab === 'received') res = res.filter(o => !o.status);
        else if (activeTab === 'today') res = res.filter(o => o.status === '已排單出貨' && o.deliveryDate === todayStr);
        else if (activeTab === 'futures') res = res.filter(o => o.status === '期貨訂單');
        else if (activeTab === 'hold') res = res.filter(o => Utils.safeStr(o.orderType).includes('保留'));
        else if (activeTab === 'confirmed') res = res.filter(o => o.status === '已確認庫存');
        else if (activeTab === 'shipped') res = res.filter(o => o.status === '已排單出貨');

        if (searchTerm) {
            const t = searchTerm.toLowerCase();
            res = res.filter(o => Utils.safeStr(o.company).toLowerCase().includes(t) || Utils.safeStr(o.orderId).toLowerCase().includes(t));
        }
        res.sort((a, b) => {
            if (!a.status && b.status) return -1;
            if (a.status && !b.status) return 1;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        setFilteredOrders(res);
    }, [searchTerm, orders, activeTab]);

    const { groupedInventory, diagnosisData } = useMemo(() => {
        const pendingItems = [];
        orders.forEach(o => {
            const isHold = Utils.safeStr(o.orderType).includes('保留');
            const isShipped = o.status === '已排單出貨';
            if (isHold && !isShipped) {
                const itemLines = Utils.parseItemsStr(o.items);
                itemLines.forEach(item => {
                    let qty = Utils.parseQty(item.qty);
                    const cleanFullLine = Utils.cleanFuzzy(item.name);
                    const tokens = item.name.split(/[\s,]+/);
                    const cleanTokens = tokens.map(t => Utils.cleanFuzzy(t)).filter(t => t.length > 1);
                    if (qty > 0) {
                        pendingItems.push({
                            company: o.company,
                            qty: qty,
                            originalName: item.name,
                            cleanName: cleanFullLine,
                            cleanTokens: cleanTokens,
                            orderId: o.orderId,
                            orderType: o.orderType,
                            matched: false
                        });
                    }
                });
            }
        });

        const searchTerms = invSearchText.split(/\s+/).filter(t => t.trim() !== "").map(t => Utils.cleanFuzzy(t));
        const minQty = parseFloat(invSearchQty);
        const hasMinQty = !isNaN(minQty);
        const hasSearch = searchTerms.length > 0 || hasMinQty;

        const allGroups = inventory.reduce((acc, curr) => {
            const qty = Utils.parseQty(curr.qty);
            const key = `${curr.id}_${curr.name}`;
            if (!acc[key]) {
                const cleanId = Utils.cleanFuzzy(curr.id);
                const cleanName = Utils.cleanFuzzy(curr.name);
                let totalRes = 0;
                let detailsRes = [];
                pendingItems.forEach(pItem => {
                    const pClean = pItem.cleanName;
                    const reverseIDMatch = cleanId.length > 1 && pClean.includes(cleanId);
                    const reverseNameMatch = cleanName.length > 1 && pClean.includes(cleanName);
                    const normalMatch = (cleanId.length > 1 && cleanId.includes(pClean));
                    const tokenMatch = pItem.cleanTokens.some(t => t === cleanId);
                    if (reverseIDMatch || reverseNameMatch || normalMatch || tokenMatch) {
                        totalRes += pItem.qty;
                        detailsRes.push(pItem);
                        pItem.matched = true;
                    }
                });
                acc[key] = {
                    id: curr.id,
                    name: curr.name,
                    spec: curr.spec,
                    packing: curr.packing,
                    usage: curr.usage,
                    totalQty: 0,
                    reservedQty: totalRes,
                    reserveDetails: detailsRes,
                    batches: []
                };
            }
            acc[key].totalQty += qty;
            if (qty > 0) acc[key].batches.push({ lot: Utils.formatBatch(curr.lot), qty: qty });
            return acc;
        }, {});

        const results = Object.values(allGroups).filter(group => {
            if (group.totalQty <= 0) return false;
            if (!hasSearch) return false;
            let matchText = true;
            let matchQty = true;
            if (searchTerms.length > 0) {
                const cId = Utils.cleanFuzzy(group.id);
                const cName = Utils.cleanFuzzy(group.name);
                const fullStr = cId + cName;

                matchText = searchTerms.every(term => {
                    return fullStr.includes(term);
                });
            }
            if (hasMinQty) {
                matchQty = (group.totalQty - group.reservedQty) >= minQty;
            }
            return matchText && matchQty;
        });

        return {
            groupedInventory: results.sort((a, b) => b.totalQty - a.totalQty),
            diagnosisData: pendingItems
        };
    }, [inventory, orders, invSearchText, invSearchQty]);

    const sendCommand = async (p) => {
        try {
            await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ payload: JSON.stringify(p) }) });
            return true;
        } catch (e) {
            return false;
        }
    };

    const handleUpdateDetails = async (id, details) => {
        const ok = await sendCommand({ action: 'updateDetails', orderId: id, ...details });
        if (ok) {
            setOrders(prev => prev.map(o => o.orderId === id ? { ...o, ...details } : o));
            return true;
        }
        return false;
    };

    const handleStatusUpdate = async (ids, status) => {
        const targetIds = ids || Array.from(selectedIds);
        const action = status === 'delete' ? 'delete' : 'updateStatus';
        if (status === 'delete') {
            setOrders(prev => prev.filter(o => !targetIds.includes(o.orderId)));
            if (selectedOrder && targetIds.includes(selectedOrder.orderId)) setSelectedOrder(null);
        } else {
            setOrders(prev => prev.map(o => targetIds.includes(o.orderId) ? { ...o, status } : o));
            if (selectedOrder && targetIds.includes(selectedOrder.orderId)) setSelectedOrder(p => p ? ({ ...p, status }) : null);
        }
        setSelectedIds(new Set());
        const success = await sendCommand({ action, status, ids: targetIds });
        if (!success) {
            fetchAllData();
            alert("操作失敗，請檢查網路連線");
        }
    };

    const handleReportStocktake = async (data) => {
        setStocktakeTarget(null);
        const success = await sendCommand({ action: 'addStocktake', ...data });
        if (success) {
            alert("✅ 盤點紀錄已送出！請至「盤點稽核」頁面查看。");
            fetchAllData();
        } else {
            alert("❌ 回報失敗");
        }
    };

    const handleResolveStocktake = async (item) => {
        if (!confirm("確認已在 ERP 修正此庫存？")) return;
        const success = await sendCommand({ action: 'resolveStocktake', productId: item.productId, batch: item.batch, timestamp: item.timestamp });
        if (success) {
            fetchAllData();
        } else {
            alert("結案失敗");
        }
    };

    const isUrgent = (order) => {
        if (!Utils.safeStr(order.orderType).includes('保留')) return false;
        if (!order.deliveryDate) return false;
        const delivery = new Date(order.deliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const limit = new Date();
        limit.setDate(today.getDate() + 30);
        if (isNaN(delivery.getTime())) return false;
        return delivery <= limit;
    };

    if (!isLoggedIn) {
        return (
            <div className="fixed inset-0 bg-[#111] flex items-center justify-center p-4 z-50">
                <div className="w-full max-w-sm bg-white/5 p-10 rounded-[2rem] border border-white/10 shadow-2xl text-center font-sans font-bold">
                    <h1 className="text-3xl font-black text-white tracking-[0.2em] mb-10 font-sans">TILE PARK</h1>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const isValid = await verifyPassword(password);
                        if (isValid) {
                            setIsLoggedIn(true);
                            if ('Notification' in window) Notification.requestPermission();
                        } else {
                            alert("密碼錯誤");
                        }
                    }} className="space-y-6">
                        <input type="password" placeholder="PASSWORD" className="w-full px-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-white text-center tracking-[1em] focus:border-orange-500 outline-none transition-all font-mono" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
                        <button type="submit" className="w-full bg-[#c25e00] text-white py-4 rounded-2xl font-black tracking-widest hover:bg-orange-600 transition-all uppercase font-bold shadow-lg">登入</button>
                    </form>
                </div>
            </div>
        );
    }

    const todayStr = Utils.getTodayStr();
    const newOrdersCount = orders.filter(o => !o.status).length;
    const todayOrdersCount = orders.filter(o => o.status === '已排單出貨' && o.deliveryDate === todayStr).length;
    const futuresCount = orders.filter(o => o.status === '期貨訂單').length;

    const tabs = [
        { id: 'received', label: '🔥 待處理', count: newOrdersCount },
        { id: 'today', label: '🚚 今日出貨', count: todayOrdersCount },
        { id: 'futures', label: '⏳ 期貨', count: futuresCount },
        { id: 'all', label: '全部', count: orders.length },
        { id: 'hold', label: '保留單', count: orders.filter(o => Utils.safeStr(o.orderType).includes('保留')).length },
        { id: 'confirmed', label: '已確認', count: orders.filter(o => o.status === '已確認庫存').length },
        { id: 'shipped', label: '已出貨', count: orders.filter(o => o.status === '已排單出貨').length },
    ];

    return (
        <div className="fixed inset-0 flex flex-col md:flex-row font-sans overflow-hidden bg-gray-100">
            <aside className="hidden md:flex w-64 bg-[#1a1a1a] text-white flex-col p-6 shrink-0 h-full">
                <div className="mb-10 font-black text-xl">TILE PARK <span className="block text-[10px] text-orange-500">Warehouse V17.26</span></div>
                <nav className="flex flex-col gap-2">
                    <button onClick={() => setCurrentView('orders')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm ${currentView === 'orders' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}><UI.File size={18} /> 訂單管理</button>
                    <button onClick={() => { setCurrentView('inventory'); setInvSearchText(""); setInvSearchQty(""); }} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm ${currentView === 'inventory' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}><UI.Box size={18} /> 庫存查詢</button>
                    <button onClick={() => setCurrentView('stocktake')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm ${currentView === 'stocktake' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
                        <div className="relative"><UI.Audit size={18} />{stocktakeLog.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}</div> 盤點稽核
                    </button>
                    <button onClick={() => setCurrentView('diagnosis')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm ${currentView === 'diagnosis' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}><UI.Bug size={18} /> 系統診斷</button>
                </nav>
                <div className="mt-auto text-[10px] text-gray-500 text-center flex flex-col gap-1">
                    <span>{lastUpdated}</span>
                    <span className="text-[9px] text-gray-600 flex items-center justify-center gap-1"><UI.Clock size={10} /> 30秒自動更新</span>
                </div>
            </aside>

            <div className="md:hidden bg-[#1a1a1a] flex flex-col shrink-0 z-50">
                <div className="grid grid-cols-4 bg-[#2a2a2a] text-gray-400 text-sm font-bold">
                    <button onClick={() => setCurrentView('orders')} className={`py-3 flex justify-center items-center ${currentView === 'orders' ? 'bg-orange-600 text-white' : ''}`}><UI.File size={16} /></button>
                    <button onClick={() => setCurrentView('inventory')} className={`py-3 flex justify-center items-center ${currentView === 'inventory' ? 'bg-teal-600 text-white' : ''}`}><UI.Box size={16} /></button>
                    <button onClick={() => setCurrentView('stocktake')} className={`py-3 flex justify-center items-center relative ${currentView === 'stocktake' ? 'bg-purple-600 text-white' : ''}`}><UI.Audit size={16} />{stocktakeLog.length > 0 && <span className="absolute top-2 right-6 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
                    <button onClick={() => setCurrentView('diagnosis')} className={`py-3 flex justify-center items-center ${currentView === 'diagnosis' ? 'bg-red-600 text-white' : ''}`}><UI.Bug size={16} /></button>
                </div>
            </div>

            <main className="flex-1 flex flex-col min-h-0 relative bg-gray-100">
                {currentView === 'orders' && (
                    <div className="flex flex-col h-full">
                        <header className="flex justify-between items-center p-4 bg-white border-b shadow-sm flex-none">
                            <h2 className="text-xl font-bold text-gray-800">訂單管理</h2>
                            <button onClick={fetchAllData} disabled={loading} className={`p-2 rounded border transition-all ${loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700 active:scale-95'}`}><UI.Refresh className={loading ? 'animate-spin-fast' : ''} /></button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24 min-h-0">
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                                {tabs.map(tab => {
                                    let activeClass = 'bg-white text-gray-600 border';
                                    let badgeColor = 'bg-gray-100 text-gray-500';

                                    if (activeTab === tab.id) {
                                        if (tab.id === 'received') {
                                            activeClass = 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-100';
                                            badgeColor = 'bg-white/20 text-white';
                                        } else if (tab.id === 'today') {
                                            activeClass = 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-100';
                                            badgeColor = 'bg-white/20 text-white';
                                        } else if (tab.id === 'futures') {
                                            activeClass = 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-100';
                                            badgeColor = 'bg-white/20 text-white';
                                        } else {
                                            activeClass = 'bg-orange-600 text-white border-orange-700 shadow-md';
                                            badgeColor = 'bg-white/20 text-white';
                                        }
                                    } else {
                                        if (tab.id === 'received' && tab.count > 0) {
                                            activeClass = 'bg-white text-red-600 border-red-200 animate-pulse';
                                            badgeColor = 'bg-red-100 text-red-600';
                                        } else if (tab.id === 'today' && tab.count > 0) {
                                            activeClass = 'bg-white text-blue-600 border-blue-200';
                                            badgeColor = 'bg-blue-100 text-blue-600';
                                        } else if (tab.id === 'futures' && tab.count > 0) {
                                            activeClass = 'bg-white text-purple-600 border-purple-200';
                                            badgeColor = 'bg-purple-100 text-purple-600';
                                        }
                                    }

                                    return (
                                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedIds(new Set()) }} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${activeClass}`}>
                                            {tab.label}
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] min-w-[1.5em] text-center ${badgeColor}`}>{tab.count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredOrders.map(o => {
                                    const previewItems = Utils.parseItemsStr(o.items);
                                    const showItems = previewItems.slice(0, 3);
                                    const moreCount = previewItems.length - 3;
                                    const isNew = !o.status;
                                    const isFutures = o.status === '期貨訂單';

                                    // 🌟 點擊整個卡片選取，點選按鈕查看詳情
                                    const isSelected = selectedIds.has(o.orderId);

                                    return (
                                        <div key={o.orderId} onClick={() => setSelectedOrder(o)} className={`bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-3 active:scale-[0.99] transition-all cursor-pointer relative group ${isSelected ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-gray-100 hover:border-orange-300'} ${isNew ? 'ring-1 ring-red-100' : ''} ${isFutures ? 'border-purple-200 bg-purple-50/20' : ''}`}>

                                            {/* 🔥 新單 Tag */}
                                            {isNew && <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg flex items-center gap-1 animate-pulse-fast"><UI.Fire size={10} /> NEW</div>}

                                            {/* Header: ID & Status (點擊 ID 可切換選取狀態) */}
                                            <div className="flex justify-between items-start">
                                                <div
                                                    className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${isSelected ? 'bg-orange-200 text-orange-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // 阻止冒泡到卡片點擊
                                                        const n = new Set(selectedIds);
                                                        n.has(o.orderId) ? n.delete(o.orderId) : n.add(o.orderId);
                                                        setSelectedIds(n);
                                                    }}
                                                >
                                                    {/* 🌟 隱藏原本醜醜的 checkbox，改用 ID 點擊切換狀態 */}
                                                    <span className="font-mono font-bold text-sm">#{o.orderId}</span>
                                                    {isSelected && <UI.Check size={14} className="text-orange-600" />}
                                                </div>
                                                <StatusBadge status={o.status} />
                                            </div>

                                            {/* Main: Company */}
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg truncate leading-tight mb-1">{o.company}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{o.orderType}</span>
                                                    {isUrgent(o) && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">急件</span>}
                                                </div>
                                            </div>

                                            {/* V17.16 優化: 品項預覽區塊 (只顯示 ID + 品名 + 數量) */}
                                            <div className="bg-gray-50 rounded-lg p-2 text-xs space-y-1.5 border border-gray-100">
                                                {showItems.map((it, i) => (
                                                    <div key={i} className="flex justify-between items-center text-gray-600">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            {it.id && <span className="shrink-0 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">{it.id}</span>}
                                                            <span className="truncate font-medium">{it.name}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-gray-800 shrink-0 ml-2">x {it.qty}{it.unit}</span>
                                                    </div>
                                                ))}
                                                {moreCount > 0 && <div className="text-center text-[10px] text-gray-400 font-bold mt-1">...還有 {moreCount} 項</div>}
                                            </div>

                                            {/* Footer: Info & Action */}
                                            <div className="flex justify-between items-end pt-2 border-t border-gray-50 mt-auto">
                                                <div className="text-xs text-gray-400 space-y-0.5">
                                                    <div className="flex items-center gap-1"><UI.User size={12} /> {o.contactName || '未填寫'}</div>
                                                    <div className="flex items-center gap-1"><UI.Clock size={12} /> {Utils.formatDateShort(o.timestamp)}</div>
                                                </div>
                                                {/* 點擊整個卡片即可查看，這裡保留按鈕是為了視覺引導，但其實整個卡片都可點 */}
                                                <button className="px-3 py-1.5 bg-white text-xs font-bold text-gray-600 rounded-lg border shadow-sm hover:bg-gray-50 transition-colors">
                                                    查看詳情
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                        </div>
                        {selectedIds.size > 0 && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-xl flex gap-4 border z-20"><span className="font-bold">{selectedIds.size} selected</span><button onClick={() => handleStatusUpdate(null, '已確認庫存')} className="text-teal-600 font-bold">確認庫存</button><button onClick={() => handleStatusUpdate(null, '已排單出貨')} className="text-blue-600 font-bold">排單出貨</button></div>}
                    </div>
                )}

                {currentView === 'inventory' && (
                    <div className="flex flex-col h-full">
                        <header className="bg-white border-b p-4 shadow-sm flex-none z-10">
                            <div className="flex gap-4 max-w-3xl">
                                <div className="relative flex-1"><UI.Search className="absolute left-3 top-3 text-gray-400" /><input type="text" placeholder="搜尋品名/貨號..." className="w-full pl-10 p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={invSearchText} onChange={e => setInvSearchText(e.target.value)} autoFocus /></div>
                                <div className="relative w-24 md:w-32"><UI.Filter className="absolute left-3 top-3 text-gray-400" /><input type="number" placeholder="數量..." className="w-full pl-10 p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" value={invSearchQty} onChange={e => setInvSearchQty(e.target.value)} /></div>
                            </div>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar pb-24 min-h-0">
                            {groupedInventory.length === 0 ? (
                                <div className="text-center py-20 text-gray-400"><UI.Box size={48} className="mx-auto mb-4 opacity-20" /><p>無符合資料</p></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                                    {groupedInventory.map((item, idx) => (
                                        <div key={idx} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${item.reservedQty > 0 ? 'border-orange-300 ring-1 ring-orange-100' : ''}`}>
                                            {/* Header Section */}
                                            <div className="p-4 border-b bg-gray-50/50 flex justify-between items-start">
                                                <div>
                                                    <span className="bg-teal-100 text-teal-800 text-[10px] px-2 py-1 rounded font-mono font-bold">{item.id}</span>
                                                    <h3 className="font-bold text-lg mt-1 break-words">{item.name}</h3>
                                                    <div className="text-[10px] text-gray-500 mt-1 space-x-2"><span>規:{item.spec}</span><span>包:{item.packing}</span><span>用:{item.usage}</span></div>
                                                </div>
                                                <div className="text-right shrink-0 ml-2"><span className="text-xs text-gray-400 font-bold block">TOTAL</span><span className="text-2xl font-black text-teal-600">{item.totalQty.toLocaleString()}</span></div>
                                            </div>

                                            {/* Stats Section */}
                                            <div className="p-3 bg-white flex justify-between items-center border-b">
                                                <div className="flex flex-col"><span className="text-[10px] text-gray-400 font-bold">RESERVED</span><span className={`font-mono font-bold ${item.reservedQty > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{item.reservedQty > 0 ? `-${item.reservedQty}` : '0'}</span></div>
                                                <div className="flex flex-col text-right"><span className="text-[10px] text-gray-400 font-bold">AVAILABLE</span><span className="font-mono text-xl font-black text-gray-800">{(item.totalQty - item.reservedQty).toLocaleString()}</span></div>
                                            </div>

                                            {/* Reserved Details */}
                                            {item.reservedQty > 0 && (
                                                <div className="bg-orange-50 p-3 border-b border-orange-100 space-y-1">
                                                    <div className="text-[10px] font-bold text-orange-400 flex items-center gap-1"><UI.Lock size={10} /> 保留明細</div>
                                                    {item.reserveDetails.map((det, dIdx) => (
                                                        <div key={dIdx} className="flex justify-between text-xs text-orange-900"><span>{det.company} ({det.orderId})</span><span className="font-mono font-bold">{det.qty}</span></div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Batch List with Stocktake Button */}
                                            <div className="p-3 bg-gray-50 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {item.batches.map((b, bi) => (
                                                    <div key={bi} className="flex justify-between items-center text-xs text-gray-600 border-b border-gray-100 last:border-0 pb-2 pt-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono font-bold">{b.lot || 'No Batch'}</span>
                                                            <span className="font-mono font-bold text-teal-700 text-sm">{b.qty}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setStocktakeTarget({ product: item, batch: b })}
                                                            className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-purple-600 border border-transparent hover:border-purple-200 px-2 py-1 rounded transition-all bg-white shadow-sm"
                                                        >
                                                            <UI.Edit size={10} /> 盤點
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'stocktake' && (
                    <div className="flex flex-col h-full">
                        <header className="flex justify-between items-center p-4 bg-white border-b shadow-sm flex-none">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><UI.Audit className="text-purple-600" /> 盤點待辦事項 (待處理)</h2>
                            <button onClick={fetchAllData} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><UI.Refresh size={18} /></button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24 min-h-0 bg-gray-50">
                            {stocktakeLog.length === 0 ? <div className="text-center py-20 text-gray-400">目前沒有待修正的庫存</div> : (
                                <div className="space-y-4">
                                    {stocktakeLog.map((log, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-l-4 border-l-purple-500 shadow-sm flex justify-between items-start">
                                            <div>
                                                <div className="text-xs text-gray-400 mb-1">{new Date(log.timestamp).toLocaleString()}</div>
                                                <div className="font-bold text-gray-800 mb-1">{log.productName}</div>
                                                <div className="flex gap-2 mb-2">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{log.productId}</span>
                                                    <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-mono font-bold">Batch: {log.batch}</span>
                                                </div>
                                                <div className="text-sm flex items-center gap-3">
                                                    <span className="text-gray-400 line-through">系統: {log.systemQty}</span>
                                                    <span className="text-purple-600 font-bold text-lg">實際: {log.actualQty}</span>
                                                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">差異 {log.diff > 0 ? '+' + log.diff : log.diff}</span>
                                                </div>
                                                {log.note && <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">備註: {log.note}</div>}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-bold">狀態: 待處理</span>
                                                <button onClick={() => handleResolveStocktake(log)} className="bg-white border-2 border-purple-600 text-purple-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-600 hover:text-white shadow-sm active:scale-95 transition-all flex items-center gap-1">
                                                    <UI.Check size={14} /> 點擊結案
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'diagnosis' && (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100 pb-24 min-h-0">
                        <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><UI.Bug className="text-red-500" /> 系統保留單診斷器</h2>
                        <div className="flex justify-end mb-4"><button onClick={fetchAllData} disabled={loading} className={`p-2 rounded border bg-white shadow-sm flex items-center gap-2 font-bold text-sm ${loading ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50 active:scale-95'}`}><UI.Refresh className={loading ? 'animate-spin-fast' : ''} /> 重新整理數據</button></div>
                        <div className="space-y-2">
                            {diagnosisData.length === 0 ? (
                                <div className="text-center p-10 text-gray-400 font-bold">目前沒有偵測到任何保留單</div>
                            ) : (
                                diagnosisData.map((item, idx) => (
                                    <div key={idx} className={`p-4 rounded-lg border flex flex-col md:flex-row justify-between gap-4 ${item.matched ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded text-white ${item.matched ? 'bg-green-600' : 'bg-red-600'}`}>
                                                    {item.matched ? 'MATCHED' : 'UNMATCHED'}
                                                </span>
                                                <span className="font-mono font-bold text-gray-700">#{item.orderId}</span>
                                                <span className="text-xs text-gray-500">({item.company})</span>
                                            </div>
                                            <div className="font-bold text-gray-800">{item.originalName}</div>
                                            <div className="font-mono text-xs text-gray-400 break-all">全句清洗: {item.cleanName}</div>
                                        </div>
                                        <div className="text-right md:w-32 flex flex-col justify-center">
                                            <span className="text-xs text-gray-400 font-bold">數量 QTY</span>
                                            <span className="text-2xl font-black text-gray-800">{item.qty}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            {stocktakeTarget && <StocktakeModal product={stocktakeTarget.product} batch={stocktakeTarget.batch} onClose={() => setStocktakeTarget(null)} onSubmit={handleReportStocktake} />}

            {selectedOrder && <OrderDetailModal order={selectedOrder} inventory={inventory} onClose={() => setSelectedOrder(null)} onUpdateStatus={handleStatusUpdate} onUpdateDetails={handleUpdateDetails} onDelete={ids => handleStatusUpdate(ids, 'delete')} isProcessing={loading} />}
        </div>
    );
}

export default App;
