module __PROJECT_NAME__::nft {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_MAX_SUPPLY_REACHED: u64 = 3;
    const E_NFT_NOT_FOUND: u64 = 4;
    const E_NOT_OWNER: u64 = 5;
    const E_INVALID_TOKEN_ID: u64 = 6;

    struct NFTCollection has key {
        name: String,
        description: String,
        total_minted: u64,
        max_supply: u64,
        creator: address,
    }

    struct NFT has store, drop, copy {
        id: u64,
        name: String,
        description: String,
        uri: String,
        creator: address,
        owner: address,
    }

    /// Global registry storing all NFTs - stored at collection creator's address
    struct NFTRegistry has key {
        nfts: vector<NFT>,
    }

    public entry fun create_collection(
        account: &signer,
        name: vector<u8>,
        description: vector<u8>,
        max_supply: u64
    ) {
        let addr = signer::address_of(account);
        assert!(!exists<NFTCollection>(addr), E_ALREADY_INITIALIZED);

        move_to(account, NFTCollection {
            name: string::utf8(name),
            description: string::utf8(description),
            total_minted: 0,
            max_supply,
            creator: addr,
        });

        move_to(account, NFTRegistry {
            nfts: vector::empty<NFT>(),
        });
    }

    public entry fun mint_nft(
        account: &signer,
        name: vector<u8>,
        description: vector<u8>,
        uri: vector<u8>
    ) acquires NFTCollection, NFTRegistry {
        let addr = signer::address_of(account);
        assert!(exists<NFTCollection>(addr), E_NOT_INITIALIZED);

        let collection = borrow_global_mut<NFTCollection>(addr);
        assert!(collection.total_minted < collection.max_supply, E_MAX_SUPPLY_REACHED);

        let nft = NFT {
            id: collection.total_minted,
            name: string::utf8(name),
            description: string::utf8(description),
            uri: string::utf8(uri),
            creator: addr,
            owner: addr,
        };

        collection.total_minted = collection.total_minted + 1;

        let registry = borrow_global_mut<NFTRegistry>(addr);
        vector::push_back(&mut registry.nfts, nft);
    }

    /// Transfer NFT to any address - no registration required
    public entry fun transfer_nft(
        from: &signer,
        collection_addr: address,
        to: address,
        token_id: u64
    ) acquires NFTRegistry {
        let from_addr = signer::address_of(from);
        assert!(exists<NFTRegistry>(collection_addr), E_NOT_INITIALIZED);

        let registry = borrow_global_mut<NFTRegistry>(collection_addr);
        let nft_index = find_nft_index(&registry.nfts, token_id);
        assert!(nft_index < vector::length(&registry.nfts), E_NFT_NOT_FOUND);

        let nft = vector::borrow_mut(&mut registry.nfts, nft_index);
        assert!(nft.owner == from_addr, E_NOT_OWNER);

        nft.owner = to;
    }

    fun find_nft_index(nfts: &vector<NFT>, token_id: u64): u64 {
        let len = vector::length(nfts);
        let i = 0u64;
        while (i < len) {
            let nft = vector::borrow(nfts, i);
            if (nft.id == token_id) {
                return i
            };
            i = i + 1;
        };
        len
    }

    #[view]
    public fun get_collection_info(addr: address): (String, String, u64, u64) acquires NFTCollection {
        assert!(exists<NFTCollection>(addr), E_NOT_INITIALIZED);
        let collection = borrow_global<NFTCollection>(addr);
        (collection.name, collection.description, collection.total_minted, collection.max_supply)
    }

    #[view]
    public fun get_nft_count(collection_addr: address, owner: address): u64 acquires NFTRegistry {
        if (!exists<NFTRegistry>(collection_addr)) {
            return 0
        };
        let registry = borrow_global<NFTRegistry>(collection_addr);
        let count = 0u64;
        let len = vector::length(&registry.nfts);
        let i = 0u64;
        while (i < len) {
            let nft = vector::borrow(&registry.nfts, i);
            if (nft.owner == owner) {
                count = count + 1;
            };
            i = i + 1;
        };
        count
    }

    #[view]
    public fun get_total_minted(addr: address): u64 acquires NFTCollection {
        if (!exists<NFTCollection>(addr)) {
            return 0
        };
        borrow_global<NFTCollection>(addr).total_minted
    }

    #[view]
    public fun collection_exists(addr: address): bool {
        exists<NFTCollection>(addr)
    }

    #[view]
    public fun get_nft_by_id(collection_addr: address, token_id: u64): (u64, String, String, String, address, address) acquires NFTRegistry {
        assert!(exists<NFTRegistry>(collection_addr), E_NOT_INITIALIZED);
        let registry = borrow_global<NFTRegistry>(collection_addr);
        let index = find_nft_index(&registry.nfts, token_id);
        assert!(index < vector::length(&registry.nfts), E_NFT_NOT_FOUND);
        let nft = vector::borrow(&registry.nfts, index);
        (nft.id, nft.name, nft.description, nft.uri, nft.creator, nft.owner)
    }

    #[view]
    public fun get_nfts_by_owner(collection_addr: address, owner: address): vector<u64> acquires NFTRegistry {
        let ids = vector::empty<u64>();
        if (!exists<NFTRegistry>(collection_addr)) {
            return ids
        };
        let registry = borrow_global<NFTRegistry>(collection_addr);
        let len = vector::length(&registry.nfts);
        let i = 0u64;
        while (i < len) {
            let nft = vector::borrow(&registry.nfts, i);
            if (nft.owner == owner) {
                vector::push_back(&mut ids, nft.id);
            };
            i = i + 1;
        };
        ids
    }

    #[view]
    public fun get_all_nfts(collection_addr: address): vector<u64> acquires NFTRegistry {
        let ids = vector::empty<u64>();
        if (!exists<NFTRegistry>(collection_addr)) {
            return ids
        };
        let registry = borrow_global<NFTRegistry>(collection_addr);
        let len = vector::length(&registry.nfts);
        let i = 0u64;
        while (i < len) {
            let nft = vector::borrow(&registry.nfts, i);
            vector::push_back(&mut ids, nft.id);
            i = i + 1;
        };
        ids
    }
}
