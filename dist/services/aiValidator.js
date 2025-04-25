"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIValidator = exports.AIModel = void 0;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const generative_ai_1 = require("@google/generative-ai");
const child_process_1 = require("child_process");
dotenv_1.default.config();
// Initialize different AI clients
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
var AIModel;
(function (AIModel) {
    AIModel["GPT4"] = "gpt-4";
    AIModel["MEDPALM"] = "med-palm";
    AIModel["BIOMEDLM"] = "biomedlm";
    AIModel["MEDITRON"] = "meditron";
})(AIModel || (exports.AIModel = AIModel = {}));
class AIValidator {
    constructor(model = AIModel.GPT4) {
        this.selectedModel = model;
    }
    async validateMedicalReport(tests, reportContent) {
        try {
            const prompt = this.generateValidationPrompt(tests, reportContent);
            let response;
            switch (this.selectedModel) {
                case AIModel.MEDPALM:
                    response = await this.useMedPalm(prompt);
                    break;
                case AIModel.BIOMEDLM:
                    response = await this.useBioMedLM(prompt);
                    break;
                case AIModel.MEDITRON:
                    response = await this.useMeditron(prompt);
                    break;
                default:
                    response = await this.useGPT4(prompt);
            }
            return this.parseAIResponse(response, tests);
        }
        catch (error) {
            console.error('Error in AI validation:', error);
            throw new Error('Failed to validate medical report');
        }
    }
    async useGPT4(prompt) {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a medical expert specialized in analyzing medical reports and test results. Your task is to validate medical tests against report content and provide detailed analysis."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
        });
        return completion.choices[0].message.content || '';
    }
    async useMedPalm(prompt) {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
    async useBioMedLM(prompt) {
        // Implementation for BioMedLM would go here
        // This would require setting up the appropriate API client
        throw new Error('BioMedLM integration not implemented yet');
    }
    async useMeditron(prompt) {
        return new Promise((resolve, reject) => {
            // Assuming Meditron is installed and accessible via command line
            const meditron = (0, child_process_1.spawn)('meditron', ['--prompt', prompt]);
            let output = '';
            let error = '';
            meditron.stdout.on('data', (data) => {
                output += data.toString();
            });
            meditron.stderr.on('data', (data) => {
                error += data.toString();
            });
            meditron.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Meditron process exited with code ${code}: ${error}`));
                }
                else {
                    resolve(output);
                }
            });
            meditron.on('error', (err) => {
                reject(new Error(`Failed to start Meditron: ${err.message}`));
            });
        });
    }
    generateValidationPrompt(tests, reportContent) {
        return `
      Please analyze the following medical report and validate it against the provided tests.
      
      Tests to validate:
      ${JSON.stringify(tests, null, 2)}
      
      Report Content:
      ${reportContent}
      
      Please provide:
      1. List of matched tests with their details
      2. List of unmatched tests
      3. Detailed analysis of the report
      4. Any relevant web references for verification
      
      Format your response as a JSON object with the following structure:
      {
        "success": boolean,
        "details": {
          "matchedTests": [...],
          "unmatchedTests": [...],
          "reportAnalysis": "string",
          "webReferences": [
            {
              "source": "string",
              "information": "string"
            }
          ]
        }
      }
    `;
    }
    parseAIResponse(response, originalTests) {
        try {
            const parsedResponse = JSON.parse(response);
            return {
                success: parsedResponse.success,
                details: {
                    matchedTests: parsedResponse.details.matchedTests,
                    unmatchedTests: parsedResponse.details.unmatchedTests,
                    reportAnalysis: parsedResponse.details.reportAnalysis,
                    webReferences: parsedResponse.details.webReferences
                }
            };
        }
        catch (error) {
            console.error('Error parsing AI response:', error);
            throw new Error('Failed to parse AI validation response');
        }
    }
}
exports.AIValidator = AIValidator;
