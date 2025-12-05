
import { GoogleGenAI, Type } from "@google/genai";
import { Employee, DaySchedule } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.includes("VITE_API_KEY")) {
    console.error("API Key is missing. Please check your .env file and rebuild.");
    throw new Error("Missing API Key. Please ensure VITE_API_KEY is set in your .env file and you have rebuilt the app.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Uses Gemini to parse unstructured or semi-structured text into structured JSON.
 */
export const parseStockDataWithGemini = async (rawText: string): Promise<any[]> => {
  try {
    const ai = getAiClient();
    const prompt = `
      You are a data entry assistant. 
      Analyze the following text block containing stock or transaction records.
      
      The format can be one of the following:
      1. Full Record: "Date, Code, Provider, Phone Number, Amount"
      2. Short Record (Ending Balance): "Code, Provider, Phone Number, Amount"
      3. System Report: "1. Code- Phone Provider Amount" (e.g., "2. C315- 01119938648 Celcom 942.38")
      
      Task: Extract the data into a JSON array. 
      - Normalize the Code (remove hyphens if attached like "C315-").
      - If the Date is present in the text, extract it.
      - If the Date is missing, leave the date field as null or empty string.
      - Treat empty amounts or missing values as 0.
      - Remove commas from amounts (e.g. 20,000.00 -> 20000.00).
      
      Input Text:
      ${rawText}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "Format DD-Mon-YYYY if present, else null", nullable: true },
              code: { type: Type.STRING, description: "The item code e.g., C105" },
              provider: { type: Type.STRING, description: "The provider/brand e.g., Celcom" },
              phoneNumber: { type: Type.STRING, description: "The phone number" },
              amount: { type: Type.NUMBER, description: "The numeric monetary value. Use 0 if missing." }
            },
            required: ["code", "phoneNumber", "amount"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};

/**
 * Generates a quick insight summary of the current data.
 */
export const generateDataInsights = async (data: any[]): Promise<string> => {
    try {
      const ai = getAiClient();
      
      // We limit data sent to avoid context limits if list is huge
      const dataSample = JSON.stringify(data.slice(0, 50)); 
      const totalCount = data.length;
    
      const prompt = `
        Analyze this partial dataset of stock records (showing ${Math.min(50, totalCount)} of ${totalCount} items).
        The dataset contains 'IN' (stock entry) and 'OUT' (usage/sales) records.
        
        Data: ${dataSample}
        
        Provide a brief, 3-sentence executive summary highlighting:
        1. Overall stock movement trend (Net accumulation vs High usage).
        2. Any provider dominance or high-usage items.
        3. An actionable insight.
        Keep it professional and concise.
      `;
    
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return response.text || "No insights generated.";
    } catch (error) {
      console.error("Gemini Insight Error:", error);
      return "Could not generate insights at this time.";
    }
  };

/**
 * Generates a MONTHLY schedule for employees.
 */
export const generateStaffSchedule = async (employees: Employee[], month: string): Promise<DaySchedule[]> => {
  try {
    const ai = getAiClient();
    
    if (employees.length === 0) return [];

    // Determine days in the requested month
    const [year, monthIdx] = month.split('-').map(Number);
    const daysInMonth = new Date(year, monthIdx, 0).getDate(); // Get last day of month

    const employeesForPrompt = employees.map(e => ({
      id: e.id,
      name: e.name,
      primaryShift: e.primaryShift || "Morning", // The shift they MUST be on for this rotation
      requests: e.requests ? e.requests.map(r => `${r.shift} on ${r.day}`).join(", ") : "None"
    }));

    const prompt = `
      Create a MONTHLY work schedule for a team of ${employees.length} people for **${month}** (Total ${daysInMonth} days).
      
      **TIMELINE**:
      Generate assignments for every single day from ${month}-01 to ${month}-${daysInMonth}.
      Ensure you return exactly ${daysInMonth} items in the main array.

      Employees Data: 
      ${JSON.stringify(employeesForPrompt)}

      **SHIFTS**:
      1. "Morning" (MORN): 9AM - 7PM (Main Shift)
      2. "Noon 1": 1PM - 11PM (Supplementary Shift)
      3. "Noon 2": 3PM - 1AM (Main Shift)
      4. "OFF": Day off
      5. "AL": Annual Leave (Only if requested)

      **CRITICAL RULES & CONSTRAINTS**:
      1. **Primary Shift Rotation (CRITICAL)**: 
        - Each employee has a "primaryShift" property.
        - **You MUST assign them their "primaryShift" for EVERY working day** in the month.
        - DO NOT switch them to a different shift unless:
          a) It is absolutely necessary to meet minimum staffing constraints.
          b) They have a specific request for a different shift on that day.
        - Example: If Weng is "Noon 2", he works "Noon 2" or is "OFF". He rarely works "Morning".
      
      2. **Off Days**: 
        - Each employee must have exactly 2 days OFF per week.
        - These OFF days MUST be consecutive (e.g., Sun-Mon).
      
      3. **Minimum Staffing**: 
        - Ensure at least 2 people are on "Morning" and at least 2 people are on "Noon 2" (or Noon 1) each day if possible.
        - Total working staff per day should be balanced.
      
      4. **Workload Distribution**:
        - **Monday, Thursday, Friday**: These are PEAK days. Increase manpower if possible.
      
      Output Format:
      Return a JSON array where each item represents a day.
      Format:
      [
        {
          "day": "YYYY-MM-DD",
          "assignments": [
            { "employeeId": "...", "employeeName": "...", "shift": "..." }
          ]
        },
        ...
      ]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING, description: "YYYY-MM-DD" },
              assignments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    employeeId: { type: Type.STRING },
                    employeeName: { type: Type.STRING },
                    shift: { type: Type.STRING, enum: ["Morning", "Noon 1", "Noon 2", "OFF", "AL"] }
                  },
                  required: ["employeeId", "employeeName", "shift"]
                }
              }
            },
            required: ["day", "assignments"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Schedule Error:", error);
    throw error;
  }
};

/**
 * Parses a schedule screenshot image to extract employees and assignments.
 * Optimized for full-month grid views with specific color coding.
 */
export const parseScheduleFromImage = async (base64Data: string, mimeType: string): Promise<{ employees: string[], flatAssignments: { date: string, employeeName: string, shift: string }[] }> => {
  try {
    const ai = getAiClient();

    const prompt = `
      Analyze this image of a STAFF SCHEDULE grid.
      
      **Task**: Extract every single cell assignment visible in the table.
      
      **Instructions**:
      1. **Dates**: Identify the header row with dates (e.g., "1 Dec", "2", "30 Nov"). Infer the year if missing (use current year).
      2. **Employees**: Identify names in the first column.
      3. **Assignments**: For EACH employee and EACH date, identify the shift based on TEXT and BACKGROUND COLOR.
      
      **CRITICAL SHIFT MAPPING**:
      - **GREEN** -> "Morning"
      - **DARK BLUE** -> "Noon 2"
      - **LIGHT BLUE / SKY** -> "Noon 1"
      - **ORANGE / YELLOW** -> "OFF"
      - **PINK / RED** -> "AL" (Annual Leave)
      
      **Rules**:
      - If a cell is GREEN, it is "Morning" even if text is unreadable.
      - If a cell is BLUE, it is "Noon 1" or "Noon 2".
      - If a cell is ORANGE, it is "OFF".
      - Do NOT default to "OFF" just because text is empty. If it has color, it's a shift.
      - Scan ALL columns visible in the image.
      
      Output JSON format:
      {
        "employees": ["Name1", "Name2"],
        "flatAssignments": [
          { "date": "YYYY-MM-DD", "employeeName": "Name1", "shift": "Morning" },
          ...
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            employees: { type: Type.ARRAY, items: { type: Type.STRING } },
            flatAssignments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "YYYY-MM-DD" },
                  employeeName: { type: Type.STRING },
                  shift: { type: Type.STRING, enum: ["Morning", "Noon 1", "Noon 2", "OFF", "AL"] }
                },
                required: ["date", "employeeName", "shift"]
              }
            }
          },
          required: ["employees", "flatAssignments"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from AI");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Image Parse Error:", error);
    throw error;
  }
};
