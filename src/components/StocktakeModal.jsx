/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { UI } from './Icons';

const StocktakeModal = ({ product, batch, onClose, onSubmit }) => {
    const [actualQty, setActualQty] = useState(batch.qty);
    const [note, setNote] = useState("");
    const diff = actualQty - batch.qty;

    const handleSubmit = () => {
        onSubmit({
            productId: product.id, productName: product.name, batch: batch.lot,
            systemQty: batch.qty, actualQty: actualQty, diff: diff, note: note
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in font-sans text-gray-800">
            <div className="bg-white w-full max-w-sm rounded-xl overflow-hidden shadow-2xl">
                <div className="bg-purple-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold flex items-center gap-2"><UI.Edit size={18} /> 盤點回報</h3><button onClick={onClose}><UI.Close size={20} /></button></div>
                <div className="p-6 space-y-4">
                    <div className="text-sm text-gray-600"><div className="font-bold text-gray-800 mb-1">{product.name}</div><div className="flex gap-4"><span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">ID: {product.id}</span><span className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-mono text-xs font-bold">批號: {batch.lot}</span></div></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-gray-400">系統數量</label><div className="text-2xl font-black text-gray-400 font-mono">{batch.qty}</div></div><div><label className="text-xs font-bold text-purple-600">實際數量</label><input type="number" value={actualQty} onChange={e => setActualQty(Number(e.target.value))} className="w-full text-2xl font-black text-gray-800 border-b-2 border-purple-500 outline-none font-mono" autoFocus /></div></div>
                    <div className={`text-center p-2 rounded font-bold text-sm ${diff !== 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>差異數: {diff > 0 ? `+${diff}` : diff}</div>
                    <div><label className="text-xs font-bold text-gray-400">備註 (原因)</label><input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="例如: 破損, 找不到..." /></div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded">取消</button><button onClick={handleSubmit} className="px-6 py-2 bg-purple-600 text-white font-bold text-sm rounded shadow hover:bg-purple-700">送出回報</button></div>
            </div>
        </div>
    );
};

export default StocktakeModal;
