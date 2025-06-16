---
sidebar_position: 2
---

# Self-Hosting Guide

Learn how to deploy and manage IronShield on your own infrastructure.

## Overview

Self-hosting IronShield gives you complete control over your security infrastructure while maintaining all the powerful features of our cloud offering. This guide will walk you through the deployment process and ongoing maintenance.

## Prerequisites

Before you begin, ensure you have:

- **Docker** installed on your target system
- **Minimum 2GB RAM** and 1 CPU core
- **Network access** for downloading images and updates
- **SSL certificates** for your domain (recommended)

## Quick Start

### 1. Download IronShield

```bash
# Download the latest IronShield image
docker pull ironshield/core:latest
```

### 2. Configuration

Create a configuration file `ironshield.yml`:

```yaml
# Basic IronShield configuration
version: "3.8"
services:
  ironshield:
    image: ironshield/core:latest
    ports:
      - "80:80"
      - "443:443"
    environment:
      - IRONSHIELD_DOMAIN=yourdomain.com
      - IRONSHIELD_API_KEY=your-api-key
    volumes:
      - ./config:/etc/ironshield
      - ./data:/var/lib/ironshield
```

### 3. Deploy

```bash
# Start IronShield
docker-compose -f ironshield.yml up -d

# Check status
docker-compose -f ironshield.yml ps
```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IRONSHIELD_DOMAIN` | Your domain name | `localhost` |
| `IRONSHIELD_API_KEY` | API key for management | Required |
| `IRONSHIELD_LOG_LEVEL` | Logging level | `info` |
| `IRONSHIELD_RATE_LIMIT` | Global rate limit | `1000/hour` |

### Advanced Configuration

For more advanced setups, you can customize:

- **Edge Protection Settings**
- **Core Bot Detection Rules** 
- **API Rate Limiting Policies**
- **Custom Middleware Integration**

## Monitoring & Maintenance

### Health Checks

```bash
# Check IronShield status
curl http://localhost/health

# View logs
docker-compose logs -f ironshield
```

### Updates

```bash
# Pull latest version
docker-compose pull

# Restart with new version
docker-compose up -d
```

## Platform-Specific Guides

### Edge Protection
Configure edge-level protection for your infrastructure.

### Core Bot Detection  
Set up adaptive bot detection and proof-of-work challenges.

### API Protection
Implement comprehensive API rate limiting and abuse prevention.

## Troubleshooting

### Common Issues

**Connection Refused**
- Check if ports 80/443 are available
- Verify firewall settings
- Ensure Docker is running

**High Memory Usage**
- Adjust resource limits in docker-compose.yml
- Consider scaling horizontally

**SSL Certificate Issues**
- Verify certificate paths in configuration
- Check certificate expiration dates

## Support

Need help with your self-hosted deployment?

- 📖 [Documentation](/docs/intro)
- 💬 [Community Discord](https://discord.gg/ironshield)  
- 📧 [Enterprise Support](mailto:support@ironshield.cloud)

## Next Steps

- [Configure Edge Protection](/docs/intro)
- [Set Up Core Detection](/docs/intro)
- [Implement API Protection](/docs/intro) 