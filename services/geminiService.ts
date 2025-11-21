import { GoogleGenAI, Type } from "@google/genai";
import { Lead, Activity, AIEmailResponse } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found. AI features will return mock data.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateFollowUpEmail = async (lead: Lead, lastActivity: Activity | null): Promise<AIEmailResponse> => {
  const ai = getClient();

  if (!ai) {
    // Fallback if no API key is present
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          subject: `Follow up regarding ${lead.companyName}`,
          body: `Hi ${lead.leadName},\n\nI hope you're having a great day. I wanted to follow up on our last conversation regarding solutions for ${lead.industry}. \n\nGiven your interest in our ${lead.budgetRange} tier, I believe we can offer significant value.\n\nAre you free for a quick chat this week?\n\nBest,\n[Your Name]`
        });
      }, 1000);
    });
  }

  const prompt = `
    Context: I am a salesperson at Apex CRM.
    Lead Name: ${lead.leadName}
    Company: ${lead.companyName}
    Industry: ${lead.industry}
    Current Stage: ${lead.stage}
    Last Activity Notes: ${lastActivity ? `${lastActivity.type} - ${lastActivity.description} (Outcome: ${lastActivity.outcome})` : 'No previous activity recorded.'}
    Goal: Move the lead to the next stage (usually a Meeting or Demo).

    Task: Write a professional, short, and friendly follow-up email subject and body.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["subject", "body"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIEmailResponse;
    }
    throw new Error("No response text");
  } catch (error) {
    console.error("Error generating email:", error);
    return {
      subject: "Error generating email",
      body: "There was an error communicating with the AI service. Please try again later."
    };
  }
};