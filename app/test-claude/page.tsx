import ClaudeTest from '@/components/examples/ClaudeTest';

/**
 * Test page for Claude Haiku Streaming LLM
 *
 * Access at: http://localhost:3000/test-claude
 */

export default function TestClaudePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <ClaudeTest />
      </div>
    </div>
  );
}
