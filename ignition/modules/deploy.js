import hre from "hardhat";

async function main() {
  const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy();

  await registry.waitForDeployment();

  console.log(`CertificateRegistry deployed to: ${await registry.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
