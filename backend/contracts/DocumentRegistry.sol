// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentRegistry {
    struct Document {
        bytes32 docHash;
        string docType;
        uint256 timestamp;
        address owner;
    }
    
    mapping(bytes32 => Document) public documents;
    
    event DocumentAdded(bytes32 indexed docHash, string docType, uint256 timestamp, address indexed owner);
    
    // Check if the document hash already exists in the mapping
    function addDocument(bytes32 _hash, string memory _docType, address _owner) public {
        require(documents[_hash].timestamp == 0, "Document hash already exists");
        documents[_hash] = Document({
            docHash: _hash,
            docType: _docType,
            timestamp: block.timestamp,
            owner: _owner
        });
        emit DocumentAdded(_hash, _docType, block.timestamp, _owner);
    }
    
    function verifyDocument(bytes32 _hash) public view returns (bool) {
        return documents[_hash].timestamp != 0;
    }
    
    function getDocument(bytes32 _hash) public view returns (string memory, uint256, address) {
        require(documents[_hash].timestamp != 0, "Document not found");
        Document memory doc = documents[_hash];
        return (doc.docType, doc.timestamp, doc.owner);
    }
}
