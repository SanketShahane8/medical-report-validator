# Medical Report Validator API

This API service validates medical test results against uploaded medical reports using AI-powered analysis.

## Features

- Upload medical reports (PDF or TXT)
- Validate medical tests against report content
- AI-powered analysis of test results
- Web reference verification
- Detailed validation results

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key_here
   UPLOAD_DIR=uploads
   ```

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Build and start the production server:
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### POST /api/validate

Validates medical tests against an uploaded report.

**Request:**
- Content-Type: multipart/form-data
- Body:
  - `tests`: JSON array of medical tests
  - `report`: Medical report file (PDF or TXT)

Example test data:
```json
{
  "tests": [
    {
      "name": "Complete Blood Count",
      "description": "Basic blood test",
      "normalRange": "4.5-11.0 x 10^9/L",
      "unit": "x 10^9/L"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "details": {
    "matchedTests": [...],
    "unmatchedTests": [...],
    "reportAnalysis": "Detailed analysis of the report...",
    "webReferences": [
      {
        "source": "source URL",
        "information": "relevant information"
      }
    ]
  }
}
```

**Example cURL**
```
curl --location 'http://localhost:3000/api/validate' \
--form 'tests="[{\"name\":\"Complete Blood Count\",\"description\":\"Basic blood test\",\"normalRange\":\"4.5-11.0 x 10^9/L\",\"unit\":\"x 10^9/L\"}]"' \
--form 'report=@"/Users/sanketshahane/Downloads/CBC-sample-report-with-notes_0.pdf"' \
--form 'model="deepseek-r1:32b"'
```

## Error Handling

The API returns appropriate error responses with the following structure:
```json
{
  "success": false,
  "error": "Error message"
}
```

## License

MIT 