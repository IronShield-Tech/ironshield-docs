---
sidebar_position: 2
---

# Core 

IronShield Core is the intelligence center of IronShield security infrastructure. It generates, verifyies, and authenticates **adaptive proof of work challenges**. It also provides advanced bot detection, behavioral analysis, and fingerprinting.

## Overview

The Core platform functions as the primary gatekeeper in front of protected services. Any incoming request to a protected service must solve a proof-of-work computational challenge described in detail below. After successful completion of the challenge, it forwards the incoming traffic to the protected service. Since IronShield challenges are adaptive, the privacy-preserving fingerprinting engine can serve much more difficult challenges to traffic it sees as malicious, such as automated AI-driven scrapers or DDoS attacks, effectively blocking them.


## Understanding Proof of Work Verification

Before diving into the technical implementation, it's important to understand **what Proof of Work (PoW)** verification accomplishes and why it's effective against automated attacks.

### What is Proof of Work?

**Proof of Work** is a cryptographic mechanism that requires a client to perform a computationally expensive operation to prove they have expended real computational resources, most famously implemented in Bitcoin mining. IronShield's similar protocol consists of the following:

- **Challenge**: IronShield provides a mathematical puzzle that requires significant CPU cycles to solve. The "work" is the energy expended a device needs to solve the challenge.
- **Solution**: The client must find a specific value (usually called a "nonce") that, when combined with the provided challenge data, produces a cryptographic hash (e.g. SHA-256) with certain properties.
- **Verification**: Any independent party can easily and quickly verify the solution is correct without having to recompute the soluition from scratch, but can be certain that the solver initially found it utilizing substantial computational work.

### Why PoW Stops Bad Actors
The problem with traditional automated attacks (bots, scrapers, DDoS) is that anybody with 20 minutes of effort and 50 dollars can bring a multi-million dollar system offline because spamming endpoints is incredibly cheap to do yet extremly costly to defend againt.

IronShield Core turns scraping and DDoS protection from a networking problem to an economic one. Attacks become economically unfeasible when each request requires significant computational cost. Malicious actors can't easily scale attacks because each request demands real CPU time and energy consumption to the point where the assymetric cost IronShield creates would make an attack economically infeasible. On the other hand, the "cost" to real users solving occasional challenges is imperceptible since they only have to solve one challenge and can use all of their computer's hardware to do so for free.

## How IronShield's PoW Functions

### What a PoW Challenge Looks Like
IronShield's protocol primarily communicates with HTTP headers, for more information see the [API Platform Documentation](/docs/platforms/api).

**Example Decoded Header Content:**
```json
IronShieldChallenge {
  random_nonce: "55a77bde84950b2a2a525885902a6b13",
  created_time: 1753923084753,
  expiration_time: 1753923114753,
  website_id: "ironshield-edge",
  challenge_param: "[0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]",
  recommended_attempts: 10000000,
  public_key: "[4, 1, 218, 71, 15, 1, 1, 7, 64, 75, 121, 0, 46, 128, 52, 26, 55, 136, 20, 182, 107, 189, 54, 235, 41, 1, 241, 143, 183, 142, 125, 60]",
  challenge_signature: "[80, 117, 53, 94, 228, 123, 162, 251, 221, 72, 66, 74, 202, 33, 225, 97, 34, 176, 138, 89, 32, 207, 247, 204, 221, 119, 194, 221, 172, 108, 190, 43, 127, 174, 95, 27,41, 160, 180, 20, 102, 152, 129, 222, 35, 79, 219, 106, 243, 86, 28, 99, 70, 151, 200, 101, 153, 98, 149, 167, 142, 139, 229, 5]"
}
```

#### What Each Field Means
- **`random_nonce`**:         The SHA-256 hash of a random number (hex string)
- **`created_time`**:         Unix milli timestamp for the challenge.
- **`expiration_time`**:      Unix milli timestamp for the challenge expiration time.
- **`challenge_param`**:      Target threshold - hash must be less than this value.
- **`recommended_attempts`**: Expected number of attempts for user guidance (2x difficulty).
- **`website_id`**:           The identifier of the website.
- **`public_key`**:           Ed25519 public key for signature verification.
- **`challenge_signature`**:  Ed25519 signature over the challenge data.

### The Computational Challenge
To solve an `IronShieldChallenge`, a client must find some `solution` nonce that concatenates with the `random_nonce` into a new string, such that when this string is hashed with SHA-256 the resulting hash represented as a *[u8; 32] big-endian byte array* is  smaller than the `challenge_param` target threshold byte array. The lower the `challenge_param` is, the harder the challenge is. 

For example, the average probability of finding a SHA-256 hash less than 2^255 represented as a [u8; 32] byte array ([0, 0, 0, ..., 128]) is 50%, since there is a 50% chance any random integer chosen between 0 and 2^256 will be less than 2^255. This can be represented mathematically as the probability of solving a given challenge on any attempt as `challenge_param / 2^256`. Therefore, the difficulty, or the expected average number of attempts to solve a challenge, is `2^256 / challenge_param`. 

#### Random Nonce
The `random_nonce` is a SHA-256 hash of a random number represented as a hex string generated by IronShield servers. Since clients have to find a valid nonce that produces a specific SHA-256 output, it is essential that instead of the nonce itself producing a hash, it must be combined with some randomness generated by the servers to prevent an attacker from precomputing valid hashes. The presence of a random nonce the solution nonce needs to be concatenated with ensures that the only possible solution to a given challenge was one computed on the spot after the client received it.

More traditional PoW algorithms like Bitcoin's usually require the solution nonce to be hashed twice to prevent against [length-extension attacks](https://en.wikipedia.org/wiki/Length_extension_attack), but the `random_nonce` ensures that there will always be a non-user-generated fixed-length input into the hash. Reducing the authentication server workload per request to 1 hash instead of 2 may not seem like a lot. However, for a server authenticating hundreds of thousands, if not millions of requests per second, this simple architecture choice reduces the expected computational cost by 50%.

#### Creation and Expiration Times
The `creation_time` and `expiration_time` timestamps in unix millis are more for the authentication server than the client. It allows a server to store old challenges as well as when they were created, and ensure that a client can't submit new solutions to old challenges. If every challenge has an expiration date, clients will have to continuously solve new challenges.

#### Target threshold
The `challenge_param` is simply a number represented as a *[u8; 32] big-endian byte array*. The output of SHA-256 hash is fundamentally a 256-bit number that can also be represented as the same type of byte array. Therefore, [lexicographic](https://en.wikipedia.org/wiki/Lexicographic_order) comparison can be used between these 2 byte arrays to find out which one is smaller. In IronShield's case, its PoW algorithm is searching for a hash that is less than the target threshold specified by the `challenge_param`.

A target threshold also allows IronShield to be able to granularly modify the difficulty of a challenges, which the `recommended_attempts` is derived from (2x difficulty). The difficulty can be as easy as 2 expected attempts, to 1 million, to 100 million, to trillions. This is much mroe advantaguous compared to aglorithms that want to find a sha-256 hash with other specific properties, like the number of leading zeroes in a hash. Although it isn't a perfect analogy, if we look at the difficulty of a challenge in terms of big *O* notation, similar to time or space complexity, where *O* is the difficulty of a challenge in terms of the expected number of attempts and *n* is varied paramater like the number of leading zeros desired, the difficulty of a leading-zero challenge will be *O(16ⁿ)*. This would result in a difficulty of 1.05 million for 5 leading zeros, 16.78 million for 6 leading zeros, and 268.44 million for 7 leading zeros. The lack of granularity in terms of difficulty scaling prevents the ability to serve slightly harder challenges to more suspicious traffic. Any proof-of-work system using this would realistically only be able to serve relatively easy or extremly difficult challenges to traffic. In contrast, the `challenge_param` target threshold can be linearly varied since is jsut a number between 0 and 2^256, so its difficulty in big O notation would be *O(n)*, and can be granuarly scaled to whatever difficulty necessary, to serve easier challenges to people on phones and harder challenges to those on desktops, and much much much arder ones to suspected bots.

#### Website Identificaton
The `website_id` is simply a url or identifier to the desired endpoint a client is trying to reach by solving a challenge. This is necessary for server-side billing and authentication, since as described in the [API platform documentation](/docs/platforms/api) the verification process can be offline, as this would be the only way a server would know which origin to forward client traffic to.

#### Keys and Signatures
The `public_key` and `challenge_signature`


### Prerequisites

- **Minimum Requirements**: 8GB RAM, 4 CPU cores
- **Storage**: 50GB SSD for logs and ML models
- **Network Access**: Port 9090 for management, 9091 for inter-service communication
- **Database**: PostgreSQL 12+ or compatible

### Quick Deployment

```bash
# Deploy Core platform
docker run -d \
  --name ironshield-core \
  -p 9090:9090 -p 9091:9091 \
  -e CORE_DB_HOST=your-db-host \
  -e CORE_DB_USER=ironshield \
  -e CORE_DB_PASS=secure-password \
  -e CORE_API_KEY=your-api-key \
  -v /var/lib/ironshield/models:/app/models \
  ironshield/core:latest
```

## Configuration

### Basic Configuration

Create a `core-config.yml` file:

```yaml
core:
  # Database configuration
  database:
    host: localhost
    port: 5432
    database: ironshield_core
    user: ironshield
    password: secure-password
    
  # Bot detection settings
  bot_detection:
    enabled: true
    sensitivity: medium
    fingerprinting: true
    behavioral_analysis: true
    
  # Machine learning
  ml_engine:
    enabled: true
    model_update_interval: 24h
    training_data_retention: 30d
```

### Advanced Settings

#### Bot Detection Configuration

Fine-tune bot detection algorithms:

```yaml
bot_detection:
  fingerprinting:
    canvas_fingerprinting: true
    webgl_fingerprinting: true
    audio_fingerprinting: true
    screen_resolution: true
    timezone_detection: true
    
  behavioral_analysis:
    mouse_movement: true
    keystroke_dynamics: true
    scroll_patterns: true
    interaction_timing: true
    
  thresholds:
    bot_score_threshold: 0.7
    suspicious_score_threshold: 0.5
    challenge_score_threshold: 0.6
```

#### Machine Learning Settings

Configure the ML engine:

```yaml
ml_engine:
  models:
    - name: "bot_classifier"
      type: "random_forest"
      features: ["behavioral", "fingerprint", "network"]
      
    - name: "anomaly_detector"
      type: "isolation_forest"
      features: ["user_patterns", "request_sequences"]
      
  training:
    batch_size: 1000
    learning_rate: 0.001
    validation_split: 0.2
    epochs: 100
```

## Bot Detection

### Detection Methods

#### Fingerprinting Techniques

IronShield Core uses multiple fingerprinting methods:

```javascript
// Example fingerprinting data collected
{
  "browser": {
    "userAgent": "Mozilla/5.0...",
    "language": "en-US",
    "platform": "Win32",
    "plugins": ["Chrome PDF Plugin", "..."],
    "screen": {
      "width": 1920,
      "height": 1080,
      "colorDepth": 24
    }
  },
  "canvas": {
    "fingerprint": "a1b2c3d4e5f6...",
    "webgl": "g7h8i9j0k1l2..."
  },
  "timing": {
    "renderTime": 45,
    "loadTime": 1250
  }
}
```

#### Behavioral Analysis

Track user interaction patterns:

```yaml
behavioral_patterns:
  mouse_movements:
    - natural_acceleration: true
    - micro_movements: present
    - trajectory_smoothness: high
    
  keyboard_patterns:
    - typing_rhythm: human_like
    - key_hold_duration: variable
    - inter_key_timing: natural
    
  interaction_flow:
    - page_dwell_time: 15s
    - scroll_behavior: gradual
    - click_patterns: purposeful
```

### Custom Rules

Define custom bot detection rules:

```yaml
custom_rules:
  - name: "rapid_requests"
    condition: "request_rate > 10/second"
    action: "challenge"
    score_adjustment: +0.3
    
  - name: "headless_browser"
    condition: "webdriver_detected OR phantom_js_detected"
    action: "block"
    score_adjustment: +0.8
    
  - name: "suspicious_user_agent"
    condition: "user_agent MATCHES /bot|crawler|spider/i"
    action: "monitor"
    score_adjustment: +0.5
```

## Analytics & Monitoring

### Real-time Dashboard

Access the Core dashboard at `https://your-core-host:9090/dashboard`

Key metrics include:
- **Bot detection accuracy**
- **False positive/negative rates**
- **Threat classification breakdown**
- **ML model performance**
- **Processing latency**

### Performance Monitoring

```bash
# Monitor Core performance
docker exec ironshield-core core-stats

# View ML model metrics
curl -H "Authorization: Bearer $API_KEY" \
  https://your-core-host:9090/api/ml/model-stats

# Export detection logs
curl -H "Authorization: Bearer $API_KEY" \
  https://your-core-host:9090/api/logs/detections?format=json
```

### Machine Learning Insights

```bash
# View model training status
GET /api/v1/ml/training/status

# Get feature importance
GET /api/v1/ml/models/bot_classifier/features

# Model accuracy metrics
GET /api/v1/ml/models/accuracy?period=7d
```

## Integration

### Edge Platform Integration

Connect Core with Edge protection:

```yaml
edge_integration:
  endpoint: "https://edge.yourdomain.com:8080/api"
  api_key: "edge-api-key"
  sync_interval: 30s
  
  data_sharing:
    threat_scores: true
    fingerprints: true
    behavioral_data: false
```

### API Platform Integration

Configure API protection coordination:

```yaml
api_integration:
  endpoint: "https://api-gateway.yourdomain.com:7070/api"
  api_key: "api-gateway-key"
  
  protection_modes:
    - endpoint_specific_rules: true
    - rate_limit_coordination: true
    - threat_intelligence_sharing: true
```

## Troubleshooting

### Common Issues

#### High False Positive Rate

**Symptoms**: Legitimate users being flagged as bots
**Solution**: Adjust detection sensitivity

```yaml
bot_detection:
  sensitivity: low
  thresholds:
    bot_score_threshold: 0.8
    challenge_score_threshold: 0.7
```

#### ML Model Performance Issues

**Symptoms**: Degraded detection accuracy
**Solution**: Retrain models with recent data

```bash
# Trigger model retraining
curl -X POST -H "Authorization: Bearer $API_KEY" \
  https://your-core-host:9090/api/ml/retrain

# Check training progress
curl -H "Authorization: Bearer $API_KEY" \
  https://your-core-host:9090/api/ml/training/progress
```

#### Database Connection Issues

**Symptoms**: Core platform unable to store/retrieve data
**Solution**: Verify database configuration

```bash
# Test database connection
docker exec ironshield-core test-db-connection

# Check database logs
docker logs ironshield-core | grep -i database
```

## API Reference

### Core Management API

#### Get Detection Statistics

```http
GET /api/v1/stats/detection
Authorization: Bearer {api_key}

Response:
{
  "total_requests": 150000,
  "bot_detections": 15000,
  "false_positives": 150,
  "accuracy": 0.95
}
```

#### Update Bot Detection Rules

```http
PUT /api/v1/rules/bot-detection
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "sensitivity": "high",
  "custom_rules": [
    {
      "name": "new_rule",
      "condition": "request_rate > 5/second",
      "action": "challenge"
    }
  ]
}
```

#### Machine Learning Model Management

```http
POST /api/v1/ml/models/{model_name}/train
Authorization: Bearer {api_key}

{
  "training_data_days": 7,
  "validation_split": 0.2
}
```

## Best Practices

### Performance Optimization

1. **Resource Allocation** - Ensure adequate CPU and memory for ML processing
2. **Database Tuning** - Optimize PostgreSQL for time-series data
3. **Model Management** - Regular model updates and performance monitoring
4. **Caching Strategy** - Implement fingerprint caching for faster lookups

### Security Recommendations

1. **API Security** - Use strong API keys and rotate regularly
2. **Database Security** - Encrypt sensitive behavioral data
3. **Network Security** - Secure inter-service communication
4. **Audit Logging** - Maintain comprehensive audit trails

### ML Model Management

1. **Regular Retraining** - Schedule periodic model updates
2. **Feature Engineering** - Continuously improve detection features
3. **A/B Testing** - Test new models against current production models
4. **Bias Monitoring** - Monitor for algorithmic bias in detection

## Support

Need help with Core platform deployment?

- 📖 [Core Documentation Hub](/docs/platforms/core)
- 💬 [ML Community Forum](https://ml.ironshield.cloud)
- 📧 [Core Platform Support](mailto:core-support@ironshield.cloud)
- 🤖 [AI/ML Technical Support](mailto:ml-support@ironshield.cloud)

## Next Steps

- [Configure Edge Platform](/docs/platforms/edge)
- [Set Up API Protection](/docs/platforms/api)
- [Self-Hosting Guide](/docs/self-hosting) 