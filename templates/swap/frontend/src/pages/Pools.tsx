import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLayout } from "@/components/PageLayout";
import { PoolsHeader } from "@/components/pools/PoolsHeader";
import { PoolsTable } from "@/components/pools/PoolsTable";
import { MyPositions } from "@/components/pools/MyPositions";
import { AddLiquidityModal } from "@/components/pools/AddLiquidityModal";
import { RemoveLiquidityModal } from "@/components/pools/RemoveLiquidityModal";
import { usePools } from "@/hooks/usePools";
import type { Pool, UserPosition } from "@/types/pool";

const Pools = () => {
  const {
    pools,
    userPositions,
    totalTVL,
    totalVolume24h,
    sortField,
    sortDirection,
    toggleSort,
    searchQuery,
    setSearchQuery,
    formatValue,
    poolCount,
  } = usePools();

  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<UserPosition | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  const handleAddLiquidity = (pool: Pool) => {
    setSelectedPool(pool);
    setIsAddModalOpen(true);
  };

  const handleRemoveLiquidity = (position: UserPosition) => {
    setSelectedPosition(position);
    setIsRemoveModalOpen(true);
  };

  return (
    <PageLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <PoolsHeader
          poolCount={poolCount}
          totalTVL={formatValue(totalTVL)}
          totalVolume={formatValue(totalVolume24h)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="glass-card">
            <TabsTrigger value="all">All Pools</TabsTrigger>
            <TabsTrigger value="positions">My Positions ({userPositions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <PoolsTable
              pools={pools}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={toggleSort}
              formatValue={formatValue}
              onSelectPool={handleAddLiquidity}
            />
          </TabsContent>

          <TabsContent value="positions" className="mt-6">
            <MyPositions
              positions={userPositions}
              formatValue={formatValue}
              onRemoveLiquidity={handleRemoveLiquidity}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      <AddLiquidityModal
        pool={selectedPool}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <RemoveLiquidityModal
        position={selectedPosition}
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
      />
    </PageLayout>
  );
};

export default Pools;
