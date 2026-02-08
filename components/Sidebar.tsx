import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
    currentView: AppView;
    onChangeView: (view: AppView) => void;
    isMobileMenuOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isMobileMenuOpen }) => {
    const navItems = [
        { id: AppView.DASHBOARD, icon: 'home', label: '首页' },
        { id: AppView.PROJECTS, icon: 'inventory_2', label: '项目列表' },
        { id: AppView.ANALYSIS, icon: 'deployed_code', label: '项目分析' },
        { id: AppView.FINANCE, icon: 'monitoring', label: '财务' },
        { id: AppView.WIKI, icon: 'menu_book', label: 'Wiki知识库' },
        { id: AppView.PERSONAL, icon: 'person', label: '个人中心' },
    ];

    const sidebarClasses = `
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
    `;

    return (
        <aside className={sidebarClasses}>
            <div className="h-full flex flex-col">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-primary font-bold text-xl">
                        <span className="material-symbols-outlined text-3xl">precision_manufacturing</span>
                        ProFabX
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onChangeView(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm
                                ${currentView === item.id 
                                    ? 'bg-blue-50 text-primary' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <span className={`material-symbols-outlined ${currentView === item.id ? 'filled' : ''}`}>
                                {item.icon}
                            </span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* User Profile Snippet */}
                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBEiMZnD0dv7UW3JYbyJjVMfaHszln-7vzleauMW3_a-DuLAVCHAUMRN4YeNWMfaJhxDJFunO6kQJLV-sDgmUkWqrWE01Om0bP9ttN7Fik5O9waMqBFX3rtA0Y5aDELoZayMPBoK3BlPE_CjcUSJMuii9bAyPNLkkgFbQe-v6mutw6KDxsLX4-Rh0JVIw0sLy3H5KTkShSde2SpV_LRr7mjkqwIJIlZ3agK53P1nRy0hck7CBblGHX256_OpUBLmzUy7TOEZV0cvjes')" }}></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">首席工程师</p>
                            <p className="text-xs text-slate-500 truncate">Online</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;