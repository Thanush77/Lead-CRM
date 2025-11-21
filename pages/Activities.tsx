import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import { Activity } from '../types';
import { getActivities, getLeads } from '../services/storageService';
import { Calendar, Mail, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Activities: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leadMap, setLeadMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // 1. Get leads visible to this user
        const leadsData = await getLeads(user);
        
        // 2. Get all activities
        const allActivities = await getActivities();

        // 3. Filter activities: Only show activities linked to leads this user can see
        const userLeadIds = new Set(leadsData.map(l => l.id));
        const filteredActivities = allActivities.filter(a => userLeadIds.has(a.leadId));

        // 4. Sort by date (newest first)
        filteredActivities.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

        setActivities(filteredActivities);

        const map: Record<string, string> = {};
        leadsData.forEach(l => map[l.id] = l.leadName);
        setLeadMap(map);
      } catch (error) {
        console.error("Failed to load activities", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
       <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Activity Log</h1>
        <p className="text-gray-500">
          {user?.role === 'Admin' ? 'Recent interactions across all territories.' : 'Track your recent interactions and follow-ups.'}
        </p>
      </div>

      <Card>
        {activities.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No activities found. Start working on your leads to see history here.
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {activities.map((activity, idx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {idx !== activities.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                           activity.type === 'Call' ? 'bg-green-500' : 
                           activity.type === 'Email' ? 'bg-blue-500' : 'bg-gray-500'
                        }`}>
                          {activity.type === 'Call' && <Phone className="h-4 w-4 text-white" />}
                          {activity.type === 'Email' && <Mail className="h-4 w-4 text-white" />}
                          {activity.type === 'Meeting' && <Calendar className="h-4 w-4 text-white" />}
                          {activity.type === 'WhatsApp' && <MessageSquare className="h-4 w-4 text-white" />}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium text-gray-900">{activity.type}</span> with{' '}
                            <span className="font-medium text-gray-900">{leadMap[activity.leadId] || 'Unknown Lead'}</span>
                          </p>
                          <p className="text-sm text-gray-700 mt-1">{activity.description}</p>
                          <div className="mt-1">
                             <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                activity.outcome === 'Interested' ? 'bg-green-100 text-green-800' :
                                activity.outcome === 'Follow-up Required' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                             }`}>
                               {activity.outcome}
                             </span>
                          </div>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time dateTime={activity.dateTime}>{new Date(activity.dateTime).toLocaleDateString()}</time>
                          <div className="text-xs mt-1">by {activity.createdBy}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </Layout>
  );
};

export default Activities;