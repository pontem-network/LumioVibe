# NFT Collection Template Specification

## Overview

Create and manage NFT collections with minting, ownership tracking, metadata, and transfers. Learn digital collectibles and non-fungible token patterns on Lumio Network.

**Difficulty:** Intermediate
**Category:** NFT
**Network:** Lumio Testnet

## Smart Contract

### Module: `nft::nft`

#### Data Structures

| Struct | Abilities | Fields | Description |
|--------|-----------|--------|-------------|
| `NFTCollection` | `key` | `name: String`, `description: String`, `total_minted: u64`, `max_supply: u64`, `creator: address` | Collection metadata |
| `NFT` | `store, drop, copy` | `id: u64`, `name: String`, `description: String`, `uri: String`, `creator: address`, `owner: address` | Individual NFT data |
| `NFTRegistry` | `key` | `nfts: vector<NFT>` | Storage for all NFTs in collection |

#### Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 1 | `E_NOT_INITIALIZED` | Collection not created |
| 2 | `E_ALREADY_INITIALIZED` | Collection already exists |
| 3 | `E_MAX_SUPPLY_REACHED` | Cannot mint, max supply reached |
| 4 | `E_NFT_NOT_FOUND` | Token ID doesn't exist |
| 5 | `E_NOT_OWNER` | Caller doesn't own NFT |
| 6 | `E_INVALID_TOKEN_ID` | Invalid token ID |

#### Entry Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `create_collection(account, name, description, max_supply)` | Signer, `vector<u8>`, `vector<u8>`, `u64` | Create new NFT collection |
| `mint_nft(account, name, description, uri)` | Signer, `vector<u8>`, `vector<u8>`, `vector<u8>` | Mint new NFT |
| `transfer_nft(from, collection_addr, to, token_id)` | Signer, `address`, `address`, `u64` | Transfer NFT to another address |

#### View Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `get_collection_info(addr)` | `address` | `(String, String, u64, u64)` | Name, description, minted, max |
| `get_nft_count(collection_addr, owner)` | `address`, `address` | `u64` | Count NFTs owned by address |
| `get_total_minted(addr)` | `address` | `u64` | Total NFTs minted |
| `collection_exists(addr)` | `address` | `bool` | Check if collection exists |
| `get_nft_by_id(collection_addr, token_id)` | `address`, `u64` | `(u64, String, String, String, address, address)` | Full NFT data |
| `get_nfts_by_owner(collection_addr, owner)` | `address`, `address` | `vector<u64>` | Token IDs owned |
| `get_all_nfts(collection_addr)` | `address` | `vector<u64>` | All token IDs |

## Frontend Integration

### Hooks

```typescript
// useContract.ts - NFT operations
const useContract = () => {
  createCollection(name: string, description: string, maxSupply: number): Promise<void>
  mintNFT(name: string, description: string, uri: string): Promise<void>
  transferNFT(collectionAddr: string, to: string, tokenId: number): Promise<void>
  getCollectionInfo(): Promise<CollectionInfo>
  getNFTById(tokenId: number): Promise<NFTData>
  getNFTsByOwner(owner: string): Promise<number[]>
  getAllNFTs(): Promise<number[]>
  getNFTCount(owner: string): Promise<number>
}

interface CollectionInfo {
  name: string
  description: string
  totalMinted: number
  maxSupply: number
}

interface NFTData {
  id: number
  name: string
  description: string
  uri: string
  creator: string
  owner: string
}
```

### Pages

- **Home** - Collection dashboard with NFT gallery and minting interface

### Features

- Create NFT collection with custom metadata
- Mint NFTs with name, description, and URI (image/metadata link)
- NFT gallery with owned NFTs
- Transfer NFTs to other addresses
- Collection statistics (minted/max supply)
- NFT detail view with metadata

## User Flows

### 1. Create Collection
```
Connect Wallet → Enter Name/Description/Max Supply → Click "Create" → Sign → Collection Created
```

### 2. Mint NFT
```
Collection exists → Enter NFT Name/Description/URI → Click "Mint" → Sign → NFT Created with ID
```

### 3. Transfer NFT
```
Select NFT → Enter recipient address → Click "Transfer" → Sign → Ownership transferred
```

### 4. View Collection
```
Enter collection address → Fetch collection info → Display gallery of all NFTs
```

### 5. View My NFTs
```
Connected → Fetch owned token IDs → Display NFT cards with metadata
```

## CLI Commands

```bash
# Create collection
lumio move run --function-id '<deployer>::nft::create_collection' \
  --args 'string:My Collection' 'string:A unique NFT collection' 'u64:1000'

# Mint NFT
lumio move run --function-id '<deployer>::nft::mint_nft' \
  --args 'string:NFT #1' 'string:First NFT in collection' 'string:ipfs://QmHash...'

# Transfer NFT
lumio move run --function-id '<deployer>::nft::transfer_nft' \
  --args 'address:<collection_addr>' 'address:<recipient>' 'u64:0'

# View collection info
lumio move view --function-id '<deployer>::nft::get_collection_info' \
  --args 'address:<collection_addr>'

# Get NFT by ID
lumio move view --function-id '<deployer>::nft::get_nft_by_id' \
  --args 'address:<collection_addr>' 'u64:0'

# Get NFTs owned by address
lumio move view --function-id '<deployer>::nft::get_nfts_by_owner' \
  --args 'address:<collection_addr>' 'address:<owner>'

# Get all NFT IDs
lumio move view --function-id '<deployer>::nft::get_all_nfts' \
  --args 'address:<collection_addr>'
```

## NFT Metadata Standard

Recommended URI format (JSON):
```json
{
  "name": "NFT Name",
  "description": "NFT Description",
  "image": "ipfs://QmImageHash",
  "attributes": [
    { "trait_type": "Rarity", "value": "Legendary" },
    { "trait_type": "Color", "value": "Blue" }
  ]
}
```

## Testing Checklist

- [ ] Deploy contract to testnet
- [ ] Create collection with max supply
- [ ] Mint multiple NFTs
- [ ] Verify token IDs increment correctly
- [ ] Transfer NFT to another address
- [ ] Verify ownership changes
- [ ] Test max supply limit
- [ ] Query NFTs by owner
- [ ] Query single NFT by ID
- [ ] Test transfer error for non-owner
- [ ] Test invalid token ID error
