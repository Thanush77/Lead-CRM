
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Card from '../components/Card';
import { Lead, Activity, ActivityType, ActivityOutcome, Stage, Status, User } from '../types';
import { getLeadById, getActivities, addActivity, updateLead, calculateLeadScore, getUsers } from '../services/storageService';
import { generateFollowUpEmail } from '../services/geminiService';
import { Phone, Mail, MessageCircle, Calendar, Sparkles, ArrowLeft, Clock, CheckSquare, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]); // For Admin assignment
  const [loading, setLoading] = useState(true);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [aiEmail, setAiEmail] = useState<{ subject: string; body: string } | null>(null);
  
  // Activity Form State
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    type: ActivityType.Call,
    outcome: ActivityOutcome.Interested,
    description: ''
  });

  const fetchData = async () => {
      if(id && user) {
          try {
            const leadData = await getLeadById(id);
            
            if (leadData) {
                // SECURITY CHECK: Ensure user has access to this lead
                if (user.role !== 'Admin' && leadData.leadOwner !== user.email) {
                    // User is not admin and not owner -> Unauthorized
                    navigate('/leads');
                    return;
                }

                setLead(leadData);
                
                const actData = await getActivities(id);
                setActivities(actData);

                // Admin: Fetch users for assignment dropdown
                if (user.role === 'Admin') {
                    const usersData = await getUsers();
                    setUsers(usersData);
                }
            } else {
                navigate('/leads');
            }
          } catch (error) {
             console.error("Error fetching lead details:", error);
          } finally {
             setLoading(false);
          }
      }
  }

  useEffect(() => {
      fetchData();
  }, [id, user]);

  const handleGenerateEmail = async () => {
    if (!lead) return;
    setIsGeneratingEmail(true);
    setAiEmail(null);
    try {
      const lastActivity = activities.length > 0 ? activities[0] : null;
      const response = await generateFollowUpEmail(lead, lastActivity);
      setAiEmail(response);
      
      // Auto-save suggestion to lead
      const updatedLead = { ...lead, suggestedEmailSubject: response.subject, suggestedEmailBody: response.body };
      setLead(updatedLead);
      await updateLead(updatedLead);

    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleAddActivity = async () => {
    if (!lead || !user || !newActivity.description) return;
    setIsSavingActivity(true);
    
    const activity: Activity = {
      id: Date.now().toString(),
      leadId: lead.id,
      type: newActivity.type as ActivityType,
      subject: `${newActivity.type} with ${lead.leadName}`,
      description: newActivity.description || '',
      outcome: newActivity.outcome as ActivityOutcome,
      dateTime: new Date().toISOString(),
      createdBy: user.email 
    };

    await addActivity(activity);
    
    // Update Lead
    const updatedActivities = [activity, ...activities];
    const newScore = calculateLeadScore(lead, updatedActivities);
    const updatedLead = { 
      ...lead, 
      leadScore: newScore, 
      lastContactedAt: new Date().toISOString() 
    };
    
    await updateLead(updatedLead);
    
    setActivities(updatedActivities);
    setLead(updatedLead);
    setShowActivityForm(false);
    setNewActivity({ type: ActivityType.Call, outcome: ActivityOutcome.Interested, description: '' });
    setIsSavingActivity(false);
  };

  const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!lead) return;
      const newStage = e.target.value as Stage;
      let newProb = lead.probability;
      
      if(newStage === Stage.Won) newProb = 100;
      if(newStage === Stage.Lost) newProb = 0;
      if(newStage === Stage.Proposal) newProb = 70;
      if(newStage === Stage.Qualified) newProb = 40;

      const updatedLead = { 
          ...lead, 
          stage: newStage,
          status: newStage === Stage.Won ? Status.Won : newStage === Stage.Lost ? Status.Lost : Status.Open,
          probability: newProb,
          expectedValue: lead.dealValue * (newProb / 100)
      };
      setLead(updatedLead);
      await updateLead(updatedLead);
  };

  const handleAssignLead = async (newOwnerEmail: string) => {
      if (!lead) return;
      const updatedLead = { ...lead, leadOwner: newOwnerEmail };
      setLead(updatedLead);
      await updateLead(updatedLead);
      alert(`Lead assigned to ${newOwnerEmail}`);
  }

  if (loading) {
      return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div></Layout>;
  }

  if (!lead) return null;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center mb-6 gap-4">
        <div className="flex items-center">
            <button onClick={() => navigate('/leads')} className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
            </button>
            <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.leadName}</h1>
            <p className="text-gray-500">{lead.companyName} • {lead.industry}</p>
            </div>
        </div>
        <div className="md:ml-auto flex gap-2">
           <a href={`tel:${lead.phone}`} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="Call">
             <Phone size={20} />
           </a>
           <a href={`mailto:${lead.email}`} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors" title="Email">
             <Mail size={20} />
           </a>
           <button className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" title="WhatsApp">
             <MessageCircle size={20} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & AI */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Actions / Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Lead Score</p>
                <div className="flex items-center">
                  <span className={`text-2xl font-bold ${lead.leadScore > 70 ? 'text-orange-600' : 'text-gray-800'}`}>{lead.leadScore}</span>
                  <span className="text-sm text-gray-400 ml-1">/ 100</span>
                </div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Stage</p>
                <select 
                    value={lead.stage} 
                    onChange={handleStageChange}
                    className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-md p-1 font-medium outline-none cursor-pointer hover:bg-blue-100 transition-colors w-full"
                >
                    {Object.values(Stage).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500 mb-1">Expected Value</p>
                <span className="text-xl font-bold text-gray-800">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(lead.expectedValue)}
                </span>
             </div>
          </div>

          {/* Admin Actions (Only visible to Admin) */}
          {user?.role === 'Admin' && (
              <Card title="Admin Actions" className="bg-gray-50 border-dashed border-gray-300">
                  <div className="flex items-center space-x-4">
                      <div className="text-gray-500 text-sm flex items-center"><Shield size={16} className="mr-2"/> Assign Lead to:</div>
                      <select 
                          className="border border-gray-300 rounded-md p-1.5 text-sm bg-white"
                          value={lead.leadOwner}
                          onChange={(e) => handleAssignLead(e.target.value)}
                      >
                          {users.map(u => (
                              <option key={u.email} value={u.email}>{u.name} ({u.role})</option>
                          ))}
                      </select>
                  </div>
              </Card>
          )}

          {/* AI Email Generator */}
          <Card 
            title="AI Assistant" 
            className="border-purple-200 bg-gradient-to-r from-white to-purple-50"
            action={
               <button 
                onClick={handleGenerateEmail} 
                disabled={isGeneratingEmail}
                className="flex items-center text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isGeneratingEmail ? <Loader2 size={16} className="animate-spin mr-2" /> : <Sparkles size={16} className="mr-2" />}
                {isGeneratingEmail ? 'Thinking...' : 'Draft Email'}
              </button>
            }
          >
            <div className="space-y-4">
              {isGeneratingEmail ? (
                 <div className="animate-pulse space-y-3">
                   <div className="h-4 bg-purple-200 rounded w-3/4"></div>
                   <div className="h-20 bg-purple-200 rounded"></div>
                 </div>
              ) : aiEmail || lead.suggestedEmailBody ? (
                <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                  <div className="mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Subject</span>
                    <p className="text-gray-900 font-medium">{aiEmail?.subject || lead.suggestedEmailSubject}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Body</span>
                    <p className="text-gray-700 text-sm whitespace-pre-line mt-1">{aiEmail?.body || lead.suggestedEmailBody}</p>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button onClick={() => navigator.clipboard.writeText(aiEmail?.body || lead.suggestedEmailBody || '')} className="text-xs text-purple-600 font-medium hover:underline">Copy to Clipboard</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Generate a personalized follow-up email based on recent activity and lead details.</p>
              )}
            </div>
          </Card>

          {/* Activity History */}
          <Card 
            title="Activity History" 
            action={
              <button onClick={() => setShowActivityForm(!showActivityForm)} className="text-blue-600 text-sm font-medium hover:underline">
                + Log Activity
              </button>
            }
          >
            {showActivityForm && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select 
                      className="w-full border rounded p-2 text-sm"
                      value={newActivity.type}
                      onChange={e => setNewActivity({...newActivity, type: e.target.value as ActivityType})}
                    >
                      {Object.values(ActivityType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Outcome</label>
                    <select 
                       className="w-full border rounded p-2 text-sm"
                       value={newActivity.outcome}
                       onChange={e => setNewActivity({...newActivity, outcome: e.target.value as ActivityOutcome})}
                    >
                       {Object.values(ActivityOutcome).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                   <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                   <textarea 
                    className="w-full border rounded p-2 text-sm" 
                    rows={3}
                    value={newActivity.description}
                    onChange={e => setNewActivity({...newActivity, description: e.target.value})}
                    placeholder="What happened?"
                   />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowActivityForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
                  <button disabled={isSavingActivity} onClick={handleAddActivity} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                      {isSavingActivity ? 'Saving...' : 'Save Activity'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {activities.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No activities recorded yet.</p>}
              {activities.map((act, idx) => (
                <div key={act.id} className="flex relative">
                  {idx !== activities.length - 1 && <div className="absolute left-3.5 top-8 bottom-[-24px] w-0.5 bg-gray-200"></div>}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    act.type === ActivityType.Call ? 'bg-green-100 text-green-600' :
                    act.type === ActivityType.Email ? 'bg-blue-100 text-blue-600' : 
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {act.type === ActivityType.Call ? <Phone size={14} /> : act.type === ActivityType.Email ? <Mail size={14} /> : <Calendar size={14} />}
                  </div>
                  <div className="ml-4 pb-1 w-full">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">{act.subject}</h4>
                      <span className="text-xs text-gray-500">{new Date(act.dateTime).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{act.description}</p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        act.outcome === 'Interested' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {act.outcome}
                      </span>
                      <span className="text-xs text-gray-400">by {act.createdBy === user.email ? 'You' : act.createdBy.split('@')[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Info */}
        <div className="space-y-6">
          <Card title="Lead Details">
             <dl className="space-y-4 text-sm">
               <div>
                 <dt className="text-gray-500">Email</dt>
                 <dd className="font-medium text-gray-900 truncate">{lead.email}</dd>
               </div>
               <div>
                 <dt className="text-gray-500">Phone</dt>
                 <dd className="font-medium text-gray-900">{lead.phone}</dd>
               </div>
               <div>
                 <dt className="text-gray-500">Source</dt>
                 <dd className="font-medium text-gray-900">{lead.source}</dd>
               </div>
               <div>
                 <dt className="text-gray-500">Budget</dt>
                 <dd className="font-medium text-gray-900">{lead.budgetRange}</dd>
               </div>
               <div>
                 <dt className="text-gray-500">Owner</dt>
                 <dd className="font-medium text-gray-900">{lead.leadOwner}</dd>
               </div>
             </dl>
          </Card>
          
          <Card title="Next Action">
            {lead.nextActionDateTime ? (
              <div className={`p-4 rounded-lg border ${
                 new Date(lead.nextActionDateTime) < new Date() ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
              }`}>
                 <div className="flex items-start">
                    <Clock size={18} className={`mt-0.5 mr-2 ${new Date(lead.nextActionDateTime) < new Date() ? 'text-red-600' : 'text-blue-600'}`} />
                    <div>
                      <p className={`font-medium ${new Date(lead.nextActionDateTime) < new Date() ? 'text-red-800' : 'text-blue-800'}`}>
                        {lead.nextActionType || 'Follow Up'}
                      </p>
                      <p className={`text-sm ${new Date(lead.nextActionDateTime) < new Date() ? 'text-red-600' : 'text-blue-600'}`}>
                        {new Date(lead.nextActionDateTime).toLocaleString()}
                      </p>
                    </div>
                 </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No upcoming actions scheduled.</p>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default LeadDetail;
