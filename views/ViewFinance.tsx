import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAnalysis } from '../context/AnalysisContext';
import { Transaction } from '../types';

const ViewFinance: React.FC = () => {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'DATA' | 'ANALYSIS'>('DATA');
    const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE'); // 成本 vs 收入
    const [financeTypeFilter, setFinanceTypeFilter] = useState<'BUSINESS' | 'TRANSFER' | 'ALL'>('BUSINESS'); // 经营 vs 走账
    const [isDetailedMode, setIsDetailedMode] = useState(true);
    const [dateFilter, setDateFilter] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH'); // Date filter for analysis
    
    // Access global finance state
    const { financeTransactions, toggleSoftDeleteTransaction, addFinanceTransaction } = useAnalysis();

    // Manual Entry Inputs
    const [manualSummary, setManualSummary] = useState('');
    const [manualAmount, setManualAmount] = useState('');

    // --- Data Processing ---
    const processedData = useMemo(() => {
        let data = [...financeTransactions];

        // 1. Filter by Main Type (Income/Expense)
        data = data.filter(t => t.type === transactionType);

        // 2. Filter by Finance Category (Business/Transfer)
        if (financeTypeFilter !== 'ALL') {
            data = data.filter(t => (t.financeType || 'BUSINESS') === financeTypeFilter);
        }

        // 3. Sort by Date Descending
        data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 4. Mark Duplicates (Simple logic: Same amount, same day, same merchant)
        const seen = new Set();
        return data.map(t => {
            if (t.isDeleted) return t; // Don't mark deleted as duplicates
            const key = `${t.date}-${t.merchant}-${t.amount}-${t.type}`;
            const isDuplicate = seen.has(key);
            seen.add(key);
            return { ...t, isDuplicate };
        });
    }, [financeTransactions, transactionType, financeTypeFilter]);

    // --- Statistics Calculation ---
    const stats = useMemo(() => {
        // We calculate stats based on the CURRENT VIEW FILTER (processedData), but excluding deleted items
        const activeItems = processedData.filter(t => !t.isDeleted);
        
        const totalAmount = activeItems.reduce((sum, t) => sum + t.amount, 0);
        const totalTax = activeItems.reduce((sum, t) => sum + (t.taxAmount || 0), 0);
        
        return { totalAmount, totalTax, count: activeItems.length };
    }, [processedData]);

    // --- Dashboard Analysis Data (Global, not filtered by view) ---
    const dashboardData = useMemo(() => {
        let activeTrans = financeTransactions.filter(t => !t.isDeleted);
        
        // Apply Date Filter for Analysis View
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        activeTrans = activeTrans.filter(t => {
            const tDate = new Date(t.date);
            if (dateFilter === 'YEAR') {
                return tDate.getFullYear() === currentYear;
            } else if (dateFilter === 'QUARTER') {
                const currentQuarter = Math.floor(currentMonth / 3);
                const tQuarter = Math.floor(tDate.getMonth() / 3);
                return tDate.getFullYear() === currentYear && tQuarter === currentQuarter;
            } else {
                // MONTH
                return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
            }
        });

        // Key Metrics
        const totalIncome = activeTrans.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const totalExpense = activeTrans.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        const netProfit = totalIncome - totalExpense;
        const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

        // Trend Chart Data (Monthly)
        const trendMap: Record<string, { name: string, income: number, expense: number }> = {};
        activeTrans.forEach(t => {
            const month = t.date.substring(0, 7); // YYYY-MM
            if (!trendMap[month]) trendMap[month] = { name: month, income: 0, expense: 0 };
            if (t.type === 'INCOME') trendMap[month].income += t.amount;
            else trendMap[month].expense += t.amount;
        });
        const trendData = Object.values(trendMap).sort((a, b) => a.name.localeCompare(b.name));

        // Composition Data (Pie)
        const businessExpense = activeTrans.filter(t => t.type === 'EXPENSE' && (t.financeType||'BUSINESS') === 'BUSINESS').reduce((s, t) => s + t.amount, 0);
        const transferExpense = activeTrans.filter(t => t.type === 'EXPENSE' && t.financeType === 'TRANSFER').reduce((s, t) => s + t.amount, 0);
        
        const pieData = [
            { name: '经营支出', value: businessExpense, color: '#EA4335' },
            { name: '走账支出', value: transferExpense, color: '#FBBC04' },
        ].filter(d => d.value > 0);

        return { totalIncome, totalExpense, netProfit, profitMargin, trendData, pieData };
    }, [financeTransactions, dateFilter]);


    // --- Handlers ---
    const handleManualAdd = () => {
        if (!manualAmount || !manualSummary) return;
        const newTransaction: Transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            type: transactionType,
            financeType: financeTypeFilter === 'ALL' ? 'BUSINESS' : financeTypeFilter,
            amount: parseFloat(manualAmount),
            category: 'Manual',
            summary: manualSummary,
            merchant: '手动录入',
            hasTicket: false,
            quantity: 1, unit: '项', unitPrice: parseFloat(manualAmount),
            taxRate: 0, taxAmount: 0, spec: '-', invoiceNumber: '-', taxId: '-'
        };
        addFinanceTransaction(newTransaction);
        setManualAmount('');
        setManualSummary('');
    };

    // --- Sub-Components ---
    const renderDataView = () => (
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden animate-fade-in-up">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-white z-20">
                <div className="flex items-center gap-4">
                    {/* Toggle Income/Expense */}
                    <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                        <button 
                            onClick={() => setTransactionType('EXPENSE')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${transactionType === 'EXPENSE' ? 'bg-white text-alert-text shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            成本支出
                        </button>
                        <button 
                            onClick={() => setTransactionType('INCOME')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${transactionType === 'INCOME' ? 'bg-white text-secondary-green shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            销售收入
                        </button>
                    </div>

                    {/* Finance Type Filter & Stats */}
                    <div className="flex items-center space-x-4 text-sm border-l border-slate-200 pl-4">
                        <div className="flex flex-col justify-center">
                            <select 
                                value={financeTypeFilter}
                                onChange={(e) => setFinanceTypeFilter(e.target.value as any)}
                                className="text-xs border-none bg-slate-50 rounded px-2 py-1 text-slate-600 focus:ring-0 cursor-pointer hover:text-primary font-bold outline-none appearance-none"
                                style={{backgroundImage: 'none'}} // hide default arrow if wanted, or keep standard
                            >
                                <option value="BUSINESS">统计: 经营数据</option>
                                <option value="TRANSFER">统计: 走账数据</option>
                                <option value="ALL">统计: 全部数据</option>
                            </select>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] text-slate-400 font-medium">有效总金额</span>
                            <span className="font-bold text-slate-700 font-mono text-sm">
                                {transactionType === 'INCOME' ? '+' : '-'}{stats.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] text-slate-400 font-medium">有效总税额</span>
                            <span className="font-bold text-slate-500 font-mono text-sm">
                                {stats.totalTax.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Tools */}
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => setIsDetailedMode(!isDetailedMode)}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm mr-1.5">{isDetailedMode ? 'open_in_full' : 'close_fullscreen'}</span>
                        {isDetailedMode ? '详细模式' : '简化模式'}
                    </button>
                    <button className="p-2 hover:bg-blue-50 text-slate-400 hover:text-primary rounded transition-colors" title="导出Excel">
                        <span className="material-symbols-outlined text-sm">download</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1 relative custom-scroll">
                <table className="w-full text-sm text-left text-slate-600 border-collapse">
                    <thead className="text-xs text-slate-500 font-bold bg-[#F9FAFB] border-b border-slate-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[100px] border-r border-slate-100">日期</th>
                            {isDetailedMode && <th className="px-4 py-3 whitespace-nowrap min-w-[140px] border-r border-slate-100">发票号码</th>}
                            <th className="px-4 py-3 whitespace-nowrap min-w-[180px] border-r border-slate-100">
                                {transactionType === 'EXPENSE' ? '对方单位 (供应商)' : '对方单位 (客户)'}
                            </th>
                            {isDetailedMode && <th className="px-4 py-3 whitespace-nowrap min-w-[140px] border-r border-slate-100">对方税号</th>}
                            <th className="px-4 py-3 whitespace-nowrap min-w-[200px] border-r border-slate-100">项目名称</th>
                            {isDetailedMode && <th className="px-4 py-3 whitespace-nowrap min-w-[80px] border-r border-slate-100">规格</th>}
                            {isDetailedMode && <th className="px-4 py-3 whitespace-nowrap min-w-[50px] border-r border-slate-100">单位</th>}
                            <th className="px-4 py-3 whitespace-nowrap min-w-[60px] border-r border-slate-100">数量</th>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[90px] border-r border-slate-100">单价</th>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[110px] border-r border-slate-100 font-bold text-slate-700">金额</th>
                            {isDetailedMode && <th className="px-4 py-3 whitespace-nowrap min-w-[90px] border-r border-slate-100">税额</th>}
                            <th className="px-4 py-3 whitespace-nowrap min-w-[60px] border-r border-slate-100">税率</th>
                            {isDetailedMode && <th className="px-4 py-3 whitespace-nowrap min-w-[120px] border-r border-slate-100">备注</th>}
                            <th className="px-4 py-3 whitespace-nowrap w-[70px] text-center sticky right-0 bg-[#F9FAFB] shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] z-20">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {processedData.length === 0 ? (
                            <tr>
                                <td colSpan={15} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl opacity-20">receipt_long</span>
                                        <p>暂无数据</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            processedData.map((row) => {
                                // Dynamic Row Styling
                                let rowClass = "hover:bg-blue-50/30 transition-colors group text-xs relative ";
                                if (row.isDeleted) rowClass += "bg-red-50/40 text-red-300 line-through decoration-red-300 ";
                                else if (row.isDuplicate) rowClass += "bg-orange-50/50 ";

                                return (
                                    <tr key={row.id} className={rowClass}>
                                        <td className="px-4 py-3 font-mono border-r border-slate-50">{row.date}</td>
                                        
                                        {isDetailedMode && (
                                            <td className="px-4 py-3 font-mono border-r border-slate-50">
                                                {row.invoiceNumber || '-'}
                                                {row.financeType === 'TRANSFER' && (
                                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 no-underline">
                                                        走账
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        
                                        <td className="px-4 py-3 font-medium truncate max-w-[180px] border-r border-slate-50" title={row.merchant}>
                                            {row.merchant}
                                        </td>
                                        
                                        {isDetailedMode && <td className="px-4 py-3 font-mono text-[10px] border-r border-slate-50">{row.taxId || '-'}</td>}
                                        
                                        <td className="px-4 py-3 truncate max-w-[200px] border-r border-slate-50" title={row.summary}>
                                            {row.summary}
                                        </td>
                                        
                                        {isDetailedMode && <td className="px-4 py-3 border-r border-slate-50">{row.spec || '-'}</td>}
                                        {isDetailedMode && <td className="px-4 py-3 border-r border-slate-50">{row.unit || '-'}</td>}
                                        
                                        <td className="px-4 py-3 font-mono border-r border-slate-50">{row.quantity || '-'}</td>
                                        <td className="px-4 py-3 font-mono border-r border-slate-50">{row.unitPrice?.toFixed(2) || '-'}</td>
                                        
                                        <td className={`px-4 py-3 font-bold font-mono border-r border-slate-50 ${
                                            row.isDeleted ? 'text-inherit' : (row.type === 'INCOME' ? 'text-secondary-green' : 'text-alert-text')
                                        }`}>
                                            {row.type === 'INCOME' ? '+' : '-'}{row.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                                        </td>
                                        
                                        {isDetailedMode && (
                                            <td className="px-4 py-3 font-mono border-r border-slate-50">
                                                {row.taxAmount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) || '0.00'}
                                            </td>
                                        )}
                                        
                                        <td className="px-4 py-3 font-mono border-r border-slate-50">
                                            {row.taxRate ? `${(row.taxRate * 100).toFixed(0)}%` : '-'}
                                        </td>
                                        
                                        {isDetailedMode && (
                                            <td className="px-4 py-3 truncate max-w-[120px] border-r border-slate-50">
                                                {row.isDuplicate && !row.isDeleted && (
                                                    <span className="mr-1 inline-flex items-center text-[10px] text-orange-600 bg-orange-100 px-1 rounded border border-orange-200">
                                                        ⚠ 重复
                                                    </span>
                                                )}
                                                {row.remarks || '-'}
                                            </td>
                                        )}
                                        
                                        {/* Sticky Operation Column */}
                                        <td className={`px-4 py-3 text-center sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] z-10 ${row.isDeleted ? 'bg-[#FFF5F5]' : 'bg-white group-hover:bg-[#EFF6FF]'}`}>
                                            <button 
                                                onClick={() => toggleSoftDeleteTransaction(row.id)}
                                                className={`p-1.5 rounded-full transition-colors ${
                                                    row.isDeleted 
                                                        ? 'text-blue-400 hover:text-blue-600 hover:bg-blue-50' 
                                                        : 'text-slate-300 hover:text-alert-text hover:bg-red-50'
                                                }`}
                                                title={row.isDeleted ? "恢复数据" : "删除记录"}
                                            >
                                                <span className="material-symbols-outlined text-base">
                                                    {row.isDeleted ? 'restore_from_trash' : 'close'}
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Quick Add Footer */}
            <div className="border-t border-slate-100 bg-[#F8F9FA] p-3 z-20">
                <div className="flex flex-col lg:flex-row gap-2 items-center">
                    <input 
                        type="text" 
                        placeholder="快速记一笔 (项目名称...)" 
                        value={manualSummary}
                        onChange={(e) => setManualSummary(e.target.value)}
                        className="flex-1 w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                     <input 
                        type="number" 
                        placeholder="金额" 
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        className="w-full lg:w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                    <button 
                        onClick={handleManualAdd}
                        className="w-full lg:w-auto px-4 py-2 bg-white border border-slate-200 hover:border-primary hover:text-primary text-slate-600 text-sm font-bold rounded-lg transition-colors shadow-sm"
                    >
                        添加记录
                    </button>
                </div>
            </div>
        </div>
    );

    const renderAnalysisView = () => (
        <div className="flex flex-col gap-6 animate-fade-in-up pb-8">
            {/* Header Date Filter */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    数据概览
                </h2>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                    <span className="text-xs text-slate-400 px-3 font-bold">时间范围:</span>
                    <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="text-sm border-none bg-transparent font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none"
                    >
                        <option value="MONTH">本月</option>
                        <option value="QUARTER">本季度</option>
                        <option value="YEAR">本年</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-alert-text">
                    <p className="text-xs text-slate-500 font-bold mb-1">总支出 (Total Expense)</p>
                    <h3 className="text-2xl font-bold text-slate-800">
                        ¥{dashboardData.totalExpense.toLocaleString()}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-secondary-green">
                    <p className="text-xs text-slate-500 font-bold mb-1">总收入 (Total Income)</p>
                    <h3 className="text-2xl font-bold text-slate-800">
                        ¥{dashboardData.totalIncome.toLocaleString()}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-primary">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 font-bold mb-1">净利润 (Net Profit)</p>
                            <h3 className={`text-2xl font-bold ${dashboardData.netProfit >= 0 ? 'text-primary' : 'text-alert-text'}`}>
                                {dashboardData.netProfit >= 0 ? '+' : ''}¥{dashboardData.netProfit.toLocaleString()}
                            </h3>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400 font-bold mb-1">利润率</p>
                            <span className="text-lg font-bold text-slate-600">{dashboardData.profitMargin.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[400px]">
                {/* Trend Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <h4 className="font-bold text-slate-700 mb-6">收支趋势 (Trend)</h4>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dashboardData.trendData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#34A853" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#34A853" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EA4335" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#EA4335" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => `${value.toLocaleString()}`}
                                />
                                <Area type="monotone" dataKey="income" name="收入" stroke="#34A853" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expense" name="支出" stroke="#EA4335" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <h4 className="font-bold text-slate-700 mb-6">支出结构 (经营 vs 走账)</h4>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dashboardData.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {dashboardData.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Top Navigation for View Switching */}
            <div className="flex items-center gap-4 shrink-0">
                <nav className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('DATA')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'DATA' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        表格数据
                    </button>
                    <button 
                        onClick={() => setActiveTab('ANALYSIS')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'ANALYSIS' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        数据分析
                    </button>
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0">
                {activeTab === 'DATA' && renderDataView()}
                {activeTab === 'ANALYSIS' && renderAnalysisView()}
            </div>
        </div>
    );
};

export default ViewFinance;