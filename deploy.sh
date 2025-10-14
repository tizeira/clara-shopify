#!/bin/bash

# Clara Avatar - Vercel Deployment Script

echo "🚀 Clara Avatar Deployment to Vercel"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Check if required files exist
echo "📋 Checking required files..."
required_files=("package.json" "next.config.mjs" "vercel.json" ".env.example")

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - Found"
    else
        echo "❌ $file - Missing"
        exit 1
    fi
done

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local - Found (make sure to configure same variables in Vercel)"
else
    echo "⚠️  .env.local - Not found (you'll need to set environment variables in Vercel)"
fi

# Run type check
echo "🔍 Running TypeScript type check..."
if npm run type-check; then
    echo "✅ TypeScript check passed"
else
    echo "❌ TypeScript errors found. Fix before deploying."
    exit 1
fi

# Run build test
echo "🏗️  Testing production build..."
if npm run build; then
    echo "✅ Production build successful"
else
    echo "❌ Build failed. Fix errors before deploying."
    exit 1
fi

echo ""
echo "🎉 Pre-deployment checks passed!"
echo ""
echo "📝 Next steps:"
echo "1. Install Vercel CLI: npm i -g vercel"
echo "2. Login to Vercel: vercel login"
echo "3. Deploy: vercel"
echo "4. Configure environment variables in Vercel dashboard:"
echo "   - HEYGEN_API_KEY"
echo "   - NEXT_PUBLIC_BASE_API_URL"
echo "   - OPENAI_API_KEY"
echo ""
echo "🔗 After deployment, your Clara Avatar will be available at:"
echo "https://your-project-name.vercel.app"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"