//import Web3 from "web3";//Bundle size of web3.js is huge (>1MB)! So once development is done only load the required modules, e.g. web3-eth
import HeadsOrTails from '../build/contracts/HeadsOrTails.json';

window.addEventListener('load', loadWeb3());
document.getElementById("play-btn").addEventListener("click", play);

//Global variables
let headsOrTails;
let account;

async function loadWeb3() {
  // Modern dapp browsers...
  if (window.ethereum) {
    window.web3 = new Web3(ethereum);
    try {
      // Request account access if needed
      await ethereum.enable();
      console.log("User has a MODERN dapp browser!");
      // Acccounts now exposed
      loadBlockchainData();
    } catch (error) {
      console.log("User denied access!");
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
    window.web3 = new Web3(web3.currentProvider);
    console.log("User has a LEGACY dapp browser!");
    loadBlockchainData();
    // Acccounts always exposed
    //web3.eth.sendTransaction({/* ... */});
  }
  // Non-dapp browsers...
  else {
    window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }
}

async function loadBlockchainData() {
  // Load account
  // const web3 = window.web3; //Was used at demo dapp. Not sure why.
  const networkId = await web3.eth.net.getId();
  console.log(networkId);
  const networkData = HeadsOrTails.networks[networkId];
  console.log(networkData);
  if (networkData) {
    console.log("HeadsOrTails contract is deployed to this network.");
    headsOrTails = new web3.eth.Contract(HeadsOrTails.abi, networkData.address);
    console.log(headsOrTails);
    //Load variable from contract (just a test)
    const dappName = await headsOrTails.methods.name().call();
    console.log(dappName);
    //Populate table of last played games & Display amount of ETH in jackpot
    getLatestGameData();
    getContractBalance();
    //Show contract address
    document.querySelector(".contract-address").innerText = networkData.address;
  } else {
    window.alert('Marketplace contract not deployed to detected network.')
  }
}

async function play() {
  //Find out which radio button is selected and how much money is bet.
  const radios = document.getElementsByName("ht-selector");
  const amountToBetEther = document.querySelector("#amount-to-bet").value;
  let headsOrTailsSelection;
  for (var i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      headsOrTailsSelection = i;
      break;
    }
  }
  console.log("0 or 1: " + headsOrTailsSelection);
  console.log("Amount to bet (ETH): " + amountToBetEther);

  const amountToBetWei = window.web3.utils.toWei(amountToBetEther, 'Ether');
  console.log("Amount to bet (Wei): " + amountToBetWei);
  const accounts = await web3.eth.getAccounts();
  account = accounts[0];
  console.log(account);
  await headsOrTails.methods.lottery(headsOrTailsSelection).send({ from: account, value: amountToBetWei });
  getLatestGameData();
  getContractBalance()
}

async function getContractBalance() {
  const currentBalance = await web3.eth.getBalance(headsOrTails._address);
  console.log("Contract balance (ETH): " + currentBalance / 1e18);
  document.querySelector(".eth-in-jackpot").innerText = currentBalance / 1e18;
}

async function getLatestGameData() {
  const gameCount = await headsOrTails.methods.getGameCount().call();
  // console.log(gameCount);
  //Purge table before populating
  document.querySelector("#table-body").innerHTML = "";
  //Populate table
  let t = document.querySelector('#productrow');
  let td = t.content.querySelectorAll("td");
  const maxEntriesToDisplay = 3;
  for (let i = gameCount - 1; i >= 0; i--) {
    const gameEntry = await headsOrTails.methods.getGameEntry(i).call();
    let result = gameEntry.winner ? "Won" : "Lost";
    //Shorten player address
    const addressShortened = gameEntry.addr.slice(0, 3) + "..." + gameEntry.addr.slice(-3);
    td[0].textContent = addressShortened;
    td[1].textContent = gameEntry.bet / 1e18 + " ETH";
    td[2].textContent = result;
    td[3].textContent = gameEntry.ethInJackpot / 1e18 + " ETH";

    let tb = document.querySelector("#table-body");
    let clone = document.importNode(t.content, true);
    tb.appendChild(clone);
    //Show only the last five games max
    // if (i <= gameCount - maxEntriesToDisplay) break;
  }
}