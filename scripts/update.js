const { CoreSDK, getDefaultConfig } = require("@bosonprotocol/core-sdk");
const { EthersAdapter } = require("@bosonprotocol/ethers-sdk");
const fs = require("fs");
const ethers = require("ethers");

const getEnv = (envName) => { 
  return {
    whitelist: `./bosonApp.io/${envName}/sellers/whitelist.json`,
    blacklist: `./bosonApp.io/${envName}/sellers/blacklist.json`
  }
}

// const envs = ["testing", "staging", "production"];
const envs = ["testing"];

function readWhitelist(file) {
  if (fs.existsSync(file)) {
    const rawData = fs.readFileSync(file);
    return JSON.parse(rawData.toString());
  }
  return {
    sellers: [],
    maxId: 0
  };
}

function writeWhitelist(file, whitelist) {
  fs.writeFileSync(file, JSON.stringify(whitelist, undefined, 2));
}

function readBlacklist(envName) {
  const file = getEnv(envName).blacklist;
  let blacklist = [];
  if (fs.existsSync(file)) {
    const rawData = fs.readFileSync(file);
    blacklist = JSON.parse(rawData.toString());
  } else {
    fs.writeFileSync(file, JSON.stringify(blacklist, undefined, 2))
  }
  blacklist = blacklist.map(id => parseInt(id));
  return blacklist;
}

function updateWhitelist(allSellerIds, envName, blacklist = []) {
  // read the file
  const whitelist = readWhitelist(getEnv(envName).whitelist);
  console.log(envName, "Previous whitelist", whitelist);
  console.log(envName, "Current blacklist", blacklist);
  // replace seller list with all existing sellers that are not in blacklist
  const newSellers = allSellerIds.filter(id => !blacklist.includes(id)).sort();
  whitelist.sellers = newSellers;
  // update maxId
  const newSellerMaxId = Math.max(...allSellerIds);
  whitelist.maxId = newSellerMaxId;
  console.log(envName, "New whitelist", whitelist);
  // write the file
  writeWhitelist(getEnv(envName).whitelist, whitelist);
}

function updateWhitelist_2(allSellerIds, envName, blacklist = []) {
  // read the file
  const whitelist = readWhitelist(getEnv(envName).whitelist);
  const oldMaxId = whitelist.maxId;
  // remove sellers with ID >= oldMaxId and those in blacklist
  whitelist.sellers = whitelist.sellers.filter(id => id <= oldMaxId).filter(id => !blacklist.includes(id)).sort();
  console.log(envName, "Previous whitelist", whitelist);
  console.log(envName, "Current blacklist", blacklist);
  // add only sellers with ID > oldMaxId and not in blacklist
  const newSellers = allSellerIds.filter(id => id > oldMaxId).filter(id => !blacklist.includes(id)).sort();
  whitelist.sellers.push(...newSellers);
  console.log(envName, "Adding sellers", newSellers);
  // update maxId
  const newSellerMaxId = Math.max(...allSellerIds);
  whitelist.maxId = newSellerMaxId;
  console.log(envName, "New whitelist", whitelist);
  // write the file
  writeWhitelist(getEnv(envName).whitelist, whitelist);
}

async function parseEnv(envName) {
  const defaultConfig = getDefaultConfig(envName);
  const coreSDK = CoreSDK.fromDefaultConfig({
    web3Lib: new EthersAdapter(
      new ethers.providers.JsonRpcProvider(defaultConfig.jsonRpcUrl)
    ),
    envName
  });
  const allSellers = await coreSDK.getSellers();
  const allSellerIds = allSellers.map((seller) => parseInt(seller.id));
  const blacklist = readBlacklist(envName);
  updateWhitelist(allSellerIds, envName, blacklist);
}

async function main() {
  for (const envName of envs) {
    await parseEnv(envName);
  }
}

main()
  .then(() => {
    console.log("success");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
