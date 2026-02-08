import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useAnalysis } from '../context/AnalysisContext';
import { PROCESS_OPTIONS, MATERIAL_OPTIONS, FINISH_OPTIONS } from '../utils/constants';

interface AnalysisData {
    dimensions: { x: number; y: number; z: number };
    volume: number;
    weight: number; // in grams (assuming Aluminum)
    minWallThickness: number;
    analyzing: boolean;
}

// Custom Dropdown Component
const CustomSelect = ({ 
    label, 
    value, 
    options, 
    onChange 
}: { 
    label: string, 
    value: string, 
    options: any[], 
    onChange: (val: string) => void 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(opt => opt.id === value)?.label || value;

    return (
        <div className={`flex flex-col gap-1.5 py-1 px-1 transition-colors hover:bg-slate-50/50 rounded-lg relative ${isOpen ? 'z-50' : 'z-auto'}`} ref={containerRef}>
            <label className="text-xs text-slate-500 font-bold ml-1">{label}</label>
            <div className="relative w-full">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between bg-slate-50 border ${isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none transition-all cursor-pointer hover:bg-white hover:border-slate-300`}
                >
                    <span className="truncate">{selectedLabel}</span>
                    <span className={`material-symbols-outlined text-slate-400 text-xl transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
                </button>
                
                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-700 border border-slate-600 rounded-xl shadow-2xl py-2 animate-fade-in-up flex flex-col overflow-hidden ring-1 ring-black/5">
                        {options.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => {
                                    onChange(opt.id);
                                    setIsOpen(false);
                                }}
                                className={`text-left px-4 py-2.5 text-sm font-bold transition-colors flex items-center justify-between
                                    ${opt.id === value 
                                        ? 'bg-primary text-white' 
                                        : 'text-slate-200 hover:bg-slate-600'
                                    }`}
                            >
                                <span className="truncate mr-2">{opt.label}</span>
                                {opt.id === value && <span className="material-symbols-outlined text-sm font-bold flex-shrink-0">check</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ViewAnalysis: React.FC = () => {
    // Context State
    const { 
        selectedProcess, setSelectedProcess,
        selectedMaterial, setSelectedMaterial,
        selectedFinish, setSelectedFinish,
        quantity, setQuantity,
        fileUrl, setFileUrl,
        fileName, setFileName
    } = useAnalysis();

    // Local UI State
    const [isOptimized, setIsOptimized] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    
    // Analysis State
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [loadingProgress, setLoadingProgress] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Refs
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const frameIdRef = useRef<number>(0);
    const detailsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Watch for fileUrl changes from Context (e.g. ChatBot uploads)
    useEffect(() => {
        if (fileUrl && fileUrl !== '') {
            // Check if it's a mock STL url or blob
            if (fileName.toLowerCase().endsWith('.stp') || fileName.toLowerCase().endsWith('.step')) {
                // Mock STP logic (visualize existing logic)
                mockLoadSTP();
            } else {
                 loadSTL(fileUrl);
            }
        }
    }, [fileUrl]); 

    // Price Calculation Logic
    const quote = useMemo(() => {
        if (!analysisData) return { total: 0, unit: 0, weight: 0, breakdown: { material: 0, machining: 0, finish: 0, setup: 0 } };

        const process = PROCESS_OPTIONS.find(p => p.id === selectedProcess)!;
        const material = MATERIAL_OPTIONS.find(m => m.id === selectedMaterial)!;
        const finish = FINISH_OPTIONS.find(f => f.id === selectedFinish)!;

        // Recalculate weight based on selected material density
        // Analysis volume is in mm^3, convert to cm^3 for density calc (mm^3 / 1000)
        const volumeCm3 = analysisData.volume / 1000;
        const estimatedWeight = volumeCm3 * material.density;

        // Base manufacturing cost formula (Simplified)
        // Material Cost + (Volume * Complexity Factor) + Base Setup Fee
        const materialCost = estimatedWeight * material.costPerG;
        const machiningCost = (volumeCm3 * 2.5) * process.multiplier; // Proxy for time
        const finishCost = (materialCost + machiningCost) * (finish.multiplier - 1);
        
        const singlePartCost = materialCost + machiningCost + finishCost;
        
        // Setup fee amortized over quantity
        const amortizedSetupFee = process.baseFee / quantity;

        // Quantity Discount Logic (Linear interpolation for demo)
        let qtyDiscount = 1;
        if (quantity > 10) qtyDiscount = 0.95;
        if (quantity > 50) qtyDiscount = 0.85;
        if (quantity > 100) qtyDiscount = 0.75;
        if (quantity > 500) qtyDiscount = 0.60;

        const unitPrice = (singlePartCost + amortizedSetupFee) * qtyDiscount;
        const totalPrice = unitPrice * quantity;

        // Return breakdown for details view
        return {
            total: totalPrice,
            unit: unitPrice,
            weight: estimatedWeight,
            breakdown: {
                material: materialCost * qtyDiscount,
                machining: machiningCost * qtyDiscount,
                finish: finishCost * qtyDiscount,
                setup: amortizedSetupFee * qtyDiscount
            }
        };
    }, [analysisData, selectedProcess, selectedMaterial, selectedFinish, quantity]);

    // Handle Details Modal Logic
    const handleOpenDetails = () => {
        if (!analysisData) return;
        setShowDetails(true);
        
        // Clear existing timer if any
        if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);
        
        // Set 20s auto-close timer
        detailsTimerRef.current = setTimeout(() => {
            setShowDetails(false);
            detailsTimerRef.current = null;
        }, 20000);
    };

    const handleCloseDetails = () => {
        setShowDetails(false);
        if (detailsTimerRef.current) {
            clearTimeout(detailsTimerRef.current);
            detailsTimerRef.current = null;
        }
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (detailsTimerRef.current) clearTimeout(detailsTimerRef.current);
        };
    }, []);

    const handleExportQuote = () => {
        const quoteNo = `QT-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random()*1000).toString().padStart(3, '0')}`;
        const date = new Date().toLocaleDateString('zh-CN');
        const totalWithTax = quote.total * 1.13;
        const taxAmount = quote.total * 0.13;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>报价单_${fileName}</title>
                <style>
                    body { font-family: 'SimSun', 'Songti SC', serif; padding: 40px; color: #333; max-width: 1000px; margin: 0 auto; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4285F4; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: bold; color: #4285F4; display: flex; align-items: center; gap: 10px; }
                    .title { font-size: 32px; font-weight: bold; text-align: right; color: #333; }
                    .meta { text-align: right; font-size: 14px; margin-top: 10px; color: #666; line-height: 1.5; }
                    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 40px; }
                    .party { flex: 1; background: #f8f9fa; padding: 20px; border-radius: 8px; }
                    .party-title { font-size: 12px; color: #888; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }
                    .company-name { font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #000; }
                    .company-info { font-size: 13px; line-height: 1.6; color: #555; }
                    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .table th { text-align: left; background: #4285F4; color: white; padding: 12px; font-size: 13px; font-weight: bold; }
                    .table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                    .table tr:nth-child(even) { background-color: #fcfcfc; }
                    .total-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
                    .total-box { width: 350px; }
                    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                    .total-row.final { border-top: 2px solid #4285F4; margin-top: 10px; padding-top: 15px; font-size: 20px; font-weight: bold; color: #4285F4; }
                    .terms { background: #fff; border: 1px solid #eee; padding: 20px; border-radius: 8px; font-size: 12px; color: #666; }
                    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
                    @media print {
                        body { padding: 0; }
                        .party { background: none; border: 1px solid #eee; }
                        .table th { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="#4285F4"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
                        ProFabX
                    </div>
                    <div>
                        <div class="title">报价单 QUOTATION</div>
                        <div class="meta">
                            <div><strong>单号 (No.):</strong> ${quoteNo}</div>
                            <div><strong>日期 (Date):</strong> ${date}</div>
                        </div>
                    </div>
                </div>

                <div class="parties">
                    <div class="party">
                        <div class="party-title">甲方 (需方 Client)</div>
                        <div class="company-name">宁波高新区阶梯科技有限公司</div>
                        <div class="company-info">
                            地址：浙江省宁波市高新区聚贤路<br>
                            联系人：采购部<br>
                            备注：高精密仪器研发合作伙伴
                        </div>
                    </div>
                    <div class="party">
                        <div class="party-title">乙方 (供方 Provider)</div>
                        <div class="company-name">宁波微星硬创科技有限公司</div>
                        <div class="company-info">
                            地址：浙江省宁波市鄞州区金谷中路（东钱湖工业区）<br>
                            联系人：大客户经理 - 张伟<br>
                            电话：0574-8888-6666<br>
                            简介：专注于高精度零件加工与快速成型服务
                        </div>
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th width="30%">项目名称</th>
                            <th width="40%">规格与工艺</th>
                            <th width="10%">数量</th>
                            <th width="10%" style="text-align:right">单价</th>
                            <th width="10%" style="text-align:right">金额</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight:bold">${fileName}</td>
                            <td>
                                <div style="font-weight:bold;margin-bottom:4px;">加工方式: ${PROCESS_OPTIONS.find(p => p.id === selectedProcess)?.label}</div>
                                <div style="color:#666;font-size:12px;">材料: ${MATERIAL_OPTIONS.find(m => m.id === selectedMaterial)?.label}</div>
                                <div style="color:#666;font-size:12px;">后处理: ${FINISH_OPTIONS.find(f => f.id === selectedFinish)?.label}</div>
                                <div style="color:#666;font-size:12px;margin-top:4px;">尺寸: ${analysisData?.dimensions.x.toFixed(0)}x${analysisData?.dimensions.y.toFixed(0)}x${analysisData?.dimensions.z.toFixed(0)}mm</div>
                            </td>
                            <td>${quantity}</td>
                            <td style="text-align:right">¥${quote.unit.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                            <td style="text-align:right">¥${quote.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="total-box">
                        <div class="total-row">
                            <span>小计 (Subtotal):</span>
                            <span>¥ ${quote.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div class="total-row">
                            <span>增值税 (VAT 13%):</span>
                            <span>¥ ${taxAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div class="total-row final">
                            <span>总计 (Total):</span>
                            <span>¥ ${totalWithTax.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>

                <div class="terms">
                    <strong>备注条款 (Terms & Conditions):</strong>
                    <ol style="margin-left: 20px; margin-top: 10px; line-height: 1.8;">
                        <li><strong>报价有效期：</strong>本报价单有效期为 15 天，逾期请重新询价。</li>
                        <li><strong>交货周期：</strong>预计在确认订单及预付款后 5-7 个工作日内发货（具体视工厂排期而定）。</li>
                        <li><strong>付款方式：</strong>合同签订后预付 30% 定金，发货前付清 70% 尾款。</li>
                        <li><strong>质量标准：</strong>依据 ISO 2768-m 公差标准执行，除非图纸另有特殊标注。</li>
                        <li><strong>发票信息：</strong>以上价格已包含 13% 增值税专用发票。</li>
                    </ol>
                </div>

                <div class="footer">
                    ProFabX System Generated Quote | 宁波微星硬创科技有限公司 | www.profabx-mock.com
                </div>
                <script>
                    setTimeout(() => { window.print(); }, 500);
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
        } else {
            alert("请允许弹出窗口以生成报价单");
        }
    };

    // Initialize Three.js Scene
    useEffect(() => {
        if (!mountRef.current) return;

        // Cleanup existing renderer if any
        while(mountRef.current.firstChild) {
            mountRef.current.removeChild(mountRef.current.firstChild);
        }

        try {
            // Scene Setup
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf8fafc); // Slate-50 equivalent
            // Add subtle grid
            const gridHelper = new THREE.GridHelper(500, 100, 0xe2e8f0, 0xf1f5f9);
            scene.add(gridHelper);

            // Lights - Improved lighting for 3D visibility
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambientLight);
            
            const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
            mainLight.position.set(100, 100, 100);
            scene.add(mainLight);

            const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
            fillLight.position.set(-100, 50, -100);
            scene.add(fillLight);

            // Camera
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;
            const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
            camera.position.set(100, 100, 100);

            // Renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance optimization
            mountRef.current.appendChild(renderer.domElement);

            // Controls
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            
            // Refs assignment
            sceneRef.current = scene;
            cameraRef.current = camera;
            rendererRef.current = renderer;
            controlsRef.current = controls;

            // Animation Loop
            const animate = () => {
                frameIdRef.current = requestAnimationFrame(animate);
                if (controlsRef.current) controlsRef.current.update();
                if (rendererRef.current && sceneRef.current && cameraRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                }
            };
            animate();

            // Handle Resize
            const handleResize = () => {
                if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
                const newWidth = mountRef.current.clientWidth;
                const newHeight = mountRef.current.clientHeight;
                cameraRef.current.aspect = newWidth / newHeight;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(newWidth, newHeight);
            };
            window.addEventListener('resize', handleResize);

            // Cleanup function for useEffect
            return () => {
                window.removeEventListener('resize', handleResize);
                cancelAnimationFrame(frameIdRef.current);
                
                if (mountRef.current && renderer.domElement) {
                    if (mountRef.current.contains(renderer.domElement)) {
                        mountRef.current.removeChild(renderer.domElement);
                    }
                }
                
                renderer.dispose();
                geometryDispose();
                // Note: We don't revoke fileUrl here because it's managed by context now
            };

        } catch (error) {
            console.error("Three.js initialization failed:", error);
            setErrorMessage("3D 引擎初始化失败，请尝试刷新页面。");
        }
    }, []);

    const geometryDispose = () => {
         if (meshRef.current) {
            if (meshRef.current.geometry) meshRef.current.geometry.dispose();
            if (Array.isArray(meshRef.current.material)) {
                meshRef.current.material.forEach(m => m.dispose());
            } else if (meshRef.current.material) {
                meshRef.current.material.dispose();
            }
        }
    };

    const mockLoadSTP = () => {
        setIsLoading(true);
        setLoadingProgress(20);
        // Faster mock loading
        const interval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsLoading(false);
                    setAnalysisData({
                        dimensions: { x: 120.5, y: 85.2, z: 45.0 },
                        volume: 45000,
                        weight: 121.5,
                        minWallThickness: 1.2,
                        analyzing: false
                    });
                    return 100;
                }
                return prev + 25; // Faster increment
            })
        }, 100); // Faster interval
    }

    // Load STL logic
    const loadSTL = (url: string) => {
        if (!sceneRef.current || !cameraRef.current || !controlsRef.current) {
            console.error("Scene not initialized");
            return;
        }

        const loader = new STLLoader();
        
        // Cleanup old mesh
        if (meshRef.current) {
            sceneRef.current.remove(meshRef.current);
            geometryDispose();
            meshRef.current = null;
        }

        setIsLoading(true);
        setLoadingProgress(0);
        setErrorMessage(null);
        setAnalysisData(null); // Reset analysis data to avoid rendering partial state

        loader.load(
            url, 
            (geometry) => {
                try {
                    // 1. Setup Mesh IMMEDIATELY
                    geometry.center();
                    
                    // Optimization: Only compute normals if needed. STLLoader often gives faces normals.
                    // But for standard material we usually need vertex normals for smooth shading. 
                    // We do this, but if it's super slow for huge files, we can skip or do flat shading.
                    if (!geometry.attributes.normal) {
                         geometry.computeVertexNormals();
                    }
                    geometry.computeBoundingBox();

                    // Material - DoubleSide is crucial
                    const material = new THREE.MeshStandardMaterial({ 
                        color: 0x4285F4, 
                        metalness: 0.3, 
                        roughness: 0.4,
                        side: THREE.DoubleSide 
                    });
                    
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.rotation.x = -Math.PI / 2; // Z-up correction
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    
                    meshRef.current = mesh;
                    sceneRef.current?.add(mesh);

                    // 2. Adjust Camera IMMEDIATELY
                    const box = geometry.boundingBox!;
                    const size = new THREE.Vector3();
                    box.getSize(size);

                    const maxDim = Math.max(size.x, size.y, size.z);
                    const fov = cameraRef.current!.fov * (Math.PI / 180);
                    
                    cameraRef.current!.near = Math.max(0.1, maxDim / 1000);
                    cameraRef.current!.far = Math.max(2000, maxDim * 100);
                    
                    let cameraDist = Math.abs(maxDim / 1.5 / Math.tan(fov / 2));
                    cameraDist = Math.max(cameraDist, maxDim * 1.2); 

                    cameraRef.current!.position.set(cameraDist, cameraDist, cameraDist);
                    cameraRef.current!.lookAt(0, 0, 0);
                    cameraRef.current!.updateProjectionMatrix();
                    
                    controlsRef.current!.target.set(0, 0, 0);
                    controlsRef.current!.update();

                    // 3. Render and Stop Loading Indicator IMMEDIATELY
                    setLoadingProgress(100);
                    setIsLoading(false);

                    // 4. Defer Heavy Calculations (Volume/Analysis)
                    // This prevents blocking the UI thread while the model appears
                    setTimeout(() => {
                        const volume = getVolume(geometry);
                        const density = 2.7; 
                        const weight = (volume / 1000) * density; 
                        const estimatedMinWall = Math.max(0.8, (maxDim / 100)).toFixed(2);
                        
                        setAnalysisData({
                            dimensions: { x: size.x, y: size.y, z: size.z },
                            volume: volume,
                            weight: weight,
                            minWallThickness: parseFloat(estimatedMinWall),
                            analyzing: false
                        });
                    }, 100); // Short delay to let the browser paint the frame first

                } catch (err) {
                     console.error("Error processing STL geometry:", err);
                     setErrorMessage("模型几何数据解析错误");
                     setIsLoading(false);
                }
            }, 
            (xhr) => {
                // onProgress
                if (xhr.total > 0) {
                    const percent = (xhr.loaded / xhr.total) * 100;
                    setLoadingProgress(Math.round(percent));
                }
            },
            (error) => {
                // onError
                console.error("Error loading STL", error);
                setIsLoading(false);
                setAnalysisData(null);
                setErrorMessage("无法加载文件。请确保是有效的 STL 文件。");
            }
        );
    };

    const getVolume = (geometry: THREE.BufferGeometry) => {
        if (!geometry.attributes.position) return 0;
        let position = geometry.attributes.position;
        let faces = position.count / 3;
        let sum = 0;
        let p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();
        
        for (let i = 0; i < faces; i++) {
            p1.fromBufferAttribute(position, i * 3 + 0);
            p2.fromBufferAttribute(position, i * 3 + 1);
            p3.fromBufferAttribute(position, i * 3 + 2);
            sum += signedVolumeOfTriangle(p1, p2, p3);
        }
        return Math.abs(sum);
    }

    const signedVolumeOfTriangle = (p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) => {
        return p1.dot(p2.cross(p3)) / 6.0;
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = ''; 

        if (file) {
            setFileName(file.name);
            setErrorMessage(null);
            
            // Revoke old URL if it exists (context managed) - actually context handles replace logic usually, but here we just overwrite
            const url = URL.createObjectURL(file);
            setFileUrl(url);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* Header */}
            <div className="flex flex-col gap-1 mb-4">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="hover:text-primary cursor-pointer uppercase tracking-wider">项目列表</span>
                    <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                    <span className="font-bold text-primary uppercase tracking-wider truncate max-w-[200px]">{fileName}</span>
                </div>
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold tracking-tight">零件分析报告</h1>
                    <div className="flex gap-2">
                        <label className="cursor-pointer px-3 py-1.5 rounded-full bg-primary text-white border border-primary text-[10px] font-bold flex items-center gap-1.5 hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200 active:scale-95">
                            <span className="material-symbols-outlined text-sm">upload_file</span> 
                            导入 STL/STP
                            <input type="file" accept=".stl,.stp,.step" onChange={handleFileChange} className="hidden" />
                        </label>
                        <button 
                            onClick={handleOpenDetails}
                            className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm text-secondary-green">visibility</span> 详情
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 pb-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* CAD Viewer */}
                    <div className="col-span-12 lg:col-span-7 xl:col-span-8 h-[600px] bg-white rounded-[32px] border border-slate-200 relative overflow-hidden shadow-sm group">
                        
                        {/* 3D Canvas Mount Point */}
                        <div ref={mountRef} className="w-full h-full bg-slate-50 cursor-move outline-none relative" tabIndex={0}></div>
                        
                        {/* Error State */}
                        {errorMessage && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90">
                                <span className="material-symbols-outlined text-4xl text-alert-text mb-2">error</span>
                                <p className="text-slate-600 font-bold">{errorMessage}</p>
                                <button onClick={() => setErrorMessage(null)} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200">
                                    重试
                                </button>
                            </div>
                        )}

                        {/* Empty State Overlay */}
                        {!fileUrl && !isLoading && !errorMessage && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-60">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-4xl text-slate-400">view_in_ar</span>
                                </div>
                                <p className="text-slate-500 font-bold">拖拽或点击上方按钮上传模型</p>
                                <p className="text-slate-400 text-xs mt-1">支持 STL, STP 格式</p>
                            </div>
                        )}

                        {/* Loading Progress Overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm transition-all duration-300">
                                <div className="w-64">
                                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                                        <span>正在解析几何数据...</span>
                                        <span>{loadingProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="bg-primary h-2 rounded-full transition-all duration-200 ease-out" 
                                            style={{ width: `${loadingProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2 text-center">正在计算体积与表面积</p>
                                </div>
                            </div>
                        )}

                        {/* Analysis Status Badges (Top Left) */}
                        {!isLoading && analysisData && analysisData.dimensions && !errorMessage && (
                            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                                <div className="px-3 py-1.5 bg-white/90 backdrop-blur text-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-sm border border-slate-200 animate-fade-in-up">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    {fileName}
                                </div>
                                {analysisData.minWallThickness < 1.0 ? (
                                    <div className="px-3 py-1.5 bg-red-50/90 backdrop-blur text-alert-text text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-sm border border-red-100 animate-fade-in-up delay-100">
                                        <span className="material-symbols-outlined text-sm">warning</span>
                                        壁厚过薄 ({analysisData.minWallThickness}mm)
                                    </div>
                                ) : (
                                    <div className="px-3 py-1.5 bg-green-50/90 backdrop-blur text-secondary-green text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-sm border border-green-100 animate-fade-in-up delay-100">
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        DFM 检测通过
                                    </div>
                                )}
                                {isOptimized && (
                                    <div className="px-3 py-1.5 bg-primary/90 backdrop-blur text-white text-[10px] font-bold rounded-lg flex items-center gap-2 shadow-sm animate-pulse animate-fade-in-up delay-200">
                                        <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                                        AI 拓扑优化预览
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Controls (Bottom Right) */}
                        <div className="absolute bottom-4 right-4 flex gap-2">
                             <button 
                                onClick={() => {
                                    if(controlsRef.current) controlsRef.current.reset();
                                }}
                                className="size-9 bg-white rounded-xl flex items-center justify-center shadow-lg text-slate-600 border border-slate-100 hover:text-primary transition-colors active:scale-95" 
                                title="重置视角"
                            >
                                <span className="material-symbols-outlined text-xl">center_focus_strong</span>
                            </button>
                        </div>
                    </div>

                    {/* Overview Analysis Card (Compact Refactor) */}
                    <div className="col-span-12 lg:col-span-5 xl:col-span-4 bg-white rounded-[24px] border border-slate-200 shadow-sm flex flex-col h-[600px] font-sans relative p-5">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-xl">info</span>
                                <h2 className="text-lg font-bold text-primary">概况</h2>
                            </div>
                            <span className="bg-[#F1F3F4] text-[#5F6368] text-[10px] font-bold px-2 py-1 rounded-full">基本信息</span>
                        </div>

                        {/* Interactive List */}
                        <div className="flex-1 flex flex-col gap-2 relative">
                            {analysisData && analysisData.dimensions ? (
                                <>
                                    {/* Process */}
                                    <CustomSelect 
                                        label="加工方式"
                                        value={selectedProcess}
                                        options={PROCESS_OPTIONS}
                                        onChange={setSelectedProcess}
                                    />

                                    {/* Material */}
                                    <CustomSelect 
                                        label="材料"
                                        value={selectedMaterial}
                                        options={MATERIAL_OPTIONS}
                                        onChange={setSelectedMaterial}
                                    />

                                    {/* Finish */}
                                    <CustomSelect 
                                        label="后处理"
                                        value={selectedFinish}
                                        options={FINISH_OPTIONS}
                                        onChange={setSelectedFinish}
                                    />

                                    {/* Quantity - Updated without buttons */}
                                    <div className="group flex flex-col gap-1.5 py-1 px-1 rounded-lg transition-colors hover:bg-slate-50/50">
                                        <label className="text-xs text-slate-500 font-bold ml-1">数量</label>
                                        <div className="relative w-full">
                                            <input 
                                                type="number" 
                                                value={quantity}
                                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)||1))}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all hover:bg-white hover:border-slate-300 pr-10"
                                            />
                                            <span className="absolute right-4 top-2.5 text-sm text-slate-500 font-bold pointer-events-none">件</span>
                                        </div>
                                    </div>

                                    {/* Dimensions (Read only) */}
                                    <div className="flex justify-between items-center py-2 px-2 mt-1">
                                        <label className="text-xs text-slate-500 font-bold ml-1">尺寸</label>
                                        <span className="text-sm font-bold text-slate-800 font-mono">
                                            {analysisData.dimensions.x.toFixed(0)} × {analysisData.dimensions.y.toFixed(0)} × {analysisData.dimensions.z.toFixed(0)} mm
                                        </span>
                                    </div>

                                    {/* Weight (Read only) */}
                                    <div className="flex justify-between items-center py-2 px-2">
                                        <label className="text-xs text-slate-500 font-bold ml-1">重量</label>
                                        <span className="text-sm font-bold text-slate-800 font-mono">
                                            {quote.weight < 1000 ? `${quote.weight.toFixed(1)} g` : `${(quote.weight/1000).toFixed(2)} kg`}
                                        </span>
                                    </div>

                                    {/* Wall Thickness (Read only) */}
                                    <div className="flex justify-between items-center py-2 px-2 mb-2">
                                        <label className="text-xs text-slate-500 font-bold ml-1">最小壁厚</label>
                                        <span className={`text-sm font-bold font-mono ${analysisData.minWallThickness < 1.0 ? 'text-[#EA4335]' : 'text-[#EA4335]'}`}>
                                            {analysisData.minWallThickness} mm
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">description</span>
                                    <p className="text-sm text-slate-500 font-medium">等待模型导入</p>
                                    <p className="text-xs text-slate-400 mt-2">导入后自动生成概况分析</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Price & Button */}
                        <div className="mt-auto pt-4 border-t border-slate-100 bg-white z-10">
                            {analysisData ? (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm text-slate-500 font-medium">预估单价</span>
                                        <span className="text-xl font-bold text-[#4285F4]">
                                            ¥ {quote.unit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={handleExportQuote}
                                        className="w-full py-3 bg-[#E8F0FE] text-[#4285F4] font-bold rounded-xl hover:bg-blue-100 transition-colors active:scale-[0.98] text-sm shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-base">file_download</span>
                                        导出报价单 (PDF)
                                    </button>
                                </>
                            ) : (
                                <button disabled className="w-full py-3 bg-slate-50 text-slate-300 font-bold rounded-xl cursor-not-allowed text-sm">
                                    等待分析...
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Recommendations */}
                <div className="flex flex-col gap-4">
                     <div className="grid grid-cols-[1fr,80px,1fr] gap-4 px-2 items-center">
                        <div className="flex items-center gap-2 text-alert-text">
                            <span className="material-symbols-outlined text-base">report</span>
                            <h3 className="font-bold text-sm uppercase tracking-wide">潜在风险预警</h3>
                        </div>
                        <div className="flex justify-center"></div>
                        <div className="flex items-center gap-2 text-primary">
                            <span className="material-symbols-outlined text-base">tips_and_updates</span>
                            <h3 className="font-bold text-sm uppercase tracking-wide">优化建议 (AI 驱动)</h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-[1fr,80px,1fr] items-center gap-4">
                            <div className="bg-red-50 border border-red-100 rounded-3xl p-4 flex items-start gap-4">
                                <div className="p-2 bg-alert-text text-white rounded-xl shrink-0">
                                    <span className="material-symbols-outlined text-base">straighten</span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-alert-text">
                                        {analysisData && analysisData.minWallThickness < 1.0 ? '薄壁风险高' : '壁厚检测完成'}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                         {analysisData && analysisData.minWallThickness < 1.0 
                                            ? `检测到 ${analysisData.minWallThickness}mm 壁厚区域，低于推荐的 1.0mm。`
                                            : "当前壁厚设计良好，未发现明显加工风险。"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center">
                                    <div className={`h-px w-6 ${isOptimized ? 'bg-secondary-green' : 'bg-slate-300'}`}></div>
                                    <span className={`material-symbols-outlined text-sm ${isOptimized ? 'text-secondary-green' : 'text-primary'}`}>
                                        {isOptimized ? 'check_circle' : 'trending_flat'}
                                    </span>
                                </div>
                            </div>

                            <div className={`border rounded-3xl p-4 flex items-start gap-4 transition-all duration-500 
                                ${isOptimized 
                                    ? 'bg-green-50 border-green-200 shadow-md transform scale-105' 
                                    : 'bg-blue-50 border-blue-100'}`}>
                                <div className={`p-2 rounded-xl shrink-0 text-white ${isOptimized ? 'bg-secondary-green' : 'bg-primary'}`}>
                                    <span className="material-symbols-outlined text-base">architecture</span>
                                </div>
                                <div>
                                    <h4 className={`text-xs font-bold ${isOptimized ? 'text-secondary-green' : 'text-primary'}`}>结构稳定性优化</h4>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        {analysisData && analysisData.minWallThickness < 1.0 
                                            ? "建议增加局部壁厚至 1.2mm 并添加加强筋。"
                                            : "建议在转角处添加倒角以减少应力集中。"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-center">
                        <button 
                            onClick={() => setIsOptimized(!isOptimized)}
                            className={`w-full max-w-2xl py-4 rounded-3xl flex items-center justify-center gap-3 shadow-xl transition-all cursor-pointer group active:scale-95
                                ${isOptimized ? 'bg-secondary-green text-white hover:bg-green-600' : 'bg-primary text-white hover:bg-blue-600'}
                            `}
                        >
                            <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">
                                {isOptimized ? 'undo' : 'auto_fix_high'}
                            </span>
                            <span className="text-base font-bold tracking-widest">
                                {isOptimized ? '撤销优化' : '一键应用全部优化'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Details Modal */}
            {showDetails && analysisData && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-w-[90%] overflow-hidden flex flex-col animate-scale-in">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-primary">
                                    <span className="material-symbols-outlined">analytics</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">成本结构深度分析</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px] animate-spin">timer</span>
                                        将在 20 秒后自动关闭
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleCloseDetails}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-500"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Cost Breakdown Bars */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">费用明细 (Cost Breakdown)</h4>
                                <div className="space-y-3">
                                    {/* Material */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-slate-600">材料费 (Material)</span>
                                            <span className="font-bold text-slate-800">¥{quote.breakdown.material.toFixed(2)}</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{width: `${(quote.breakdown.material / quote.unit) * 100}%`}}></div>
                                        </div>
                                    </div>
                                    {/* Machining */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-slate-600">加工费 (Machining)</span>
                                            <span className="font-bold text-slate-800">¥{quote.breakdown.machining.toFixed(2)}</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-secondary-green" style={{width: `${(quote.breakdown.machining / quote.unit) * 100}%`}}></div>
                                        </div>
                                    </div>
                                    {/* Finish */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-slate-600">后处理 (Finish)</span>
                                            <span className="font-bold text-slate-800">¥{quote.breakdown.finish.toFixed(2)}</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-400" style={{width: `${(quote.breakdown.finish / quote.unit) * 100}%`}}></div>
                                        </div>
                                    </div>
                                    {/* Setup */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-slate-600">调试分摊 (Setup)</span>
                                            <span className="font-bold text-slate-800">¥{quote.breakdown.setup.toFixed(2)}</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-400" style={{width: `${(quote.breakdown.setup / quote.unit) * 100}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Manufacturing Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2 text-primary">
                                        <span className="material-symbols-outlined text-lg">factory</span>
                                        <h5 className="text-xs font-bold uppercase">加工单位信息</h5>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500">承接工厂: <span className="text-slate-800 font-bold">ProFab 宁波智能一厂</span></p>
                                        <p className="text-xs text-slate-500">机台编号: <span className="text-slate-800 font-bold">CNC-HM-042 (五轴)</span></p>
                                        <p className="text-xs text-slate-500">排期状态: <span className="text-green-600 font-bold">空闲 (Available)</span></p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 mb-2 text-primary">
                                        <span className="material-symbols-outlined text-lg">schedule</span>
                                        <h5 className="text-xs font-bold uppercase">时间预估</h5>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500">单件加工: <span className="text-slate-800 font-bold">45 分钟</span></p>
                                        <p className="text-xs text-slate-500">总工时: <span className="text-slate-800 font-bold">{(quantity * 0.75).toFixed(1)} 小时</span></p>
                                        <p className="text-xs text-slate-500">预计交付: <span className="text-slate-800 font-bold">3-5 工作日</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Progress Bar (Visual Timer) */}
                        <div className="h-1 bg-slate-100 w-full">
                            <div className="h-full bg-primary origin-left animate-[shrink_20s_linear_forwards]"></div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={handleCloseDetails}
                                className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                取消 (Cancel)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewAnalysis;