{/* 🏭 工廠排程與註記 (樣式優化版：白底黑字) */}
<div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6 relative group transition-all hover:shadow-md">
<h3 className="text-sm font-bold text-amber-800 mb-4 flex items-center gap-2">
    <Icons.Factory size={18}/> 
    工廠排程與內部註記 (後台專用)
</h3>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
        <label className="text-xs text-amber-900/70 font-bold mb-1 block">預計到港/到貨日 (Factory ETA)</label>
        <input 
            type="date" 
            value={factoryEta} 
            onChange={e => setFactoryEta(e.target.value)} 
            /* 👇 修改：強制 bg-white (白底) 和 text-gray-900 (深黑字) */
            className="w-full p-2 border border-amber-300 rounded text-sm bg-white text-gray-900 font-medium focus:ring-2 focus:ring-amber-400 outline-none shadow-sm"
        />
        <p className="text-[10px] text-amber-600/80 mt-1">*供內部查詢，不直接顯示於前台訂單</p>
    </div>
    <div className="md:col-span-2">
        <label className="text-xs text-amber-900/70 font-bold mb-1 block">內部備忘錄 (Internal Note)</label>
        <textarea 
            value={internalNote} 
            onChange={e => setInternalNote(e.target.value)} 
            /* 👇 修改：強制 bg-white (白底) 和 text-gray-900 (深黑字) */
            className="w-full p-2 border border-amber-300 rounded text-sm h-20 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-amber-400 outline-none resize-none shadow-sm placeholder-gray-400"
            placeholder="在此輸入：貨櫃號碼、工廠延遲原因、保留期限等內部資訊..."
        />
    </div>
</div>
</div>