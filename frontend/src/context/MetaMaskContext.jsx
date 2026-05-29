import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserProvider, Interface } from 'ethers';

const MetaMaskContext = createContext();

const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7'; // 11155111
const SEPOLIA_CHAIN_ID_INT = 11155111n;
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x46C23CAD78Aa0d17aD2C5F11b1715831C79426a5';

export function MetaMaskProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [txState, setTxState] = useState({ status: 'idle', txHash: null, error: null });

  // Reset transaction state
  const resetTxState = () => {
    setTxState({ status: 'idle', txHash: null, error: null });
  };

  // Check if MetaMask is installed
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      setIsMetaMaskInstalled(true);
      checkConnection();

      // Listen for account changes
      const handleAccounts = (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        } else {
          setWalletAddress(null);
          setIsConnected(false);
        }
      };

      // Listen for network changes
      const handleChain = (chainId) => {
        // chainId is hex
        const isSepolia = parseInt(chainId, 16) === 11155111;
        setIsCorrectNetwork(isSepolia);
      };

      window.ethereum.on('accountsChanged', handleAccounts);
      window.ethereum.on('chainChanged', handleChain);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccounts);
          window.ethereum.removeListener('chainChanged', handleChain);
        }
      };
    } else {
      setIsMetaMaskInstalled(false);
    }
  }, []);

  const checkConnection = async () => {
    try {
      if (!window.ethereum) return;
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0].address);
        setIsConnected(true);
        const network = await provider.getNetwork();
        setIsCorrectNetwork(network.chainId === SEPOLIA_CHAIN_ID_INT);
      }
    } catch (err) {
      console.error("Error checking wallet connection status:", err);
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
      setIsCorrectNetwork(true);
      return true;
    } catch (switchError) {
      // 4902 indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID_HEX,
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'Sepolia Ether',
                  symbol: 'SepoliaETH',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          setIsCorrectNetwork(true);
          return true;
        } catch (addError) {
          console.error("Failed to add Sepolia network:", addError);
          return false;
        }
      }
      console.error("Failed to switch network:", switchError);
      return false;
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed! Please install MetaMask to use this feature.");
      return;
    }
    setIsConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        const network = await provider.getNetwork();
        
        if (network.chainId !== SEPOLIA_CHAIN_ID_INT) {
          await switchNetwork();
        } else {
          setIsCorrectNetwork(true);
        }
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const sendApprovalTransaction = async (docHash, docType) => {
    if (!window.ethereum) {
      const errorMsg = "MetaMask is not installed. Please install MetaMask browser extension.";
      setTxState({ status: 'rejected', txHash: null, error: errorMsg });
      throw new Error(errorMsg);
    }

    setTxState({ status: 'pending', txHash: null, error: null });

    try {
      // 1. Ensure connected
      let accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      }
      const activeAddress = accounts[0];

      // 2. Ensure Sepolia network
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      if (network.chainId !== SEPOLIA_CHAIN_ID_INT) {
        const switched = await switchNetwork();
        if (!switched) {
          const errorMsg = "Wrong network. Please switch to the Sepolia testnet to proceed.";
          setTxState({ status: 'rejected', txHash: null, error: errorMsg });
          throw new Error(errorMsg);
        }
      }

      // Reinitialize after potential network switch
      const cleanProvider = new BrowserProvider(window.ethereum);
      const signer = await cleanProvider.getSigner();

      // Format data as hex (must start with 0x)
      const dataHex = docHash.startsWith('0x') ? docHash : '0x' + docHash;

      // Encode function call to verifyDocument(bytes32 _hash) on DocumentRegistry
      const contractInterface = new Interface([
        "function verifyDocument(bytes32 _hash) public view returns (bool)"
      ]);
      const callData = contractInterface.encodeFunctionData("verifyDocument", [dataHex]);

      // Send a lightweight call transaction to the contract address.
      // This prevents the "External transactions to internal accounts cannot include data" error in MetaMask,
      // keeps the gas extremely cheap, uses a view function so it will never revert on-chain,
      // and triggers the MetaMask confirmation popup.
      const tx = await signer.sendTransaction({
        to: CONTRACT_ADDRESS,
        value: 0n,
        data: callData
      });

      setTxState({ status: 'pending', txHash: tx.hash, error: null });

      // Wait for transaction block verification
      await tx.wait();

      setTxState({ status: 'success', txHash: tx.hash, error: null });
      return tx.hash;
    } catch (err) {
      console.error("MetaMask transaction error:", err);
      let errorMsg = err.message || "Transaction failed.";
      let status = 'rejected';

      // Code 4001 means user rejected transaction request
      if (err.code === 4001 || (err.message && err.message.toLowerCase().includes("user rejected"))) {
        errorMsg = "User rejected the transaction approval request in MetaMask.";
        status = 'rejected';
      } else {
        errorMsg = `MetaMask Error: ${err.message || 'Unknown transaction failure'}`;
        status = 'rejected';
      }

      setTxState({ status, txHash: null, error: errorMsg });
      throw new Error(errorMsg);
    }
  };

  return (
    <MetaMaskContext.Provider value={{
      walletAddress,
      isConnected,
      isCorrectNetwork,
      isMetaMaskInstalled,
      isConnecting,
      txState,
      connectWallet,
      switchNetwork,
      sendApprovalTransaction,
      resetTxState
    }}>
      {children}
    </MetaMaskContext.Provider>
  );
}

export function useMetaMask() {
  const context = useContext(MetaMaskContext);
  if (!context) {
    throw new Error("useMetaMask must be used within a MetaMaskProvider");
  }
  return context;
}
