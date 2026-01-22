const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { Wallets, Gateway } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');

const channelName = envOrDefault('CHANNEL_NAME', 'mychannel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');
const mspId = envOrDefault('MSP_ID', 'Org1MSP');

// Path to crypto materials.
const cryptoPath = envOrDefault(
    'CRYPTO_PATH',
    path.resolve(
        __dirname,
        '..',
        'test-network',
        'organizations',
        'peerOrganizations',
        'org1.example.com'
    )
);

const app = express();
const port = 3001;
app.use(cors());

// 🔹 Arduino Serial Port Configuration
const arduinoPort = new SerialPort({
  path: 'COM6', // Update based on your system
  baudRate: 9600,
});

const parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));
let lastInsertionTime = 0;

let sensorData = {
  humidity: null,
  temperature: null,
  lightStatus: null,
  vibrationStatus: null,
  gps: { latitude: null, longitude: null },
};

// 🔹 MySQL Configuration
// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'coldchain',
// });

// 🔹 Handle Serial Port Errors
arduinoPort.on('error', (err) => console.error('Serial Port Error:', err.message));

// 🔹 Listen for Data from Arduino
parser.on('data', (data) => {
  try {
    //console.log(`Raw data from Arduino: ${data}`);
    const parsedData = data.trim().split(',');

    parsedData.forEach((item) => {
      const [key, value] = item.trim().split(':').map((str) => str.trim());

      if (key === 'Humidity') sensorData.humidity = parseInt(value);
      else if (key === 'Temperature') sensorData.temperature = parseInt(value);
      else if (key === 'LIGHT_ON' || key === 'LIGHT_OFF') sensorData.lightStatus = key;
      else if (key === 'VIBRATION_LOW' || key === 'VIBRATION_HIGH') sensorData.vibrationStatus = key;
      else if (key === 'GPS_LAT') sensorData.gps.latitude = parseFloat(value);
      else if (key === 'GPS_LON') sensorData.gps.longitude = parseFloat(value);
    });

    //console.log('Parsed Sensor Data:', sensorData);

   // storeToBlockchain(sensorData);

    const currentTime = new Date().getTime();
    if (currentTime - lastInsertionTime >= 30000) {
     // insertDataToDatabase();
      lastInsertionTime = currentTime;
    }
  } catch (err) {
    console.error('Error parsing serial data:', err.message);
  }
});

// 🔹 API Endpoint: Serve Sensor Data
app.get('/data', (req, res) => res.json(sensorData));

app.get('/report', (req, res) => {
  const sql = 'SELECT * FROM report';
  db.query(sql, (err, data) => (err ? res.json(err) : res.json(data)));
});

// 🔹 Blockchain Connection Utility
async function getBlockchainContract() {
  console.log("inside getBlockchaincontract");
  const walletPath = path.join(__dirname, 'wallet');
  const connectionProfilePath = path.join(__dirname, 'connection-profile.json');
  console.log("Loading connection profile...");
if (!fs.existsSync(connectionProfilePath)) {
    console.error('❌ Connection profile file not found at:', connectionProfilePath);
    process.exit(1);
}

let ccp;
try {
    ccp = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
    console.log("✅ Connection profile loaded successfully!");
} catch (error) {
    console.error("❌ Error parsing connection profile:", error);
    process.exit(1);
}

console.log("Loading wallet from:", walletPath);
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  console.log("Wallet loaded. Checking for identity 'user1'...");
  const gateway = new Gateway();
  const identity = await wallet.get('user1');
  if (!identity) {
    console.error("Identity 'user1' not found in wallet.");
    process.exit(1);
}
console.log("Identity 'user1' found. Attempting to connect to gateway...");
  await gateway.connect(ccp, {
    wallet,
    identity: 'user1',
    discovery: { enabled: true, asLocalhost: false },
  });
console.log("gateway connected");
  const network = await gateway.getNetwork('mychannel'); 
  return { gateway, contract: network.getContract('basic') }; 
}

// 🔹 Store Sensor Data on Blockchain
async function storeToBlockchain(sensorData) {
  try {
    console.log("inside storeToBlockchain");
    const { gateway, contract } = await getBlockchainContract();
    await contract.submitTransaction('storeSensorData', JSON.stringify(sensorData));
    console.log('✅ Data stored on blockchain!');
    await gateway.disconnect();
  } catch (error) {
    console.error('❌ Blockchain Storage Error:', error);
  }
}

// 🔹 Retrieve Sensor Data from Blockchain
async function retrieveFromBlockchain(sensorId) {
  try {
    const { gateway, contract } = await getBlockchainContract();
    const result = await contract.evaluateTransaction('retrieveSensorData', sensorId);
    await gateway.disconnect();
    return JSON.parse(result.toString());
  } catch (error) {
    console.error('❌ Blockchain Retrieval Error:', error);
    return null;
  }
}

// 🔹 API: Retrieve Blockchain Data
app.get('/retrieveData/:sensorId', async (req, res) => {
  const data = await retrieveFromBlockchain(req.params.sensorId);
  data ? res.status(200).json(data) : res.status(404).json({ message: 'Sensor data not found' });
});


const keyDirectoryPath = envOrDefault(
  'KEY_DIRECTORY_PATH',
  path.resolve(
      cryptoPath,
      'users',
      'User1@org1.example.com',
      'msp',
      'keystore'
  )
);

// Path to user certificate directory.
const certDirectoryPath = envOrDefault(
  'CERT_DIRECTORY_PATH',
  path.resolve(
      cryptoPath,
      'users',
      'User1@org1.example.com',
      'msp',
      'signcerts'
  )
);

// Path to peer tls certificate.
const tlsCertPath = envOrDefault(
  'TLS_CERT_PATH',
  path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt')
);

// Gateway peer endpoint.
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');

// Gateway peer SSL host name override.
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org1.example.com');

const utf8Decoder = new TextDecoder();
const assetId = `asset${String(Date.now())}`;

async function main() {
  displayInputParameters();

  // The gRPC client connection should be shared by all Gateway connections to this endpoint.
  const client = await newGrpcConnection();

  const gateway = connect({
      client,
      identity: await newIdentity(),
      signer: await newSigner(),
      hash: hash.sha256,
      // Default timeouts for different gRPC calls
      evaluateOptions: () => {
          return { deadline: Date.now() + 5000 }; // 5 seconds
      },
      endorseOptions: () => {
          return { deadline: Date.now() + 15000 }; // 15 seconds
      },
      submitOptions: () => {
          return { deadline: Date.now() + 5000 }; // 5 seconds
      },
      commitStatusOptions: () => {
          return { deadline: Date.now() + 60000 }; // 1 minute
      },
  });

  try {
      // Get a network instance representing the channel where the smart contract is deployed.
      const network = gateway.getNetwork(channelName);

      // Get the smart contract from the network.
      const contract = network.getContract(chaincodeName);

      // Initialize a set of asset data on the ledger using the chaincode 'InitLedger' function.
      await initLedger(contract);
      await storeSensorData(contract);

  } finally {
      gateway.close();
      client.close();
  }
}

main().catch((error) => {
  console.error('******** FAILED to run the application:', error);
  process.exitCode = 1;
});

async function newGrpcConnection() {
  console.log(tlsCertPath);
  const tlsRootCert = await fs.readFile(tlsCertPath);
  const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
  return new grpc.Client(peerEndpoint, tlsCredentials, {
      'grpc.ssl_target_name_override': peerHostAlias,
  });
}

async function newIdentity() {
  const certPath = await getFirstDirFileName(certDirectoryPath);
  const credentials = await fs.readFile(certPath);
  return { mspId, credentials };
}

async function getFirstDirFileName(dirPath) {
  const files = await fs.readdir(dirPath);
  const file = files[0];
  if (!file) {
      throw new Error(`No files in directory: ${dirPath}`);
  }
  return path.join(dirPath, file);
}

async function newSigner() {
  const keyPath = await getFirstDirFileName(keyDirectoryPath);
  const privateKeyPem = await fs.readFile(keyPath);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return signers.newPrivateKeySigner(privateKey);
}

/**
* This type of transaction would typically only be run once by an application the first time it was started after its
* initial deployment. A new version of the chaincode deployed later would likely not need to run an "init" function.
*/
async function initLedger(contract) {
  console.log(
      '\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger'
  );

  await contract.submitTransaction('InitLedger');

  console.log('*** Transaction committed successfully');
}

async function storeSensorData(contract) {
  console.log('\n--> Submit Transaction: StoreSensorData, function creates the initial set of sensor data on the ledger'
  );
  await contract.submitTransaction(
   'StoreSensorData',
   'sensor1',
    '9.5',
    '90.2',
     'Warehouse-A',
    '400',
     '0.6',
    '2025-03-25T12:34:56Z'
  )
  console.log('✅ Sensor data successfully stored on the blockchain');
}



/**
* envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
*/
function envOrDefault(key, defaultValue) {
  return process.env[key] || defaultValue;
}

/**
* displayInputParameters() will print the global scope parameters used by the main driver routine.
*/
function displayInputParameters() {
  console.log(`channelName:       ${channelName}`);
  console.log(`chaincodeName:     ${chaincodeName}`);
  console.log(`mspId:             ${mspId}`);
  console.log(`cryptoPath:        ${cryptoPath}`);
  console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
  console.log(`certDirectoryPath: ${certDirectoryPath}`);
  console.log(`tlsCertPath:       ${tlsCertPath}`);
  console.log(`peerEndpoint:      ${peerEndpoint}`);
  console.log(`peerHostAlias:     ${peerHostAlias}`);
}
// 🔹 Start Express Server
//app.listen(port, () => console.log(`🚀 Server running at http://localhost:${port}`));
