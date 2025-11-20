# Eval Wizard

Evaluate your Custom GPTs and AI agents in minutes, designed for educators.

## Overview

Eval Wizard helps educators and non-technical users evaluate their AI tools (Custom GPTs, chatbots, tutoring assistants) without needing deep expertise in evaluation systems. The tool:

1. **Generates test cases automatically** based on your AI tool description
2. **Provides education-focused evaluation criteria** (pedagogical soundness, age-appropriateness, etc.)
3. **Uses AI judges** (Claude) to evaluate responses across multiple dimensions
4. **Presents clear, visual results** with detailed reasoning

## Features

- AI-powered test case generation
- 7 pre-built education-focused evaluation criteria
- Manual test case editing and creation
- Parallel evaluation execution
- Visual results dashboard with pass/fail breakdown
- CSV export for further analysis
- No database required (uses in-memory storage for MVP)

## Tech Stack

- **Frontend/Backend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + Shadcn/ui components
- **LLMs**:
  - OpenAI GPT-4 (for testing AI products and generating test cases)
  - Anthropic Claude 3.5 Sonnet (for judging responses)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenAI API key
- Anthropic API key

### Installation

1. Clone the repository:
```bash
cd eval-wizard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

### 1. Create a Project

- Enter a name for your AI tool (e.g., "Math Tutor GPT")
- Describe what your AI tool does
- Paste your system prompt or Custom GPT instructions

### 2. Review Test Cases

- AI generates 10-15 test cases based on your description
- Review each test case (student query + expected behavior)
- Edit, add, or remove test cases as needed
- Click "Continue to Evaluation Criteria"

### 3. Select Criteria

Choose which education-focused criteria to evaluate:
- ✓ Pedagogically Sound
- ✓ Age-Appropriate
- ✓ Encourages Critical Thinking
- ✓ Inclusive & Culturally Sensitive
- ✓ Handles Off-Topic Requests
- ✓ Supportive When Student Struggles
- ✓ Accurate Information

### 4. View Results

- Wait for evaluations to complete
- See overall pass rate and performance by criterion
- Click on individual test cases to see:
  - Student query
  - AI response
  - Judge evaluation for each criterion with reasoning
- Export results to CSV for sharing

## Project Structure

```
eval-wizard/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── projects/             # Project creation & management
│   │   ├── test-cases/           # Test case storage
│   │   └── eval-runs/            # Evaluation execution
│   ├── projects/[projectId]/     # Project pages
│   │   ├── test-cases/          # Test case review
│   │   ├── criteria/            # Criteria selection
│   │   └── results/[evalRunId]/ # Results dashboard
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── components/
│   └── ui/                      # Shadcn/ui components
├── lib/
│   ├── llm/                     # LLM client wrappers
│   │   ├── openai-client.ts    # OpenAI integration
│   │   └── anthropic-client.ts # Anthropic integration
│   ├── types.ts                # TypeScript type definitions
│   ├── schema.sql              # SQL schema (for future DB)
│   └── utils.ts                # Utility functions
└── public/                     # Static assets
```

## API Overview

### POST /api/projects
Creates a new project and generates test cases.

**Request:**
```json
{
  "name": "Math Tutor GPT",
  "description": "Helps middle school students with algebra",
  "systemPrompt": "You are a helpful math tutor..."
}
```

**Response:**
```json
{
  "projectId": "proj_123456",
  "project": {...},
  "testCases": [...]
}
```

### POST /api/eval-runs
Starts an evaluation run.

**Request:**
```json
{
  "projectId": "proj_123456",
  "criteriaIds": ["pedagogically-sound", "age-appropriate"]
}
```

**Response:**
```json
{
  "evalRunId": "eval_789012"
}
```

### GET /api/eval-runs?id=eval_789012
Retrieves evaluation results.

## Evaluation Criteria

The tool includes 7 pre-built education-focused criteria:

1. **Pedagogically Sound**: Doesn't give away answers inappropriately; encourages learning through guidance
2. **Age-Appropriate**: Uses language and concepts suitable for the target age group
3. **Encourages Critical Thinking**: Promotes analytical reasoning and problem-solving skills
4. **Inclusive & Culturally Sensitive**: Accessible and respectful of diverse backgrounds
5. **Handles Off-Topic Requests**: Appropriately redirects or declines inappropriate queries
6. **Supportive When Student Struggles**: Provides helpful guidance and encouragement
7. **Accurate Information**: Provides factually correct and up-to-date information

## Roadmap

### MVP (Current)
- [x] Project creation with system prompt input
- [x] AI-powered test case generation
- [x] Manual test case editing
- [x] Education-focused evaluation criteria
- [x] LLM judge system
- [x] Results dashboard
- [x] CSV export

### Future Features
- [ ] Database integration (PostgreSQL)
- [ ] User authentication
- [ ] Project history and versioning
- [ ] Custom evaluation criteria
- [ ] A/B testing (compare two versions)
- [ ] Integration with Custom GPT API
- [ ] Cost estimation before running evals
- [ ] Scheduled evaluations
- [ ] Team collaboration features

## Cost Considerations

Each evaluation run incurs API costs:
- **OpenAI**: ~$0.01-0.03 per test case (for generating AI responses)
- **Anthropic**: ~$0.02-0.05 per criterion per test case (for judging)

Example: 12 test cases × 5 criteria = 60 evaluations ≈ $1-3 per run

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Acknowledgments

Built following best practices from:
- [OpenAI's guide on evals](https://openai.com/index/evals-drive-next-chapter-of-ai/)
- [Hamel Husain's LLM Judge guide](https://hamel.dev/blog/posts/llm-judge/)
