import { ChatMessage } from '../types';

// In a real app, this would use the Gemini API. 
// For this UI demo, we simulate responses based on context.

export const generateResponse = async (
    message: string, 
    context: string
): Promise<ChatMessage> => {
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    let responseText = "我明白了。需要我为您提供更详细的报告吗？";
    let type: 'text' | 'analysis' = 'text';

    if (context === 'FINANCE' && message.includes('盈利')) {
        responseText = "正在对比Q2与Q3的原材料数据...\n\nQ2 原材料占比: 52%\nQ3 原材料占比: 60% ⬆\n\n建议：钢材价格上涨导致成本增加15%，建议寻找替代供应商。";
    } else if (context === 'ANALYSIS' && message.includes('优化')) {
        responseText = "已为您生成风险-优化映射视图。您可以直观地看到每个潜在加工风险对应的 AI 解决方案。";
        type = 'analysis';
    } else if (context === 'WIKI' && message.includes('审核')) {
        responseText = "主管您好，我是 ProFabX-wikibot。关于您刚查看的“五轴热补偿”修订，我已识别出潜在的技术敏感词。";
    }

    return {
        id: Date.now().toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: type
    };
};
