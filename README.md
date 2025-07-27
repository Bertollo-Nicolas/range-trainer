# 🃏 Range Trainer

A comprehensive poker training application focused on range analysis, scenario practice, and spaced repetition learning using the Anki system.

## ✨ Features

- **Range Editor**: Visual poker range editor with mixed colors and advanced action definitions
- **Scenario Training**: Practice decision-making in realistic poker scenarios with AI-powered feedback
- **Anki System**: Spaced repetition learning system for poker concepts and hand analysis
- **Performance Analytics**: Track your progress with detailed statistics and session history
- **Responsive Design**: Optimized for both desktop and mobile (landscape mode)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Bertollo-Nicolas/range-trainer.git
cd range-trainer

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── trainer/           # Training modules
│   ├── anki/              # Spaced repetition system
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
│   ├── ui/                # Base UI components (shadcn/ui)
│   ├── range-editor/      # Range editing components
│   ├── anki/              # Anki system components
│   └── scenario/          # Scenario training components
├── lib/                   # Core utilities and services
│   ├── services/          # API and data services
│   ├── database/          # Database schemas and migrations
│   └── utils.ts           # Shared utilities
├── types/                 # TypeScript type definitions
├── hooks/                 # Custom React hooks
└── utils/                 # Utility functions
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **State Management**: React hooks + Context
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 🔧 Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase account (for database)

### Environment Variables

Create a `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm type-check   # Run TypeScript checks

# Database
pnpm db:generate  # Generate database types
pnpm db:migrate   # Run database migrations
```

### Database Setup

1. Create a new Supabase project
2. Run the SQL migrations found in `src/lib/database/`
3. Update your environment variables
4. Generate TypeScript types: `pnpm db:generate`

## 📊 Core Features

### Range Editor
- Visual 13x13 poker range grid
- Custom action definitions with colors
- Mixed color support for percentage-based strategies
- Import/export functionality
- Real-time validation

### Scenario Training
- Interactive poker table simulation
- Decision-making practice with immediate feedback
- Performance tracking and analytics
- Custom scenario creation
- Mixed strategy validation

### Anki System
- Spaced repetition algorithm (SM-2)
- Card creation with rich content support
- Tag-based organization
- Progress tracking and statistics
- Intelligent review scheduling

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards

- Use TypeScript strictly (no `any` types)
- Follow the existing naming conventions
- Write self-documenting code with clear variable names
- Add JSDoc comments for complex functions
- Use the logger utility instead of console.log
- Ensure all text and comments are in English

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Supabase](https://supabase.io/) for the backend infrastructure
- [Next.js](https://nextjs.org/) for the amazing React framework
- The poker community for inspiration and feedback

## 📞 Support

- 📧 Email: support@range-trainer.com
- 💬 Discord: [Join our community](https://discord.gg/range-trainer)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/range-trainer/issues)

---

Made with ❤️ for the poker community
