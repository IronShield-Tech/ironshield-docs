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
To solve an `IronShieldChallenge`, a client must find some `solution` that concatenates with the `random_nonce`, such that when this new value is hashed with SHA-256 the resulting hash represented as a *[u8; 32] big-endian byte array* is  smaller than the `challenge_param` target threshold byte array. The lower the `challenge_param` is, the harder the challenge is.

For example, the average probability of finding a SHA-256 hash less than 2^255 represented as a [u8; 32] byte array ([0, 0, 0, ..., 128]) is 50%, since there is a 50% chance any random integer chosen between 0 and 2^256 will be less than 2^255. This can be represented mathematically as the probability of solving a given challenge on any attempt as `challenge_param / 2^256`. Therefore, the difficulty, or the expected average number of attempts to solve a challenge, is `2^256 / challenge_param`. 

:::tip
For the exact concatenation and hashing process, please see the [PoW Verification](/docs/platforms/core#pow-verification) documentation below.
:::

### Random Nonce
The `random_nonce` is a SHA-256 hash of a random number represented as a hex string generated by IronShield servers. Since clients have to find a valid nonce that produces a specific SHA-256 output, it is essential that instead of the nonce itself producing a hash, it must be combined with some randomness generated by the servers to prevent an attacker from precomputing valid hashes. The presence of a random nonce the solution nonce needs to be concatenated with ensures that the only possible solution to a given challenge was one computed on the spot after the client received it.

More traditional PoW algorithms like Bitcoin's usually require the solution nonce to be hashed twice to prevent against [length-extension attacks](https://en.wikipedia.org/wiki/Length_extension_attack), but the `random_nonce` ensures that there will always be a non-user-generated fixed-length input into the hash. Reducing the authentication server workload per request to 1 hash instead of 2 may not seem like a lot. However, for a server authenticating hundreds of thousands, if not millions of requests per second, this simple architecture choice reduces the expected computational cost by 50%.

### Creation and Expiration Times
The `creation_time` and `expiration_time` timestamps in unix millis are more for the authentication server than the client. It allows a server to store old challenges as well as when they were created, and ensure that a client can't submit new solutions to old challenges. If every challenge has an expiration date, clients will have to continuously solve new challenges.

### Target threshold
The `challenge_param` is simply a number represented as a *[u8; 32] big-endian byte array*. The output of SHA-256 hash is fundamentally a 256-bit number that can also be represented as the same type of byte array. Therefore, [lexicographic](https://en.wikipedia.org/wiki/Lexicographic_order) comparison can be used between these 2 byte arrays to find out which one is smaller. In IronShield's case, its PoW algorithm is searching for a hash that is less than the target threshold specified by the `challenge_param`.

A target threshold also allows IronShield to be able to granularly modify the difficulty of a challenges, which the `recommended_attempts` is derived from (2x difficulty). The difficulty can be as easy as 2 expected attempts, to 1 million, to 100 million, to trillions. This is much mroe advantaguous compared to aglorithms that want to find a sha-256 hash with other specific properties, like the number of leading zeroes in a hash. Although it isn't a perfect analogy, if we look at the difficulty of a challenge in terms of big *O* notation, similar to time or space complexity, where *O* is the difficulty of a challenge in terms of the expected number of attempts and *n* is varied paramater like the number of leading zeros desired, the difficulty of a leading-zero challenge will be *O(16ⁿ)*. This would result in a difficulty of 1.05 million for 5 leading zeros, 16.78 million for 6 leading zeros, and 268.44 million for 7 leading zeros. The lack of granularity in terms of difficulty scaling prevents the ability to serve slightly harder challenges to more suspicious traffic. Any proof-of-work system using this would realistically only be able to serve relatively easy or extremly difficult challenges to traffic. In contrast, the `challenge_param` target threshold can be linearly varied since is jsut a number between 0 and 2^256, so its difficulty in big O notation would be *O(n)*, and can be granuarly scaled to whatever difficulty necessary, to serve easier challenges to people on phones and harder challenges to those on desktops, and much much much arder ones to suspected bots.

### Website Identificaton
The `website_id` is simply a url or identifier to the desired endpoint a client is trying to reach by solving a challenge. This is necessary for server-side billing and authentication, since as described in the [API platform documentation](/docs/platforms/api) the verification process can be offline, as this would be the only way a server would know which origin to forward client traffic to.

### Keys and Signatures
The `public_key` and `challenge_signature` exist for any indepdent third party to verify the authenticity of challenges. The `public_key` can be extracted from the public PGP key block belonging to software (at) ironshield.cloud posted to keys.openpgp.org. The challenge_signature over the challenge data can also be verified by any indpendent third party to have been generated by the owner of the corresponding private key to the `public_key`, which proves an authentic IronShield server created the challenge.

## PoW Verification
The verification process is quite similar to the solving process, except in this case, the solution has already been provided. All the verification server has to do is run through one iteration of the proof-of-work algorithm toe nsure the nonce is valid, and then redirect then issue a solution token.

### What a PoW Solution Looks Like
IronShield's protocol primarily communicates with HTTP headers, for more information see the [API Platform Documentation](/docs/platforms/api).

**Decoded Challenge Response Content:**
```json
IronShieldChallengeResponse {
  solved_challenge: IronShieldChallenge {
  random_nonce: "55a77bde84950b2a2a525885902a6b13",
  created_time: 1753923084753,
  expiration_time: 1753923114753,
  website_id: "ironshield-edge",
  challenge_param: "[0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]",
  recommended_attempts: 10000000,
  public_key: "[4, 1, 218, 71, 15, 1, 1, 7, 64, 75, 121, 0, 46, 128, 52, 26, 55, 136, 20, 182, 107, 189, 54, 235, 41, 1, 241, 143, 183, 142, 125, 60]",
  challenge_signature: "[80, 117, 53, 94, 228, 123, 162, 251, 221, 72, 66, 74, 202, 33, 225, 97, 34, 176, 138, 89, 32, 207, 247, 204, 221, 119, 194, 221, 172, 108, 190, 43, 127, 174, 95, 27,41, 160, 180, 20, 102, 152, 129, 222, 35, 79, 219, 106, 243, 86, 28, 99, 70, 151, 200, 101, 153, 98, 149, 167, 142, 139, 229, 5]"
  },
  solution: 11128447
}
```

#### What Each Field Means
- **`solved_challenge`**: The now solved challenge issued to client
- **`solution`**:         Valid solution nonce

### Challenge Response
The `solved_challenge` is simply an exact copy of the original IronShieldChallenge issued to the client. It allows the server to verify the client is submitting the solution for the exact challenge they issued the client. The `solution` is a signed 64-bit integer that is converted to a *[u8; 8] little-endian byte array*. The `random_nonce` is converted to a *[u8; 32] little-endian byte array*. They are then added to a SHA-256 hashing object and hashed. The output *[u8; 32] big-endian byte array* is compared against the target threshold `challenge_param `byte array of the same type to ensure the hash is less than the target threshold. This is the same process used in the original PoW solving.

## Advanced Technical Details
This section is significantly more technical than the rest of the platform documentation and is primarily intended to be read by developers looking to understand IronShield in much greater depth or potentially contribute to the codebase.

### Proof-of-Work Algorithm
The proof-of-work hashing algorithm was designed with a few key requirements:

1. It has to be able to run cross-platform, whether it be in a web browser or native machine code without hurting performance dramatically.
2. It should be particulary difficult, if not impossible, for a headless browser instance to perform.
3. To achieve millions of hashes per second, it should be multithreaded, and scale perfectly with more and more threads.
4. It should be able to report back progress (like hash rate, total hashes, etc.) at specific intervals.
5. It should be incredibly easy to scale the difficulty of.

The cross-platform nature of this problem elimiated the possibility of JavaScript ever being used. Typically when running SHA-256 in a browser, the JavaScript function `crypto.subtle.digest()`, is used, and can typically only do about 30-50k hashes per second on a normal computer. We are looking for performance on the order of millions per second. WebAssembly comes in quite handy for this problem since it gives us direct control over memeory in the browser and doesn't suffer from the event loops, batching, and garbage collection inherent to JavaScript. Rust was the natural choice for this problem given its extensive ecosystem with WebAssembly and lack of a garbage collector. 

#### Rust PoW Implementation
Below is a coded-up implementaion of IronShield's hyper-optimized PoW algorithm, which can be found in the [ironshield-core](https://github.com/IronShield-Tech/ironshield-core) repository. It extracts the `random_nonce` and `challenge_param` from the IronShieldChallenge as byte arrays and returns an IronShieldChallengeResponse, which returns the original challenge and the solution as a signed 64-bit integer. 
```rust
fn execute_proof_of_work(
    start_nonce:        i64,
    nonce_increment:    i64,
    config:             &PoWConfig,
    progress_callback:  Option<&dyn Fn(u64)>,
    challenge:          &IronShieldChallenge,
) -> Result<IronShieldChallengeResponse, String> {
    let mut      nonce_bytes: [u8; 8] = start_nonce.to_le_bytes();
    let     increment_amount:     u64 = nonce_increment as u64;
    let mut            nonce:     i64 = start_nonce;
    let mut attempts_counter:     u64 = 0;

    // Extract the random nonce and threshold from the challenge
    let random_nonce_bytes: Vec<u8> = hex::decode(&challenge.random_nonce)
        .map_err(|e: hex::FromHexError| format!("Failed to decode random_nonce hex: {}", e))?;
    let target_threshold: &[u8; 32] = &challenge.challenge_param;

    // Pre-compute the hash of the random nonce
    let mut base_hasher: Sha256 = Sha256::new();
    base_hasher.update(random_nonce_bytes);

    while nonce < config.max_attempts {
        // Hash the random nonce and nonce bytes
        let mut hasher = base_hasher.clone();
        hasher.update(&nonce_bytes);
        let hash_result = hasher.finalize();

        // Upon finding a valid solution convert bytes back to i64 and return the solution
        if hash_result.as_slice() < target_threshold {
            let final_nonce: i64 = le_bytes_to_i64(&nonce_bytes);
            return Ok(IronShieldChallengeResponse::new(
                challenge.clone(),
                final_nonce,
            ));
        }

        // Increment the attempts counter and report progress if a callback is provided
        attempts_counter += 1;
        if attempts_counter == config.progress_reporting_interval {
            if let Some(callback) = progress_callback {
                callback(attempts_counter);
            }
            attempts_counter = 0;
        }

        // Increment nonce byte directly, avoid i64 conversion.
        increment_le_bytes(&mut nonce_bytes, increment_amount);
        nonce += nonce_increment;
    }

    Err(format!("Could not find solution within {} attempts", config.max_attempts))
}
```

#### What Each Field Means
- **`start_nonce`**:          The starting nonce to check for the PoW algorithm
- **`nonce_increment`**:      The interval between each checked nonce in the PoW algorithm
- **`config`**:               Configuration settings for the solving progress
- **`progress_callback`**:    Counter for the number of hashing attempts
- **`challenge`**:            The IronShieldChallenge the client is attempting to solve

### Multithreading
This algorithm is primarily designed to be run on a single thread in a multi-threaded process. To avoid the overhead of threads keeping track of the progress others have made, a thread-stride algorithm was selected instead of breaking up the work into chunks. Assume a client has N threads available, indexed 0-(N-1). The `start_nonce` for each thread would be its corresponding index, and the `nonce_increment` would be the total number of threads, N. 

For example if a client has 4 available threads to solve the challenge with indexes 0-3, the `start_nonce` for the 0th thread would be 0, the 1st thread would be 1, the 2nd thread would be 2, and the 3rd thread would be 3. The `nonce_increment` for all of them would be the number of threads, 4. Continuing with our example, that means Thread #0 will check the nonces 0, 4, 8, 12, 16, etc.. Thread #1 will check the nonces 1, 5, 9, 13, 17, etc.. Thread #2 will check the nonces 2, 6, 10, 14, 18, etc. Thread #3 will check the nonces 3, 7, 11, 15, 19, etc.. 

This algorithm mathematiclaly ensures every nonce starting from 0 will be checked but each thread doesn't have to worry about checking nonce other threads have already checked, completely elimiating massive overhead that would normally be present slowing down hashing.

### Configuration
The `config` contains settings for how the solving process will function, like the total number of maximum attempts and the progress reporting interval of how many hashes have to occur before each call back to report the progress. The progress reporting happens through the `progress_callback` paramater that ispassed through the function, where a client can pass it as a paramater to get an update on how many iterations or hashes have elapsed.

### Byte Array Operations
All nonces numbers, and operations on them are represented as byte arrays instead of signed integers. This is done for numerous reasons, most notably a  SHA-256 hash is a 256-bit number, and there is no way to easily store 256-bit integers in Rust. Since the hashes are stored as byte arrays, every other value must also be converted to a byte array for comparisons and operations. An example of these highly-optimzied byte-array operations used in the PoW algorithm can be seen below.
```rust
#[inline]
fn increment_le_bytes(bytes: &mut [u8; 8], increment: u64) {
    let mut carry: u64 = increment;
    for byte in bytes.iter_mut() {
        if carry == 0 {
            break;
        }
        let sum: u64 = *byte as u64 + carry;
        *byte   = sum as u8;
        carry   = sum >> 8;
    }
}
```
Instead of converting the checked nonce back into a signed 64-bit integer, a function like this allows us for the addition of `nonce_increment` amount directly to the byte array. Although using this approach shaves off 12-15 cpu cycles per iteration, considering this algorithm is running millions of times per second, this slight compute saving can shave off **400ms** for a challenge that needs 100 million iterations to solve it, which can appear as the difference between a snappy user-experience, and a sluggish one.








