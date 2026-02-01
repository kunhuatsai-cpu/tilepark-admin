import React from 'react';

const StatusBadge = ({ status }) => {
    let color = "bg-green-100 text-green-800 border-green-200";
    if (status === '已確認庫存') color = "bg-teal-100 text-teal-800 border-teal-200";
    if (status === '已排單出貨') color = "bg-blue-100 text-blue-800 border-blue-200";
    if (status === '期貨訂單') color = "bg-purple-100 text-purple-800 border-purple-200";
    return <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${color} whitespace-nowrap`}>{status || '已接收'}</span>;
};

export default StatusBadge;
