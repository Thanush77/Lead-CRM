
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import { Lead, Stage, Source, BudgetRange, Status, User } from '../types';
import { getLeads, createLead, getUsers } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, ChevronRight, Flame, AlertTriangle, X, Loader2, User as UserIcon, Filter } from 'lucide-react';

const LeadList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'hot' | 'overdue'>('all');
  const [adminUserFilter, setAdminUserFilter] = useState<string>('all'); // Admin only: Filter by owner
  
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    leadName: '',
    companyName: '',
    email: '',
    phone: '',
    industry: '',
    source: Source.Website,
    budgetRange: BudgetRange.OneToFiveL,
    stage: Stage.New,
    dealValue: 0,
    leadOwner: user?.email // Default to self
  });

  const fetchData = async () => {
    setLoading(true);
    if (user) {
        // If Admin, getLeads returns ALL leads. If Sales, returns ONLY their leads.
        const leadsData = await getLeads(user);
        setLeads(leadsData);
        
        if (user.role === 'Admin') {
            const usersData = await getUsers();
            setUsers(usersData || []);
        }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
      filterLeads();
  }, [leads, searchTerm, viewFilter, adminUserFilter]);

  const filterLeads = () => {
    let result = leads.filter(l => 
      l.leadName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Admin Specific Filter: Show leads for specific user
    if (user?.role === 'Admin' && adminUserFilter !== 'all') {
        result = result.filter(l => l.leadOwner === adminUserFilter);
    }

    if (viewFilter === 'hot') {
      result = result.filter(l => l.leadScore > 70);
    } else if (viewFilter === 'overdue') {
      const now = new Date();
      result = result.filter(l => l.nextActionDateTime && new Date(l.nextActionDateTime) < now && l.status === 'Open');
    }

    setFilteredLeads(result);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !newLead.leadName) return;
      
      setIsSubmitting(true);
      
      const leadToCreate: Lead = {
          id: Date.now().toString(),
          leadName: newLead.leadName!,
          companyName: newLead.companyName || 'Unknown',
          email: newLead.email || '',
          phone: newLead.phone || '',
          industry: newLead.industry || 'Other',
          source: newLead.source as Source,
          budgetRange: newLead.budgetRange as BudgetRange,
          stage: Stage.New,
          status: Status.Open,
          leadOwner: newLead.leadOwner || user.email, // Use selected owner or self
          leadScore: 10, // Initial score
          probability: 10,
          dealValue: Number(newLead.dealValue) || 0,
          expectedValue: (Number(newLead.dealValue) || 0) * 0.1,
          createdAt: new Date().toISOString(),
          notes: '',
      };

      await createLead(leadToCreate);
      await fetchData();
      setIsSubmitting(false);
      setIsModalOpen(false);
      // Reset form
      setNewLead({
        leadName: '',
        companyName: '',
        email: '',
        phone: '',
        industry: '',
        source: Source.Website,
        budgetRange: BudgetRange.OneToFiveL,
        stage: Stage.New,
        dealValue: 0,
        leadOwner: user.email
      });
  };

  const getStageColor = (stage: Stage) => {
    switch (stage) {
      case Stage.New: return 'bg-blue-100 text-blue-800 border-blue-200';
      case Stage.Contacted: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case Stage.Qualified: return 'bg-purple-100 text-purple-800 border-purple-200';
      case Stage.Proposal: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case Stage.Won: return 'bg-green-100 text-green-800 border-green-200';
      case Stage.Lost: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{user?.role === 'Admin' ? 'All Leads & Pipeline' : 'My Leads'}</h1>
          <p className="text-gray-500">
            {user?.role === 'Admin' ? 'Monitor team performance and assign leads.' : 'Manage your active pipeline and opportunities.'}
          </p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center font-medium transition-colors shadow-sm"
        >
          <Plus size={18} className="mr-2" /> New Lead
        </button>
      </div>

      <Card className="mb-6 sticky top-0 z-10 border-b-4 border-blue-500">
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                type="text"
                placeholder="Search name, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <button 
                onClick={() => setViewFilter('all')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                All Leads
                </button>
                <button 
                onClick={() => setViewFilter('hot')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors ${viewFilter === 'hot' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                <Flame size={16} className="mr-1" /> Hot
                </button>
                <button 
                onClick={() => setViewFilter('overdue')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors ${viewFilter === 'overdue' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                <AlertTriangle size={16} className="mr-1" /> Overdue
                </button>
            </div>
            </div>

            {/* ADMIN ONLY: Salesperson Filter */}
            {user?.role === 'Admin' && (
                <div className="flex items-center pt-3 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-500 flex items-center mr-3">
                        <Filter size={16} className="mr-1" /> Filter by Owner:
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        <button 
                            onClick={() => setAdminUserFilter('all')}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${adminUserFilter === 'all' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            All Team
                        </button>
                        {users.map(u => (
                            <button 
                                key={u.email}
                                onClick={() => setAdminUserFilter(u.email)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border flex items-center ${adminUserFilter === u.email ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                <div className="w-4 h-4 rounded-full bg-gray-300 text-white flex items-center justify-center text-[10px] mr-1.5">
                                    {u.name.charAt(0)}
                                </div>
                                {u.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </Card>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <Loader2 className="animate-spin mr-2" /> Loading pipeline data...
            </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lead Details</th>
                {user?.role === 'Admin' && (
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned To</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Next Action</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => {
                const isOverdue = lead.nextActionDateTime && new Date(lead.nextActionDateTime) < new Date() && lead.status === 'Open';
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{lead.leadName}</div>
                          <div className="text-sm text-gray-500">{lead.companyName}</div>
                        </div>
                      </div>
                    </td>
                    {user?.role === 'Admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center bg-gray-50 rounded-full px-3 py-1 w-fit border border-gray-200">
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">
                                    {lead.leadOwner.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-gray-700">{lead.leadOwner.split('@')[0]}</span>
                            </div>
                        </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md border ${getStageColor(lead.stage)}`}>
                        {lead.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full max-w-[60px] h-1.5 bg-gray-200 rounded-full mr-2 overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${lead.leadScore > 70 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-blue-400'}`} 
                                style={{width: `${lead.leadScore}%`}}
                            ></div>
                        </div>
                        <span className={`text-xs font-bold ${lead.leadScore > 70 ? 'text-orange-600' : 'text-gray-600'}`}>
                          {lead.leadScore}
                        </span>
                      </div>
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(lead.dealValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {lead.nextActionType ? `${lead.nextActionType}` : 'None'}
                        {lead.nextActionDateTime && (
                          <div className="text-xs opacity-75">
                            {new Date(lead.nextActionDateTime).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors inline-flex items-center"
                      >
                        Manage <ChevronRight size={14} className="ml-1" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
            <div className="bg-gray-100 p-4 rounded-full mb-3">
                <Search size={24} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900">No leads found</p>
            <p className="text-sm text-gray-500 mb-4">Try adjusting your filters or create a new lead.</p>
            <button onClick={() => setIsModalOpen(true)} className="text-blue-600 hover:underline font-medium">Create new lead</button>
          </div>
        )}
        </div>
        )}
      </div>

      {/* Create Lead Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="text-lg font-bold text-gray-800">Create New Lead</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
                  </div>
                  <div className="p-6 max-h-[80vh] overflow-y-auto">
                      <form onSubmit={handleCreateLead} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                                  <input required type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newLead.leadName} onChange={e => setNewLead({...newLead, leadName: e.target.value})} placeholder="John Doe" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Company</label>
                                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newLead.companyName} onChange={e => setNewLead({...newLead, companyName: e.target.value})} placeholder="Acme Corp" />
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Email</label>
                                  <input type="email" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} placeholder="john@example.com" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Phone</label>
                                  <input type="tel" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} placeholder="+1 555..." />
                              </div>
                          </div>
                          
                          {/* Admin: Assign Owner */}
                          {user?.role === 'Admin' && (
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                  <label className="block text-xs font-bold text-blue-800 mb-1.5 flex items-center">
                                      <UserIcon size={14} className="mr-1.5" /> Assign Lead Owner
                                  </label>
                                  <select 
                                      className="w-full border border-blue-200 rounded-lg p-2.5 text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={newLead.leadOwner}
                                      onChange={e => setNewLead({...newLead, leadOwner: e.target.value})}
                                  >
                                      {users.map(u => (
                                          <option key={u.email} value={u.email}>
                                              {u.name} ({u.role})
                                          </option>
                                      ))}
                                  </select>
                                  <p className="text-[10px] text-blue-600 mt-1 ml-1">The selected user will see this lead in their dashboard immediately.</p>
                              </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                               <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Industry</label>
                                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newLead.industry} onChange={e => setNewLead({...newLead, industry: e.target.value})} placeholder="Technology" />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Potential Value (₹)</label>
                                  <input type="number" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newLead.dealValue} onChange={e => setNewLead({...newLead, dealValue: Number(e.target.value)})} />
                              </div>
                          </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Source</label>
                                  <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newLead.source} onChange={e => setNewLead({...newLead, source: e.target.value as Source})}>
                                      {Object.values(Source).map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Budget Range</label>
                                  <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" value={newLead.budgetRange} onChange={e => setNewLead({...newLead, budgetRange: e.target.value as BudgetRange})}>
                                      {Object.values(BudgetRange).map(b => <option key={b} value={b}>{b}</option>)}
                                  </select>
                              </div>
                          </div>
                          
                          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                              <button type="submit" disabled={isSubmitting} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center shadow-md transition-all hover:shadow-lg">
                                  {isSubmitting && <Loader2 size={16} className="animate-spin mr-2" />}
                                  Create Lead
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default LeadList;
