---
sidebar_position: 1
---

# Getting Started

Welcome to **IronShield** - the next-generation security platform designed to protect your applications and APIs from sophisticated threats.

## What is IronShield?

IronShield is a comprehensive security platform that provides three layers of protection:

- **🛡️ Edge Protection** - Blocks attacks at the network perimeter
- **🧠 Core Intelligence** - Advanced bot detection and behavioral analysis  
- **🔌 API Security** - Comprehensive API protection and rate limiting

## Quick Start

Choose your deployment option to get started with IronShield:

### Cloud Deployment

The fastest way to get started is with our cloud-hosted solution:

1. **Sign up** for an IronShield account at [ironshield.cloud](https://ironshield.cloud)
2. **Configure** your domain and DNS settings
3. **Deploy** protection rules through our dashboard
4. **Monitor** your traffic and security events

### Self-Hosted Deployment

For full control over your security infrastructure:

```bash
# Quick deployment with Docker
docker run -d \
  --name ironshield \
  -p 80:80 -p 443:443 \
  -e IRONSHIELD_DOMAIN=yourdomain.com \
  -e IRONSHIELD_API_KEY=your-api-key \
  ironshield/platform:latest
```

See our [Self-Hosting Guide](/docs/self-hosting) for detailed deployment instructions.

## Next Steps

### Explore Our Platforms

Learn about each layer of IronShield protection:

- 📖 [**Edge Platform**](/docs/platforms/edge) - Network perimeter protection
- 📖 [**Core Platform**](/docs/platforms/core) - Bot detection and behavioral analysis
- 📖 [**API Platform**](/docs/platforms/api) - API security and rate limiting

### Deploy Self-Hosted

Ready to deploy on your own infrastructure?

- 🚀 [**Self-Hosting Guide**](/docs/self-hosting) - Complete deployment guide

### Get Support

Need help getting started?

- 💬 [Community Discord](https://discord.gg/ironshield)
- 📧 [Technical Support](mailto:support@ironshield.cloud)
- 📖 [Knowledge Base](https://help.ironshield.cloud)
