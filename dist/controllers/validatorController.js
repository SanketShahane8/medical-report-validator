"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatorController = void 0;
const aiValidator_1 = require("../services/aiValidator");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const upload = (0, multer_1.default)({
    dest: process.env.UPLOAD_DIR || 'uploads',
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF, TXT, and DOCX files are allowed.'));
        }
    },
});
class ValidatorController {
    constructor() {
        this.validateReport = async (req, res) => {
            try {
                const tests = req.body.tests;
                const file = req.file;
                const model = req.body.model || aiValidator_1.AIModel.GPT4;
                if (!tests || !Array.isArray(tests)) {
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
                this.aiValidator = new aiValidator_1.AIValidator(model);
                // Extract text based on file type
                let reportContent;
                switch (file.mimetype) {
                    case 'application/pdf':
                        const pdfBuffer = fs_1.default.readFileSync(file.path);
                        const pdfData = await (0, pdf_parse_1.default)(pdfBuffer);
                        reportContent = pdfData.text;
                        break;
                    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                        const docxBuffer = fs_1.default.readFileSync(file.path);
                        const docxResult = await mammoth_1.default.extractRawText({ buffer: docxBuffer });
                        reportContent = docxResult.value;
                        break;
                    default:
                        reportContent = fs_1.default.readFileSync(file.path, 'utf-8');
                }
                const validationResult = await this.aiValidator.validateMedicalReport(tests, reportContent);
                // Clean up uploaded file
                fs_1.default.unlinkSync(file.path);
                return res.json(validationResult);
            }
            catch (error) {
                console.error('Error in validation:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        };
        // Default to GPT-4, but can be changed based on request
        this.aiValidator = new aiValidator_1.AIValidator(aiValidator_1.AIModel.GPT4);
    }
    getUploadMiddleware() {
        return upload.single('report');
    }
}
exports.ValidatorController = ValidatorController;
