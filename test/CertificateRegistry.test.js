import { expect } from "chai";
import hre from "hardhat";

describe("CertificateRegistry", function () {
  let CertificateRegistry, registry;
  let owner, addr1;

  beforeEach(async function () {
    CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
    [owner, addr1] = await hre.ethers.getSigners();
    registry = await CertificateRegistry.deploy();
  });

  describe("Registration", function () {
    it("Should allow the owner to register a valid certificate hash", async function () {
      const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("certificate_data"));
      
      await expect(registry.registerCertificate(hash))
        .to.emit(registry, "CertificateRegistered")
        .withArgs(hash, (timestamp) => {
          return timestamp > 0n;
        });

      expect(await registry.verifyCertificate(hash)).to.be.true;
    });

    it("Should not allow non-owners to register a certificate", async function () {
      const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("certificate_data_2"));
      
      await expect(
        registry.connect(addr1).registerCertificate(hash)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("Should prevent registering the same hash twice", async function () {
      const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("certificate_data_3"));
      await registry.registerCertificate(hash);
      
      await expect(registry.registerCertificate(hash))
        .to.be.revertedWith("Certificate hash is already registered");
    });
  });

  describe("Verification", function () {
    it("Should return false for unregistered hashes", async function () {
      const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("unregistered_data"));
      expect(await registry.verifyCertificate(hash)).to.be.false;
    });
  });
});
