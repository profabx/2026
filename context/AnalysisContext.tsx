import React, { createContext, useState, useContext, ReactNode } from 'react';
import { PROCESS_OPTIONS, MATERIAL_OPTIONS, FINISH_OPTIONS } from '../utils/constants';
import { Transaction } from '../types';

interface AnalysisContextType {
    selectedProcess: string;
    setSelectedProcess: (id: string) => void;
    selectedMaterial: string;
    setSelectedMaterial: (id: string) => void;
    selectedFinish: string;
    setSelectedFinish: (id: string) => void;
    quantity: number;
    setQuantity: (num: number) => void;
    
    // File state
    fileUrl: string | null;
    setFileUrl: (url: string | null) => void;
    fileName: string;
    setFileName: (name: string) => void;

    // Finance State
    financeTransactions: Transaction[];
    addFinanceTransaction: (t: Transaction) => void;
    deleteFinanceTransaction: (id: string) => void; // Hard delete
    toggleSoftDeleteTransaction: (id: string) => void; // Soft delete/Restore
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedProcess, setSelectedProcess] = useState(PROCESS_OPTIONS[2].id);
    const [selectedMaterial, setSelectedMaterial] = useState(MATERIAL_OPTIONS[0].id);
    const [selectedFinish, setSelectedFinish] = useState(FINISH_OPTIONS[2].id);
    const [quantity, setQuantity] = useState(50);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("XX项目 #P-2024-892");

    // Initial Mock Data for Finance
    const [financeTransactions, setFinanceTransactions] = useState<Transaction[]>([
        { 
            id: '1', 
            date: '2023-10-01', 
            type: 'EXPENSE',
            financeType: 'BUSINESS',
            amount: 1486.00, 
            category: 'Material', 
            summary: '*塑料制品*3D打印手板', 
            merchant: '东莞元风科技有限公司', 
            hasTicket: true,
            invoiceNumber: '2644200001072506661',
            taxId: '91441900MADHD1FK9R',
            spec: '-',
            unit: '套',
            quantity: 1,
            unitPrice: 1315.04,
            taxAmount: 170.96,
            taxRate: 0.13,
            remarks: '-'
        },
        { 
            id: '2', 
            date: '2023-10-03', 
            type: 'EXPENSE', 
            financeType: 'BUSINESS',
            amount: 1200.00, 
            category: 'Material', 
            summary: '*金属材料*铝合金板 6061', 
            merchant: '西南铝业有限公司', 
            hasTicket: true,
            invoiceNumber: '2644200001072501234',
            taxId: '9150010074747474X',
            spec: '100x100x10mm',
            unit: 'kg',
            quantity: 50,
            unitPrice: 21.24,
            taxAmount: 138.05,
            taxRate: 0.13,
            remarks: '加急配送'
        },
        { 
            id: '3', 
            date: '2023-10-05', 
            type: 'EXPENSE',
            financeType: 'TRANSFER', // 走账示例
            amount: 50000.00, 
            category: 'Transfer', 
            summary: '代付加工费', 
            merchant: '宁波某某精密', 
            hasTicket: true,
            invoiceNumber: '233000111222',
            unit: '批',
            quantity: 1,
            unitPrice: 48000,
            taxAmount: 2000,
            taxRate: 0,
            remarks: '客户指定走账'
        },
        { 
            id: '4', 
            date: '2023-10-05', 
            type: 'INCOME', // 对应走账收入
            financeType: 'TRANSFER', 
            amount: 50500.00, 
            category: 'Transfer', 
            summary: '代收加工费', 
            merchant: '上海某某科技', 
            hasTicket: true,
            invoiceNumber: '233000111223',
            unit: '批',
            quantity: 1,
            unitPrice: 50500,
            taxAmount: 0,
            taxRate: 0,
            remarks: '含500手续费'
        },
        { 
            id: '5', 
            date: '2023-10-06', 
            type: 'EXPENSE', 
            financeType: 'BUSINESS',
            amount: 300.00, 
            category: 'Meal', 
            summary: '加班餐费', 
            merchant: '美团外卖', 
            hasTicket: false,
            unit: '次',
            quantity: 1,
            unitPrice: 300,
            taxAmount: 0,
            taxRate: 0,
            isDeleted: true // 软删除示例
        },
    ]);

    const addFinanceTransaction = (t: Transaction) => {
        // Default new transactions to BUSINESS if not specified
        if (!t.financeType) t.financeType = 'BUSINESS';
        setFinanceTransactions(prev => [...prev, t]);
    };

    const deleteFinanceTransaction = (id: string) => {
        setFinanceTransactions(prev => prev.filter(t => t.id !== id));
    };

    const toggleSoftDeleteTransaction = (id: string) => {
        setFinanceTransactions(prev => prev.map(t => 
            t.id === id ? { ...t, isDeleted: !t.isDeleted } : t
        ));
    };

    return (
        <AnalysisContext.Provider value={{
            selectedProcess, setSelectedProcess,
            selectedMaterial, setSelectedMaterial,
            selectedFinish, setSelectedFinish,
            quantity, setQuantity,
            fileUrl, setFileUrl,
            fileName, setFileName,
            financeTransactions, addFinanceTransaction, deleteFinanceTransaction, toggleSoftDeleteTransaction
        }}>
            {children}
        </AnalysisContext.Provider>
    );
};

export const useAnalysis = () => {
    const context = useContext(AnalysisContext);
    if (!context) {
        throw new Error('useAnalysis must be used within an AnalysisProvider');
    }
    return context;
};
