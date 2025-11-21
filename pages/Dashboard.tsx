
import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getLeads, getActivities, getUsers } from '../services/storageService';
import { Lead, Stage, Activity, Status, User } from '../types';
import { DollarSign, Users, CheckCircle, AlertCircle, Loader2, TrendingUp, Briefcase, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        if (user) {
            const promises: Promise<any>[] = [getLeads(user), getActivities()];
            
            if (user.role === 'Admin') {
                promises.push(getUsers());
            }

            const [leadsData, activitiesData, usersData] = await Promise.all(promises);
            
            setLeads(leadsData);
            
            // If Admin, we see all activities. If Sales, only their lead activities.
            // (API already handles lead filtering, but we filter activities here to be safe)
            const leadIds = new Set(leadsData.map(l => l.id));
            setActivities(activitiesData.filter((a: Activity) => leadIds.has(a.leadId)));
            
            if (usersData) {
                setTeamMembers(usersData.filter((u: User) => u.role === 'Sales'));
            }

            setLoading(false);
        }
    };
    fetchData();
  }, [user]);

  if (loading) return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div></Layout>;

  // Metrics Calculations
  const totalPipelineValue = leads.filter(l => l.status === Status.Open).reduce((acc, l) => acc + l.expectedValue, 0);
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.stage === Stage.Won).length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;
  const overdueTasks = leads.filter(l => l.nextActionDateTime && new Date(l.nextActionDateTime) < new Date() && l.status === Status.Open).length;

  // Chart Data: Pipeline by Stage
  const pipelineData = Object.values(Stage).map(stage => {
    const stageLeads = leads.filter(l => l.stage === stage);
    return {
      name: stage,
      count: stageLeads.length,
      value: stageLeads.reduce((sum, l) => sum + l.dealValue, 0)
    };
  });

  // Chart Data: Activity Volume
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const activityTrend = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    calls: activities.filter(a => a.type === 'Call' && a.dateTime.startsWith(date)).length,
    emails: activities.filter(a => a.type === 'Email' && a.dateTime.startsWith(date)).length,
  }));

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(val);

  // Admin Specific: Team Performance Data
  const getTeamPerformance = () => {
      return teamMembers.map(member => {
          const memberLeads = leads.filter(l => l.leadOwner === member.email);
          const openValue = memberLeads.filter(l => l.status === Status.Open).reduce((a, b) => a + b.expectedValue, 0);
          const wonCount = memberLeads.filter(l => l.status === Status.Won).length;
          return {
              ...member,
              leadCount: memberLeads.length,
              openValue,
              wonCount
          };
      }).sort((a, b) => b.openValue - a.openValue);
  };

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center">
            {user?.role === 'Admin' && <div className="bg-indigo-600 text-white p-2 rounded-lg mr-3"><Globe size={24}/></div>}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    {user?.role === 'Admin' ? 'Company Overview' : 'My Dashboard'}
                </h1>
                <p className="text-gray-500">
                    {user?.role === 'Admin' 
                        ? `Monitor global sales performance and team activities across ${teamMembers.length} representatives.`
                        : `Welcome back, ${user?.name}. Here is your personal pipeline summary.`
                    }
                </p>
            </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 z-0"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center border border-green-100">
              <TrendingUp size={12} className="mr-1" /> Forecast
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-sm text-gray-500 font-medium">{user?.role === 'Admin' ? 'Total Pipeline' : 'My Pipeline'}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPipelineValue)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Users size={24} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Leads</p>
            <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle size={24} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Win Rate</p>
            <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
              <AlertCircle size={24} />
            </div>
            {overdueTasks > 0 && <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></span>}
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Action Required</p>
            <p className="text-2xl font-bold text-gray-900">{overdueTasks} <span className="text-sm font-normal text-gray-400">Leads</span></p>
          </div>
        </div>
      </div>

      {/* ADMIN: Team Performance Table */}
      {user?.role === 'Admin' && (
          <Card title="Sales Team Performance" className="mb-8 border-indigo-100">
              <div className="overflow-x-auto">
                  <table className="min-w-full">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sales Representative</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Territory</th>
                              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Active Leads</th>
                              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Pipeline Value</th>
                              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Deals Won</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                          {getTeamPerformance().map(member => (
                              <tr key={member.email} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap flex items-center">
                                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm mr-3 shadow-sm">
                                          {member.name.charAt(0)}
                                      </div>
                                      <div>
                                          <div className="text-sm font-bold text-gray-900">{member.name}</div>
                                          <div className="text-xs text-gray-400">{member.email}</div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.territory || 'N/A'}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-medium">{member.leadCount}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                                      {formatCurrency(member.openValue)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-200">
                                          {member.wonCount}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </Card>
      )}

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card title="Pipeline Volume by Stage" className="lg:col-span-2 min-h-[400px]">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar yAxisId="left" dataKey="count" name="Lead Count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar yAxisId="right" dataKey="value" name="Deal Value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Activity Trends (7 Days)" className="lg:col-span-1 min-h-[400px]">
           <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{fontSize: 10}} />
                <YAxis tick={{fontSize: 10}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="calls" name="Calls" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCalls)" />
                <Area type="monotone" dataKey="emails" name="Emails" stroke="#3b82f6" fillOpacity={0.3} fill="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Activities List */}
      <Card title="Recent Activities">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Activity</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Outcome</th>
                {user?.role === 'Admin' && <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>}
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activities.slice(0, 5).map(act => (
                <tr key={act.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{act.type}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 cursor-pointer hover:underline font-medium" onClick={() => window.location.hash = `#/leads/${act.leadId}`}>
                    {leads.find(l => l.id === act.leadId)?.leadName || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      act.outcome === 'Interested' ? 'bg-green-100 text-green-800 border border-green-100' :
                      act.outcome === 'Follow-up Required' ? 'bg-yellow-100 text-yellow-800 border border-yellow-100' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {act.outcome}
                    </span>
                  </td>
                   {user?.role === 'Admin' && (
                      <td className="px-4 py-3 text-sm text-gray-500">
                          <div className="flex items-center">
                             <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] mr-2">{act.createdBy.charAt(0)}</div>
                             {act.createdBy.split('@')[0]}
                          </div>
                      </td>
                   )}
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{new Date(act.dateTime).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activities.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">No recent activities.</div>}
        </div>
      </Card>
    </Layout>
  );
};

export default Dashboard;
