---
sidebar_position: 3
---

# API

IronShield API provides **distributed Proof of Work verification** that allows third-party APIs to verify clients have solved valid computational challenges to prove they aren't malicious without requiring direct communication with IronShield servers. This creates a **zero-trust, sandboxed verification system** that is extremely difficult to exploit and can be utilized in threat models that are more extreme, such as servers that only allow inbound network traffic.

## Overview

The IronShield API verification system operates through a **cryptographically-secured token exchange process** that enables any third-party service to independently verify that a client has completed legitimate computational work (Proof of Work). This system is designed to be completely **offline-verifiable**, meaning verification can happen in sandboxed environments without any outbound network traffic to IronShield. For more detailed information on the PoW system, please see the [Core Platform Documentation](/docs/platforms/core).

### Key Features
- **🌐 Universal Compatibility** - Works with any HTTP-based API or service
- **📦 Simple Integration** - Just verify HTTP headers - no complex SDKs required
- **⚡ Zero-Latency Verification** - No need to contact IronShield servers for token validation
- **🛡️ Sandboxed Security** - Verification works in completely isolated environments
- **🔐 Offline Cryptographic Verification** - ECDSA signatures allow offline verification and authentication of PoW tokens


## How It Works: Complete Verification Flow
The IronShield verification process involves **eight distinct steps** that create a secure, verifiable chain of trust without requiring ongoing communication between your API and IronShield servers. Included in this diagram are also the custom X-IRONSHIELD HHTP headers parties use to communicate with each other via this protocol.

```mermaid
sequenceDiagram
    participant Client as Unknown Client
    participant IronShield as IronShield Servers
    participant API as Third-Party API
    
        Client->>IronShield: 1. Client Requests Challenge
    Note over Client,IronShield: X-IRONSHIELD-CHALLENGE-REQUEST
    
    
    IronShield->>Client: 2. IronShield Servers Issue Challenge
    Note over Client,IronShield: X-IRONSHIELD-CHALLENGE
    
    
    Note over Client: 3. Client Solves PoW challenge<br/>(CPU computation)
    
    
    Client->>IronShield: 4. Client Submits Solution
    Note over Client,IronShield: X-IRONSHIELD-CHALLENGE-RESPONSE
    
    
    Note over IronShield: 5. IronShield Servers Verifies Solution<br/>(hash verification is O(1) in time)
    
    
    IronShield->>Client: 6. IronShield Servers Return Signed Approval Token
    Note over Client,IronShield: X-IRONSHIELD-TOKEN
    
    
    Client->>API: 7. Token Forwarded In API Request
    Note over Client,API: X-IRONSHIELD-TOKEN
    
    
    Note over API: Third Party API Verifies Token Offline<br/>(no IronShield contact needed)
    
    
    API->>Client: 8. API Returns Response to Client
```

:::tip Why This Matters
This architecture means your API can verify legitimate users **without any dependency on IronShield's infrastructure**. Even if IronShield servers are completely unreachable, your API can still verify tokens and serve legitimate traffic.
:::

Now let's walk through each step of the verification process in detail, including the exact HTTP headers used and what happens at each stage.

### Step 1: Client Requests Challenge

When an unknown client wants to access a third-party API protected by IronShield, 
they first need to obtain a computational challenge. 
The client sends a HTTP request to IronShield servers with a specific Base64URL'd header.

:::info Base64URL Encoding
All IronShield headers use **Base64URL encoding** (not standard Base64) to avoid browser-unsafe characters like `+`, `/`, and `=`. 
This ensures headers work seamlessly across all HTTP implementations and can be easily represented, copied, and modified since they are just one long blob of text.
:::

**Example HTTP Header:** `X-IRONSHIELD-CHALLENGE-REQUEST`

```http
X-IRONSHIELD-CHALLENGE-REQUEST: eyJ0eXBlIjoiY2hhbGxlbmdlX3JlcXVlc3QiLCJ0YXJnZXRfYXBpIjoiYXBpLmV4YW1wbGUuY29tIiwidGltZXN0YW1wIjoxNzA5NTU5NjAwfQ==
```

**Decoded Header Content (Base64URL decoded):**
```json
{
  "type": "challenge_request",
  "target_api": "api.example.com",
  "timestamp": 1709559600,
  "client_info": {
    "user_agent": "MyApp/1.0",
    "platform": "web"
  }
}
```



### Step 2: IronShield Issues Challenge

IronShield servers respond with a computational challenge that the client must solve. This challenge includes all the parameters needed for the Proof of Work computation.

**HTTP Header Used:** `X-IRONSHIELD-CHALLENGE`

```http
HTTP/1.1 200 OK
X-IRONSHIELD-CHALLENGE: eyJjaGFsbGVuZ2VfaWQiOiJjaGFsXzE3MDk1NTk2MDBfYWJjZGVmIiwiZGlmZmljdWx0eSI6NSwiaGFzaF90YXJnZXQiOiIwMDAwMCIsInNhbHQiOiJyYW5kb21fc2FsdF8xMjM0NSIsImV4cGlyZXMiOjE3MDk1NjMyMDAsInByb29mX3R5cGUiOiJzaGEyNTYiLCJub25jZV9yYW5nZSI6WzAsMTAwMDAwMDBdLCJ0YXJnZXRfYXBpIjoiYXBpLmV4YW1wbGUuY29tIn0=
```

**Decoded Challenge Content:**
```json
{
  "challenge_id": "chal_1709559600_abcdef",
  "difficulty": 5,
  "hash_target": "00000",
  "salt": "random_salt_12345",
  "expires": 1709563200,
  "proof_type": "sha256",
  "nonce_range": [0, 100000000],
  "target_api": "api.example.com",
  "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----"
}
```

**What Each Field Means:**

- **`challenge_id`**: Unique identifier for this specific challenge
- **`difficulty`**: How computationally expensive the solution should be (higher = harder)
- **`hash_target`**: The target pattern the computed hash must match (5 leading zeros in this example)
- **`salt`**: Random data that ensures each challenge is unique  
- **`expires`**: Unix timestamp when this challenge becomes invalid
- **`proof_type`**: Hashing algorithm to use (SHA256, SHA3, etc.)
- **`nonce_range`**: Acceptable range for the nonce value clients should search
- **`target_api`**: Which API this challenge is valid for
- **`public_key`**: IronShield's public key for later signature verification

### Step 3: Client Solves Challenge Locally

This is where the actual **Proof of Work** computation happens. The client takes the challenge parameters and performs a brute-force search to find a nonce value that, when combined with the challenge data, produces a hash matching the target pattern.

**What the Client Must Do:**

1. **Extract challenge parameters** from the received challenge
2. **Iterate through nonce values** in the specified range
3. **Compute hash** for each attempt using the formula: `SHA256(challenge_id + salt + nonce + target_api)`
4. **Check if hash matches target** (starts with required number of zeros)
5. **Stop when solution found** or nonce range exhausted

**Example Computation Process:**

```javascript
// Pseudocode for client-side PoW solving
function solvePoWChallenge(challenge) {
  const { challenge_id, salt, hash_target, target_api, nonce_range } = challenge;
  
  for (let nonce = nonce_range[0]; nonce <= nonce_range[1]; nonce++) {
    // Combine all challenge components
    const input = challenge_id + salt + nonce.toString() + target_api;
    
    // Compute SHA256 hash
    const hash = sha256(input);
    
    // Check if hash starts with required zeros
    if (hash.startsWith(hash_target)) {
      return {
        nonce: nonce,
        hash: hash,
        solution_found: true
      };
    }
  }
  
  return { solution_found: false };
}
```

**Real Example:**
- **Challenge ID**: `chal_1709559600_abcdef`
- **Salt**: `random_salt_12345`  
- **Target API**: `api.example.com`
- **Target Hash**: Must start with `00000` (5 zeros)
- **Trying nonce 42,847,293**: 
  - Input: `chal_1709559600_abcdefrandom_salt_1234542847293api.example.com`
  - Hash: `00000a1b2c3d4e5f6789012345678901234567890123456789012345678901234`
  - **✅ Success!** Hash starts with 5 zeros

:::warning Computational Cost
The difficulty directly impacts computation time. Difficulty 5 (5 leading zeros) might take a few seconds, while difficulty 8 could take several minutes. This creates the economic barrier against automated attacks.
:::

**Why This Works:**
- **Asymmetric Cost**: Finding the solution requires trying many nonce values (expensive), but verifying a solution requires only one hash computation (cheap)
- **Unpredictable**: Can't pre-compute solutions because salt and challenge_id are random
- **Time-Limited**: Challenges expire, preventing reuse of old solutions

### Step 4: Client Submits Solution to IronShield

Once the client has found a valid nonce that produces the target hash, they submit their solution back to IronShield servers for verification and token generation.

**HTTP Header Used:** `X-IRONSHIELD-CHALLENGE-RESPONSE`

```http
POST /verify-challenge HTTP/1.1
Host: challenge.ironshield.cloud
X-IRONSHIELD-CHALLENGE-RESPONSE: eyJjaGFsbGVuZ2VfaWQiOiJjaGFsXzE3MDk1NTk2MDBfYWJjZGVmIiwibm9uY2UiOjQyODQ3MjkzLCJoYXNoIjoiMDAwMDBhMWIyYzNkNGU1ZjY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2NzgifQ==
```

**Decoded Response Content:**
```json
{
  "challenge_id": "chal_1709559600_abcdef",
  "nonce": 42847293,
  "hash": "00000a1b2c3d4e5f6789012345678901234567890123456789012345678901234",
  "timestamp": 1709559800,
  "client_info": {
    "computation_time": 2.34,
    "attempts": 42847293
  }
}
```

**What IronShield Does Upon Receiving:**

1. **Validate Challenge ID**: Ensures the challenge exists and hasn't expired
2. **Verify Solution**: Recomputes the hash using submitted nonce to confirm it matches target
3. **Check Timing**: Ensures solution was submitted within acceptable time window
4. **Generate Token**: If valid, creates a cryptographically signed approval token

**IronShield's Verification Process:**
```javascript
// Server-side verification pseudocode
function verifyChallengeSolution(response) {
  const challenge = getChallenge(response.challenge_id);
  
  // Check if challenge is still valid
  if (Date.now() > challenge.expires) {
    return { valid: false, reason: "Challenge expired" };
  }
  
  // Recompute hash with submitted nonce
  const input = challenge.challenge_id + challenge.salt + 
                response.nonce.toString() + challenge.target_api;
  const computed_hash = sha256(input);
  
  // Verify hash matches target pattern
  if (computed_hash !== response.hash || 
      !computed_hash.startsWith(challenge.hash_target)) {
    return { valid: false, reason: "Invalid solution" };
  }
  
  return { valid: true };
}
```

:::tip Why Server Verification is Fast
Server verification only requires **one hash computation** to check the client's work, making it extremely fast even under high load. The expensive work was done by the client.
:::

### Step 5: IronShield Issues Approval Token

When IronShield verifies that the client's solution is correct, it generates a **cryptographically signed approval token** that serves as proof the client completed valid computational work.

**HTTP Header Used:** `X-IRONSHIELD-TOKEN`

```http
HTTP/1.1 200 OK
X-IRONSHIELD-TOKEN: eyJ0b2tlbl9pZCI6InRva2VuXzE3MDk1NTk4MDBfZGVmZ2hpIiwiY2hhbGxlbmdlX2lkIjoiY2hhbF8xNzA5NTU5NjAwX2FiY2RlZiIsInRhcmdldF9hcGkiOiJhcGkuZXhhbXBsZS5jb20iLCJpc3N1ZWRfYXQiOjE3MDk1NTk4MDAsImV4cGlyZXMiOjE3MDk1NjMzMDAsInNvbHV0aW9uX2hhc2giOiIwMDAwMGExYjJjM2Q0ZTVmNjc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3OCIsImdlbmVyYXRlZF9ieSI6Imlyb25zaGllbGQtc2VydmVyLTAzIiwic2lnbmF0dXJlIjoiU0hBMjU2d2l0aFJTQVNpZ25hdHVyZU9mVG9rZW5EYXRhIn0=
```

**Decoded Token Content:**
```json
{
  "token_id": "token_1709559800_defghi",
  "challenge_id": "chal_1709559600_abcdef",
  "target_api": "api.example.com",
  "issued_at": 1709559800,
  "expires": 1709563300,
  "solution_hash": "00000a1b2c3d4e5f6789012345678901234567890123456789012345678901234",
  "difficulty": 5,
  "generated_by": "ironshield-server-03",
  "signature": "SHA256withRSASignatureOfTokenData"
}
```

**Critical Token Components:**

- **`token_id`**: Unique identifier for this specific approval token
- **`challenge_id`**: Links back to the original challenge that was solved
- **`target_api`**: Specifies which API this token is valid for
- **`issued_at`** & **`expires`**: Token validity time window  
- **`solution_hash`**: The actual PoW solution hash that was verified
- **`difficulty`**: Challenge difficulty level that was completed
- **`signature`**: **RSA/ECDSA signature** of all token data using IronShield's private key

**How the Signature Works:**

The signature is computed over all the token data concatenated together:

```javascript
// Token signature generation (done by IronShield servers)
const tokenData = [
  token_id,
  challenge_id, 
  target_api,
  issued_at.toString(),
  expires.toString(),
  solution_hash,
  difficulty.toString()
].join('|');

const signature = rsaSign(tokenData, ironshield_private_key);
```

:::warning Security Notice
The **signature is the critical security component**. It proves that IronShield servers verified valid computational work and issued this specific token. Without the private key, no one can forge valid signatures.
:::

**Why This Design is Secure:**

- **Cryptographic Proof**: RSA/ECDSA signatures provide mathematical certainty
- **Tamper-Evident**: Any modification to token data invalidates the signature
- **Time-Limited**: Tokens have explicit expiration timestamps
- **API-Specific**: Each token is bound to a specific target API
- **Replay Protection**: Unique token IDs prevent reuse attacks

### Step 6: Third-Party API Verifies Token Offline

This is the **most important step** - where third-party APIs can cryptographically verify that clients have completed valid Proof of Work **without contacting IronShield servers**. This enables complete offline verification in sandboxed environments.

**Client Request to Third-Party API:**

```http
GET /api/v1/protected-endpoint HTTP/1.1
Host: api.example.com
Authorization: Bearer your-regular-api-key
X-IRONSHIELD-TOKEN: eyJ0b2tlbl9pZCI6InRva2VuXzE3MDk1NTk4MDBfZGVmZ2hpIiwiY2hhbGxlbmdlX2lkIjoiY2hhbF8xNzA5NTU5NjAwX2FiY2RlZiIsInRhcmdldF9hcGkiOiJhcGkuZXhhbXBsZS5jb20iLCJpc3N1ZWRfYXQiOjE3MDk1NTk4MDAsImV4cGlyZXMiOjE3MDk1NjMzMDAsInNvbHV0aW9uX2hhc2giOiIwMDAwMGExYjJjM2Q0ZTVmNjc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3OCIsImdlbmVyYXRlZF9ieSI6Imlyb25zaGllbGQtc2VydmVyLTAzIiwic2lnbmF0dXJlIjoiU0hBMjU2d2l0aFJTQVNpZ25hdHVyZU9mVG9rZW5EYXRhIn0=
Content-Type: application/json

{
  "user_id": 12345,
  "action": "get_sensitive_data"
}
```

**Third-Party API Verification Process:**

The API performs **complete offline verification** using only the token and IronShield's public key:

```javascript
// Complete offline verification function
function verifyIronShieldToken(tokenHeader, apiDomain) {
  try {
    // 1. Decode the Base64URL token
    const tokenData = base64URLDecode(tokenHeader);
    const token = JSON.parse(tokenData);
    
    // 2. Check basic token validity
    if (token.target_api !== apiDomain) {
      return { valid: false, reason: "Token not for this API" };
    }
    
    if (Date.now() > token.expires * 1000) {
      return { valid: false, reason: "Token expired" };
    }
    
    // 3. Verify the Proof of Work solution
    const challengeInput = token.challenge_id + 
                          extractSaltFromChallenge(token.challenge_id) + 
                          extractNonceFromHash(token.solution_hash) + 
                          token.target_api;
    
    const computedHash = sha256(challengeInput);
    if (computedHash !== token.solution_hash) {
      return { valid: false, reason: "Invalid PoW solution" };
    }
    
    // 4. Check hash meets difficulty requirement
    const requiredZeros = token.difficulty;
    if (!token.solution_hash.startsWith('0'.repeat(requiredZeros))) {
      return { valid: false, reason: "Insufficient PoW difficulty" };
    }
    
    // 5. Verify IronShield's cryptographic signature
    const signatureData = [
      token.token_id,
      token.challenge_id,
      token.target_api,
      token.issued_at.toString(),
      token.expires.toString(),
      token.solution_hash,
      token.difficulty.toString()
    ].join('|');
    
    const isValidSignature = rsaVerify(
      signatureData, 
      token.signature, 
      IRONSHIELD_PUBLIC_KEY
    );
    
    if (!isValidSignature) {
      return { valid: false, reason: "Invalid IronShield signature" };
    }
    
    // All checks passed!
    return { 
      valid: true, 
      token_id: token.token_id,
      difficulty: token.difficulty,
      issued_at: token.issued_at
    };
    
  } catch (error) {
    return { valid: false, reason: "Token parsing error" };
  }
}
```

**IronShield Public Key (Example):**

Third-party APIs need IronShield's public key to verify signatures. This can be:
- **Embedded in code** (for maximum security/isolation)
- **Fetched once at startup** (for easier key rotation)  
- **Retrieved from a well-known endpoint** (most flexible)

```javascript
const IRONSHIELD_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890abcdef...
-----END PUBLIC KEY-----`;
```

**What Each Verification Step Accomplishes:**

1. **Token Parsing**: Ensures token is well-formed JSON in proper Base64URL encoding
2. **API Binding**: Confirms token was issued specifically for this API domain  
3. **Expiration Check**: Prevents use of old/stale tokens
4. **PoW Verification**: Confirms a valid computational challenge was actually solved
5. **Difficulty Check**: Ensures the required computational work was performed
6. **Signature Verification**: Cryptographically proves IronShield issued this token

:::success Zero-Trust Verification
This verification process requires **zero outbound network calls**. Your API can run in a completely sandboxed environment, behind firewalls, or offline - and still verify legitimate users.
:::

**Practical Implementation Examples:**

<details>
<summary><strong>Cloudflare Worker Implementation</strong></summary>

```javascript
// Cloudflare Worker that verifies tokens before reaching origin
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});

async function handleRequest(request) {
  const ironshieldToken = request.headers.get('X-IRONSHIELD-TOKEN');
  
  if (!ironshieldToken) {
    return new Response('Missing IronShield token', { status: 401 });
  }
  
  const verification = verifyIronShieldToken(ironshieldToken, 'api.example.com');
  
  if (!verification.valid) {
    return new Response(`Token verification failed: ${verification.reason}`, { 
      status: 403 
    });
  }
  
  // Token is valid - forward to origin server
  return fetch(request);
}
```
</details>

<details>
<summary><strong>Express.js Middleware</strong></summary>

```javascript
const ironshieldMiddleware = (req, res, next) => {
  const token = req.headers['x-ironshield-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'IronShield token required' });
  }
  
  const verification = verifyIronShieldToken(token, req.get('host'));
  
  if (!verification.valid) {
    return res.status(403).json({ 
      error: 'Invalid IronShield token',
      reason: verification.reason 
    });
  }
  
  // Add verification info to request
  req.ironshield = verification;
  next();
};

// Use middleware on protected routes
app.get('/api/protected', ironshieldMiddleware, (req, res) => {
  res.json({ 
    message: 'Access granted',
    pow_difficulty: req.ironshield.difficulty 
  });
});
```
</details>

**Performance Characteristics:**

- **Verification Time**: < 1ms (single hash + signature verification)
- **Memory Usage**: Minimal (only crypto operations)  
- **CPU Impact**: Negligible (RSA verification is fast)
- **Network Calls**: **Zero** (completely offline)
- **Scalability**: Linear (no shared state or bottlenecks)

## Security Considerations & Implementation

### Token Security Model

The IronShield verification system is designed with multiple layers of security to prevent various attack vectors:

**Forgery Protection:**
- **RSA/ECDSA Signatures**: Impossible to forge without IronShield's private key
- **Cryptographic Binding**: Each token is cryptographically bound to specific challenge data
- **Mathematical Proof**: Signature verification provides mathematical certainty of authenticity

**Replay Attack Prevention:**
- **Unique Token IDs**: Each token has a globally unique identifier
- **Time-Limited Validity**: Tokens automatically expire after a configurable time window
- **Challenge Binding**: Tokens are tied to specific, single-use computational challenges

**Domain Security:**
- **API-Specific Tokens**: Each token is valid only for the specific target API domain
- **Explicit Binding**: Domain checking prevents cross-site token reuse
- **Isolation**: Tokens for api-a.com cannot be used on api-b.com

### Implementation Recommendations

#### For API Providers

**1. Verification Placement Options:**

<details>
<summary><strong>Edge/CDN Level (Recommended)</strong></summary>

Implement verification at CDN/edge level for maximum performance:

```javascript
// Cloudflare Worker / AWS Lambda@Edge
export default {
  async fetch(request) {
    const token = request.headers.get('X-IRONSHIELD-TOKEN');
    
    if (!verifyIronShieldToken(token, request.url.hostname).valid) {
      return new Response('Access Denied', { status: 403 });
    }
    
    return fetch(request); // Forward to origin
  }
}
```

**Benefits:**
- Blocks bad traffic before it reaches your servers
- Reduces origin server load
- Geographic distribution for low latency
- Natural DDoS protection
</details>

<details>
<summary><strong>API Gateway Level</strong></summary>

Integrate with your existing API gateway:

```yaml
# Kong plugin configuration
plugins:
- name: ironshield-verifier
  config:
    public_key_url: "https://keys.ironshield.cloud/public"
    cache_duration: 3600
    fail_mode: "closed"  # Reject if verification fails
```

**Benefits:**
- Centralized security policy
- Easy integration with existing infrastructure
- Detailed analytics and logging
</details>

<details>
<summary><strong>Application Level</strong></summary>

Implement directly in your application code:

```python
# Python Flask example
from flask import Flask, request, jsonify
import ironshield_verifier

app = Flask(__name__)

@app.before_request
def verify_ironshield():
    if request.endpoint == 'health':  # Skip health checks
        return
        
    token = request.headers.get('X-IRONSHIELD-TOKEN')
    if not token or not ironshield_verifier.verify(token, request.host):
        return jsonify({'error': 'Valid IronShield token required'}), 403
```

**Benefits:**
- Fine-grained control per endpoint
- Easy debugging and testing
- Custom verification logic
</details>

**2. Public Key Management:**

```javascript
// Option 1: Embedded key (highest security)
const IRONSHIELD_PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\n...";

// Option 2: Fetch at startup (balance of security and flexibility)
const publicKey = await fetch('https://keys.ironshield.cloud/public')
  .then(r => r.text())
  .then(key => { cache(key, '24h'); return key; });

// Option 3: Dynamic fetching with caching (most flexible)
async function getPublicKey() {
  const cached = getFromCache('ironshield_public_key');
  if (cached && !isExpired(cached)) return cached.key;
  
  const key = await fetch('https://keys.ironshield.cloud/public').then(r => r.text());
  setCache('ironshield_public_key', key, '1h');
  return key;
}
```

**3. Error Handling Strategy:**

```javascript
function handleVerificationError(error, request) {
  switch (error.type) {
    case 'TOKEN_MISSING':
      return new Response('IronShield token required', { status: 401 });
      
    case 'TOKEN_EXPIRED':
      return new Response('Token expired, please solve new challenge', { 
        status: 401,
        headers: { 'X-Challenge-URL': 'https://challenge.ironshield.cloud' }
      });
      
    case 'INVALID_SIGNATURE':
      // Log as potential attack attempt
      logSecurityEvent('invalid_signature_attempt', request);
      return new Response('Invalid token signature', { status: 403 });
      
    case 'WRONG_API':
      return new Response('Token not valid for this API', { status: 403 });
      
    default:
      return new Response('Token verification failed', { status: 403 });
  }
}
```

#### For Client Developers

**1. Client Implementation Strategy:**

Clients need to implement the full PoW challenge/response flow:

```javascript
class IronShieldClient {
  constructor(challengeEndpoint) {
    this.challengeEndpoint = challengeEndpoint;
    this.workers = navigator.hardwareConcurrency || 4; // Use available CPU cores
  }
  
  async getToken(targetAPI) {
    // Step 1: Request challenge
    const challenge = await this.requestChallenge(targetAPI);
    
    // Step 2: Solve challenge (potentially in Web Workers for better UX)
    const solution = await this.solveChallenge(challenge);
    
    // Step 3: Submit solution and get token
    const token = await this.submitSolution(solution);
    
    return token;
  }
  
  async solveChallenge(challenge) {
    return new Promise((resolve) => {
      // Use Web Workers to avoid blocking main thread
      const worker = new Worker('/pow-solver.js');
      worker.postMessage(challenge);
      worker.onmessage = (e) => resolve(e.data);
    });
  }
}
```

**2. Challenge Difficulty Management:**

Different types of clients should receive appropriate difficulty levels:

- **Web Browsers**: Lower difficulty (3-4 zeros) for better user experience
- **Mobile Apps**: Medium difficulty (4-5 zeros) balancing security and battery life  
- **Server-to-Server**: Higher difficulty (6-8 zeros) since computational resources are abundant
- **IoT Devices**: Very low difficulty (2-3 zeros) due to limited processing power

**3. Caching and Reuse:**

```javascript
// Token caching strategy
class TokenCache {
  constructor() {
    this.tokens = new Map();
  }
  
  getValidToken(apiDomain) {
    const token = this.tokens.get(apiDomain);
    if (token && token.expires > Date.now() + 60000) { // 1 min buffer
      return token;
    }
    return null;
  }
  
  storeToken(apiDomain, token) {
    this.tokens.set(apiDomain, {
      ...token,
      expires: token.expires * 1000 // Convert to milliseconds
    });
  }
}
```

### Real-World Usage Examples

**Enterprise API Protection:**

```bash
# High-security financial API
curl -X GET \
  -H "Authorization: Bearer your-api-key" \
  -H "X-IRONSHIELD-TOKEN: eyJ0b2tlbl9pZC..." \
  https://api.bank.com/v1/transactions
```

**Public API with PoW Protection:**

```bash
# Weather API that prevents scraping
curl -X GET \
  -H "X-IRONSHIELD-TOKEN: eyJ0b2tlbl9pZC..." \
  https://api.weather.com/v1/current?location=NYC
```

**Microservice Communication:**

```bash
# Service-to-service calls with PoW verification
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-IRONSHIELD-TOKEN: eyJ0b2tlbl9pZC..." \
  -d '{"user_id": 123, "action": "update_profile"}' \
  https://internal-api.company.com/v1/users
```

## Benefits Summary

### For API Providers

✅ **Zero Infrastructure Dependency**: Verify tokens without contacting IronShield
✅ **Extreme Threat Model Ready**: Works in completely air-gapped environments  
✅ **High Performance**: Sub-millisecond verification times
✅ **Economic Attack Mitigation**: Makes automated attacks financially unfeasible
✅ **Flexible Integration**: Works with any HTTP-based API or gateway
✅ **Cryptographic Security**: Mathematical proof of computational work

### For Legitimate Users

✅ **Transparent Protection**: Minimal impact on normal usage patterns
✅ **One-Time Cost**: Solve challenge once, use token for multiple requests
✅ **Background Processing**: PoW solving can happen in Web Workers
✅ **Cross-Platform**: Works in browsers, mobile apps, and server environments

### For Security Teams

✅ **Defense in Depth**: Adds computational cost layer to existing security
✅ **Attack Attribution**: PoW solutions provide forensic evidence
✅ **Scalable Protection**: Linear performance characteristics  
✅ **Compliance Friendly**: No PII collection or processing required

## Common Implementation Patterns

### Progressive Enhancement

Start with optional PoW verification and gradually enforce:

```javascript
// Phase 1: Optional verification (monitoring mode)
function checkIronShieldToken(request) {
  const token = request.headers.get('X-IRONSHIELD-TOKEN');
  const verification = token ? verifyToken(token) : { valid: false };
  
  // Log metrics but don't block
  logMetrics('pow_verification', {
    has_token: !!token,
    valid: verification.valid,
    endpoint: request.url
  });
  
  return true; // Always allow through
}

// Phase 2: Enforce for suspicious traffic  
function enforceForSuspicious(request) {
  const riskScore = calculateRiskScore(request);
  
  if (riskScore > THRESHOLD) {
    const token = request.headers.get('X-IRONSHIELD-TOKEN');
    return verifyToken(token).valid;
  }
  
  return true; // Low-risk traffic passes through
}

// Phase 3: Full enforcement
function enforceForAll(request) {
  const token = request.headers.get('X-IRONSHIELD-TOKEN');
  return verifyToken(token).valid;
}
```

### Graceful Degradation

Handle verification failures gracefully:

```javascript
function handleRequest(request) {
  const token = request.headers.get('X-IRONSHIELD-TOKEN');
  const verification = verifyToken(token);
  
  if (!verification.valid) {
    // Return limited functionality instead of complete rejection
    return {
      status: 200,
      data: {
        message: "Limited access mode",
        rate_limit: "5 requests/hour",
        features_available: ["basic_search"],
        upgrade_instructions: {
          challenge_url: "https://challenge.ironshield.cloud",
          target_api: request.url.hostname
        }
      }
    };
  }
  
  // Full access for verified clients
  return processFullRequest(request);
}
```

## Troubleshooting Guide

### Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Token Expired** | 401 responses with "token expired" | Client should request new challenge |
| **Wrong API Domain** | 403 with "token not for this API" | Ensure challenge requested for correct domain |
| **Invalid Signature** | 403 with "invalid signature" | Verify public key is current |
| **PoW Solution Invalid** | Token generation fails | Check hash computation logic |
| **High CPU Usage** | Browser/app becomes unresponsive | Use Web Workers for PoW computation |

### Debug Mode

Enable detailed logging for troubleshooting:

```javascript
const DEBUG = process.env.NODE_ENV === 'development';

function verifyTokenWithDebug(token, domain) {
  const result = verifyToken(token, domain);
  
  if (DEBUG) {
    console.log('Token verification details:', {
      token_id: result.token_id,
      valid: result.valid,
      reason: result.reason,
      domain_match: result.domain_match,
      signature_valid: result.signature_valid,
      expiry_check: result.expiry_check
    });
  }
  
  return result;
}
```

## Getting Started

Ready to implement IronShield verification in your API? Here's your roadmap:

### 1. **Understand the Flow** 
Review the 6-step verification process above to understand how clients obtain and use PoW tokens.

### 2. **Choose Implementation Level**
Decide where to implement verification:
- **Edge/CDN** (recommended for performance)
- **API Gateway** (good for centralized control)  
- **Application** (maximum flexibility)

### 3. **Obtain IronShield Public Key**
Get the public key needed for signature verification from IronShield.

### 4. **Implement Verification Logic**
Use the provided code examples to implement token verification in your chosen technology stack.

### 5. **Test Integration**
Start with monitoring mode, then gradually enforce verification for increasingly broader traffic.

### 6. **Monitor and Optimize**
Track verification metrics and adjust difficulty levels based on your threat landscape.

## Implementation Checklist

<details>
<summary><strong>📋 Pre-Implementation Checklist</strong></summary>

- [ ] **Architecture Review**: Determined where verification will be implemented
- [ ] **Public Key Management**: Decided on key distribution strategy
- [ ] **Error Handling**: Planned user experience for verification failures
- [ ] **Performance Testing**: Verified sub-millisecond verification performance
- [ ] **Monitoring Setup**: Prepared logging and metrics collection
- [ ] **Rollback Plan**: Defined procedure to disable verification if needed

</details>

<details>
<summary><strong>🔧 Technical Implementation Checklist</strong></summary>

- [ ] **Token Parsing**: Implemented Base64URL decoding
- [ ] **Domain Validation**: Verified tokens are for correct API
- [ ] **Expiry Checking**: Implemented time-based token validation
- [ ] **PoW Verification**: Recreated hash computation logic
- [ ] **Signature Verification**: Implemented RSA/ECDSA signature checking
- [ ] **Error Responses**: Defined appropriate HTTP status codes and messages

</details>

<details>
<summary><strong>🚀 Go-Live Checklist</strong></summary>

- [ ] **Phased Rollout**: Started with monitoring mode
- [ ] **Performance Monitoring**: Tracking verification latency
- [ ] **Error Rate Monitoring**: Watching for verification failures
- [ ] **User Impact Assessment**: Monitoring legitimate user experience
- [ ] **Attack Mitigation**: Measuring reduction in automated traffic
- [ ] **Documentation**: Updated API docs with PoW requirements

</details>

## Advanced Topics

### Custom Difficulty Algorithms

Implement dynamic difficulty adjustment based on threat levels:

```javascript
function calculateDifficulty(request, baselineThreats) {
  let difficulty = 4; // Base difficulty
  
  // Increase for suspicious patterns
  if (isHighRiskIP(request.ip)) difficulty += 1;
  if (hasBotuserAgent(request.userAgent)) difficulty += 2;
  if (isRateLimitHit(request.ip)) difficulty += 1;
  
  // Decrease for trusted clients
  if (hasValidApiKey(request)) difficulty -= 1;
  if (isWhitelistedDomain(request.referrer)) difficulty -= 1;
  
  return Math.max(2, Math.min(8, difficulty)); // Clamp between 2-8
}
```

### Multi-Token Architecture

For high-traffic APIs, implement token pooling:

```javascript
class TokenPool {
  constructor(size = 10) {
    this.tokens = [];
    this.maxSize = size;
  }
  
  async getToken(apiDomain) {
    // Try to get valid token from pool
    const validToken = this.tokens.find(t => 
      t.target_api === apiDomain && 
      t.expires > Date.now() + 60000
    );
    
    if (validToken) return validToken;
    
    // Generate new token if pool has space
    if (this.tokens.length < this.maxSize) {
      const newToken = await this.generateToken(apiDomain);
      this.tokens.push(newToken);
      return newToken;
    }
    
    // Replace oldest token
    const oldestIndex = this.findOldestTokenIndex();
    this.tokens[oldestIndex] = await this.generateToken(apiDomain);
    return this.tokens[oldestIndex];
  }
}
```

## Support & Resources

### Documentation
- 📖 [IronShield Overview](/docs/intro)
- 🛡️ [Edge Platform](/docs/platforms/edge)
- 🧠 [Core Platform](/docs/platforms/core)
- 🔧 [Self-Hosting Guide](/docs/self-hosting)

### Community & Support
- 💬 [Developer Discord](https://discord.gg/ironshield)
- 📧 [Technical Support](mailto:support@ironshield.cloud)
- 🐛 [Report Issues](https://github.com/IronShield-Tech/ironshield/issues)
- 📚 [Knowledge Base](https://help.ironshield.cloud)

### Professional Services
- 🏗️ [Implementation Consulting](mailto:consulting@ironshield.cloud)
- 🎯 [Custom Integration Development](mailto:professional-services@ironshield.cloud)
- 📊 [Security Assessment Services](mailto:security@ironshield.cloud)

---

:::tip Ready to Get Started?
The IronShield verification system provides unparalleled security for extreme threat models while maintaining high performance and zero infrastructure dependencies. **Start with monitoring mode** to understand the impact, then gradually enforce verification as your confidence grows.
::: 