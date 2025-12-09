import { GoogleGenAI } from "@google/genai";
import { Product, Transaction, FinancialSummary, CartItem } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const GENERATION_CONFIG = {
  maxOutputTokens: 1000,
  temperature: 0.2, // Low temperature for analytical precision
};

/**
 * Analyzes financial data and provides an executive summary.
 */
export const generateExecutiveSummary = async (
  summary: FinancialSummary,
  transactions: Transaction[],
  topProducts: Product[]
): Promise<string> => {
  try {
    const prompt = `
      Act as a Chief Financial Officer (CFO) for a retail grocery store ("Toko Kelontong").
      Analyze the following financial snapshot for the current month:
      
      Revenue: Rp ${summary.revenue.toLocaleString()}
      COGS: Rp ${summary.cogs.toLocaleString()}
      Gross Profit: Rp ${summary.grossProfit.toLocaleString()}
      Expenses: Rp ${summary.expenses.toLocaleString()}
      Net Profit: Rp ${summary.netProfit.toLocaleString()}
      Transaction Count: ${transactions.length}
      Top Selling Product: ${topProducts.length > 0 ? topProducts[0].name : 'N/A'}

      Provide a brief, 3-sentence executive summary highlighting the health of the business and one actionable recommendation for the store owner to improve profitability or efficiency.
      Keep the tone professional yet accessible.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: GENERATION_CONFIG
    });

    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "AI Service Unavailable. Please check your connection or API key.";
  }
};

/**
 * Advanced chat for custom analysis
 */
export const askFinancialAnalyst = async (
  question: string,
  contextData: string
): Promise<string> => {
  try {
    const prompt = `
      You are an expert Accounting AI Assistant for a grocery store ERP.
      
      Context Data (JSON):
      ${contextData}

      User Question: "${question}"

      Answer the user's question based strictly on the provided data and general accounting principles. 
      If predicting future trends, explicitly state that it is a forecast based on historical patterns.
      Format the output nicely using Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        ...GENERATION_CONFIG,
        temperature: 0.5
      }
    });

    return response.text || "I couldn't analyze that.";
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "Error connecting to the AI analyst.";
  }
};

/**
 * Parses an uploaded invoice image or document to extract structured transaction data.
 */
export const analyzeUploadedDocument = async (
  base64Data: string,
  mimeType: string
): Promise<any> => {
  try {
    const prompt = `
      You are a Data Entry Clerk. Analyze this image of a receipt/invoice.
      Extract the following information and return ONLY a raw JSON object (no markdown, no backticks):
      
      {
        "date": "ISO 8601 date string (YYYY-MM-DD), use today if not found",
        "supplier": "Name of store/supplier",
        "total": number (numeric value only),
        "items": [
          { "name": "product name", "price": number, "quantity": number }
        ]
      }

      If the image is not a receipt or unreadable, return: { "error": "Invalid Document" }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        ...GENERATION_CONFIG,
        temperature: 0.1 // Very precise
      }
    });

    const text = response.text || "{}";
    // Clean up markdown code blocks if Gemini adds them despite instruction
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Document Analysis Error:", error);
    return { error: "Failed to process document" };
  }
};

/**
 * Generates up-selling/cross-selling recommendations based on cart items.
 */
export const generatePOSRecommendations = async (
  cartItems: CartItem[],
  allProducts: Product[]
): Promise<string[]> => {
  try {
    if (cartItems.length === 0) return [];

    const cartContext = cartItems.map(i => i.name).join(', ');
    const productCatalog = allProducts.map(p => p.name).join(', ');

    const prompt = `
      As an AI Sales Assistant, suggest 2 complementary products to upsell/cross-sell based on the current cart:
      Cart: [${cartContext}]
      Available Catalog: [${productCatalog}]
      
      Return ONLY a JSON array of strings with the exact product names from the catalog. Example: ["Sugar 1kg", "Milk"]
      Do not include products already in the cart.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.warn("Recommendation Error:", error);
    return [];
  }
};