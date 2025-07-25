# LinkedIn Agent Development Guidelines

## Build/Configuration Instructions

### Prerequisites
- Node.js (recommended: use nvm for version management)
- npm (comes with Node.js)

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Server runs on http://localhost:8080

# Build for production
npm run build

# Build for development (with source maps)
npm run build:dev

# Preview production build
npm run preview
```

### Key Configuration Files
- **vite.config.ts**: Uses React with SWC for fast compilation, includes lovable-tagger plugin for development
- **tsconfig.json**: Uses project references with relaxed TypeScript settings (noImplicitAny, strictNullChecks disabled)
- **eslint.config.js**: TypeScript ESLint with React hooks and refresh plugins
- **Path Alias**: `@/*` maps to `./src/*` (configured in both Vite and TypeScript)

### Environment & Backend
- **Supabase**: Backend service with hardcoded configuration in `src/integrations/supabase/client.ts`
- **Database**: Uses Supabase migrations (located in `supabase/migrations/`)
- **No Environment Variables**: Configuration is hardcoded (typical for Lovable projects)

## Testing Information

### Test Framework Setup
The project uses **Vitest** with React Testing Library:

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

### Test Configuration
- **vitest.config.ts**: Configured with jsdom environment and React SWC plugin
- **src/test/setup.ts**: Contains necessary mocks for browser APIs (IntersectionObserver, ResizeObserver, matchMedia)
- **Global test utilities**: Available via Vitest globals (describe, it, expect)

### Adding New Tests
1. Create test files with `.test.ts` or `.test.tsx` extension
2. Place tests near the code they test (e.g., `src/components/MyComponent.test.tsx`)
3. Use React Testing Library for component testing
4. Import test utilities: `import { describe, it, expect } from 'vitest'`

### Example Test Structure
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(React.createElement(MyComponent))
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Working Test Example
See `src/lib/utils.test.ts` for a functional test example that demonstrates:
- Basic function testing
- Conditional logic testing
- Tailwind class merging validation

## Development Patterns & Code Style

### Component Architecture
- **Functional Components**: Use React functional components with hooks
- **Performance**: Use `memo()` for expensive components and `useCallback()` for memoized functions
- **TypeScript**: Strict typing with interfaces for props
- **File Organization**: Components in `src/components/`, organized by feature (e.g., `jobs/`, `dashboard/`)

### UI Components
- **shadcn-ui**: Extensive use of Radix UI components via shadcn-ui
- **Styling**: Tailwind CSS with `cn()` utility function for class merging
- **Icons**: Lucide React for consistent iconography
- **Theming**: Uses next-themes for dark/light mode support

### State Management
- **React Query**: For server state management with custom configuration:
  - 5-minute stale time
  - 10-minute cache time
  - Disabled refetch on window focus
  - Custom retry logic (max 3 attempts, skip 404s)
- **Local State**: React hooks (useState, useReducer)
- **Authentication**: Custom AuthProvider context

### Code Quality
- **ESLint**: Configured with TypeScript and React rules
- **TypeScript**: Relaxed settings for faster development
- **Accessibility**: Proper ARIA labels and semantic HTML
- **Error Handling**: ErrorBoundary and LoadingBoundary components

### Routing
- **React Router**: Browser router with lazy-loaded pages
- **Routes**: 
  - `/` - Main dashboard (Index)
  - `/auth` - Authentication
  - `/results/:jobId?` - Job results with optional job ID
  - `*` - 404 Not Found

### Project-Specific Patterns
- **Job Management**: Core functionality around LinkedIn job scraping
- **Playwright Integration**: Uses playwright and puppeteer-extra for automation
- **Progress Tracking**: Components show job progress with visual indicators
- **Export Functionality**: XLSX export capabilities for job results

### Development Tips
1. **Hot Reload**: Vite provides fast HMR for development
2. **Component Tagger**: lovable-tagger plugin helps with component identification in development
3. **Type Safety**: While TypeScript is relaxed, maintain good typing practices
4. **Performance**: Use React.memo and useCallback for expensive operations
5. **Testing**: Write tests for utility functions and critical component logic

### Debugging
- Use React Developer Tools browser extension
- Vite provides excellent error messages and stack traces
- React Query DevTools available for debugging server state
- Console logging is preserved in development builds