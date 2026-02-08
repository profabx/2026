export const PROCESS_OPTIONS = [
    { id: 'cnc_3', label: 'CNC 三轴加工', multiplier: 1.0, baseFee: 200 },
    { id: 'cnc_4', label: 'CNC 四轴加工', multiplier: 1.3, baseFee: 350 },
    { id: 'cnc_5', label: 'CNC 五轴联动', multiplier: 1.8, baseFee: 500 },
    { id: '3d_sla', label: '3D打印 (SLA树脂)', multiplier: 0.6, baseFee: 50 },
    { id: '3d_slm', label: '3D打印 (SLM金属)', multiplier: 2.5, baseFee: 600 },
];

export const MATERIAL_OPTIONS = [
    { id: 'al_6061', label: '铝合金 6061-T6', density: 2.7, costPerG: 0.5 },
    { id: 'al_7075', label: '铝合金 7075', density: 2.8, costPerG: 0.8 },
    { id: 'ss_304', label: '不锈钢 304', density: 7.93, costPerG: 0.6 },
    { id: 'ss_316', label: '不锈钢 316L', density: 7.98, costPerG: 0.9 },
    { id: 'abs', label: '工程塑料 ABS', density: 1.04, costPerG: 0.15 },
    { id: 'peek', label: '特种塑料 PEEK', density: 1.32, costPerG: 4.5 },
];

export const FINISH_OPTIONS = [
    { id: 'standard', label: '标准去毛刺', multiplier: 1.0 },
    { id: 'bead_blast', label: '喷砂 (120目)', multiplier: 1.1 },
    { id: 'anodize_bk', label: '阳极氧化 - 黑色', multiplier: 1.25 },
    { id: 'anodize_nat', label: '阳极氧化 - 本色', multiplier: 1.2 },
    { id: 'powder', label: '粉末喷涂', multiplier: 1.3 },
    { id: 'polish', label: '手工抛光 (Ra0.4)', multiplier: 1.8 },
];