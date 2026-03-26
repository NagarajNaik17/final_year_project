from web3 import Web3
try:
    from web3.middleware import geth_poa_middleware
except ImportError:
    from web3.middleware import ExtraDataToPOAMiddleware as geth_poa_middleware
from eth_account import Account
import os

ALCHEMY_RPC_URL = os.getenv("ALCHEMY_RPC_URL", "")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")

# We need a minimal ABI to interact with the contract
MINIMAL_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "_hash", "type": "bytes32"},
            {"internalType": "string", "name": "_docType", "type": "string"},
            {"internalType": "address", "name": "_owner", "type": "address"}
        ],
        "name": "addDocument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "_hash", "type": "bytes32"}],
        "name": "verifyDocument",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "_hash", "type": "bytes32"}],
        "name": "getDocument",
        "outputs": [
            {"internalType": "string", "name": "docType", "type": "string"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"internalType": "address", "name": "owner", "type": "address"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

w3 = Web3(Web3.HTTPProvider(ALCHEMY_RPC_URL))
# Inject middleware for PoA chains like Sepolia
if w3.is_connected():
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

def get_contract():
    if not w3.is_connected() or not CONTRACT_ADDRESS:
        return None
    return w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=MINIMAL_ABI)

def check_document_exists_on_blockchain(doc_hash: str) -> bool:
    """Check if the document hash exists on the blockchain."""
    contract = get_contract()
    if not contract:
        return False
        
    try:
        # Convert hex string hash to bytes32 format
        bytes32_hash = Web3.to_bytes(hexstr=doc_hash) if doc_hash.startswith('0x') else Web3.to_bytes(hexstr='0x' + doc_hash)
        exists = contract.functions.verifyDocument(bytes32_hash).call()
        return exists
    except Exception as e:
        print(f"Error checking blockchain: {e}")
        return False

def get_document_details_from_blockchain(doc_hash: str) -> dict:
    """Gets document metadata directly from the smart contract if it exists."""
    contract = get_contract()
    if not contract:
        return None
        
    try:
        bytes32_hash = Web3.to_bytes(hexstr=doc_hash) if doc_hash.startswith('0x') else Web3.to_bytes(hexstr='0x' + doc_hash)
        if contract.functions.verifyDocument(bytes32_hash).call():
            docType, timestamp, owner = contract.functions.getDocument(bytes32_hash).call()
            return {"docType": docType, "timestamp": timestamp, "owner": owner}
        return None
    except Exception as e:
        print(f"Error fetching document details: {e}")
        return None

def store_document_hash_on_blockchain(doc_hash: str, doc_type: str, owner_address: str = None) -> str:
    """Store the document hash on chain and return transaction hash."""
    contract = get_contract()
    if not contract or not PRIVATE_KEY:
        return f"mock_tx_hash_{doc_hash[:10]}"
        
    try:
        account = Account.from_key(PRIVATE_KEY)
        default_owner = owner_address if owner_address and w3.is_address(owner_address) else account.address
        
        # Convert hex string hash to bytes32
        bytes32_hash = Web3.to_bytes(hexstr=doc_hash) if doc_hash.startswith('0x') else Web3.to_bytes(hexstr='0x' + doc_hash)
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(account.address)
        
        # We need to estimate gas, or provide a default for Sepolia
        txn = contract.functions.addDocument(bytes32_hash, doc_type, default_owner).build_transaction({
            'chainId': 11155111, # Sepolia chain ID
            'gas': 2000000,
            'maxFeePerGas': w3.to_wei('2', 'gwei'),
            'maxPriorityFeePerGas': w3.to_wei('1', 'gwei'),
            'nonce': nonce,
        })
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(txn, private_key=PRIVATE_KEY)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        
        # Return transaction hash (hex)
        return w3.to_hex(tx_hash)
        
    except Exception as e:
        print(f"Error storing on blockchain: {e}")
        return f"mock_tx_hash_{doc_hash[:10]}"
