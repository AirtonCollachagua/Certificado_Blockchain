// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CertificateRegistry
 * @dev Registry for Moodle certificate hashes. Only the owner can add certificates.
 *      Only the hash is stored to comply with privacy regulations (e.g. GDPR).
 */
contract CertificateRegistry is Ownable {
    // Mapping from SHA-256 hash to a boolean indicating if it's registered
    mapping(bytes32 => bool) private certificates;

    // Event emitted when a new certificate hash is registered
    event CertificateRegistered(bytes32 indexed certificateHash, uint256 timestamp);

    /**
     * @dev Initialize the contract setting the deployer as the initial owner.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Registers a new certificate hash. Only the owner can call this.
     * @param _hash The SHA-256 hash of the certificate PDF.
     */
    function registerCertificate(bytes32 _hash) external onlyOwner {
        require(!certificates[_hash], "Certificate hash is already registered");
        certificates[_hash] = true;
        emit CertificateRegistered(_hash, block.timestamp);
    }

    /**
     * @dev Verifies if a certificate hash is registered.
     * @param _hash The SHA-256 hash to verify.
     * @return True if the certificate hash is registered, false otherwise.
     */
    function verifyCertificate(bytes32 _hash) external view returns (bool) {
        return certificates[_hash];
    }
}
