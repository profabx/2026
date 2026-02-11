import React, { useState, useRef, useEffect } from 'react';
import ChatBot from './ChatBot';
import { AppView } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    currentView: AppView;
    onChangeView: (view: AppView) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
    // Navigation items
    const navItems = [
        { id: AppView.DASHBOARD, label: '首页' },
        { id: AppView.PROJECTS, label: '项目列表' },
        { id: AppView.ANALYSIS, label: '项目分析' },
        { id: AppView.FINANCE, label: '财务' },
        { id: AppView.WIKI, label: 'Wiki知识库' },
    ];

    // Only show the global generic chatbot on non-Wiki views.
    // The Wiki view has its own integrated specialized sidebar.
    const showGlobalChat = currentView !== AppView.WIKI;

    // Right-side ProFabX-bot collapse state
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);
    const [chatWidth, setChatWidth] = useState(360);
    const [isResizing, setIsResizing] = useState(false);

    const sidebarRef = useRef<HTMLDivElement | null>(null);
    const startXRef = useRef(0);
    const startWidthRef = useRef(360);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!sidebarRef.current) return;
            const deltaX = startXRef.current - e.clientX;
            let newWidth = startWidthRef.current + deltaX;

            const MIN_WIDTH = 260;
            const MAX_WIDTH = 520;
            if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
            if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;

            setChatWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!sidebarRef.current || isChatCollapsed) return;
        startXRef.current = e.clientX;
        startWidthRef.current = sidebarRef.current.offsetWidth || chatWidth;
        setIsResizing(true);
    };

    return (
        <div className="flex h-screen w-full bg-white overflow-hidden flex-col font-body">
            {/* Top Navigation Header */}
            <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6 shrink-0 z-40 relative shadow-sm">
                
                {/* Left Side: Logo and Nav */}
                <div className="flex items-center h-full flex-1">
                    {/* Logo */}
                    <div className="flex items-center gap-2 text-primary font-bold text-xl shrink-0 mr-8">
                        <span className="material-symbols-outlined text-3xl">precision_manufacturing</span>
                        <span className="hidden md:inline">ProFabX</span>
                    </div>

                    {/* Divider - Visual separation */}
                    <div className="h-6 w-px bg-slate-200 hidden md:block mr-8"></div>

                    {/* Navigation - shifted right via margin/separation */}
                    <nav className="flex items-center gap-2 overflow-x-auto hide-scrollbar h-full py-2">
                        {navItems.map((item) => {
                            const isActive = currentView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onChangeView(item.id)}
                                    className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 border border-transparent
                                        ${isActive 
                                            ? 'bg-blue-50 text-primary border-blue-100' 
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
                
                {/* Right Side Actions */}
                 <div className="flex items-center gap-4 shrink-0 pl-4">
                     <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors rounded-full hover:bg-slate-50">
                        <span className="material-symbols-outlined">search</span>
                     </button>
                     <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors rounded-full hover:bg-slate-50 relative">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                     </button>
                 </div>
            </header>

            {/* Main Layout Body */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Main Content Area */}
                <main className={`flex-1 overflow-y-auto overflow-x-hidden bg-background-light custom-scroll ${currentView === AppView.WIKI ? '' : 'p-4 lg:p-8'}`}>
                    <div className={`${currentView === AppView.WIKI ? 'h-full' : 'max-w-7xl mx-auto min-h-full'}`}>
                        {children}
                    </div>
                </main>
                
                {/* Right Sidebar (Global Chat: ProFabX-bot) - Collapsible & Resizable */}
                {showGlobalChat && (
                    <div
                        ref={sidebarRef}
                        className={`relative h-full hidden xl:flex flex-col border-l border-slate-200 bg-white shadow-[0_0_15px_rgba(0,0,0,0.03)] z-20 transition-all duration-300 ${
                            isChatCollapsed ? 'w-12' : ''
                        }`}
                        style={!isChatCollapsed ? { width: chatWidth, cursor: isResizing ? 'col-resize' as const : 'default' } : undefined}
                    >
                        {isChatCollapsed ? (
                            <button
                                onClick={() => setIsChatCollapsed(false)}
                                className="flex-1 flex flex-col items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-50"
                                title="展开 ProFabX-bot"
                            >
                                <span className="material-symbols-outlined text-xl mb-1">smart_toy</span>
                                <span className="text-[10px] font-bold [writing-mode:vertical-rl]">ProFabX-bot</span>
                            </button>
                        ) : (
                            <>
                                {/* Drag handle for resizing width */}
                                <div
                                    onMouseDown={handleResizeStart}
                                    className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-30 hover:bg-blue-100/40"
                                />
                                <button
                                    onClick={() => setIsChatCollapsed(true)}
                                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 rounded-l-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-400 hover:text-primary hover:bg-blue-50"
                                    title="折叠 ProFabX-bot"
                                >
                                    <span className="material-symbols-outlined text-base">chevron_right</span>
                                </button>
                                <ChatBot currentView={currentView} onChangeView={onChangeView} />
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Layout;