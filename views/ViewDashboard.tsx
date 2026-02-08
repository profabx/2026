import React from 'react';

const ViewDashboard: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-20">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-2">早上好，首席工程师</h1>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-secondary-green animate-pulse"></span>
                        系统运行正常 • 3个进行中构建 • 1个紧急警报
                    </p>
                </div>
                <div className="h-10 px-4 bg-white rounded-full flex items-center gap-2 border border-slate-200 text-sm font-medium text-slate-600 shadow-sm">
                    <span className="material-symbols-outlined text-lg">calendar_today</span>
                    <span>2023年10月24日</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-lg transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-full text-primary group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">precision_manufacturing</span>
                        </div>
                        <span className="text-secondary-green bg-green-50 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">trending_up</span> +10%
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">项目进展</p>
                    <h3 className="text-3xl font-bold mt-1 text-slate-800">12</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-lg transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-full text-primary group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">rate_review</span>
                        </div>
                        <span className="text-slate-400 text-xs font-bold py-1">待处理</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Wiki 贡献度</p>
                    <h3 className="text-3xl font-bold mt-1 text-slate-800">7</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-lg transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 rounded-full text-orange-600 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">speed</span>
                        </div>
                        <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">trending_down</span> -5%
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">设备利用率</p>
                    <h3 className="text-3xl font-bold mt-1 text-slate-800">92%</h3>
                </div>
            </div>

            {/* Split Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Alerts */}
                <div className="bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                            <span className="material-symbols-outlined text-alert-text filled">warning</span>
                            高风险项目预警
                        </h3>
                        <span className="bg-alert-red text-alert-text text-xs font-bold px-3 py-1 rounded-full">2项 紧急</span>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                        <div className="flex gap-4 p-4 rounded-xl bg-alert-red border border-transparent hover:bg-red-100 transition-colors cursor-pointer group">
                            <div className="shrink-0 w-12 h-12 rounded-full bg-white text-alert-text flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined">inventory_2</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-900 group-hover:text-alert-text transition-colors">项目 Alpha-X</h4>
                                    <span className="text-xs text-alert-text font-bold">12分钟前</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">CNC阶段预计出现物料短缺。需要立即进行采购审查。</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-google-yellow transition-colors cursor-pointer group">
                            <div className="shrink-0 w-12 h-12 rounded-full bg-yellow-100 text-google-yellow flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined">view_in_ar</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-900 group-hover:text-google-yellow transition-colors">涡轮模型 v4</h4>
                                    <span className="text-xs text-google-yellow font-bold">2小时前</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1">在子组件 B2 中检测到网格几何错误。模拟已暂停。</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* To-Do */}
                <div className="bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col h-full">
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
                            <span className="material-symbols-outlined text-primary">checklist</span>
                            今日待办
                        </h3>
                        <div className="flex gap-1">
                            <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                            <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                            <span className="h-2 w-2 rounded-full bg-primary"></span>
                        </div>
                    </div>
                    <div className="p-2 flex flex-col h-full overflow-y-auto">
                        <label className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                            <input className="w-5 h-5 text-primary rounded-md border-slate-300 focus:ring-primary focus:ring-offset-0 bg-transparent" type="checkbox" />
                            <div className="flex-1">
                                <p className="font-medium text-slate-800 group-hover:text-primary transition-colors">审查外壳单元的CAD规格</p>
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">建模</span>
                            </div>
                            <div className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400 text-sm">attach_file</span>
                            </div>
                        </label>
                         <label className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group">
                            <input className="w-5 h-5 text-primary rounded-md border-slate-300 focus:ring-primary focus:ring-offset-0 bg-transparent" type="checkbox" />
                            <div className="flex-1">
                                <p className="font-medium text-slate-800 group-hover:text-primary transition-colors">批准4号铣床的G代码生成</p>
                                <span className="text-xs text-primary bg-accent-blue px-2 py-0.5 rounded-full mt-1 inline-block">加工</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Stream */}
            <div className="mt-2">
                <h3 className="font-bold text-lg text-slate-800 mb-4">工程动态流</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                    <div className="min-w-[280px] p-5 bg-white rounded-2xl shadow-soft border border-transparent flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBv8Suc2DWs1o0yyoDPa_l3Bv4G4SbSjEbSz-0zw4Cee6NkpTYtVQWCf_qDW6PecpvH3Z7NMLrS_F0exzzPTjwg3tUmxVe3bDwhwoyuZBAow9Vzc_LruRZe4ylS4E0o0rZdnjijOc5-DxxTGSkPhBepKZdQPv_cnyQ-h57m-p7zAiaKQ20BNsiQRJ9jaF6Yo4kHdVKoqzOnZdXK0BQAQ85AZTKI6w87dHbJeQwTwreQvqicF7ZSymSAJ2WKYdY_SgdQgHD72Vr6wvZy')" }}></div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Marcus Chen</p>
                                <p className="text-xs text-slate-500">上传了 3 个文件</p>
                            </div>
                        </div>
                        <div className="h-24 bg-slate-50 rounded-xl w-full flex items-center justify-center relative overflow-hidden group border border-slate-100">
                            <span className="material-symbols-outlined text-4xl text-slate-300 absolute z-0 group-hover:scale-110 transition-transform">folder_zip</span>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-white text-xs font-medium">Chassis_V3.step</span>
                            </div>
                        </div>
                    </div>
                     <div className="min-w-[280px] p-5 bg-white rounded-2xl shadow-soft border border-transparent flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDc8fPE25dxGqxJO0uF8gqEzr8tpnan9Va4qYywBn2t3N2ipIDcUtyLCSEMYDjBBQ83q_f0JbkgcqtKrWBMzzkByw6qchbXU4ToO-ciLXZKhRTyVgTK980BgzuEfc9WOOu0HB__HOLE24y6IKzonY9bzKwLnKC4XKmQd2mlx4HEvYN7U_pckxi9BLHEV579LilqMIM1i2EjUONxARPo3ROT9bC-kd_JH3_Wuse98x9XeOH1PizBvYHCwG8gqA4MHJAlqclyzNNPV0fn')" }}></div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Sarah Miller</p>
                                <p className="text-xs text-slate-500">评论了工单 #402</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 italic">"合金的热膨胀系数需要重新计算..."</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewDashboard;
