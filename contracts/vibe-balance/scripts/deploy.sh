#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$CONTRACT_DIR")")"
FRONTEND_ENV_FILE="$PROJECT_ROOT/frontend/.env.sample"
SERVER_ENV_FILE="$PROJECT_ROOT/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

NETWORK="${LUMIO_NETWORK:-testnet}"

INITIAL_WHITELIST=(
    "0xac1f48e2c77b95f2646c37ff629dbd27fa1a1f0857f7260ddf59ed14a13063fb"
)

echo -e "${YELLOW}======== Vibe Balance Deployment (${NETWORK}) ========${NC}"

if ! command -v lumio &> /dev/null; then
    echo -e "${RED}Error: 'lumio' CLI not found${NC}"
    exit 1
fi

cd "$CONTRACT_DIR"

ACCOUNT_ADDRESS="0x$(grep 'account:' "$CONTRACT_DIR/.lumio/config.yaml" 2>/dev/null | awk '{print $2}')"

if [ -z "$ACCOUNT_ADDRESS" ] || [ "$ACCOUNT_ADDRESS" == "0x" ]; then
    echo -e "${RED}Error: Could not determine account address${NC}"
    exit 1
fi

echo -e "Account: ${GREEN}$ACCOUNT_ADDRESS${NC}"
echo -e "Network: ${GREEN}$NETWORK${NC}"

echo -e "\n${YELLOW}Building...${NC}"
lumio move compile --named-addresses vibe_balance=$ACCOUNT_ADDRESS

echo -e "\n${YELLOW}Testing...${NC}"
lumio move test --named-addresses vibe_balance=$ACCOUNT_ADDRESS

echo -e "\n${YELLOW}Publishing...${NC}"
lumio move publish --named-addresses vibe_balance=$ACCOUNT_ADDRESS --assume-yes

PACKAGE_ADDRESS=$ACCOUNT_ADDRESS

echo -e "\n${GREEN}======== Deployed ========${NC}"
echo -e "Address: ${GREEN}$PACKAGE_ADDRESS${NC}"
echo "$PACKAGE_ADDRESS" > "$CONTRACT_DIR/deployed_address_${NETWORK}.txt"

update_env_var() {
    local env_file=$1
    local var_name=$2
    local value=$3

    if [ -f "$env_file" ]; then
        if grep -q "^${var_name}=" "$env_file"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|^${var_name}=.*|${var_name}=\"${value}\"|" "$env_file"
            else
                sed -i "s|^${var_name}=.*|${var_name}=\"${value}\"|" "$env_file"
            fi
        else
            echo "${var_name}=\"${value}\"" >> "$env_file"
        fi
        echo -e "Updated ${env_file}: ${var_name}=\"${value}\""
    fi
}

# Determine RPC URL and Chain ID based on network
if [ "$NETWORK" == "mainnet" ]; then
    RPC_URL="https://api.lumio.io/"
    CHAIN_ID="1"
elif [ "$NETWORK" == "local" ]; then
    RPC_URL="http://127.0.0.1:8080/"
    CHAIN_ID="4"
else
    RPC_URL="https://api.testnet.lumio.io/"
    CHAIN_ID="2"
fi

# Update frontend env
update_env_var "$FRONTEND_ENV_FILE" "VITE_VIBE_BALANCE_CONTRACT" "$PACKAGE_ADDRESS"
update_env_var "$FRONTEND_ENV_FILE" "VITE_LUMIO_RPC_URL" "$RPC_URL"
update_env_var "$FRONTEND_ENV_FILE" "VITE_LUMIO_CHAIN_ID" "$CHAIN_ID"

# Update server env (create if not exists)
if [ ! -f "$SERVER_ENV_FILE" ]; then
    touch "$SERVER_ENV_FILE"
fi
update_env_var "$SERVER_ENV_FILE" "VIBE_BALANCE_CONTRACT" "$PACKAGE_ADDRESS"
update_env_var "$SERVER_ENV_FILE" "LUMIO_RPC_URL" "$RPC_URL"
update_env_var "$SERVER_ENV_FILE" "LUMIO_CHAIN_ID" "$CHAIN_ID"

if [[ "$1" == "--init" ]]; then
    echo -e "\n${YELLOW}Initializing...${NC}"
    lumio move run --function-id "${PACKAGE_ADDRESS}::vibe_balance::initialize" --assume-yes
    echo -e "${GREEN}Initialized!${NC}"

    if [ ${#INITIAL_WHITELIST[@]} -gt 0 ]; then
        echo -e "\n${YELLOW}Adding to whitelist...${NC}"
        for addr in "${INITIAL_WHITELIST[@]}"; do
            lumio move run \
                --function-id "${PACKAGE_ADDRESS}::vibe_balance::add_to_whitelist" \
                --args "address:$addr" \
                --assume-yes
            echo -e "  + $addr"
        done
        echo -e "${GREEN}Whitelist updated!${NC}"
    fi
fi

echo -e "\n${YELLOW}Contract: ${PACKAGE_ADDRESS}::vibe_balance${NC}"
