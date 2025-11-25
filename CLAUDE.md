# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run Next.js linter
- `npm run type-check` - Run TypeScript type checking

## Architecture Overview

This is a Next.js 14 app that creates a Clara help assistant widget with glassmorphism effects and fully functional HeyGen avatar integration using StreamingAvatar SDK v2.0.13.

### Core Components

- **Main Widget**: `components/help-assistant-widget.tsx` - The primary chat widget with glassmorphism design
- **Avatar Components**: `components/avatar/` - Modular avatar-related components
  - `AvatarVideo.tsx` - Video display component for streaming avatar
  - `MessageHistory.tsx` - Chat message display with glassmorphism styling
  - `VoiceInterface.tsx` - Voice chat controls and indicators
- **Avatar Hooks**: `hooks/avatar/` - Complete hook system for avatar management
  - `context.tsx` - Global state management with React Context
  - `useStreamingAvatarSession.ts` - Avatar session lifecycle management with memory leak prevention
  - `useVoiceChat.ts` - Voice chat functionality and controls
- **Real-time Conversation System**: `lib/realtime-conversation/` - Modular conversation pipeline
  - `interfaces.ts` - Type-safe interfaces for STT, LLM, and Avatar providers
  - `state-machine.ts` - Conversation state management with barge-in support
- **Providers**: `lib/providers/` - Pluggable provider implementations
  - `DeepgramFluxSTT.ts` - Deepgram Flux v2 STT provider with native turn detection
- **Personalization System**: `lib/personalization/` - Shopify-based personalization
  - `types.ts` - Customer data interfaces
  - `shopify-fetcher.ts` - 24-hour cache system for customer data
  - `prompt-template.ts` - Template engine for personalized prompts
- **Configuration**: `config/features.ts` - Feature flags and provider configuration
  - Flux presets: simple, lowLatency, highReliability, complex
  - Audio configuration for optimal streaming
  - Timing and retry settings

### API Routes

**Active Endpoints:**
- `/api/get-access-token` - Creates HeyGen session tokens (ACTIVE - used in production)
- `/api/shopify-customer` - Shopify customer data endpoint (READY - not yet in use)

**Legacy Endpoints (not used in production):**
- `/api/voice-chat` - Traditional voice chat processing (LEGACY)
- `/api/voice-chat-avatar` - Avatar-based voice interactions (LEGACY)
- `/api/heygen-token` - Duplicate of get-access-token (LEGACY)

### Key Features

- **Glassmorphism Design**: Custom CSS effects in `app/globals.css` with `.glass-*` classes
- **Functional Avatar Integration**:
  - HeyGen StreamingAvatar SDK v2.0.13
  - Real-time video streaming with WebRTC
  - Spanish language support
  - Voice chat with Deepgram Flux v2 (native turn detection)
  - Knowledge base integration (Clara skincare)
- **Real-time Conversation Pipeline**:
  - Deepgram Flux STT with ~260ms turn detection latency
  - Native barge-in support (no custom VAD needed)
  - Pluggable architecture (STT, LLM, Avatar providers)
  - Configurable Flux presets for different use cases
  - Type-safe event system with state machine
- **Cross-Browser Compatibility**:
  - Full Safari iOS and desktop support
  - Chrome desktop support
  - Brave browser support
  - Direct getUserMedia() approach for maximum compatibility
- **Context-Based State Management**: Global avatar state using React Context
- **Real-time Communication**: WebSocket-based voice chat transport
- **Responsive Design**: Mobile-first with adaptive avatars
  - Mobile: Katya_CasualLook_public (portrait)
  - Desktop: Katya_Chair_Sitting_public (landscape)
- **Dynamic Personalization**:
  - Personalized greetings based on user name
  - User-specific knowledge base integration
  - Session persistence via localStorage
- **Performance Monitoring**:
  - Latency logging (LLM processing, TTS duration)
  - Real-time performance metrics in console
- **Shopify Integration** (Ready for use):
  - GraphQL client for Shopify Admin API
  - HMAC validation for webhook security
  - Customer data fetching capabilities

### Configuration

- **Mobile Avatar**: Katya_CasualLook_public (portrait format for mobile devices)
- **Desktop Avatar**: Katya_Chair_Sitting_public (landscape format for desktop ≥1024px)
- **Voice**: Voice ID 0e69c649917e4a6da0f9a9e1fe02f498
- **Knowledge Base**: Clara's skincare database (knowledgeId: 251ae2b8b812448d9d03efbc354c9b98)
- **Path Alias**: `@/*` maps to project root
- **Styling**: Tailwind CSS + custom glassmorphism effects

### Environment Variables

Required environment variables (see `.env.example`):

**HeyGen Configuration:**
- `HEYGEN_API_KEY` - HeyGen API key for authentication
- `NEXT_PUBLIC_BASE_API_URL` - HeyGen API base URL (https://api.heygen.com)
- `NEXT_PUBLIC_HEYGEN_AVATAR_ID` - Mobile avatar ID (portrait format)
- `NEXT_PUBLIC_HEYGEN_DESKTOP_AVATAR_ID` - Desktop avatar ID (landscape format)
- `NEXT_PUBLIC_HEYGEN_VOICE_ID` - Voice ID for text-to-speech
- `NEXT_PUBLIC_HEYGEN_KNOWLEDGE_ID` - Knowledge base ID

**Authentication:**
- `NEXT_PUBLIC_AUTH_ENABLED` - Enable/disable password protection (true/false)
- `NEXT_PUBLIC_ACCESS_PASSWORD` - Password for accessing the app

**Additional Services:**
- `OPENAI_API_KEY` - OpenAI API key for additional LLM processing

**Deepgram Flux STT (Required for real-time conversation):**
- `DEEPGRAM_API_KEY` - Deepgram API key for Flux v2 STT
- `NEXT_PUBLIC_FLUX_PRESET` - Flux configuration preset: 'simple' (default) | 'lowLatency' | 'highReliability' | 'complex'
- `NEXT_PUBLIC_ENABLE_STREAMING_STT` - Enable Deepgram Flux streaming (true/false)
- `NEXT_PUBLIC_LOG_FLUX_EVENTS` - Log Flux turn events for debugging (true/false)

**Shopify Integration (Optional):**
- `SHOPIFY_HMAC_SECRET` - Secret for HMAC validation (generate with: `openssl rand -hex 32`)
- `SHOPIFY_STORE_DOMAIN` - Your Shopify store domain (e.g., store.myshopify.com)
- `SHOPIFY_ADMIN_ACCESS_TOKEN` - Admin API access token with read_customers, read_orders scopes

### Avatar Session States

1. **INACTIVE**: Initial state, shows setup interface
2. **CONNECTING**: Loading state while initializing avatar
3. **CONNECTED**: Active session with streaming video

### Recent Fixes and Improvements

**Week 1 Fixes (Merged to main on 2025-11-20):**

1. **Safari Compatibility Fix** (commit 03544b2)
   - **Location**: `components/help-assistant-widget.tsx`
   - **Problem**: Safari doesn't support `navigator.permissions.query()` for microphone
   - **Solution**: Direct `getUserMedia()` approach that works across all browsers
   - **Impact**: Full compatibility with Safari iOS and desktop
   - **Testing**: Verified on Safari iOS, Chrome, Brave

2. **Memory Leak Fix** (commit 24e7574)
   - **Location**: `hooks/avatar/useStreamingAvatarSession.ts`
   - **Problem**: Event listeners accumulating after multiple avatar sessions
   - **Solution**: Explicit cleanup of 11 event listeners in `stop()` function
   - **Impact**: Prevents memory accumulation, stable performance across multiple sessions
   - **Testing**: 3+ consecutive sessions tested without memory growth

3. **SessionId Race Condition Fix** (commit f14227a)
   - **Location**: `app/api/voice-chat-avatar/route.ts`
   - **Problem**: SessionId generated twice, potential mismatch
   - **Solution**: Generate once using `crypto.randomUUID()` with fallback
   - **Impact**: More reliable session management
   - **Note**: Endpoint currently not in use, but fix applied for future use

### Architecture Benefits

- **Modular Design**: Separates concerns with hooks, components, and context
- **Type Safety**: Full TypeScript support with proper typing
- **Error Handling**: Comprehensive error states and recovery
- **Performance Optimizations**:
  - Memory leak prevention with proper event listener cleanup
  - Memoized callbacks with `useMemoizedFn` from ahooks
  - Proper WebRTC stream cleanup on session end
  - Efficient state management with React Context
- **Browser Compatibility**: Tested and working on Safari iOS, Chrome, Brave
- **Maintainability**: Clean separation between UI and business logic

### Testing & Browser Compatibility

**Tested Browsers:**
- ✅ Chrome Desktop (Windows/Mac)
- ✅ Safari iOS (iPhone/iPad)
- ✅ Safari Desktop (Mac)
- ✅ Brave Desktop

**Known Issues:**
- Favicon 404 (cosmetic, low priority)
- Initial response time calculation bug (shows incorrect ~55 years, cosmetic only)
- ScriptProcessorNode deprecation warning (from LiveKit SDK, unavoidable)
- DataChannel errors on session close (from LiveKit SDK, non-critical)

## Development Workflow

### Branch Strategy

```
main (production)
  ↑
test/feature-name (development features)
```

**Branch Types:**
- `main` - Production branch, always stable, auto-deploys to Vercel production
- `test/*` - Feature development branches, auto-deploy to Vercel preview URLs

### Development Process

**Creating a New Feature:**

```bash
# 1. Start from updated main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b test/feature-name

# 3. Develop and commit
# ... make changes ...
git add .
git commit -m "feat: description of feature"
git push origin test/feature-name

# 4. Test in Vercel preview
# Vercel automatically creates preview URL for the branch
# Test thoroughly in preview environment

# 5. When ready, merge to main
git checkout main
git pull origin main
git merge test/feature-name --no-ff -m "feat: merge feature-name"
git push origin main

# 6. Clean up (optional)
git branch -d test/feature-name
git push origin --delete test/feature-name
```

### Safety Best Practices

**Before Major Changes:**
1. Create backup tag: `git tag backup-pre-change-$(date +%Y%m%d)`
2. Push tag: `git push origin backup-pre-change-YYYYMMDD`
3. If something goes wrong: `git reset --hard backup-pre-change-YYYYMMDD`

**Merge Strategy:**
- Always use `--no-ff` flag for merges to create explicit merge commits
- This makes rollbacks easier if needed
- Example: `git merge test/feature --no-ff -m "descriptive message"`

**Testing Requirements:**
- Test in Vercel preview before merging to main
- Test on multiple browsers (Chrome, Safari iOS minimum)
- Test multiple session cycles to verify no memory leaks
- Check console for errors

### Vercel Deployment

**Automatic Deployments:**
- `main` branch → Production deployment (auto)
- `test/*` branches → Preview deployments (auto)

**Environment Variables:**
- Managed in Vercel Dashboard → Settings → Environment Variables
- Changes require redeploy (either push new commit or manual redeploy)
- Preview branches inherit project-level environment variables

## Shopify Integration

**Current Status:** Ready but not actively used in production

**Implementation:**
- GraphQL client: `lib/shopify-client.ts`
- HMAC security: `lib/shopify-security.ts`
- Customer endpoint: `app/api/shopify-customer/route.ts`

**Required Scopes:**
- `read_customers` - Read customer data
- `read_orders` - Read order history

**Security:**
- HMAC validation for webhook authenticity
- Secure token storage in environment variables
- No customer data stored locally

The implementation is based on HeyGen's official demo but adapted to maintain the glassmorphism aesthetic and Clara's branding, with additional fixes for cross-browser compatibility and memory management.
