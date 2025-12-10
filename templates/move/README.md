# Move Contract Template

Simple starting point for Lumio Move contracts.

## Files

- `Move.toml.template` - Package configuration template
  - Replace `{{PROJECT_NAME}}` with your project name
  - Replace `{{DEPLOYER_ADDRESS}}` with your account address

- `sources/counter.move.template` - Example counter contract template
  - Replace `{{PROJECT_NAME}}` with your project name
  - Shows basic Move patterns
  - Includes entry functions, view functions, and tests

- `.gitignore` - Excludes build artifacts

## Usage by Agent

The agent should:

1. **Get deployer address first:**
   ```bash
   lumio account fund-with-faucet --amount 100000000
   lumio account list  # Get address
   ```

2. **Copy and process templates:**
   ```bash
   cp /openhands/templates/move/Move.toml.template contract/Move.toml
   cp /openhands/templates/move/sources/counter.move.template contract/sources/counter.move

   # Replace placeholders
   sed -i "s/{{PROJECT_NAME}}/my_project/g" contract/Move.toml
   sed -i "s/{{DEPLOYER_ADDRESS}}/0x123abc.../g" contract/Move.toml
   sed -i "s/{{PROJECT_NAME}}/my_project/g" contract/sources/*.move
   ```

3. **Or write custom contract:**
   - Copy Move.toml.template and update placeholders
   - Write your own .move file instead of using counter template
   - Use `lumio_framework` modules (NOT aptos_framework)

4. **Compile:**
   ```bash
   lumio move compile --package-dir contract/
   ```

5. **Test:**
   ```bash
   lumio move test --package-dir contract/
   ```

6. **Deploy:**
   ```bash
   lumio move publish --package-dir contract/ --assume-yes
   ```

## Key Differences from Aptos

- Use `lumio_framework` instead of `aptos_framework`
- Use `0x1::lumio_coin::LumioCoin` instead of `aptos_coin::AptosCoin`
- Use `0x1::lumio_account` instead of `aptos_account`

## Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{PROJECT_NAME}}` | Snake_case project name | `my_token`, `nft_marketplace` |
| `{{DEPLOYER_ADDRESS}}` | Account address from `lumio account list` | `0x5509970d628fdff6...` |
