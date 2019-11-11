// const ethers = require('ethers');

// The Contract interface
const abi = [
  "event GameResult(bool won)",
  "function lottery(uint8 guess) returns (bool value)",
  "function getGameCount() view returns (uint8 value)",
  "function getGameEntry(uint index) public view returns(address addr, uint amountBet, uint8 guess, bool winner, uint ethInJackpot)"
];

//Global variables
let headsOrTails;
let account;
let ethUsd;
const deployedNetwork = 5777;//To which network is the contract deployed? Ganache: 5777, Ropsten: 3, Mainnet: 1
// const contractAddress = "0x7f8b9483b79f735C34820497A1a7f9FB82C9224b";//Contract address on Ropsten
const contractAddress = "7855c451eE02CA17B4e2C08B628D5445FbF3dc6b";//Contract address on Ganache
let provider;
let signer;

window.addEventListener('load', loadWeb3());
window.addEventListener('load', getEthFiatRate());
document.getElementById("form").addEventListener("submit", (event) => {
  event.preventDefault();
  play();
});
document.getElementById("amount-to-bet").addEventListener("input", calcFiat); //Calculate value in USD during input

async function loadWeb3() {
  // Connect to the network
  // Modern dapp browsers...
  if (window.ethereum) {
    try {
      // Request account access if needed
      await ethereum.enable();//If this doesn't work an error is thrown
      console.log("User has a MODERN dapp browser!");
      provider = new ethers.providers.Web3Provider(ethereum);

      // Acccounts now exposed. Load the contract!
      loadBlockchainData();
    } catch (error) {
      console.log("There was and error: ", error.message);
    }
  }
  // Legacy dapp browsers (acccounts always exposed)...
  else if (window.web3) {
    provider = new ethers.providers.Web3Provider(web3.currentProvider);
    console.log("User has a LEGACY dapp browser!");
    loadBlockchainData();
  }
  // Non-dapp browsers...
  else {
    //Load blockchain data (jackpot, last games) via Infura
    window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }
}

async function loadBlockchainData() {
  //First check if contract is deployed to the network
  let activeNetwork = await provider.getNetwork(provider);
  // console.log(activeNetwork);

  if (activeNetwork.chainId === deployedNetwork) {
    // We connect to the Contract using a signer, so we have read and write access
    signer = provider.getSigner();
    headsOrTails = new ethers.Contract(contractAddress, abi, signer);
    console.log(headsOrTails);

    //Populate table of last played games & Display amount of ETH in jackpot
    getLatestGameData();
    getContractBalance();
    //Show contract address
    document.querySelector(".contract-address").innerHTML = '<a href="https://ropsten.etherscan.io/address/' + contractAddress + '">' + contractAddress + '</a>';
  } else window.alert("Contract not deployed to selected network");
}

async function play() {
  //Find out which radio button is selected and how much money is bet.
  const amountToBetEther = document.querySelector("#amount-to-bet").value;
  const headsOrTailsSelection = document.querySelector(":checked").value;

  console.log("0 or 1: " + headsOrTailsSelection);
  console.log("Amount to bet (ETH): " + amountToBetEther);

  const amountToBetWei = ethers.utils.parseEther(amountToBetEther);
  // console.log(amountToBetWei);
  console.log("Amount to bet (Wei): " + amountToBetWei);
  //Reload contract variable in case user has changed account in Metamask after page load.
  headsOrTails = new ethers.Contract(contractAddress, abi, provider.getSigner());

  //Define some custom settings when initiating the contract function
  let overrides = {
    // The maximum units of gas for the transaction to use
    // gasLimit: 23000,

    // The price (in wei) per unit of gas
    // gasPrice: utils.parseUnits('9.0', 'gwei'),

    // The amount to send with the transaction (i.e. msg.value)
    value: amountToBetWei
  };

  try {
    toggleBlur();
    let tx = await headsOrTails.lottery(headsOrTailsSelection, overrides);//In case of failure it jumps straight to catch()
    console.log(tx.hash);
    logEvent();
    toggleBlur();
    getLatestGameData();
    getContractBalance();
  } catch (err) {
    console.log(err.message); // Error message in case user denied access
    toggleBlur();
  }
}

//Listen for an event. After receipt stop listening.
function logEvent() {
  headsOrTails.once("GameResult", (won, event) => {
    window.alert(won);
    console.log(`Last game won? ${won}`);
    // console.log(event);
  });
}

async function getContractBalance() {
  const currentBalanceWei = await provider.getBalance(contractAddress);
  const currentBalanceEth = ethers.utils.formatEther(currentBalanceWei);
  console.log("Contract balance (ETH): " + currentBalanceEth);
  document.querySelector(".eth-in-jackpot").innerHTML = currentBalanceEth + " ETH (~" + (currentBalanceEth * ethUsd).toFixed(2) + "$)";

  //Set the max bet value to contract balance (i.e money in jackpot)
  document.querySelector("#amount-to-bet").max = currentBalanceEth;
}

async function getLatestGameData() {
  const gameCount = await headsOrTails.getGameCount();
  // console.log(gameCount);

  //Purge table before populating
  document.querySelector("#table-body").innerHTML = "";
  //Populate table
  let t = document.querySelector('#productrow');
  let td = t.content.querySelectorAll("td");
  const maxEntriesToDisplay = 3;
  for (let i = gameCount - 1; i >= 0; i--) {
    const gameEntry = await headsOrTails.getGameEntry(i);
    let result = gameEntry.winner ? "Won" : "Lost";
    let guess = gameEntry.guess == 0 ? "Heads" : "Tails";
    //Shorten player address
    const addressShortened = gameEntry.addr.slice(0, 3) + "..." + gameEntry.addr.slice(-3);
    td[0].textContent = addressShortened;
    td[1].textContent = ethers.utils.formatEther(gameEntry.amountBet) + " ETH";
    td[2].textContent = guess;
    td[3].textContent = result;
    td[4].textContent = ethers.utils.formatEther(gameEntry.ethInJackpot) + " ETH";

    let tb = document.querySelector("#table-body");
    let clone = document.importNode(t.content, true);
    tb.appendChild(clone);
    //Show only the last five games max
    // if (i <= gameCount - maxEntriesToDisplay) break;
  }
}

async function getEthFiatRate() {
  const url = "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR";
  fetch(url)
    .then(handleErrors)
    .then(res => {
      return res.json();
    })
    .then(data => {
      console.log(data.USD);
      ethUsd = data.USD;
      // return (data.EUR);
    })
    .catch(error => console.error(error));
}

//Handle errors from fetch operation
function handleErrors(response) {
  //console.log(response);
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return response;
}

function calcFiat() {
  const amountToBetEther = document.querySelector("#amount-to-bet").value;
  const betInDollar = document.querySelector("#bet-in-dollar");
  // console.log(amountToBetEther);
  // console.log(ethUsd);
  betInDollar.innerText = (amountToBetEther * ethUsd).toFixed(2);
}

// Temporary stuff
// Blur button
document.querySelector(".blur").addEventListener("click", toggleBlur);
function toggleBlur() {
  // let blur = document.querySelector(".wait");
  document.body.classList.toggle("wait");
}

// Load previous games
document.querySelector(".load-data").addEventListener("click", getWei);

async function getWei() {
  const amountToBetEther = document.querySelector("#amount-to-bet").value;
  const amountToBetWei = ethers.utils.parseEther(amountToBetEther);
  console.log("Wei:", amountToBetWei);
}