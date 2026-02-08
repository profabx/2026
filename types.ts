
export enum AppView {
    DASHBOARD = 'DASHBOARD',
    PROJECTS = 'PROJECTS',
    ANALYSIS = 'ANALYSIS',
    FINANCE = 'FINANCE',
    WIKI = 'WIKI',
    PERSONAL = 'PERSONAL'
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: string;
    type?: 'text' | 'analysis' | 'image' | 'file';
    metadata?: any;
}

export interface ProjectItem {
    id: string;
    name: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'WARNING';
    progress: number;
    owner: string;
    date: string;
}

export interface Transaction {
    id: string;
    date: string;
    type: 'INCOME' | 'EXPENSE';
    financeType: 'BUSINESS' | 'TRANSFER'; // BUSINESS=经营, TRANSFER=走账
    amount: number; // 价税合计 (Total Amount)
    category: string; // 宽泛分类 (Material, Meal, etc.)
    summary: string; // 项目名称 (Item Name)
    merchant: string; // 对方单位 (Counterparty)
    hasTicket: boolean;
    fileUrl?: string;

    // State flags
    isDeleted?: boolean;
    isDuplicate?: boolean;

    // Detailed Invoice Fields
    invoiceNumber?: string; // 发票号码
    taxId?: string; // 对方税号
    spec?: string; // 规格型号
    unit?: string; // 单位
    quantity?: number; // 数量
    unitPrice?: number; // 单价
    taxAmount?: number; // 税额
    taxRate?: number; // 税率 (e.g. 0.13)
    remarks?: string; // 备注
}
