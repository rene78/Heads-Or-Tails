import HeadsOrTails from '../build/contracts/HeadsOrTails.json';

window.addEventListener('load', loadWeb3());
window.addEventListener('load', loadBlockchainData());

async function loadWeb3() {
  // Modern dapp browsers...
  if (window.ethereum) {
    window.web3 = new Web3(ethereum);
    try {
      // Request account access if needed
      await ethereum.enable();
      console.log("User has a MODERN dapp browser!");
      // Acccounts now exposed
      //web3.eth.sendTransaction({/* ... */});
    } catch (error) {
      console.log("User denied access!");
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
    window.web3 = new Web3(web3.currentProvider);
    console.log("User has a LEGACY dapp browser!");
    // Acccounts always exposed
    //web3.eth.sendTransaction({/* ... */});
  }
  // Non-dapp browsers...
  else {
    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }
}

async function loadBlockchainData() {
  // Load account
  // const web3 = window.web3; //Was used at demo dapp. Not sure why.
  const accounts = await web3.eth.getAccounts();
  let account=accounts[0];
  console.log(account);
  const networkId = await web3.eth.net.getId();
  console.log(networkId);
  const networkData = HeadsOrTails.networks[networkId];
  console.log(networkData);
  if (networkData) {
    console.log("HeadsOrTails contract is deployed to this network.");
    const headsOrTails = new web3.eth.Contract(HeadsOrTails.abi, networkData.address);
    console.log(headsOrTails);
    const productCount = await headsOrTails.methods.name().call();
    console.log(productCount);
  } else {
    window.alert('Marketplace contract not deployed to detected network.')
  }
}

function play() {
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
  console.log("Amount to bet: " + amountToBetEther);

  const amountToBetWei = window.web3.utils.toWei(amountToBetEther, 'Ether');
  console.log(amountToBetWei);
}