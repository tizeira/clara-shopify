Streaming Avatar SDK
Add real-time AI avatars to your app with HeyGen SDK

Suggest Edits
Overview
The @heygen/streaming-avatar allows developers to integrate real-time, AI-powered avatars into their applications. Using HeyGen's platform, you can control avatars through live streaming sessions, allowing them to speak, respond to commands, and interact with users via WebSockets. This SDK simplifies the process of connecting to HeyGen’s streaming services and handling avatar interactions programmatically.

Learn more about AI Avatars

Key Features
Real-time Streaming: Connect and control avatars in live sessions using WebSockets for seamless communication.
Text-to-Speech Integration: Send text commands to avatars, allowing them to speak in real-time with customizable voices.
Event-Driven Architecture: Capture key events, such as when the avatar starts or stops speaking, and use them to trigger updates in your application.
Session Management: Easily create, manage, and terminate avatar sessions programmatically.
Choose Avatars: Choose avatars, adjust their quality, and customize their voice settings.
For a practical demonstration of how to use the Streaming Avatar SDK, check out our Next.js demo. This demo showcases the capabilities of the SDK in a Next.js environment, providing a comprehensive example of avatar integration.

Getting Started
To get started with the Streaming Avatar SDK, install the TypeScript package from npm and add your HeyGen API Token to your project.

Installation
To install the Streaming Avatar SDK, use npm:

Shell

npm install @heygen/streaming-avatar livekit-client
Basic Usage
Here’s a simple example of how to create a streaming session and send a task to an avatar:

TypeScript

import { StreamingAvatar } from '@heygen/streaming-avatar';

const avatar = new StreamingAvatar({ token: 'your-access-token' });

const startSession = async () => {
  const sessionData = await avatar.createStartAvatar({
    avatarName: 'MyAvatar',
    quality: 'high',
  });
  
  console.log('Session started:', sessionData.session_id);

  await avatar.speak({
    sessionId: sessionData.session_id,
    text: 'Hello, world!',
    task_type: TaskType.REPEAT
  });
};

startSession();
Managing Sessions
The SDK provides comprehensive session management features, including starting, stopping, and controlling avatar sessions. You can handle session details, such as checking if the session is active, tracking the session duration, and managing multiple avatars simultaneously.

Event Handling
The SDK uses an event-driven architecture to handle various avatar interactions. You can listen for key events such as when an avatar starts talking, stops talking, or when the stream is ready for display. This allows you to dynamically update your application based on real-time avatar behavior.

SDK API Reference
For API reference, you can refer to this page: Streaming API SDK Reference.

Learn more about AI Video Avatar

Conclusion
The Streaming Avatar SDK empowers developers to integrate real-time, AI-driven avatars into their applications with ease. By leveraging HeyGen's platform, you can create interactive, engaging experiences with customizable avatars, real-time text-to-speech, and seamless session management.

