import os
from dotenv import load_dotenv
from web3 import Web3
from solcx import compile_standard, install_solc

load_dotenv()

def deploy():
    print("Installing solc 0.8.20...")
    install_solc("0.8.20")
    
    print("Compiling contract...")
    with open("./contracts/DocumentRegistry.sol", "r") as file:
        contract_source = file.read()

    compiled = compile_standard({
        "language": "Solidity",
        "sources": {"DocumentRegistry.sol": {"content": contract_source}},
        "settings": {"outputSelection": {"*": {"*": ["abi", "evm.bytecode"]}}}
    }, solc_version="0.8.20")

    bytecode = compiled["contracts"]["DocumentRegistry.sol"]["DocumentRegistry"]["evm"]["bytecode"]["object"]
    abi = compiled["contracts"]["DocumentRegistry.sol"]["DocumentRegistry"]["abi"]

    alchemy_url = os.getenv("ALCHEMY_RPC_URL")
    private_key = os.getenv("PRIVATE_KEY")
    
    if not alchemy_url or not private_key:
        print("Missing ALCHEMY_RPC_URL or PRIVATE_KEY in .env!")
        return

    w3 = Web3(Web3.HTTPProvider(alchemy_url))
    account = w3.eth.account.from_key(private_key)
    print(f"Deployer address: {account.address}")
    
    balance = w3.eth.get_balance(account.address)
    print(f"Deployer balance: {w3.from_wei(balance, 'ether')} ETH")
    if balance == 0:
        print("Error: Account has 0 Sepolia ETH. Please get some from a faucet before deploying.")
        return

    DocumentRegistry = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(account.address)

    base_fee = w3.eth.get_block("latest").baseFeePerGas
    if not base_fee:
        base_fee = w3.to_wei(10, 'gwei')
        
    max_priority_fee = w3.to_wei(2, 'gwei')
    max_fee = base_fee * 2 + max_priority_fee

    transaction = DocumentRegistry.constructor().build_transaction({
        "chainId": 11155111,
        "nonce": nonce,
        "maxFeePerGas": max_fee,
        "maxPriorityFeePerGas": max_priority_fee
    })

    signed_txn = w3.eth.account.sign_transaction(transaction, private_key=private_key)
    print("Deploying contract to Sepolia testnet...")

    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    print(f"Waiting for transaction {w3.to_hex(tx_hash)}...")

    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    contract_address = tx_receipt.contractAddress
    print(f"Contract deployed successfully at address: {contract_address}")

    # Update .env
    env_file = ".env"
    with open(env_file, "r") as f:
        lines = f.readlines()

    with open(env_file, "w") as f:
        for line in lines:
            if line.startswith("CONTRACT_ADDRESS="):
                f.write(f"CONTRACT_ADDRESS={contract_address}\n")
            else:
                f.write(line)
    
    print("Updated .env with the new CONTRACT_ADDRESS")

if __name__ == "__main__":
    deploy()
