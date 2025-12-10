---
name: ts-client
type: knowledge
version: 1.0.0
agent: CodeActAgent
triggers:
- client
- typescript
- sdk
- aptos-sdk
---

# TypeScript Client Generation for Lumio

## Setup

```bash
mkdir -p client/src client/tests
cd client
pnpm init
pnpm add @aptos-labs/ts-sdk
pnpm add -D typescript vitest @types/node
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## package.json scripts

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## Lumio Configuration

```typescript
// src/config.ts
import { Aptos, AptosConfig } from "@aptos-labs/ts-sdk";

export const LUMIO_CONFIG = {
  fullnode: "https://api.testnet.lumio.io/v1",
  faucet: "https://faucet.testnet.lumio.io",
};

export function createLumioClient(): Aptos {
  const config = new AptosConfig({
    fullnode: LUMIO_CONFIG.fullnode,
    faucet: LUMIO_CONFIG.faucet,
  });
  return new Aptos(config);
}
```

## Client Template

```typescript
// src/client.ts
import {
  Aptos,
  AptosConfig,
  Account,
  Ed25519PrivateKey,
  InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";

const LUMIO_CONFIG = {
  fullnode: "https://api.testnet.lumio.io/v1",
  faucet: "https://faucet.testnet.lumio.io",
};

export class ContractClient {
  private aptos: Aptos;
  private contractAddress: string;

  constructor(contractAddress: string) {
    const config = new AptosConfig({
      fullnode: LUMIO_CONFIG.fullnode,
      faucet: LUMIO_CONFIG.faucet,
    });
    this.aptos = new Aptos(config);
    this.contractAddress = contractAddress;
  }

  // Entry function call
  async callEntryFunction(
    account: Account,
    functionName: string,
    typeArgs: string[] = [],
    args: any[] = []
  ) {
    const payload: InputGenerateTransactionPayloadData = {
      function: `${this.contractAddress}::module_name::${functionName}`,
      typeArguments: typeArgs,
      functionArguments: args,
    };

    const transaction = await this.aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: payload,
    });

    const signature = this.aptos.transaction.sign({
      signer: account,
      transaction,
    });

    const result = await this.aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator: signature,
    });

    return this.aptos.waitForTransaction({
      transactionHash: result.hash,
    });
  }

  // View function call
  async callViewFunction<T>(
    functionName: string,
    typeArgs: string[] = [],
    args: any[] = []
  ): Promise<T> {
    const result = await this.aptos.view({
      payload: {
        function: `${this.contractAddress}::module_name::${functionName}`,
        typeArguments: typeArgs,
        functionArguments: args,
      },
    });
    return result[0] as T;
  }
}
```

## Example: Counter Client

```typescript
// src/counter-client.ts
import { Account } from "@aptos-labs/ts-sdk";
import { ContractClient } from "./client";

export class CounterClient extends ContractClient {
  constructor(contractAddress: string) {
    super(contractAddress);
  }

  async initialize(account: Account) {
    return this.callEntryFunction(account, "initialize");
  }

  async increment(account: Account) {
    return this.callEntryFunction(account, "increment");
  }

  async getCount(address: string): Promise<number> {
    return this.callViewFunction<number>("get_count", [], [address]);
  }
}
```

## Test Template

```typescript
// tests/contract.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { CounterClient } from "../src/counter-client";

describe("Counter Contract", () => {
  let client: CounterClient;
  let account: Account;

  beforeAll(() => {
    // Use test private key or generate new one
    const privateKey = new Ed25519PrivateKey(
      process.env.PRIVATE_KEY || "0x..."
    );
    account = Account.fromPrivateKey({ privateKey });

    client = new CounterClient("0x...contract_address...");
  });

  it("should get count", async () => {
    const count = await client.getCount(account.accountAddress.toString());
    expect(typeof count).toBe("number");
  });
});
```

## vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
  },
});
```

## Reading ABI

After compilation, ABI is located at:
```
contract/build/<project_name>/abis/<module_name>.abi
```

Use this to generate types for your client.

## Key Points

1. Use `@aptos-labs/ts-sdk` - it works with Lumio
2. Configure with Lumio testnet URLs
3. Native coin is `0x1::lumio_coin::LumioCoin` (but SDK handles this)
4. Always wait for transaction confirmation
5. Use view functions for read-only operations
