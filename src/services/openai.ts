import { MOCK_EXTRACTION_DATA } from "../data/mockExtraction";

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface ExtractedData {
    field: string;
    value: string;
    confidence: number;
}

const SYSTEM_PROMPT = `
You are an expert underwriter and loan processor with advanced vision capabilities.
Your task is to extract ALL vital loan information from the provided document image.

CRITICAL INSTRUCTIONS:
1. **Semantic Mapping & Reasoning**: The document may use different terminology than the target fields. You must **reason** about the context to match them correctly.
   - Example 1: "Note Rate" or "Interest" -> Map to "Interest Rate".
   - Example 2: "Creditor" or "Note Holder" -> Map to "Lender / Creditor Name".
   - Example 3: "Principal Amount" or "Amount Financed" -> Map to "Loan Amount".
2. **Handle Blurry/Small Text**: Use context clues to infer words if text is pixelated. Do not give up easily.
3. **Output Format**: Return a JSON object with two keys:
   - "reasoning": A brief string explaining your analysis of the document structure and any difficult mappings you made.
   - "data": An array of extracted fields.
4. **Array Structure**: Each item in "data" must be an object with keys: "field", "value", and "confidence" (0-1).

VITAL FIELDS TO EXTRACT (Look for these specifically):
- Borrower Name(s) (Full names)
- Property Address (Full street address, City, State, ZIP)
- Lender / Creditor Name
- Loan Number
- Loan Amount (Principal)
- Interest Rate (%)
- Interest Rate Type (Fixed, Adjustable/ARM)
- Loan Term (Months or Years)
- Amortization Type (Fixed, ARM, Balloon, etc.)
- Loan Purpose (Purchase, Refinance, Equity, etc.)
- Loan Type (Conventional, FHA, VA, USDA, etc.)
- Monthly Principal & Interest Payment
- Total Monthly Payment (if different)
- Origination / Closing Date
- Maturity Date
- Prepayment Penalty (Yes/No)
- Escrow / Impound Account (Yes/No)

If a field is NOT found, set value to "Not Found".
Format values cleanly (e.g., "$450,000.00", "6.5%", "360 Months").
`;

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export async function extractLoanData(file: File, docType: string = "Generic Loan Document"): Promise<ExtractedData[]> {
    if (!API_KEY) {
        console.error("Missing API Key, using mock data");
        return new Promise(resolve => setTimeout(() => resolve(MOCK_EXTRACTION_DATA), 2000));
    }

    // Dynamic instructions based on document type
    let specificInstructions = "";
    if (docType === 'Pay Stub') {
        specificInstructions = "Focus on extracting: Gross Pay, Net Pay, Pay Period Start/End, Employer Name, Employee Name, YTD Gross.";
    } else if (docType === 'Bank Statement') {
        specificInstructions = "Focus on extracting: Account Holder, Bank Name, Account Number, Beginning Balance, Ending Balance, Statement Period.";
    } else if (docType === 'Tax Return') {
        specificInstructions = "Focus on extracting: Tax Year, Filing Status, Total Income, Adjusted Gross Income (AGI), Wages/Salaries.";
    }

    const FINAL_SYSTEM_PROMPT = `${SYSTEM_PROMPT}
    
    DOCUMENT TYPE CONTEXT:
    The user has identified this document as a: **${docType}**.
    ${specificInstructions}
    Use this knowledge to prioritize relevant fields and interpret ambiguous values correctly.
    `;

    try {
        const base64Image = await fileToBase64(file);

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: FINAL_SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: `Extract loan data from this ${docType} image.` },
                            {
                                type: "image_url",
                                image_url: {
                                    url: base64Image
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1500,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        if (!content) {
            throw new Error("No content received from OpenAI");
        }

        const parsed = JSON.parse(content);

        if (!parsed || typeof parsed !== 'object') {
            throw new Error("Invalid or empty JSON response");
        }

        // Robustly find the array - check common keys just in case 'data' isn't exact
        const result = Array.isArray(parsed) ? parsed : (parsed.data || parsed.fields || parsed.result || []);

        if (!Array.isArray(result)) {
            console.warn("Unexpected JSON structure:", parsed);
            return [];
        }

        // Normalize to ensure it matches our interface
        return result.map((item: any) => ({
            field: item.field || "Unknown",
            value: item.value || "",
            confidence: item.confidence || 0.5
        }));

    } catch (error) {
        console.error("Extraction Failed:", error);
        // Fallback or rethrow
        throw error;
    }
}
