
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, FunnelChart, Funnel, LabelList, Cell 
} from 'recharts';
import { getLeads, getActivities } from '../services/storageService';
import { Lead, Stage, Status, Activity } from '../types';
import { useAuth } from '../context/AuthContext';
import { Loader2, TrendingUp, Users, Target, Calendar } from 'lucide-react';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all'); // all, month, quarter

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        // Admin fetches all leads automatically via backend logic if role is Admin
        // Sales fetches only their leads
        const data = await getLeads(user);
        setLeads(data);
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div></Layout>;

  // --- DATA PROCESSING ---

  // 1. Funnel Data
  // Logic: A lead in 'Won' has passed through all previous stages conceptually for the funnel view
  const stageOrder = [Stage.New, Stage.Contacted, Stage.Qualified, Stage.Proposal, Stage.Won];
  const funnelRawCounts = leads.reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const funnelData = stageOrder.map((stage, index) => {
    // Calculate drop-off or absolute count. 
    // Simple view: Count of leads CURRENTLY in that stage + leads in subsequent stages (cumulative)
    // Complex view: Just current stage count. Let's do Current Stage Count for clarity in this MVP.
    return {
      name: stage,
      value: funnelRawCounts[stage] || 0,
      fill: COLORS[index % COLORS.length]
    };
  });

  // 2. Revenue Trend (Expected vs Actual Won) by Month
  const revenueByMonth = leads.reduce((acc, lead) => {
    const date = new Date(lead.createdAt); // In real app, use 'closedAt' for Won leads
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[key]) acc[key] = { name: key, expected: 0, closed: 0 };
    
    acc[key].expected += lead.expectedValue;
    if (lead.status === Status.Won) {
      acc[key].closed += lead.dealValue;
    }
    return acc;
  }, {} as Record<string, any>);

  const revenueData = Object.values(revenueByMonth).sort((a: any, b: any) => a.name.localeCompare(b.name));

  // 3. Team Performance (Admin Only or Self)
  const teamPerformance = leads.reduce((acc, lead) => {
    const owner = lead.leadOwner.split('@')[0]; // Simple name
    if (!acc[owner]) acc[owner] = { name: owner, leads: 0, revenue: 0, won: 0 };
    
    acc[owner].leads += 1;
    acc[owner].revenue += lead.expectedValue;
    if (lead.status === Status.Won) acc[owner].won += 1;
    
    return acc;
  }, {} as Record<string, any>);
  
  const teamData = Object.values(teamPerformance).sort((a: any, b: any) => b.revenue - a.revenue);

  // 4. Conversion by Source
  const sourceStats = leads.reduce((acc, lead) => {
    if (!acc[lead.source]) acc[lead.source] = { name: lead.source, total: 0, won: 0 };
    acc[lead.source].total += 1;
    if (lead.status === Status.Won) acc[lead.source].won += 1;
    return acc;
  }, {} as Record<string, any>);

  const sourceConversionData = Object.values(sourceStats).map((s: any) => ({
    name: s.name,
    rate: s.total > 0 ? Number(((s.won / s.total) * 100).toFixed(1)) : 0,
    total: s.total
  }));

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(val);

  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics & Reports</h1>
          <p className="text-gray-500">Deep dive into your pipeline performance and revenue forecasts.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-1 flex mt-4 md:mt-0">
          {['all', 'month', 'quarter'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                timeRange === range ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* REVENUE TREND */}
        <Card title="Revenue Forecast vs Actual" className="min-h-[400px]">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{fontSize: 12}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="expected" name="Expected Pipeline" stroke="#3b82f6" fillOpacity={1} fill="url(#colorExpected)" />
                <Area type="monotone" dataKey="closed" name="Closed Won" stroke="#10b981" fillOpacity={1} fill="url(#colorClosed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* CONVERSION FUNNEL */}
        <Card title="Pipeline Funnel" className="min-h-[400px]">
          <div className="h-80 w-full flex items-center justify-center">
            {leads.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip />
                  <Funnel
                    dataKey="value"
                    data={funnelData}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400">No data available</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* TEAM LEADERBOARD */}
        <Card title="Leaderboard (Revenue)" className="lg:col-span-2 min-h-[350px]">
           <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#4b5563'}} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}} 
                  formatter={(value: number, name: string) => [name === 'revenue' ? formatCurrency(value) : value, name === 'revenue' ? 'Pipeline Value' : 'Deals Won']}
                />
                <Legend />
                <Bar dataKey="revenue" name="Pipeline Value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="won" name="Deals Won (Count)" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* LEAD SOURCE ROI */}
        <Card title="Conversion by Source" className="lg:col-span-1 min-h-[350px]">
           <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceConversionData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis unit="%" />
                <Tooltip />
                <Bar dataKey="rate" name="Win Rate %" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                  {sourceConversionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rate > 20 ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-gray-500 mt-2">Win Rate % (Won / Total)</p>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Analytics;
