import { useState, useEffect } from 'react';
import { usePontem } from '../hooks/usePontem';
import { useContract, CollectionInfo, NFTInfo } from '../hooks/useContract';

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-6 gradient-border">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400">
          {icon}
        </div>
        <div>
          <p className="text-sm text-white/40">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ onClick, loading, disabled, children, variant = 'primary' }: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="loading-spinner" />
          Processing...
        </span>
      ) : children}
    </button>
  );
}

function NFTCard({ nft, isOwner, onTransfer }: {
  nft: NFTInfo;
  isOwner: boolean;
  onTransfer: (id: number) => void;
}) {
  return (
    <div className="glass-card p-4 gradient-border group">
      <div className="aspect-square rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4 flex items-center justify-center overflow-hidden relative">
        {nft.uri ? (
          <img src={nft.uri} alt={nft.name} className="w-full h-full object-cover" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
        ) : null}
        {!nft.uri && (
          <div className="flex flex-col items-center justify-center">
            <svg className="w-12 h-12 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-white/40 text-sm mt-2">#{nft.id}</span>
          </div>
        )}
        {/* Transfer overlay on hover - only for owned NFTs */}
        {isOwner && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => onTransfer(nft.id)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm hover:scale-105 transition-transform"
            >
              Transfer
            </button>
          </div>
        )}
      </div>
      <h3 className="font-semibold text-white truncate">{nft.name}</h3>
      <p className="text-sm text-white/50 truncate">{nft.description}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-purple-400">Token #{nft.id}</span>
        {isOwner ? (
          <span className="text-xs text-emerald-400 font-medium">Owned</span>
        ) : (
          <span className="text-xs text-white/30 font-mono truncate max-w-[100px]" title={nft.owner}>
            {nft.owner.slice(0, 6)}...
          </span>
        )}
      </div>
    </div>
  );
}

function TransferModal({
  isOpen,
  onClose,
  tokenId,
  onTransfer,
  loading
}: {
  isOpen: boolean;
  onClose: () => void;
  tokenId: number | null;
  onTransfer: (to: string) => void;
  loading: boolean;
}) {
  const [recipient, setRecipient] = useState('');

  if (!isOpen || tokenId === null) return null;

  const handleSubmit = () => {
    if (recipient) {
      onTransfer(recipient);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass-card p-8 max-w-md w-full animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Transfer NFT #{tokenId}</h3>
          <p className="text-sm text-white/50 mt-1">Send this NFT to any address</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50 font-mono text-sm"
              placeholder="0x..."
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!recipient || loading}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="loading-spinner" />
                  Sending...
                </span>
              ) : (
                'Send NFT'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { connected, account, isTestMode } = usePontem();
  const {
    createCollection,
    mintNFT,
    transferNFT,
    getCollectionInfo,
    collectionExists,
    getAllNFTs,
    loading,
    error,
    contractAddress,
  } = useContract();

  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null);
  const [hasCollection, setHasCollection] = useState(false);
  const [allNFTs, setAllNFTs] = useState<NFTInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showError, setShowError] = useState(false);

  // Form states
  const [collectionName, setCollectionName] = useState('My NFT Collection');
  const [collectionDesc, setCollectionDesc] = useState('A collection of unique digital assets');
  const [maxSupply, setMaxSupply] = useState('100');

  const [nftName, setNftName] = useState('');
  const [nftDesc, setNftDesc] = useState('');
  const [nftUri, setNftUri] = useState('');

  // Transfer modal states
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const refreshData = async () => {
    if (!account || !contractAddress) return;
    setRefreshing(true);
    try {
      const exists = await collectionExists(contractAddress);
      setHasCollection(exists || false);
      if (exists) {
        const info = await getCollectionInfo(contractAddress);
        setCollectionInfo(info);
        // Load all NFTs from blockchain
        const nfts = await getAllNFTs(contractAddress);
        setAllNFTs(nfts);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (account) {
      refreshData();
    }
  }, [account]);

  const handleCreateCollection = async () => {
    const result = await createCollection(collectionName, collectionDesc, parseInt(maxSupply));
    if (result) {
      await refreshData();
    }
  };

  const handleMintNFT = async () => {
    if (!nftName) return;
    const result = await mintNFT(nftName, nftDesc, nftUri);
    if (result) {
      setNftName('');
      setNftDesc('');
      setNftUri('');
      await refreshData();
    }
  };

  const openTransferModal = (tokenId: number) => {
    setSelectedTokenId(tokenId);
    setTransferModalOpen(true);
  };

  const closeTransferModal = () => {
    setTransferModalOpen(false);
    setSelectedTokenId(null);
  };

  const handleTransferNFT = async (recipient: string) => {
    if (!recipient || selectedTokenId === null) return;
    const result = await transferNFT(recipient, selectedTokenId);
    if (result) {
      closeTransferModal();
      await refreshData();
    }
  };

  // Count owned NFTs
  const myNFTCount = allNFTs.filter(nft => nft.owner === account).length;

  if (!connected && !isTestMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="animate-float mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-2xl shadow-purple-500/30">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
            NFT Collection
          </span>
        </h1>
        <p className="text-lg text-white/50 max-w-md mb-8">
          Connect your wallet to create and mint NFTs on Lumio Network
        </p>
        <div className="flex items-center gap-4">
          <span className="status-badge info">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lumio Testnet
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
            NFT Collection
          </span>
        </h1>
        <p className="text-lg text-white/50">
          Create, mint, and manage your NFT collection on Lumio
        </p>
      </div>

      {!hasCollection ? (
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="animate-float mb-6 inline-block">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Create Your Collection</h2>
            <p className="text-white/50">Set up your NFT collection to start minting</p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Collection Name</label>
              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                placeholder="My NFT Collection"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">Description</label>
              <input
                type="text"
                value={collectionDesc}
                onChange={(e) => setCollectionDesc(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                placeholder="A collection of unique digital assets"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">Max Supply</label>
              <input
                type="number"
                value={maxSupply}
                onChange={(e) => setMaxSupply(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                placeholder="100"
                min="1"
              />
            </div>
            <div className="pt-4">
              <ActionButton onClick={handleCreateCollection} loading={loading}>
                Create Collection
              </ActionButton>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Collection Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Collection"
              value={collectionInfo?.name || 'Loading...'}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            <StatCard
              label="Total Minted"
              value={collectionInfo?.totalMinted || 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
            />
            <StatCard
              label="Max Supply"
              value={collectionInfo?.maxSupply || 0}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              }
            />
            <StatCard
              label="Your NFTs"
              value={myNFTCount}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>

          {/* Mint NFT Form */}
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Mint New NFT
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">NFT Name *</label>
                  <input
                    type="text"
                    value={nftName}
                    onChange={(e) => setNftName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                    placeholder="My Awesome NFT"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Description</label>
                  <input
                    type="text"
                    value={nftDesc}
                    onChange={(e) => setNftDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                    placeholder="A unique digital collectible"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Image URI</label>
                  <input
                    type="text"
                    value={nftUri}
                    onChange={(e) => setNftUri(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                    placeholder="https://example.com/image.png"
                  />
                </div>
                <div className="pt-2">
                  <ActionButton onClick={handleMintNFT} loading={loading} disabled={!nftName}>
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Mint NFT
                    </span>
                  </ActionButton>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border-2 border-dashed border-white/10">
                  {nftUri ? (
                    <img src={nftUri} alt="Preview" className="w-full h-full object-cover rounded-2xl" onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }} />
                  ) : (
                    <div className="text-center text-white/30">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">Preview</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* All NFTs Grid */}
          {allNFTs.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Collection NFTs
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 nft-grid">
                {allNFTs.map((nft) => (
                  <NFTCard
                    key={nft.id}
                    nft={nft}
                    isOwner={nft.owner === account}
                    onTransfer={openTransferModal}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Contract Details */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Contract Details</h3>
        <div className="space-y-0">
          <div className="info-row">
            <span className="info-label">Contract Address</span>
            <span className="info-value font-mono text-xs">
              {contractAddress?.slice(0,12)}...{contractAddress?.slice(-8)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Network</span>
            <span className="info-value text-purple-400">Lumio Testnet</span>
          </div>
          <div className="info-row">
            <span className="info-label">Module</span>
            <span className="info-value font-mono">nft::nft</span>
          </div>
          <div className="info-row">
            <span className="info-label">Mode</span>
            <span className={`info-value ${isTestMode ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isTestMode ? 'Test Mode' : 'Production'}
            </span>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <ActionButton onClick={refreshData} loading={refreshing} variant="secondary">
          <span className="inline-flex items-center gap-2">
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </span>
        </ActionButton>
      </div>

      {showError && error && (
        <div className="error-toast">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-red-400">Error</p>
              <p className="text-sm text-white/60 mt-1">{error}</p>
            </div>
            <button onClick={() => setShowError(false)} className="text-white/40 hover:text-white/60 ml-auto">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={transferModalOpen}
        onClose={closeTransferModal}
        tokenId={selectedTokenId}
        onTransfer={handleTransferNFT}
        loading={loading}
      />
    </div>
  );
}
