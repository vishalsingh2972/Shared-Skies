# Shared Skies

A real-time communication app designed to ease loneliness by connecting people through shared interests and life topics. Select categories like relationships, career, or art, and join text or video chat rooms—because there’s always someone out there to listen, and someone who needs you too.

## Core Idea

- People often feel lonely and just need to talk to someone who feels the same right now.

- Users select a topic or emotional state (e.g., relationships, anxiety, career stress, nostalgia, etc.) and are matched with others wanting to talk about the same thing at that moment.

- The conversations happen in ephemeral, private chat rooms (text, voice, or video).

- No followers, no likes—just instant, meaningful, human connection.

- The goal is to make it safe, anonymous if desired, and easy for people to feel heard and less alone.

## Tech Stack

| Layer                     | Tools                                                                                   |
|---------------------------|----------------------------------------------------------------------------------------|
| **Frontend**              | Next.js, React, Tailwind CSS, TypeScript                                               |
| **Backend**               | Node.js, TypeScript, Prisma ORM                                                        |
| **Auth**                  | Clerk (preferred for easy anonymous + social auth) or NextAuth                         |
| **Realtime Chat**         | WebSockets (Socket.IO)                                                                 |
| **Database**              | PostgreSQL (via Prisma ORM), Redis (for caching & transient data)                      |
| **Matchmaking Queue**     | Redis Pub/Sub (simple and fast for matchmaking)                                        |
| **Voice/Video (RTC)**     | WebRTC with SFU (MediaSoup preferred for scalability, or Jitsi for faster setup)       |
| **Infrastructure**        | Docker, Kubernetes, AWS (EC2, EKS, S3, CloudFront, etc.)                              |
| **Security & Networking** | Cloudflare (DDoS protection, CDN), Rate-Limiting (Redis-based or API Gateway level)    |
| **Event Streaming**       | Kafka (for scalable event-driven systems) or Redis Streams (for simpler use cases)     |
| **Message Queues**        | Kafka or Redis, plus gRPC or Pub/Sub (for microservices communication, if needed later)|
| **Monitoring & Logging**  | Prometheus, Grafana, Loki (optional for log aggregation)                               |