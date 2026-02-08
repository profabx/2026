import React, { useState, useEffect, useRef } from 'react';
import { AppView, ChatMessage, Transaction } from '../types';
import { generateResponse } from '../services/geminiService';
import { useAnalysis } from '../context/AnalysisContext';
import { PROCESS_OPTIONS, MATERIAL_OPTIONS, FINISH_OPTIONS } from '../utils/constants';
import { GoogleGenAI } from "@google/genai";

interface ChatBotProps {
    currentView: AppView;
    onChangeView?: (view: AppView) => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ currentView, onChangeView }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Context for updating analysis state
    const { 
        setSelectedProcess, 
        setSelectedMaterial, 
        setSelectedFinish, 
        setQuantity, 
        setFileUrl, 
        setFileName,
        addFinanceTransaction
    } = useAnalysis();

    // Initial greeting based on view
    useEffect(() => {
        const getInitialMessage = (): ChatMessage => {
            let text = "你好！我是您的工程助手 ProFabX-bot。";
            if (currentView === AppView.ANALYSIS) text = "已为您生成 #P-2024-892 项目全景视图。DFM 评估已完成 75%。\n我可以帮您修改材料、工艺或导入新的 STL/Excel 文件。";
            if (currentView === AppView.FINANCE) text = "您好！财务助手已就绪。\n您可以**批量拖入**发票(JPG/PDF)或直接输入文字，我将自动提取：\n• 发票号码/税号\n• 商品明细与规格\n• 归类【销售收入】或【成本支出】";
            if (currentView === AppView.WIKI) text = "正在协助您审核 铝合金加工工艺 词条...";
            
            return {
                id: 'init',
                role: 'model',
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        };
        setMessages([getInitialMessage()]);
    }, [currentView]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const processNaturalLanguage = (text: string): string => {
        let response = "";
        let updated = false;
        const lowerText = text.toLowerCase();

        // 1. Match Quantity
        let qtyMatch = lowerText.match(/(?:数量|件数|qty|count)[^0-9]{0,5}?(\d+)/);
        if (!qtyMatch) {
            qtyMatch = lowerText.match(/(\d+)\s*(?:个|件|pcs)/);
        }

        if (qtyMatch) {
            const qty = parseInt(qtyMatch[1]);
            if (qty > 0) {
                setQuantity(qty);
                response += `\n✅ 已将数量更新为 ${qty} 件。`;
                updated = true;
            }
        }

        // 2. Match Material
        const matKeywords: Record<string, string> = {
            "铝合金": "al_6061", "6061": "al_6061", "aluminum": "al_6061",
            "7075": "al_7075",
            "不锈钢": "ss_304", "304": "ss_304", "316": "ss_316", "steel": "ss_304",
            "abs": "abs", "工程塑料": "abs", "plastic": "abs",
            "peek": "peek"
        };
        for (const [key, id] of Object.entries(matKeywords)) {
            if (lowerText.includes(key)) {
                setSelectedMaterial(id);
                const matName = MATERIAL_OPTIONS.find(m => m.id === id)?.label;
                response += `\n✅ 材料已切换为：${matName}。`;
                updated = true;
                break;
            }
        }

        // 3. Match Process
        const procKeywords: Record<string, string> = {
            "五轴": "cnc_5", "5轴": "cnc_5", "5-axis": "cnc_5",
            "四轴": "cnc_4", "4轴": "cnc_4", "4-axis": "cnc_4",
            "三轴": "cnc_3", "3轴": "cnc_3", "3-axis": "cnc_3",
            "slm": "3d_slm", "金属打印": "3d_slm", "metal print": "3d_slm",
            "sla": "3d_sla", "树脂": "3d_sla", "3d打印": "3d_sla", "3d print": "3d_sla",
            "cnc": "cnc_3"
        };
        for (const [key, id] of Object.entries(procKeywords)) {
             if (lowerText.includes(key)) {
                setSelectedProcess(id);
                const procName = PROCESS_OPTIONS.find(p => p.id === id)?.label;
                response += `\n✅ 工艺已更为：${procName}。`;
                updated = true;
                break;
            }
        }

        // 4. Match Finish
        const finishKeywords: Record<string, string> = {
            "标准": "standard", "去毛刺": "standard", "standard": "standard",
            "喷砂": "bead_blast", "blast": "bead_blast",
            "黑色": "anodize_bk", "黑阳": "anodize_bk", "black": "anodize_bk",
            "本色": "anodize_nat", "原色": "anodize_nat", "natural": "anodize_nat",
            "粉末": "powder", "喷涂": "powder", "powder": "powder",
            "抛光": "polish", "polish": "polish"
        };
        for (const [key, id] of Object.entries(finishKeywords)) {
            if (lowerText.includes(key)) {
               setSelectedFinish(id);
               const finishName = FINISH_OPTIONS.find(f => f.id === id)?.label;
               response += `\n✅ 后处理已更为：${finishName}。`;
               updated = true;
               break;
           }
       }
       
       return response;
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const newUserMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: inputValue,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            const nlpResponse = processNaturalLanguage(newUserMsg.text);
            
            if (nlpResponse) {
                await new Promise(resolve => setTimeout(resolve, 600));
                const responseMsg: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'model',
                    text: `收到修改指令。${nlpResponse}\n\n报价已自动更新。`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setMessages(prev => [...prev, responseMsg]);
            } else {
                const response = await generateResponse(newUserMsg.text, currentView);
                setMessages(prev => [...prev, response]);
            }
        } finally {
            setIsTyping(false);
        }
    };

    // --- Helper to clean JSON string from Markdown ---
    const cleanJsonString = (str: string) => {
        // Handle common markdown json wrappers
        let clean = str.replace(/```json\n?|```/g, '').trim();
        // Sometimes models add explanatory text before/after
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            clean = clean.substring(firstBrace, lastBrace + 1);
        }
        return clean;
    };

    const processFinanceFile = async (file: File): Promise<{ success: boolean; data?: Transaction; error?: string }> => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                    const result = reader.result?.toString() || '';
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
            });

            // STRICT LOGIC Prompt for correct Purchaser/Seller identification
            const prompt = `
                Role: Financial Accountant AI.
                Task: Extract data from this invoice (Image/PDF) to JSON.
                
                MY IDENTITY (The User):
                - Company Name: 宁波微星硬创科技有限公司 (Ningbo Weixing / ProFabX)
                
                CRITICAL LOGIC FOR "TYPE" (INCOME vs EXPENSE):
                1.  Analyze the layout to find "Purchaser" (购买方) and "Seller" (销售方) sections.
                2.  CHECK PURCHASER:
                    - If "Purchaser" field contains "宁波微星" or "ProFabX" => RETURN "EXPENSE". (I am paying).
                3.  CHECK SELLER:
                    - If "Seller" field contains "宁波微星" or "ProFabX" => RETURN "INCOME". (I am selling).
                4.  DEFAULT:
                    - If neither matches perfectly, assume "EXPENSE".
                
                EXAMPLE SCENARIO:
                - If Seller is "东莞元风科技有限公司" and Purchaser is "宁波微星硬创科技有限公司" -> TYPE must be "EXPENSE".
                
                EXTRACTION FIELDS:
                - merchant: 
                    * If EXPENSE, merchant is the Seller Name.
                    * If INCOME, merchant is the Purchaser Name.
                - invoiceNumber: 发票号码
                - taxId: The OTHER party's Tax ID.
                - amount: 价税合计 (Total Amount with Tax).
                - summary: The main product name (项目名称).
                
                JSON Format:
                {
                    "date": "YYYY-MM-DD",
                    "invoiceNumber": "string",
                    "merchant": "string",
                    "taxId": "string",
                    "summary": "string",
                    "spec": "string",
                    "unit": "string",
                    "quantity": number,
                    "unitPrice": number,
                    "amount": number,
                    "taxAmount": number,
                    "taxRate": number,
                    "remarks": "string",
                    "type": "INCOME" | "EXPENSE"
                }
            `;

            // Using gemini-2.0-flash for high accuracy
            const result = await ai.models.generateContent({
                model: 'gemini-2.0-flash', 
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: file.type, data: base64Data } }
                    ]
                }
            });

            const responseText = result.text || "";
            
            let data;
            try {
                const cleanedText = cleanJsonString(responseText);
                data = JSON.parse(cleanedText);
            } catch (e) {
                console.error("JSON Parse Error:", e, responseText);
                return { success: false, error: "AI 返回格式无法解析" };
            }

            const newTransaction: Transaction = {
                id: Date.now().toString() + Math.random(),
                date: data.date || new Date().toISOString().split('T')[0],
                type: (data.type === 'INCOME' || data.type === 'EXPENSE') ? data.type : 'EXPENSE',
                financeType: 'BUSINESS', // Default to BUSINESS for OCR
                amount: Number(data.amount) || 0,
                category: 'Business',
                summary: data.summary || '未命名项目',
                merchant: data.merchant || '未知单位',
                hasTicket: true,
                fileUrl: URL.createObjectURL(file),
                // Detailed fields
                invoiceNumber: data.invoiceNumber || '-',
                taxId: data.taxId || '-',
                spec: data.spec || '-',
                unit: data.unit || '-',
                quantity: Number(data.quantity) || 1,
                unitPrice: Number(data.unitPrice) || Number(data.amount),
                taxAmount: Number(data.taxAmount) || 0,
                taxRate: Number(data.taxRate) || 0,
                remarks: data.remarks || '-'
            };
            
            addFinanceTransaction(newTransaction);
            return { success: true, data: newTransaction };

        } catch (error: any) {
            console.error("Finance OCR Failed", error);
            // Friendly error message mapping
            let msg = "识别服务异常";
            if (error.message?.includes('404')) msg = "模型未找到 (请检查API权限或区域)";
            if (error.message?.includes('400')) msg = "请求格式错误 (文件可能过大)";
            if (error.message?.includes('429')) msg = "请求过于频繁 (Rate Limit)";
            return { success: false, error: msg };
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const fileArray: File[] = Array.from(files);
        const fileCount = fileArray.length;

        // User message
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: `上传了 ${fileCount} 个文件`,
            type: 'file',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        // --- Finance View Logic (Batch OCR) ---
        if (currentView === AppView.FINANCE) {
            const results: string[] = [];
            let successCount = 0;

            const promises = fileArray.map(async (file) => {
                const isImage = file.type.startsWith('image/');
                const isPDF = file.type === 'application/pdf';

                if (!isImage && !isPDF) {
                    return `❌ ${file.name}: 格式不支持`;
                }

                const res = await processFinanceFile(file);
                if (res.success && res.data) {
                    successCount++;
                    const typeLabel = res.data.type === 'INCOME' ? '🟢 销售收入' : '🔴 成本支出';
                    return `✅ ${file.name}\n   ${typeLabel} | ¥${res.data.amount}\n   ${res.data.summary}`;
                } else {
                    return `❌ ${file.name}: ${res.error}`;
                }
            });

            const processedResults = await Promise.all(promises);

            const summaryMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                text: `📊 **处理完成** (${successCount}/${fileCount})\n\n${processedResults.join('\n\n')}\n\n已自动填入财务明细表中。`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            
            setMessages(prev => [...prev, summaryMsg]);
            setIsTyping(false);
        } 
        else {
             // ... existing logic for other views
            const file = fileArray[0];
            setTimeout(() => {
                let replyText = `文件 "${file.name}" 上传成功。`;
                const botMsg: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'model',
                    text: replyText,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setMessages(prev => [...prev, botMsg]);
                setIsTyping(false);
            }, 1000);
        }
        
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-primary shadow-sm">
                        <span className="material-symbols-outlined filled">smart_toy</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 leading-none text-base">ProFabX-bot</h3>
                        <p className="text-xs text-secondary-green font-bold mt-1.5 flex items-center gap-1.5">
                            在线 • AI 助手
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <button className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                     </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scroll bg-[#F8F9FA]">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center mt-1 border border-blue-100">
                                <span className="material-symbols-outlined text-primary text-xs">smart_toy</span>
                            </div>
                        )}
                        
                        <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-3.5 text-sm shadow-sm
                                ${msg.role === 'user' 
                                    ? 'bg-primary text-white rounded-2xl rounded-tr-sm' 
                                    : 'bg-white text-slate-700 rounded-2xl rounded-tl-sm border border-slate-100'
                                }`}>
                                {msg.type === 'file' && (
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
                                        <span className="material-symbols-outlined text-lg">description</span>
                                        <span className="font-bold">文件附件</span>
                                    </div>
                                )}
                                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 mx-1">{msg.timestamp}</span>
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                   <div className="flex gap-3 max-w-[90%]">
                       <div className="w-8 h-8 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center border border-blue-100">
                           <span className="material-symbols-outlined text-primary text-xs">smart_toy</span>
                       </div>
                       <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 border border-slate-100 shadow-sm">
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></div>
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-75"></div>
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></div>
                       </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <div className="relative flex items-center group gap-2">
                    <label className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-primary hover:bg-slate-50 cursor-pointer transition-colors" title="批量上传发票">
                        <span className="material-symbols-outlined text-xl">attach_file</span>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            className="hidden" 
                            accept=".pdf,image/jpeg,image/png,.stl,.stp" 
                            multiple
                            onChange={handleFileUpload}
                        />
                    </label>
                    <div className="relative flex-1">
                        <input 
                            className="w-full bg-slate-50 text-slate-800 px-4 py-3.5 rounded-full text-sm border-transparent focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/10 placeholder-slate-400 font-medium transition-all" 
                            placeholder={currentView === AppView.FINANCE ? "批量上传发票或输入..." : "输入指令..."}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                         <button 
                            onClick={handleSendMessage}
                            className={`absolute right-1.5 top-1.5 p-2 rounded-full transition-all duration-200
                                ${inputValue.trim() 
                                    ? 'bg-primary text-white shadow-md hover:bg-primary-dark hover:scale-105' 
                                    : 'text-slate-300 bg-transparent cursor-not-allowed'}`}
                        >
                            <span className="material-symbols-outlined text-lg leading-none flex items-center justify-center">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatBot;