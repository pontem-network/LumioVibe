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
    }

    struct NFT has store, drop, copy {
        id: u64,
        name: String,
        description: String,
        uri: String,
        creator: address,
    }

    struct NFTStore has key {
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
        });

        move_to(account, NFTStore {
            nfts: vector::empty<NFT>(),
        });
    }

    public entry fun mint_nft(
        account: &signer,
        name: vector<u8>,
        description: vector<u8>,
        uri: vector<u8>
    ) acquires NFTCollection, NFTStore {
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
        };

        collection.total_minted = collection.total_minted + 1;

        let store = borrow_global_mut<NFTStore>(addr);
        vector::push_back(&mut store.nfts, nft);
    }

    public entry fun transfer_nft(
        from: &signer,
        to: address,
        token_id: u64
    ) acquires NFTStore {
        let from_addr = signer::address_of(from);
        assert!(exists<NFTStore>(from_addr), E_NOT_INITIALIZED);
        assert!(exists<NFTStore>(to), E_NOT_INITIALIZED);

        let from_store = borrow_global_mut<NFTStore>(from_addr);
        let nft_index = find_nft_index(&from_store.nfts, token_id);
        assert!(nft_index < vector::length(&from_store.nfts), E_NFT_NOT_FOUND);

        let nft = vector::remove(&mut from_store.nfts, nft_index);

        let to_store = borrow_global_mut<NFTStore>(to);
        vector::push_back(&mut to_store.nfts, nft);
    }

    public entry fun register(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<NFTStore>(addr)) {
            move_to(account, NFTStore {
                nfts: vector::empty<NFT>(),
            });
        };
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
    public fun get_nft_count(addr: address): u64 acquires NFTStore {
        if (!exists<NFTStore>(addr)) {
            return 0
        };
        vector::length(&borrow_global<NFTStore>(addr).nfts)
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
    public fun has_store(addr: address): bool {
        exists<NFTStore>(addr)
    }
}
