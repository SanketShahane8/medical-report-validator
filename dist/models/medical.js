"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicalReportSchema = exports.MedicalTestSchema = void 0;
const zod_1 = require("zod");
exports.MedicalTestSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    normalRange: zod_1.z.string().optional(),
    unit: zod_1.z.string().optional(),
});
exports.MedicalReportSchema = zod_1.z.object({
    patientId: zod_1.z.string(),
    reportDate: zod_1.z.date(),
    tests: zod_1.z.array(exports.MedicalTestSchema),
    findings: zod_1.z.string().optional(),
    conclusion: zod_1.z.string().optional(),
});
