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
let ethUsd;
const deployedNetwork = 3;//To which network is the contract deployed? Ganache: 5777, Ropsten: 3, Mainnet: 1
const contractAddress = "0x7f8b9483b79f735C34820497A1a7f9FB82C9224b";//Contract address on Ropsten
// const contractAddress = "7855c451eE02CA17B4e2C08B628D5445FbF3dc6b";//Contract address on Ganache
let provider;
let signer;
let swissFranc;

window.addEventListener('load', () => {
  // swissFranc = three(); //initialize coin
  setTimeout(() => swissFranc = three(), 1000); ////initialize coin 1sec after load
  setTimeout(() => swissFranc.stopAnimation("heads"), 2000); //stop initial coin animation after 1sec
  loadWeb3(); //load all relevant infos in order to interact with Ethereum
  getEthFiatRate() //Get current ETH-fiat exchange rate from Cryptocompare
});

//Launch play() when user clicks on play button
document.getElementById("form").addEventListener("submit", (event) => {
  event.preventDefault();
  //Find out which radio button is selected and how much money is bet.
  const amountToBetEther = document.querySelector("#amount-to-bet").value;
  const headsOrTailsSelection = document.querySelector(":checked").value;
  // console.log("0 or 1: " + headsOrTailsSelection);
  // console.log("Amount to bet (ETH): " + amountToBetEther);
  play(headsOrTailsSelection, amountToBetEther);
});
//Calculate fiat value during input of bet amount and show on page
document.getElementById("amount-to-bet").addEventListener("input", () => {
  const amountToBetEther = document.querySelector("#amount-to-bet").value;
  // console.log(amountToBetEther);
  document.querySelector("#bet-in-dollar").innerText = calcFiat(amountToBetEther);
  document.querySelector("#bet-in-eth2").innerText = amountToBetEther * 2;
  document.querySelector("#bet-in-dollar2").innerText = calcFiat(amountToBetEther) * 2;
});

async function loadWeb3() {
  // Connect to the network
  // Modern dapp browsers...
  if (window.ethereum) {
    try {
      // Request account access if needed
      await ethereum.enable();//If this doesn't work an error is thrown
      console.log("User has a MODERN dapp browser!");
      provider = new ethers.providers.Web3Provider(ethereum);
      // console.log(provider);

      // Acccounts now exposed. Load the contract!
      loadBlockchainData();
    } catch (error) {
      console.log("There was and error: ", error.message);//In case user denied access
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
    //Load blockchain and contract data (jackpot, last games) via ethers default provider (Infura, Etherscan)
    window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
    provider = ethers.getDefaultProvider('ropsten');
    // console.log(provider);
    loadBlockchainData();
  }
}

async function loadBlockchainData() {
  //First check if contract is deployed to the network
  let activeNetwork = await provider.getNetwork(provider);
  // console.log(activeNetwork);

  if (activeNetwork.chainId === deployedNetwork) {
    //When connected via Metamask (i.e. "provider.connection" defined) define a signer (for read-write accesss),
    //else (i.e. non-ethereum browser) use provider (read access only)
    if (provider.connection) signer = provider.getSigner(); else signer = provider;

    headsOrTails = new ethers.Contract(contractAddress, abi, signer);
    console.log(headsOrTails);

    //Populate table of last played games & Display amount of ETH in jackpot
    getLatestGameData();
    getContractBalance();
    //Show contract address
    document.querySelector(".contract-address").innerHTML = '<a href="https://ropsten.etherscan.io/address/' + contractAddress + '">' + contractAddress + '</a>';
  } else window.alert("Contract not deployed to selected network");
}

async function play(headsOrTailsSelection, amountToBetEther) {
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
  } catch (err) {
    console.log(err.message); // Error message in case user rejected transfer
    toggleBlur();
  }
}

//Listen for an event. After receipt stop listening.
function logEvent() {
  headsOrTails.once("GameResult", (won, event) => {
    const msg = won ? "You won!" : "You lost!";
    window.alert(msg);
    toggleBlur();
    getLatestGameData();
    getContractBalance();
    // console.log(event);
  });
}

async function getContractBalance() {
  const currentBalanceWei = await provider.getBalance(contractAddress);
  const currentBalanceEth = ethers.utils.formatEther(currentBalanceWei);
  console.log("Contract balance (ETH): " + currentBalanceEth);
  document.querySelector(".eth-in-jackpot").innerHTML = currentBalanceEth + " ETH (~" + (calcFiat(currentBalanceEth)) + "$)";

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
  const maxEntriesToDisplay = 5;
  for (let i = gameCount - 1; i >= 0; i--) {
    const gameEntry = await headsOrTails.getGameEntry(i);
    let result = gameEntry.winner ? "Won" : "Lost";
    let resultClass = gameEntry.winner ? "won" : "lost";//define class to color text red or green
    // console.log(resultClass);
    let guess = gameEntry.guess == 0 ? "Heads" : "Tails";
    //Shorten player address
    const addressShortened = gameEntry.addr.slice(0, 3) + "..." + gameEntry.addr.slice(-3);
    td[0].textContent = addressShortened;
    td[1].textContent = ethers.utils.formatEther(gameEntry.amountBet);
    td[2].textContent = guess;
    td[3].textContent = result;
    td[3].className = "";//remove old class first
    td[3].classList.add(resultClass);
    td[4].textContent = ethers.utils.formatEther(gameEntry.ethInJackpot);

    let tb = document.querySelector("#table-body");
    let clone = document.importNode(t.content, true);
    tb.appendChild(clone);
    //Show only the last five games max
    if (i <= gameCount - maxEntriesToDisplay) break;
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

function calcFiat(etherToConvert) {
  // console.log(etherToConvert);
  // console.log(ethUsd);
  return (etherToConvert * ethUsd).toFixed(2);
}

function three() {
  let scene, camera, renderer, coin, id, angleToVertical;
  initializeScene();

  // Adding ambient lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  // Left point light
  const pointLightLeft = new THREE.PointLight(0xff4422, 1);
  pointLightLeft.position.set(-1, -1, 3);
  scene.add(pointLightLeft);

  // Right point light
  const pointLightRight = new THREE.PointLight(0x44ff88, 1);
  pointLightRight.position.set(1, 2, 3);
  scene.add(pointLightRight);

  // Top point light
  const pointLightTop = new THREE.PointLight(0xdd3311, 1);
  pointLightTop.position.set(0, 3, 2);
  scene.add(pointLightTop);

  THREE.ImageUtils.crossOrigin = '';
  const textureCirc = new THREE.TextureLoader().load("img/circumference.jpg");
  textureCirc.wrapS = THREE.RepeatWrapping;//repeat texture horizontally
  textureCirc.repeat.set(20, 0);//repeat 20x
  const textureHeads = new THREE.TextureLoader().load("img/heads.jpg");
  const textureTails = new THREE.TextureLoader().load("img/tails.jpg");
  const metalness = 0.7;
  const roughness = 0.3;

  const materials = [
    new THREE.MeshStandardMaterial({
      //Circumference
      map: textureCirc,
      metalness: metalness,
      roughness: roughness
    }),
    //1st side
    new THREE.MeshStandardMaterial({
      map: textureHeads,
      metalness: metalness,
      roughness: roughness
    }),
    //2nd side
    new THREE.MeshStandardMaterial({
      map: textureTails,
      metalness: metalness,
      roughness: roughness
    })
  ];

  var geometry = new THREE.CylinderGeometry(3, 3, 0.4, 100);
  coin = new THREE.Mesh(geometry, materials);

  scene.add(coin);
  camera.position.set(0, 0, 7);

  coin.rotation.x = Math.PI / 2;
  coin.rotation.y = Math.PI / 2;

  animateCoin();

  //Update canvas on container size change. Thanks to gman (https://stackoverflow.com/a/45046955/5263954)!
  function resizeCanvasToDisplaySize() {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      console.log("Container size of coin animation has changed (w: " + width + ", height: " + height + "). Canvas size updated!");
      // you must pass false here or three.js sadly fights the browser
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      // set render target sizes here
    }
  }

  function animateCoin(time) {
    time *= 0.001;  // seconds, not used
    // console.log(time);

    resizeCanvasToDisplaySize();

    coin.rotation.x += 0.05;

    renderer.render(scene, camera);
    id = requestAnimationFrame(animateCoin);
  }

  function initializeScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, 1, 1, 10);
    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector(".result-coin canvas") });
    scene.background = new THREE.Color(0x000000);
  }

  function stopAnimation(side) {
    //on first run of function "side" is a string ("heads" or "tails"). On subsequent runs it is a timestamp (number)
    if (typeof side === "string") {
      // console.log(side);
      angleToVertical = (side === "tails") ? (3 * Math.PI / 2) : (Math.PI / 2);//tails=1.5pi, heads=pi/2
      // console.log(angleToVertical);
    }

    let rotVal = coin.rotation.x;

    // console.log(rotVal);
    let deltaAngle = rotVal % (Math.PI * 2) - angleToVertical;
    // console.log(deltaAngle);

    if (deltaAngle < 0.06 && deltaAngle > -0.06) {
      cancelAnimationFrame(id);//cancel coin animation
      cancelAnimationFrame(stopAnimation);//cancel excution of this function
      return;
    }
    requestAnimationFrame(stopAnimation);//rerun this function until if-statment above is true
  }

  const coinObj = {
    stopAnimation,
    animateCoin
  }
  return coinObj;
}

// ---------------------------Temporary stuff---------------------------
// Blur button
function toggleBlur() {
  const elements = document.querySelectorAll(".to-blur");
  // console.log(elements);
  for (let i = 0; i < elements.length; i++) {
    elements[i].classList.toggle("wait");
  }
}

//Start the coin animation with message below animation div
function startCoinFlip() {
  swissFranc.animateCoin();//start coin animation
  toggleBlur(); //blur all irrelevant divs
  togglePlayButton() //deactivate play button functionality
  document.querySelector(".infotext").innerHTML = "<b>Game on!</b><br>Please be patient. Depending on the gas price it might take a while..."
}

//toggle play button functionality
function togglePlayButton() {
  const playButton = document.querySelector(".play-button");
  if (playButton.disabled) playButton.disabled = "";
  else playButton.disabled = "disabled";
}

//Stop the coin animation with result message below animation div
function stopCoinFlip() {
  swissFranc.stopAnimation("tails");//stop coin animation
  setTimeout(() => {
    toggleBlur(); //unblur all divs
    togglePlayButton() //deactivate play button functionality
    document.querySelector(".infotext").innerHTML = "<b>You won!</b>"//Show message
  }, 1500); //unblur and show message 1.5s after request to stop animation
}

function toggleVisibility() {
  let infotext = document.querySelector(".infotext");
  infotext.classList.toggle("show-hide");
}

async function getWei() {
  let jackpot = headsOrTails.getValue();
  console.log(jackpot);
}