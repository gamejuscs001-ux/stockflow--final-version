
import React, { useMemo } from 'react';
import { StockItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Package, Smartphone, ArrowDownRight, ClipboardList } from 'lucide-react';

interface DashboardProps {
  data: StockItem[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#10b981'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const stats = useMemo(() => {
    // Basic Sums
    const totalIn = data.filter(i => i.type === 'IN').reduce((acc, item) => acc + item.amount, 0);
    const totalOut = data.filter(i => i.type === 'OUT').reduce((acc, item) => acc + item.amount, 0);
    const totalTemp = data.filter(i => i.type === 'TEMP_USE').reduce((acc, item) => acc + item.amount, 0);
    
    // Official Inventory (for Audit) = IN - OUT
    const officialInventoryValue = totalIn - totalOut;
    // Physical Inventory (Actual) = IN - OUT - TEMP
    const physicalInventoryValue = totalIn - totalOut - totalTemp;
    
    const totalItems = data.length;
    const uniqueProviders = new Set(data.map(i => i.provider)).size;

    // Chart Data: Current Stock Value by Provider (Physical)
    const providerMap = data.reduce((acc, item) => {
      let val = 0;
      if (item.type === 'IN') val = item.amount;
      else val = -item.amount; // Deduct OUT and TEMP
      
      const key = item.provider === 'Temp Use' ? 'Temporary' : item.provider;
      acc[key] = (acc[key] || 0) + val;
      return acc;
    }, {} as Record<string, number>);
    
    const providerChartData = Object.entries(providerMap)
      .map(([name, value]) => ({ name, value: Math.max(0, value as number) }))
      .filter(i => i.value > 0);

    // Chart Data: Top 5 Highest Usage Items (OUT + TEMP)
    const usageMap = data.filter(i => i.type === 'OUT' || i.type === 'TEMP_USE').reduce((acc, item) => {
      acc[item.code] = (acc[item.code] || 0) + item.amount;
      return acc;
    }, {} as Record<string, number>);

    const topUsageData = Object.entries(usageMap)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([name, value]) => ({ name, value: value as number }));

    return { 
      physicalInventoryValue, 
      officialInventoryValue,
      totalOut, 
      totalTemp,
      totalItems, 
      uniqueProviders, 
      providerChartData, 
      topUsageData 
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Physical Stock</p>
            <p className="text-2xl font-bold text-gray-900">${stats.physicalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-400 mt-1">Official: ${stats.officialInventoryValue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-full">
            <DollarSign className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Confirmed Usage</p>
            <p className="text-2xl font-bold text-gray-900">${stats.totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-full">
            <ArrowDownRight className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Temp / Pending</p>
            <p className="text-2xl font-bold text-amber-600">${stats.totalTemp.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-full">
            <ClipboardList className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
          </div>
          <div className="p-3 bg-violet-50 rounded-full">
            <Package className="w-6 h-6 text-violet-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Stock Value by Provider</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.providerChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.providerChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center mt-2">
              {stats.providerChartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center text-xs text-gray-600">
                      <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      {entry.name}
                  </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Highest Usage Items</h3>
          <div className="h-64">
            {stats.topUsageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topUsageData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={50} tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => [`$${value}`, 'Usage']} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                 No usage data yet
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
