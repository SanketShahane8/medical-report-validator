import OpenAI from 'openai';
import { MedicalTest, MedicalReport, ValidationResult } from '../models/medical';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import path from 'path';

dotenv.config();

// Initialize different AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export enum AIModel {
  GPT4 = 'gpt-4',
  MEDPALM = 'med-palm',
  BIOMEDLM = 'biomedlm',
  DEEPSEEK = 'deepseek-r1:32b'
}

export class AIValidator {
  private selectedModel: AIModel;

  constructor(model: AIModel = AIModel.GPT4) {
    this.selectedModel = model;
  }

  async validateMedicalReport(
    tests: MedicalTest[],
    reportContent: string
  ): Promise<ValidationResult> {
    try {
      const prompt = this.generateValidationPrompt(tests, reportContent);
      
      let response: string;
      
      switch (this.selectedModel) {
        case AIModel.MEDPALM:
          response = await this.useMedPalm(prompt);
          break;
        case AIModel.BIOMEDLM:
          response = await this.useBioMedLM(prompt);
          break;
        case AIModel.DEEPSEEK:
          response = await this.useDeepSeek(prompt);
          break;
        default:
          response = await this.useGPT4(prompt);
      }

      return this.parseAIResponse(response, tests);
    } catch (error) {
      console.error('Error in AI validation:', error);
      throw new Error('Failed to validate medical report');
    }
  }

  private async useGPT4(prompt: string): Promise<string> {
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

  private async useMedPalm(prompt: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  private async useBioMedLM(prompt: string): Promise<string> {
    // Implementation for BioMedLM would go here
    // This would require setting up the appropriate API client
    throw new Error('BioMedLM integration not implemented yet');
  }

  private async useDeepSeek(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('Starting DeepSeek via Ollama...');
      
      // Set a timeout of 2 minutes
      const timeout = setTimeout(() => {
        reject(new Error('DeepSeek request timed out after 2 minutes'));
      }, 300000);

      const ollama = spawn('ollama', ['run', 'deepseek-r1:32b'], {
        env: {
          ...process.env,
          PATH: process.env.PATH
        }
      });

      let output = '';
      let error = '';
      let isComplete = false;

      // Write the prompt to stdin
      ollama.stdin.write(prompt + '\n');
      ollama.stdin.end();

      ollama.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log('DeepSeek stdout:', dataStr);

        // Check for completion indicators
        if (dataStr.includes('}') && dataStr.includes('"success"')) {
          isComplete = true;
          clearTimeout(timeout);
          ollama.kill(); // End the process once we have complete response
        }
      });

      ollama.stderr.on('data', (data) => {
        const dataStr = data.toString();
        error += dataStr;
        console.error('DeepSeek stderr:', dataStr);
      });

      ollama.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0 && !isComplete) {
          console.error(`DeepSeek process exited with code ${code}`);
          reject(new Error(`DeepSeek process exited with code ${code}: ${error}`));
        } else {
          console.log('DeepSeek process completed successfully');
          console.log('Raw output:', output);
          
          // Clean the output to ensure we have valid JSON
          const cleanedOutput = output
            .replace(/^.*?\{/, '{') // Remove everything before the first {
            .replace(/\}.*$/, '}')  // Remove everything after the last }
            .trim();
            
          resolve(cleanedOutput);
        }
      });

      ollama.on('error', (err) => {
        clearTimeout(timeout);
        console.error('Failed to start DeepSeek:', err);
        reject(new Error(`Failed to start DeepSeek via Ollama: ${err.message}`));
      });
    });
  }

  private generateValidationPrompt(tests: MedicalTest[], reportContent: string): string {
    // Clean and format the report content
    const cleanedContent = reportContent
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    console.log('Report content length:', cleanedContent.length);
    console.log('First 500 characters of report:', cleanedContent.substring(0, 500));

    return `
      You are a medical expert analyzing a medical report. Please validate the following tests against the report content.
      Your response must be in valid JSON format only, with no additional text or explanations.
      
      Tests to validate:
      ${JSON.stringify(tests, null, 2)}
      
      Report Content:
      ${cleanedContent}
      
      Required JSON structure:
      {
        "success": true/false,
        "details": {
          "matchedTests": [list of matched tests],
          "unmatchedTests": [list of unmatched tests],
          "reportAnalysis": "detailed analysis",
          "webReferences": [
            {
              "source": "source URL",
              "information": "relevant information"
            }
          ]
        }
      }
      
      Remember: Respond with ONLY the JSON object, no other text.
    `;
  }

  private parseAIResponse(response: string, originalTests: MedicalTest[]): ValidationResult {
    try {
      console.log('Attempting to parse response:', response);
      
      // Clean the response by removing any non-JSON text
      const cleanedResponse = response
        .replace(/```json\n?/g, '') // Remove markdown code blocks
        .replace(/```\n?/g, '')     // Remove closing code blocks
        .replace(/^\s*[\r\n]/gm, '') // Remove empty lines
        .trim();

      console.log('Cleaned response:', cleanedResponse);

      // Try to find JSON in the cleaned response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in cleaned response');
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      console.log('Extracted JSON:', jsonStr);

      const parsedResponse = JSON.parse(jsonStr);
      
      // Validate the response structure
      if (!parsedResponse.success || !parsedResponse.details) {
        throw new Error('Invalid response structure');
      }

      return {
        success: parsedResponse.success,
        details: {
          matchedTests: parsedResponse.details.matchedTests || [],
          unmatchedTests: parsedResponse.details.unmatchedTests || [],
          reportAnalysis: parsedResponse.details.reportAnalysis || '',
          webReferences: parsedResponse.details.webReferences || []
        }
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Original response:', response);
      throw new Error('Failed to parse AI validation response');
    }
  }
} 