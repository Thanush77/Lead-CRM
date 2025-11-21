import { Lead, Activity, User } from '../types';

// !!! IMPORTANT: PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE !!!
const API_URL = 'https://script.google.com/macros/s/AKfycbwfueUusCfqVYBNW2jluSaBKKu9dAN-gdFhLxq59Gp75hV2hOBV7o8O6kY-rl6UteQwwQ/exec'; 

// Helper to simulate network delay (optional, can be removed if API is fast)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API HELPERS ---

const apiFetch = async (action: string, params: Record<string, string> = {}) => {
  if (!API_URL) {
      console.error("API_URL is missing. Please add your Google Apps Script URL in storageService.ts");
      return null;
  }

  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  
  try {
    const response = await fetch(url.toString());
    const json = await response.json();
    if (json.error) {
        console.error("API Error:", json.error);
        throw new Error(json.error);
    }
    return json;
  } catch (error) {
    console.error("Fetch Error:", error);
    return null;
  }
};

const apiPost = async (action: string, data: any) => {
  if (!API_URL) return null;

  try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, data })
    });
    const json = await response.json();
    if (json.error) throw new Error(json.error);
    return json;
  } catch (error) {
      console.error("Post Error:", error);
      throw error;
  }
};


// --- USERS ---
export const getUsers = async (): Promise<User[]> => {
    const data = await apiFetch('getUsers');
    return data || [];
};

export const authenticateUser = async (email: string, passwordInput: string): Promise<User | undefined> => {
    // 1. Fetch user by email from the backend
    const user = await apiFetch('authenticate', { email });
    
    // 2. Verify password locally (since our simple backend returns the whole user object including the pwd column)
    // In a high-security env, password check should happen on server-side.
    if (user && user.password === passwordInput) {
        return user;
    }
    
    return undefined;
}

// --- LEADS ---
export const getLeads = async (user?: User): Promise<Lead[]> => {
  const params: Record<string, string> = {};
  if (user) {
      params.userEmail = user.email;
      params.userRole = user.role;
  }
  const data = await apiFetch('getLeads', params);
  return data || [];
};

export const getLeadById = async (id: string): Promise<Lead | undefined> => {
  return apiFetch('getLeadById', { id });
};

export const createLead = async (lead: Lead): Promise<void> => {
    await apiPost('createLead', lead);
}

export const updateLead = async (lead: Lead): Promise<void> => {
    await apiPost('updateLead', lead);
};

// --- ACTIVITIES ---
export const getActivities = async (leadId?: string): Promise<Activity[]> => {
  const params: Record<string, string> = {};
  if (leadId) params.leadId = leadId;
  const data = await apiFetch('getActivities', params);
  
  if (!data) return [];

  // Sort by date desc
  return data.sort((a: Activity, b: Activity) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
};

export const addActivity = async (activity: Activity): Promise<void> => {
    await apiPost('addActivity', activity);
};

// --- SCORING ---
// Pure logic, no storage needed
export const calculateLeadScore = (lead: Lead, leadActivities: Activity[]): number => {
  let score = 0;
  
  // Use enums from types, but handle string matching loosely in case of sheet data variations
  
  // Source Score
  if (lead.source === 'Referral') score += 20;
  else if (lead.source === 'Website') score += 10;
  else if (lead.source === 'Cold Call') score += 5;

  // Budget Score
  if (lead.budgetRange === '>10L') score += 30;
  else if (lead.budgetRange === '5–10L') score += 20;
  else if (lead.budgetRange === '1–5L') score += 10;

  // Engagement Score
  const lastActivity = leadActivities.length > 0 ? leadActivities[0] : null; 
  if (lastActivity) {
    if (lastActivity.outcome === 'Interested') score += 20;
    if (lastActivity.outcome === 'Follow-up Required') score += 10;
  }
  
  if (leadActivities.length > 3) score += 10;

  return Math.min(score, 100); 
};