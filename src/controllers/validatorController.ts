import { Request, Response } from 'express';
import { AIValidator, AIModel } from '../services/aiValidator';
import { MedicalTest, MedicalReportSchema } from '../models/medical';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const upload = multer({
  dest: process.env.UPLOAD_DIR || 'uploads',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, and DOCX files are allowed.'));
    }
  },
});

export class ValidatorController {
  private aiValidator: AIValidator;

  constructor() {
    // Default to GPT-4, but can be changed based on request
    this.aiValidator = new AIValidator(AIModel.GPT4);
  }

  public validateReport = async (req: Request, res: Response) => {
    try {
      const tests: MedicalTest[] = req.body.tests;
      const file = req.file;
      const model = req.body.model as AIModel || AIModel.GPT4;

      if (!tests) {
        return res.status(400).json({
          success: false,
          error: 'Invalid tests data provided'
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      // Set the AI model based on request
      this.aiValidator = new AIValidator(model);

      // Extract text based on file type
      let reportContent: string;
      try {
        switch (file.mimetype) {
          case 'application/pdf':
            const pdfBuffer = fs.readFileSync(file.path);
            const pdfData = await pdfParse(pdfBuffer);
            reportContent = pdfData.text;
            console.log('Extracted PDF content length:', reportContent.length);
            break;
          case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            const docxBuffer = fs.readFileSync(file.path);
            const docxResult = await mammoth.extractRawText({ buffer: docxBuffer });
            reportContent = docxResult.value;
            console.log('Extracted DOCX content length:', reportContent.length);
            break;
          default:
            reportContent = fs.readFileSync(file.path, 'utf-8');
            console.log('Extracted text content length:', reportContent.length);
        }

        if (!reportContent || reportContent.trim().length === 0) {
          throw new Error('No content could be extracted from the file');
        }
      } catch (error) {
        console.error('Error extracting file content:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to extract content from the file'
        });
      }

      const validationResult = await this.aiValidator.validateMedicalReport(tests, reportContent);

      // Clean up uploaded file
      fs.unlinkSync(file.path);

      return res.json(validationResult);
    } catch (error) {
      console.error('Error in validation:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  public getUploadMiddleware() {
    return upload.single('report');
  }
} 