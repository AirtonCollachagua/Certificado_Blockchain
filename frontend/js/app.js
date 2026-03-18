const POLYGON_RPC = "https://1rpc.io/matic";
const CONTRACT_ADDRESS = "0x0600b35d9987cfEeF9799d4e137ABdBaE223d708";

// Minimal ABI just to read verifyCertificate
const ABI = [
    "function verifyCertificate(bytes32 _hash) external view returns (bool)"
];

const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadText = document.getElementById('uploadText');
const verifyBtn = document.getElementById('verifyBtn');
const btnText = document.getElementById('btnText');
const spinner = document.getElementById('spinner');
const resultDiv = document.getElementById('result');
const rpcStatusDiv = document.getElementById('rpcStatus');

let selectedFile = null;
let rpcAvailable = false;
let provider = null;
let contract = null;

// Initialization: check node health
async function init() {
    try {
        if (typeof ethers === 'undefined') {
            throw new Error("Ethers.js library not loaded");
        }
        
        provider = new ethers.JsonRpcProvider(POLYGON_RPC);
        
        // Timeout mechanism to check RPC health
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('RPC Timeout')), 5000));
        await Promise.race([provider.getBlockNumber(), timeoutPromise]);

        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        rpcAvailable = true;
        rpcStatusDiv.innerHTML = "🟢 Conectado a Polygon Mainnet";
        rpcStatusDiv.style.color = "#10B981";
    } catch (error) {
        console.error("RPC Connection Error:", error);
        rpcAvailable = false;
        rpcStatusDiv.innerHTML = "🔴 Error de conexión con la red Blockchain (RPC caído o bloqueado). La validación no está disponible.";
        rpcStatusDiv.style.color = "#EF4444";
    }
}

// Event Listeners for file upload
fileInput.addEventListener('change', handleFile);
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFile();
    }
});

verifyBtn.addEventListener('click', verifyDocument);

function handleFile() {
    if (fileInput.files.length > 0) {
        selectedFile = fileInput.files[0];
        
        if (selectedFile.type !== "application/pdf") {
            showResult('Por favor, sube un archivo PDF válido.', 'error');
            verifyBtn.disabled = true;
            return;
        }

        uploadText.innerText = selectedFile.name;
        verifyBtn.disabled = false;
        hideResult();
    }
}

async function verifyDocument() {
    if (!selectedFile) return;

    if (!rpcAvailable) {
        showResult('No se puede verificar el certificado porque no hay conexión con la Blockchain en este momento.', 'warning');
        return;
    }

    setLoading(true);
    hideResult();

    try {
        // 1. Read the file into an ArrayBuffer
        const arrayBuffer = await selectedFile.arrayBuffer();
        
        // 2. Hash the file locally in the browser (SHA-256)
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const bytes32Hash = "0x" + hashHex;

        console.log("Calculated Hash:", bytes32Hash);

        // 3. Check the blockchain
        const isRegistered = await contract.verifyCertificate(bytes32Hash);

        if (isRegistered) {
            showResult('✅ Certificado Válido. El PDF original ha sido verificado criptográficamente en la Blockchain de Polygon.', 'success');
        } else {
            showResult('❌ Certificado Inválido. Este documento ha sido modificado, no es el original, o no fue emitido por nuestra institución.', 'error');
        }
    } catch (error) {
        console.error("Verification error:", error);
        // Important specific feedback: Handle potential RPC failures during verification elegantly
        showResult('⚠️ Ocurrió un error al contactar el Smart Contract de la Blockchain. Por favor, intenta de nuevo más tarde para descartar falsos negativos.', 'warning');
    } finally {
        setLoading(false);
    }
}

function showResult(message, type) {
    resultDiv.innerHTML = message;
    resultDiv.className = type;
    resultDiv.style.display = 'block';
}

function hideResult() {
    resultDiv.style.display = 'none';
}

function setLoading(isLoading) {
    if (isLoading) {
        btnText.style.display = 'none';
        spinner.style.display = 'inline-block';
        verifyBtn.disabled = true;
    } else {
        btnText.style.display = 'inline-block';
        spinner.style.display = 'none';
        verifyBtn.disabled = false;
    }
}

// Start
init();
