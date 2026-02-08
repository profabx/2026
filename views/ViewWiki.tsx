import React, { useState, useEffect, useRef } from 'react';

// Define the navigation structure type
interface WikiNode {
    id: string;
    label: string;
    children?: WikiNode[];
}

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

interface WikiUpdate {
    id: string;
    content: string;
    source: string;
    timestamp: string;
    status: 'pending' | 'approved';
    isEditing: boolean;
}

// Navigation Data based on user screenshots
const WIKI_NAV_DATA: WikiNode[] = [
  {
    id: 'cmf',
    label: 'CMF (颜色/材质/工艺)',
    children: [
      {
        id: 'cmf-c', label: 'CMF-C (颜色)', children: [
          { id: 'cmf-c-standard', label: '标准颜色' },
          { id: 'cmf-c-exist', label: '存在方式' },
          { id: 'cmf-c-source', label: '来源' },
          { id: 'cmf-c-inspect', label: '检验方式' },
          { id: 'cmf-c-env', label: '环境' },
          { id: 'cmf-c-device', label: '特定设备颜色' },
        ]
      },
      {
        id: 'cmf-m', label: 'CMF-M (材质)', children: [
           { id: 'cmf-m-metal', label: '金属' },
           { id: 'cmf-m-polymer', label: '聚合物' },
           { id: 'cmf-m-ceramic', label: '陶瓷' },
           { id: 'cmf-m-composite', label: '复合材料' },
           { id: 'cmf-m-other', label: '其他材料' },
        ]
      },
      {
        id: 'cmf-f', label: 'CMF-F (工艺)', children: [
           { id: 'cmf-f-surface', label: '表面处理' },
           { id: 'cmf-f-heat', label: '热处理' },
           { id: 'cmf-f-polish', label: '打磨工艺' },
           { id: 'cmf-f-chemical', label: '化学处理' },
        ]
      }
    ]
  },
  {
    id: 'additive',
    label: '增材制造',
    children: [
       { id: 'fdm', label: 'FDM' },
       { id: 'sla', label: 'SLA' },
       { id: 'sls', label: 'SLS' },
       { id: 'slm', label: 'SLM' },
       { id: 'lcd', label: 'LCD' },
       { id: 'mjf', label: 'MJF' },
       { id: 'mim', label: 'MIM' },
       { id: 'additive-app', label: '应用' },
       { id: 'additive-other', label: '其他' },
    ]
  },
  {
    id: 'equal',
    label: '等材制造',
    children: [
        { id: 'mold', label: '模具' },
        { id: 'silicone', label: '硅胶复模' },
        { id: 'sheet-metal', label: '钣金' },
        { id: 'rapid-tooling', label: '快速模具' },
    ]
  },
  {
    id: 'subtractive',
    label: '减材制造',
    children: [
        { id: 'cnc', label: 'CNC' },
        { id: 'wire-cut', label: '线切割' },
        { id: '5-axis', label: '五轴加工中心' }, // Added to match the demo logic
    ]
  },
  {
    id: 'inspection',
    label: '检测',
    children: [
        { id: 'dimension', label: '尺寸' },
        { id: 'roughness', label: '粗糙度' },
        { id: 'salt-spray', label: '盐雾试验' },
        { id: 'ip-rating', label: 'IP等级' },
        { id: 'reverse', label: '逆向' },
    ]
  },
  {
    id: 'manual',
    label: '手工',
    children: [
        { id: 'cutting', label: '剪切' },
        { id: 'joining', label: '连接' },
    ]
  },
];

const ViewWiki: React.FC = () => {
    // UI State
    const [activeNav, setActiveNav] = useState('5-axis');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['cmf', 'cmf-m', 'subtractive', 'additive', 'equal', 'inspection', 'manual']));
    
    // Chat & Update State
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'model', text: '主管您好，我是 ProFabX-wikibot。您可以发送“目录名 + 链接”来快速导入并生成文档内容。' }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Stores updates per node ID
    const [wikiUpdates, setWikiUpdates] = useState<Record<string, WikiUpdate[]>>({});
    // Local state for editing content temporarily before save
    const [editContentBuffer, setEditContentBuffer] = useState<string>('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Helper: Find node by fuzzy name match
    const findNodeByName = (name: string, nodes: WikiNode[] = WIKI_NAV_DATA): WikiNode | null => {
        for (const node of nodes) {
            // Check current node
            // Handle cases like "五轴" matching "五轴加工中心"
            if (node.label.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(node.label.toLowerCase())) {
                return node;
            }
            // Check children
            if (node.children) {
                const found = findNodeByName(name, node.children);
                if (found) return found;
            }
        }
        return null;
    };

    // Helper: Generate context-aware mock content
    const generateMockContent = (label: string, link: string) => {
        const l = label.toLowerCase();
        if (l.includes('cnc') || l.includes('五轴') || l.includes('减材') || l.includes('铣')) {
            return `根据链接 (${link}) 内容，针对 **${label}** 的工艺优化建议：\n\n1. **切削参数修正**：对于硬度 HRC50 以上的模具钢，建议切削速度降低至 80m/min，进给量减少 15%。\n2. **刀具选择**：推荐使用 TiAlN 涂层硬质合金刀具以延长寿命。\n3. **冷却策略**：高速精加工时建议采用油雾冷却 (MQL) 替代传统切削液。`;
        }
        if (l.includes('3d') || l.includes('增材') || l.includes('sla') || l.includes('slm') || l.includes('fdm')) {
            return `根据链接 (${link}) 内容，关于 **${label}** 的最新技术要点：\n\n1. **支撑结构优化**：新型树状支撑算法可减少 40% 的材料浪费。\n2. **成型室温度**：建议保持在 60°C 恒温以防止底部翘曲。\n3. **后处理规范**：去除支撑后需进行 2 小时的热等静压处理以消除内应力。`;
        }
        if (l.includes('cmf') || l.includes('颜色') || l.includes('材质') || l.includes('工艺')) {
            return `根据链接 (${link}) 内容，提取到 **${label}** 相关的设计趋势：\n\n1. **色彩趋势**：2024 年度工业设计流行色为“数字薰衣草”，建议在 CMF 库中增加潘通 134-67-89。\n2. **环保材质**：生物基聚合物的应用案例增加，需评估其耐候性。\n3. **表面纹理**：微纳米级激光蚀刻纹理正在成为高端消费电子的主流。`;
        }
        if (l.includes('检测') || l.includes('尺寸') || l.includes('粗糙度')) {
             return `根据链接 (${link}) 内容，关于 **${label}** 的新标准解读：\n\n1. **公差等级**：ISO 2768-m 标准在最新版本中对线性尺寸公差进行了微调。\n2. **检测设备**：建议引入三坐标测量机 (CMM) 进行复杂曲面的全检。\n3. **数据记录**：所有关键尺寸需留存 CPK 报告。`;
        }
        return `根据您提供的链接 (${link})，AI 已提取以下关键信息并合并至 **【${label}】**：\n\n1. **核心概念**：文档详细阐述了该技术的基本原理与应用场景。\n2. **操作流程**：更新了标准作业程序 (SOP) 的第三步，增加了安全检查环节。\n3. **注意事项**：强调了在高湿度环境下存储的要求。`;
    };

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;

        const userText = chatInput;
        const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText };
        setMessages(prev => [...prev, newUserMsg]);
        setChatInput('');
        setIsTyping(true);

        // Parse Command: "Directory + Link"
        // Regex allows for spaces around '+' and supports http/https
        const commandMatch = userText.match(/^(.+?)\s*[+＋]\s*(https?:\/\/.+)$/);

        setTimeout(() => {
            if (commandMatch) {
                const [_, dirName, link] = commandMatch;
                const targetNode = findNodeByName(dirName.trim());

                if (targetNode) {
                    // Generate Content
                    const content = generateMockContent(targetNode.label, link.trim());

                    const newUpdate: WikiUpdate = {
                        id: Date.now().toString(),
                        source: link.trim(),
                        timestamp: '刚刚',
                        content: content,
                        status: 'pending',
                        isEditing: false
                    };

                    setWikiUpdates(prev => ({
                        ...prev,
                        [targetNode.id]: [...(prev[targetNode.id] || []), newUpdate]
                    }));

                    setActiveNav(targetNode.id); // Navigate to the page
                    
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'model',
                        text: `✅ 已成功提取链接内容。\n\n**${targetNode.label}** 文档已更新。\n新增内容已标记为绿色（待审核），您可以直接在文档中编辑或批准。`
                    }]);
                } else {
                    // Not found
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: 'model',
                        text: `❌ 未找到名称包含 "${dirName.trim()}" 的目录。\n请检查左侧目录树名称是否正确。`
                    }]);
                }
            } else {
                // Normal Chat
                let reply = "收到。如果您想快速导入外部文档，请使用格式：\n目录名 + 链接\n例如：CNC + https://example.com/article";
                if (userText.includes('审核')) reply = "好的，正在启动自动合规性审查流程...";
                
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: reply
                }]);
            }
            setIsTyping(false);
        }, 1000);
    };

    // --- Single Update Actions ---
    const handleApprove = (nodeId: string, updateId: string) => {
        setWikiUpdates(prev => ({
            ...prev,
            [nodeId]: prev[nodeId].map(u => u.id === updateId ? { ...u, status: 'approved' } : u)
        }));
    };

    const handleEdit = (update: WikiUpdate) => {
        setEditContentBuffer(update.content);
        setWikiUpdates(prev => {
            // Find the node ID that contains this update
            const entries = Object.entries(prev);
            const newState: Record<string, WikiUpdate[]> = { ...prev };
            
            for (const [nodeId, updates] of entries) {
                const updateList = updates as WikiUpdate[];
                if (updateList.some(u => u.id === update.id)) {
                    newState[nodeId] = updateList.map(u => u.id === update.id ? { ...u, isEditing: true } : u);
                    break;
                }
            }
            return newState;
        });
    };

    const handleSave = (nodeId: string, updateId: string) => {
        setWikiUpdates(prev => ({
            ...prev,
            [nodeId]: prev[nodeId].map(u => u.id === updateId ? { ...u, content: editContentBuffer, isEditing: false } : u)
        }));
    };

    const handleCancel = (nodeId: string, updateId: string) => {
        setWikiUpdates(prev => ({
            ...prev,
            [nodeId]: prev[nodeId].map(u => u.id === updateId ? { ...u, isEditing: false } : u)
        }));
    };

    // --- Bulk Actions (Footer Buttons) ---
    const handleApproveAll = () => {
        if (!wikiUpdates[activeNav]) return;
        
        // Check if pending items exist
        const hasPending = wikiUpdates[activeNav].some(u => u.status === 'pending');
        if (!hasPending) return;

        setWikiUpdates(prev => ({
            ...prev,
            [activeNav]: prev[activeNav].map(u => 
                u.status === 'pending' ? { ...u, status: 'approved' } : u
            )
        }));
        
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: `✅ 已批准当前页面所有待审核内容。`
        }]);
    };

    const handleRejectAll = () => {
        if (!wikiUpdates[activeNav]) return;

        // Check if pending items exist
        const hasPending = wikiUpdates[activeNav].some(u => u.status === 'pending');
        if (!hasPending) return;

        setWikiUpdates(prev => ({
            ...prev,
            [activeNav]: prev[activeNav].filter(u => u.status !== 'pending')
        }));

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: `🚫 已移除当前页面所有待审核内容。`
        }]);
    };

    // Recursive component for navigation items
    const renderNavNode = (node: WikiNode, level: number = 0) => {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = expandedIds.has(node.id);
        const isActive = activeNav === node.id;
        
        // Indentation calculation
        const paddingLeft = level === 0 ? '1rem' : `${1 + level * 1.2}rem`;

        return (
            <div key={node.id} className="select-none">
                <div 
                    onClick={() => {
                        if (hasChildren) {
                            toggleExpand(node.id, {} as any);
                        } else {
                            setActiveNav(node.id);
                        }
                    }}
                    className={`
                        flex items-center justify-between py-2 pr-4 cursor-pointer text-sm font-medium transition-colors
                        ${isActive ? 'bg-blue-50 text-primary border-r-2 border-primary' : 'text-slate-600 hover:bg-slate-50'}
                    `}
                    style={{ paddingLeft }}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        {/* Arrow for parents */}
                        <div 
                            className={`w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 transition-colors ${hasChildren ? '' : 'invisible'}`}
                            onClick={(e) => hasChildren && toggleExpand(node.id, e)}
                        >
                            <span className={`material-symbols-outlined text-base text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                arrow_right
                            </span>
                        </div>
                        
                        {/* Icon: Folder for parents, Document for leaves */}
                        <span className="material-symbols-outlined text-[18px] text-slate-400">
                             {hasChildren ? 'folder_open' : 'article'}
                        </span>
                        
                        <span className="truncate">{node.label}</span>
                    </div>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="animate-fade-in-down origin-top">
                        {node.children!.map(child => renderNavNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    // --- Helper to get current node label ---
    const getActiveNodeLabel = () => {
        const findLabel = (nodes: WikiNode[]): string | undefined => {
            for (const node of nodes) {
                if (node.id === activeNav) return node.label;
                if (node.children) {
                    const found = findLabel(node.children);
                    if (found) return found;
                }
            }
        };
        return findLabel(WIKI_NAV_DATA) || '文档详情';
    };

    return (
        <div className="flex h-full w-full bg-white overflow-hidden">
            
            {/* --- LEFT SIDEBAR: NAVIGATION --- */}
            <aside className="w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col z-10 hidden md:flex">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <span className="material-symbols-outlined">menu_book</span>
                        <span>目录</span>
                    </div>
                    <div className="flex items-center gap-1">
                         <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-primary">
                            <span className="material-symbols-outlined text-lg">add</span>
                         </button>
                         <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-primary">
                            <span className="material-symbols-outlined text-lg">filter_list</span>
                         </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scroll py-2">
                    {WIKI_NAV_DATA.map(node => renderNavNode(node))}
                </div>
                
                {/* Bottom Stats or Action */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
                    共 {WIKI_NAV_DATA.reduce((acc, n) => acc + (n.children?.length || 0), 0) + 10} 个词条
                </div>
            </aside>

            {/* --- CENTER: MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto custom-scroll bg-white relative flex flex-col">
                <div className="max-w-4xl mx-auto w-full px-8 py-10 pb-32">
                    {/* Breadcrumbs & Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-4">
                            <span>Wiki知识库</span>
                            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                            <span>{activeNav.includes('cmf') ? 'CMF' : activeNav.includes('add') ? '增材制造' : '减材制造'}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                                    {activeNav === '5-axis' ? '五轴加工中心主轴热补偿机制' : getActiveNodeLabel()}
                                </h1>
                                <p className="text-slate-500">
                                    {activeNav === '5-axis' 
                                        ? '精细化的工程制造知识分级体系，支持多级目录联动的协作平台。' 
                                        : '标准化的工艺说明文档，适用于内部工程参考。'}
                                </p>
                            </div>
                            <div className="flex bg-slate-100 rounded-full p-1">
                                <button className="px-4 py-1.5 rounded-full bg-white shadow-sm text-xs font-bold text-slate-700">公开版</button>
                                <button className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-700">内部版</button>
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="flex gap-2 mb-8">
                        {['#工程标准', '#工艺规范', '#特审核修订'].map((tag, i) => (
                            <span key={i} className={`px-3 py-1 rounded-lg text-xs font-bold ${tag === '#特审核修订' ? 'bg-green-50 text-secondary-green' : 'bg-blue-50 text-primary'}`}>
                                {tag}
                            </span>
                        ))}
                        <span className="ml-auto text-xs text-slate-400 font-medium flex items-center">
                            最后修改: 刚刚
                        </span>
                    </div>

                    <div className="prose prose-slate max-w-none">
                        {/* Static Content for 5-axis Demo */}
                        {activeNav === '5-axis' && (
                            <>
                                <h2 className="text-2xl font-bold text-slate-800 mb-4">五轴加工中心主轴热补偿机制</h2>
                                <p className="text-slate-600 leading-relaxed mb-4">
                                    在高速加工过程中，主轴由于摩擦生热会产生微量伸长。
                                </p>
                                
                                {/* Hardcoded Highlighted Content Block */}
                                <div className="relative bg-green-50/50 border border-green-200 rounded-xl p-4 my-6 group">
                                    <div className="flex gap-3">
                                        <p className="text-slate-800 font-medium text-sm leading-relaxed flex-1">
                                            <span className="bg-green-100 px-1 rounded mx-1">目前的实验数据显示，当转速</span> 
                                            <span className="text-primary font-bold mx-1">热漂</span> 
                                            可能会达到 <span className="text-primary font-bold">速超过12000rpm时，</span>
                                            <span className="text-primary font-bold mx-1">移量</span> 
                                            0.02mm 左右。
                                        </p>
                                        <div className="flex gap-2 self-start shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer hover:border-primary text-slate-400 hover:text-primary">
                                                <span className="material-symbols-outlined text-base">comment</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-sm cursor-pointer">
                                                <span className="material-symbols-outlined text-base">star</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Floating Warning */}
                                    <div className="absolute -bottom-3 left-4 bg-white shadow-lg border border-red-100 rounded-full px-3 py-1 flex items-center gap-2 text-[10px] font-bold text-slate-600 animate-bounce">
                                        <span className="material-symbols-outlined text-sm text-red-500">lock</span>
                                        建议在预热 15 分钟后进行补偿量测定。<span className="text-primary">保密协议 A-12</span> 规定此类参数严禁外传。
                                    </div>
                                </div>

                                <p className="text-slate-600 leading-relaxed mt-8">
                                    这种热变形如果不加以补偿，将直接影响精密零件的尺寸精度。现代五轴系统通常配备实时温度传感器网络，配合 AI 算法进行动态补偿。
                                </p>
                            </>
                        )}
                        
                        {/* Placeholder for other pages */}
                        {activeNav !== '5-axis' && (
                            <div className="text-slate-500 italic mb-8">
                                <p>当前展示的是 {getActiveNodeLabel()} 的标准文档内容...</p>
                                <p className="mt-2">（在此处显示文档的常规段落、图片和图表）</p>
                            </div>
                        )}

                        {/* DYNAMIC CONTENT INJECTION AREA */}
                        {wikiUpdates[activeNav] && wikiUpdates[activeNav].map((update, index) => {
                            const isApproved = update.status === 'approved';
                            const isEditing = update.isEditing;

                            return (
                                <div 
                                    key={update.id} 
                                    className={`relative rounded-xl p-6 my-6 animate-fade-in-up transition-all duration-300
                                        ${isApproved 
                                            ? 'bg-white border-l-4 border-primary shadow-sm' 
                                            : 'bg-[#F0FDF4] border border-green-200 shadow-sm'
                                        }`}
                                >
                                    {/* Badge */}
                                    {!isApproved && (
                                        <div className="absolute -top-3 -right-3 bg-secondary-green text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">auto_awesome</span>
                                            AI 自动生成 • 待审核
                                        </div>
                                    )}
                                    
                                    <div className="flex gap-4">
                                        <div className="shrink-0 pt-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                                                ${isApproved ? 'bg-blue-50 text-primary' : 'bg-green-100 text-secondary-green'}`}>
                                                <span className="material-symbols-outlined text-sm">smart_toy</span>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            {/* Meta Header */}
                                            <div className={`text-xs font-bold mb-2 flex items-center gap-2 ${isApproved ? 'text-slate-400' : 'text-green-700'}`}>
                                                <span>来源: {update.source}</span>
                                                <span className={`w-1 h-1 rounded-full ${isApproved ? 'bg-slate-300' : 'bg-green-300'}`}></span>
                                                <span>{update.timestamp}</span>
                                                {isApproved && <span className="text-primary ml-2 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">verified</span> 已合并</span>}
                                            </div>
                                            
                                            {/* Content Body */}
                                            {isEditing ? (
                                                <div className="mb-4">
                                                    <textarea 
                                                        value={editContentBuffer}
                                                        onChange={(e) => setEditContentBuffer(e.target.value)}
                                                        className="w-full h-40 p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none font-mono leading-relaxed"
                                                    />
                                                    <div className="flex gap-2 mt-2 justify-end">
                                                        <button 
                                                            onClick={() => handleCancel(activeNav, update.id)}
                                                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded"
                                                        >
                                                            取消
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSave(activeNav, update.id)}
                                                            className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded hover:bg-blue-600"
                                                        >
                                                            保存修改
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                                                    {update.content}
                                                </div>
                                            )}
                                            
                                            {/* Action Toolbar (Only for Pending or Approved-but-editable) */}
                                            {!isEditing && !isApproved && (
                                                <div className="flex gap-3 mt-4 pt-4 border-t border-green-100">
                                                    <button 
                                                        onClick={() => handleApprove(activeNav, update.id)}
                                                        className="text-xs font-bold text-secondary-green hover:text-green-700 flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-lg transition-colors hover:bg-green-100"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">check</span> 批准合并
                                                    </button>
                                                    <button 
                                                        onClick={() => handleEdit(update)}
                                                        className="text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">edit</span> 编辑内容
                                                    </button>
                                                </div>
                                            )}

                                            {/* Approved Toolbar (Minimal) */}
                                            {!isEditing && isApproved && (
                                                 <div className="flex gap-3 mt-4 pt-4 border-t border-slate-50">
                                                     <button 
                                                        onClick={() => handleEdit(update)}
                                                        className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 hover:bg-slate-50 px-2 py-1 rounded"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">edit</span> 修订
                                                    </button>
                                                 </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                    </div>

                    {/* Author Footer */}
                    <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDC8fPE25dxGqxJO0uF8gqEzr8tpnan9Va4qYywBn2t3N2ipIDcUtyLCSEMYDjBBQ83q_f0JbkgcqtKrWBMzzkByw6qchbXU4ToO-ciLXZKhRTyVgTK980BgzuEfc9WOOu0HB__HOLE24y6IKzonY9bzKwLnKC4XKmQd2mlx4HEvYN7U_pckxi9BLHEV579LilqMIM1i2EjUONxARPo3ROT9bC-kd_JH3_Wuse98x9XeOH1PizBvYHCwG8gqA4MHJAlqclyzNNPV0fn')" }}></div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Alex Chen</p>
                                <p className="text-xs text-slate-500">技术研究员</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleRejectAll}
                                className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                拒绝修改
                            </button>
                            <button 
                                onClick={handleApproveAll}
                                className="px-5 py-2 text-sm font-bold bg-secondary-green text-white rounded-lg hover:bg-green-600 shadow-sm transition-colors flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">check</span>
                                批准并应用
                            </button>
                        </div>
                    </div>
                </div>

                {/* Floating Toolbar (Optional for nice UI touch) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white px-2 py-2 rounded-full flex gap-1 shadow-2xl z-20">
                     <button className="p-3 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-outlined text-xl">edit</span></button>
                     <button className="p-3 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-outlined text-xl">add_comment</span></button>
                     <button className="p-3 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-outlined text-xl">share</span></button>
                     <div className="w-px h-6 bg-white/20 my-auto mx-1"></div>
                     <button className="p-3 hover:bg-white/20 rounded-full transition-colors"><span className="material-symbols-outlined text-xl">more_horiz</span></button>
                </div>
            </main>

            {/* --- RIGHT SIDEBAR: WIKI BOT --- */}
            <aside className="w-[340px] bg-white border-l border-slate-200 flex-shrink-0 flex flex-col z-20 shadow-[-5px_0_20px_rgba(0,0,0,0.02)]">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 leading-tight">ProFabX-wikibot</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">在线</span>
                            </div>
                        </div>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA]">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {msg.role === 'model' && (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mt-1">
                                     <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEiMZnD0dv7UW3JYbyJjVMfaHszln-7vzleauMW3_a-DuLAVCHAUMRN4YeNWMfaJhxDJFunO6kQJLV-sDgmUkWqrWE01Om0bP9ttN7Fik5O9waMqBFX3rtA0Y5aDELoZayMPBoK3BlPE_CjcUSJMuii9bAyPNLkkgFbQe-v6mutw6KDxsLX4-Rh0JVIw0sLy3H5KTkShSde2SpV_LRr7mjkqwIJIlZ3agK53P1nRy0hck7CBblGHX256_OpUBLmzUy7TOEZV0cvjes" className="w-full h-full rounded-full object-cover opacity-80" alt="bot" />
                                </div>
                            )}
                            <div className={`
                                p-4 rounded-2xl shadow-sm border border-slate-100 text-sm leading-relaxed max-w-[85%]
                                ${msg.role === 'user' 
                                    ? 'bg-primary text-white rounded-tr-none' 
                                    : 'bg-white text-slate-600 rounded-tl-none'}
                            `}>
                                <p className="whitespace-pre-line">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    
                    {isTyping && (
                         <div className="flex gap-3">
                             <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mt-1">
                                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEiMZnD0dv7UW3JYbyJjVMfaHszln-7vzleauMW3_a-DuLAVCHAUMRN4YeNWMfaJhxDJFunO6kQJLV-sDgmUkWqrWE01Om0bP9ttN7Fik5O9waMqBFX3rtA0Y5aDELoZayMPBoK3BlPE_CjcUSJMuii9bAyPNLkkgFbQe-v6mutw6KDxsLX4-Rh0JVIw0sLy3H5KTkShSde2SpV_LRr7mjkqwIJIlZ3agK53P1nRy0hck7CBblGHX256_OpUBLmzUy7TOEZV0cvjes" className="w-full h-full rounded-full object-cover opacity-80" alt="bot" />
                            </div>
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-75"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></div>
                            </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="relative flex items-center">
                        <button className="absolute left-1.5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <span className="material-symbols-outlined text-xl">add_circle</span>
                        </button>
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="目录名 + 链接 (例如: CNC + http://...)"
                            className="w-full bg-slate-100 text-slate-800 pl-12 pr-12 py-3.5 rounded-full text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary border border-transparent transition-all"
                        />
                        <button 
                            onClick={handleSendMessage}
                            className={`absolute right-1.5 p-2 rounded-full shadow-md transition-colors ${chatInput.trim() ? 'bg-primary text-white hover:bg-blue-600' : 'bg-slate-200 text-slate-400'}`}
                            disabled={!chatInput.trim()}
                        >
                             <span className="material-symbols-outlined text-lg leading-none flex">send</span>
                        </button>
                    </div>
                </div>
            </aside>

        </div>
    );
};

export default ViewWiki;