import React, { useState } from 'react';
import Layout from './components/Layout';
import ViewDashboard from './views/ViewDashboard';
import ViewAnalysis from './views/ViewAnalysis';
import ViewFinance from './views/ViewFinance';
import ViewWiki from './views/ViewWiki';
import { AppView } from './types';
import { AnalysisProvider } from './context/AnalysisContext';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

    const renderContent = () => {
        switch (currentView) {
            case AppView.DASHBOARD:
                return <ViewDashboard />;
            case AppView.ANALYSIS:
                return <ViewAnalysis />;
            case AppView.FINANCE:
                return <ViewFinance />;
            case AppView.WIKI:
                return <ViewWiki />;
            default:
                return (
                    <div className="flex items-center justify-center h-full text-slate-400 flex-col gap-4">
                        <span className="material-symbols-outlined text-6xl">construction</span>
                        <p>该模块正在建设中 (Work in Progress)</p>
                    </div>
                );
        }
    };

    return (
        <AnalysisProvider>
            <Layout currentView={currentView} onChangeView={setCurrentView}>
                {renderContent()}
            </Layout>
        </AnalysisProvider>
    );
};

export default App;