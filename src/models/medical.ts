import { z } from 'zod';

export interface MedicalTest {
  name: string;
  description?: string;
  normalRange?: string;
  unit?: string;
}

export interface MedicalReport {
  patientId: string;
  reportDate: Date;
  tests: MedicalTest[];
  findings?: string;
  conclusion?: string;
}

export interface ValidationResult {
  success: boolean;
  details: {
    matchedTests: MedicalTest[];
    unmatchedTests: MedicalTest[];
    reportAnalysis: string;
    webReferences?: {
      source: string;
      information: string;
    }[];
  };
}

export const MedicalTestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  normalRange: z.string().optional(),
  unit: z.string().optional(),
});

export const MedicalReportSchema = z.object({
  patientId: z.string(),
  reportDate: z.date(),
  tests: z.array(MedicalTestSchema),
  findings: z.string().optional(),
  conclusion: z.string().optional(),
}); 