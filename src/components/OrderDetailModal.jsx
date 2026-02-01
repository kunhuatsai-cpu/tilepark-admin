/* eslint-disable react/prop-types */
import React, { useState, useRef } from 'react';
import { UI } from './Icons';
import { Utils, compressImage, groupMatches } from '../utils/helpers';
import { API_URL } from '../utils/constants';
import ErrorBoundary from './ErrorBoundary';

const OrderDetailModal = ({ order, inventory, onClose, onUpdateStatus, onUpdateDetails, onDelete, isProcessing }) => {
    if (!order) return null;
    // Status Logic
    const isFutures = order.status === '期貨訂單';
    const isStockConfirmed = order.status === '已確認庫存';
    const isShipped = order.status === '已排單出貨';

    const [orderType, setOrderType] = useState(Utils.safeStr(order.orderType));
    const [internalNote, setInternalNote] = useState(Utils.safeStr(order.internalNote));
    const [factoryEta, setFactoryEta] = useState(Utils.safeStr(order.factoryEta));
    const [deliveryDate, setDeliveryDate] = useState(Utils.safeDate(order.deliveryDate));
    const [siteContact, setSiteContact] = useState(Utils.safeStr(order.siteContact));
    const [sitePhone, setSitePhone] = useState(Utils.safeStr(order.sitePhone));
    const [address, setAddress] = useState(Utils.safeStr(order.address || order.shippingAddress));
    const [trackingNumber, setTrackingNumber] = useState(Utils.safeStr(order.trackingNumber));
    const [shippingMethod, setShippingMethod] = useState(Utils.safeStr(order.shippingMethod));
    const [receiptUrl, setReceiptUrl] = useState(Utils.safeStr(order.receiptUrl));
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [editableItems, setEditableItems] = useState(() => {
        try {
            return Utils.parseItemsStr(order.items).map(i => ({ ...i, originalQty: i.qty, currentQty: i.qty, note: '' }));
        } catch (e) { return [{ name: "解析錯誤", originalQty: '0', currentQty: '0', unit: '', note: '' }]; }
    });

    // 🌟 V17.25 升級版匹配邏輯：ID 優先 + 雙向模糊搜尋 + 關鍵字拆分Fallback
    const getProductMatches = (item) => {
        if (!Array.isArray(inventory) || inventory.length === 0) return [];

        // 1. 強力 ID 比對 (如果有抓到 ID)
        if (item.id) {
            const targetId = Utils.cleanFuzzy(item.id);
            const idMatches = inventory.filter(inv => Utils.cleanFuzzy(inv.id) === targetId);
            if (idMatches.length > 0) {
                return groupMatches(idMatches);
            }
        }

        // 2. 關鍵字比對 (ID 比對失敗後的 Fallback)
        const targetName = item.name;
        const targetCleaned = Utils.cleanFuzzy(targetName);

        let matches = inventory.filter(inv => {
            const cleanID = Utils.cleanFuzzy(inv.id);
            const cleanName = Utils.cleanFuzzy(inv.name);

            // A. 訂單品名包含庫存品名 (Short match Long)
            if (cleanName.includes(targetCleaned)) return true;

            // B. 庫存品名包含訂單品名 (Long match Short) - 修正後的邏輯
            if (targetCleaned.length > 2 && targetCleaned.includes(cleanName)) return true;

            // C. ID 模糊比對
            if (cleanID.length > 2 && targetCleaned.includes(cleanID)) return true;

            return false;
        });

        // 3. 🌟 Token Match (終極手段)
        // 如果前面都沒抓到，嘗試用「空格」拆分品名，拿第一個關鍵字(通常是型號)去搜
        if (matches.length === 0) {
            const firstToken = targetCleaned.split(/[\s\-_]+/)[0]; // 抓第一個詞
            if (firstToken.length > 2) {
                matches = inventory.filter(inv => {
                    const cleanName = Utils.cleanFuzzy(inv.name);
                    const cleanID = Utils.cleanFuzzy(inv.id);
                    return cleanName.includes(firstToken) || cleanID.includes(firstToken);
                });
            }
        }

        return groupMatches(matches).filter(g => g.total > 0);
    };

    const handleUpdateItemQty = (index, value) => {
        const updated = [...editableItems]; updated[index].currentQty = value; setEditableItems(updated);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setIsUploading(true);
        try {
            const compressedBase64 = await compressImage(file);
            const payload = { action: 'uploadReceipt', orderId: order.orderId, fileData: compressedBase64 };
            const response = await fetch(API_URL, { method: 'POST', body: new URLSearchParams({ payload: JSON.stringify(payload) }), redirect: 'follow' });
            if (!response.ok) throw new Error("Network response was not ok");
            const result = await response.json();
            if (result.result === 'success' && result.url) { setReceiptUrl(result.url); alert("✅ 上傳成功！連結已自動填入。"); }
            else { throw new Error(result.message || "上傳未回傳連結，請稍後重試"); }
        } catch (error) {
            console.error(error);
            if (error.message && (error.message.includes("權限") || error.message.includes("permission") || error.message.includes("DriveApp"))) { alert("❌ 上傳失敗：Google Drive 權限不足。\n\n請至 Apps Script 後台執行 'manualSetupDriveFolder' 函式以完成授權。"); }
            else { alert(`❌ 上傳失敗: ${error.message || "請檢查網路或重試"}`); }
        } finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleSave = async () => {
        setIsSavingDetails(true);
        try {
            const itemsString = editableItems.map(i => {
                const unitPart = i.unit ? i.unit : '';
                const notePart = i.note ? ` ${i.note}` : '';
                const idPart = i.id ? `[${i.id}] ` : ''; // 補回 ID
                return `${idPart}${i.name} x ${i.currentQty}${unitPart}${notePart}`;
            }).join('\n');
            const success = await onUpdateDetails(order.orderId, { orderType, internalNote, factoryEta, deliveryDate, siteContact, sitePhone, address, items: itemsString, trackingNumber, shippingMethod, receiptUrl });
            if (success) { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); }
        } finally { setIsSavingDetails(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in font-sans text-gray-800">
            <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] h-[95dvh] relative">
                <div className={`p-4 flex justify-between items-center shrink-0 text-white ${isShipped ? 'bg-blue-600' : isFutures ? 'bg-purple-600' : isStockConfirmed ? 'bg-teal-600' : 'bg-[#222]'}`}>
                    <div className="flex flex-col"><span className="text-[10px] uppercase font-bold opacity-70 tracking-widest font-sans">Warehouse V17.26</span><h2 className="text-xl font-bold font-mono">訂單 #{order.orderId}</h2></div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><UI.Close size={24} /></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50 flex-1 font-sans pb-20">
                    <ErrorBoundary onClose={onClose}>
                        {/* 🌟 狀態切換區塊 (三欄式互斥) */}
                        <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* 期貨選項 */}
                            <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${isFutures ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 hover:border-gray-300 text-gray-500'}`}>
                                <div className="mb-2">{isFutures ? <UI.Check size={28} /> : <UI.Time size={28} className="opacity-30" />}</div>
                                <div className="font-bold">期貨訂單</div>
                                <div className="text-[10px] opacity-70">確認無庫存，等待入倉</div>
                                <input type="checkbox" className="hidden" checked={isFutures} onChange={() => onUpdateStatus([order.orderId], isFutures ? '' : '期貨訂單')} disabled={isProcessing} />
                            </label>

                            {/* 庫存選項 */}
                            <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${isStockConfirmed ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-100 hover:border-gray-300 text-gray-500'}`}>
                                <div className="mb-2">{isStockConfirmed ? <UI.Check size={28} /> : <UI.DB size={28} className="opacity-30" />}</div>
                                <div className="font-bold">已確認庫存</div>
                                <div className="text-[10px] opacity-70">現貨充足，已保留</div>
                                <input type="checkbox" className="hidden" checked={isStockConfirmed} onChange={() => onUpdateStatus([order.orderId], isStockConfirmed ? '' : '已確認庫存')} disabled={isProcessing} />
                            </label>

                            {/* 出貨選項 */}
                            <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${isShipped ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-300 text-gray-500'}`}>
                                <div className="mb-2">{isShipped ? <UI.Check size={28} /> : <UI.Truck size={28} className="opacity-30" />}</div>
                                <div className="font-bold">已排單出貨</div>
                                <div className="text-[10px] opacity-70">安排物流出貨</div>
                                <input type="checkbox" className="hidden" checked={isShipped} onChange={() => onUpdateStatus([order.orderId], isShipped ? '' : '已排單出貨')} disabled={isProcessing} />
                            </label>
                        </div>

                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-6">
                            <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-4"><UI.Truck size={18} /> 物流與簽單管理 (前台可見)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="block text-xs font-bold text-gray-400 mb-1">貨運單號 (Tracking No.)</label><input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 outline-none font-bold font-mono" placeholder="輸入單號..." /></div>
                                <div><label className="block text-xs font-bold text-gray-400 mb-1">出貨方式 (Method)</label><select value={shippingMethod} onChange={e => setShippingMethod(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 outline-none font-bold"><option value="">選擇方式...</option><option value="新竹物流">新竹物流</option><option value="大榮貨運">大榮貨運</option><option value="黑貓宅急便">黑貓宅急便</option><option value="回頭車">回頭車</option><option value="公司車">公司車</option><option value="自取">自取</option></select></div>
                                <div><label className="block text-xs font-bold text-gray-400 mb-1">簽單/照片 (Receipt)</label><div className="flex gap-2 items-center"><input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} /><div className="flex-1 relative"><input type="text" value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 outline-none" placeholder="連結或點擊右側上傳..." />{receiptUrl && <a href={receiptUrl} target="_blank" className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"><UI.Link size={16} /></a>}</div><button onClick={() => fileInputRef.current.click()} disabled={isUploading} className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1 text-white shadow-sm transition-all ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600 active:scale-95'}`}>{isUploading ? <UI.Loader size={14} className="animate-spin" /> : <UI.File size={14} />} {isUploading ? '上傳中' : '上傳檔案'}</button></div></div>
                            </div>
                        </div>

                        <div className="bg-white border rounded-xl p-5 mb-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2"><UI.File size={18} className="text-gray-400" /> 基本資料</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-400 mb-1">預計出貨日</label><input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:border-orange-500 outline-none font-bold" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 mb-1">訂單分類</label><input type="text" value={orderType} onChange={e => setOrderType(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:border-orange-500 outline-none font-bold" /></div>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-400 mb-1">工廠交期 (ETA)</label><input type="text" value={factoryEta} onChange={e => setFactoryEta(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:border-orange-500 outline-none font-bold" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 mb-1">內部備註</label><textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 h-24 focus:border-orange-500 outline-none"></textarea></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2"><UI.User size={18} className="text-gray-400" /> 收貨資訊 (可編輯)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-400 mb-1">現場聯絡人</label><input type="text" value={siteContact} onChange={e => setSiteContact(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 outline-none font-bold" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 mb-1">現場電話</label><input type="text" value={sitePhone} onChange={e => setSitePhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold text-gray-800 font-mono" /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-400 mb-1">送貨地址</label><input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold text-gray-800" /></div>
                                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-600 border border-blue-100 flex items-start gap-2"><UI.Info size={14} className="mt-0.5 shrink-0" />提示：修改此處資訊後按下「儲存」，系統將更新訂單的收貨資料。</div>
                            </div>
                        </div>
                        <section className="mb-8 font-sans">
                            <div className="flex justify-between items-center mb-4 px-1">
                                <h3 className="text-xs font-black uppercase tracking-widest text-orange-600 font-bold font-sans">訂單商品與庫存批號對照</h3>
                                <div className="flex items-center gap-2 text-[10px] text-gray-400"><div className={`w-2.5 h-2.5 rounded-full ${inventory.length > 0 ? 'bg-green-500 shadow-sm' : 'bg-red-500 animate-pulse'}`}></div>A06REPORT 已同步: {inventory.length} 筆</div>
                            </div>
                            <div className="space-y-6">
                                {editableItems.map((item, idx) => {
                                    // 🌟 V17.25 修正：將整個 item 物件傳入，而不只是 item.name
                                    const matches = getProductMatches(item);
                                    const currentNeed = Utils.parseQty(item.currentQty);
                                    return (
                                        <div key={idx} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:border-orange-300 transition-all font-sans">
                                            <div className="p-4 bg-gray-50 border-b flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-gray-800">
                                                <div className="flex-1 min-w-0 font-sans">
                                                    <div className="text-[15px] font-black text-gray-900 leading-tight mb-1">{item.name}</div>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium"><UI.Info size={12} /> 訂單原文: {item.originalName}</div>
                                                </div>
                                                <div className="flex items-center gap-6 bg-white p-2 rounded-lg border border-gray-200 shadow-inner font-sans shrink-0">
                                                    <div className="flex flex-col items-center px-4 border-r border-gray-100"><span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">原始下單量</span><span className="font-mono text-base font-black text-gray-800">{item.originalQty} <span className="text-[10px] font-normal">{item.unit}</span></span></div>
                                                    <div className="flex flex-col items-center px-4"><span className="text-[9px] font-bold text-orange-600 uppercase mb-0.5 font-bold">客服調整數</span><div className="flex items-center gap-1.5 font-sans"><input type="number" value={item.currentQty} onChange={(e) => handleUpdateItemQty(idx, e.target.value)} className="w-16 p-1 border border-orange-300 rounded text-base font-black text-center outline-none bg-orange-50 focus:ring-2 focus:ring-orange-200 text-orange-700" /><span className="text-[11px] font-bold text-gray-500">{item.unit}</span></div></div>
                                                </div>
                                            </div>
                                            <div className="p-4 font-sans">
                                                {matches.length > 0 ? (
                                                    <div className="grid grid-cols-1 gap-4 font-sans">
                                                        {matches.map((group, gIdx) => (
                                                            <div key={gIdx} className="border border-teal-100 bg-teal-50/10 rounded-lg p-3 font-sans">
                                                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-teal-100">
                                                                    <div className="flex flex-col"><div className="flex items-center gap-2 mb-1"><span className="font-mono text-[11px] font-black bg-teal-600 text-white px-1.5 py-0.5 rounded shadow-sm">{group.id}</span><span className="text-[13px] font-bold text-gray-700 truncate max-w-[200px]">{group.name}</span></div><div className="text-[10px] text-gray-400 font-medium">規格: {group.spec || '標規'}</div></div>
                                                                    <div className="text-right"><span className="text-[10px] text-gray-400 block uppercase font-bold tracking-tighter">總剩餘庫存</span><span className={`text-xl font-black ${group.total < currentNeed ? 'text-red-500 underline' : 'text-teal-600'}`}>{group.total}</span></div>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-sans">
                                                                    {group.lots.length > 0 ? group.lots.map((lot, lIdx) => (
                                                                        <div key={lIdx} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col hover:border-teal-400 transition-colors group font-sans">
                                                                            <span className="text-[9px] text-gray-400 font-bold uppercase mb-1 group-hover:text-teal-500 tracking-wider">Batch 批號</span>
                                                                            <span className="font-mono text-sm font-black text-[#c25e00] break-all leading-tight mb-2 font-sans">{Utils.formatBatch(lot.lot) || "無標註"}</span>
                                                                            <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-end"><span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">剩餘數量</span><span className="font-black text-[15px] text-teal-600 font-mono leading-none">{lot.qty}</span></div>
                                                                        </div>
                                                                    )) : <div className="col-span-full text-center p-3 text-xs text-gray-400 bg-gray-50 rounded-lg">此產品目前無任何有效批號庫存 (>0)</div>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300 font-sans"><UI.Search size={44} className="mx-auto text-gray-300 mb-3" /><p className="text-sm text-gray-400 font-black uppercase tracking-widest font-sans">No Match in A06REPORT</p><p className="text-[11px] text-gray-400 mt-2 font-sans px-4">無法在數據分頁中自動匹配到： <span className="font-bold font-mono text-gray-600">"{item.name}"</span></p><p className="text-[9px] text-gray-300 mt-2 italic px-8 font-sans">已啟用【全域模糊比對】：系統已保留中文字元，並嘗試在貨號(Col A)與品名(Col C)中搜尋關鍵字。</p></div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 font-sans font-bold">
                            <button onClick={() => confirm(`確定刪除訂單 #${order.orderId}？此操作不可撤回。`) && onDelete([order.orderId]) && onClose()} className="text-red-400 hover:text-red-600 text-sm font-bold flex items-center gap-1.5 px-4 py-2 hover:bg-red-50 rounded-lg transition-colors font-sans"><UI.Trash size={16} /> 刪除單據</button>
                            <button onClick={handleSave} disabled={isSavingDetails} className={`w-full sm:w-auto px-10 py-3.5 rounded-xl text-sm font-black text-white transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 ${saveSuccess ? 'bg-green-600 shadow-green-100' : 'bg-[#c25e00] hover:bg-[#a04d00] shadow-orange-100'} font-sans font-bold`}>
                                {isSavingDetails ? <UI.Loader size={20} className="animate-spin" /> : saveSuccess ? <UI.Check size={20} /> : <UI.Save size={20} />}
                                {isSavingDetails ? '正在同步數據...' : saveSuccess ? '變更已成功同步' : '儲存數量與所有變更'}
                            </button>
                        </div>
                    </ErrorBoundary>
                </div>
            </div>
        </div>
    );
}

export default OrderDetailModal;
