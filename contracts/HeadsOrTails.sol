// Version of Solidity compiler this program was written for
pragma solidity ^0.5.0;

// Heads or tails game contract
contract HeadsOrTails {
  address payable owner;
  string public name;

  struct Game {
    address addr;
    uint bet;
    bool winner;
    uint ethInJackpot;
  }

  Game[] lastPlayedGames;

  //Log values for debugging purposes
  event Play(uint contractBalance, uint incomingEth);

  // Contract constructor run only on contract creation. Set owner.
  constructor() public {
    owner = msg.sender;
    name = "Heads or Tails dApp";
  }

  //add this modifier to functions, which should only be accessible by the owner
  modifier onlyOwner {
    require(msg.sender == owner, "This function can only be launched by the owner");
    _;
  }

  //Play the game!
  function lottery(uint8 guess) public payable returns(string memory, uint time) {
    time = block.timestamp;
    require(guess == 0 || guess == 1, "Variable 'guess' should be either 0 or 1");
    require(msg.value <= address(this).balance - msg.value, "You cannot bet more than what is available in the jackpot");
    //address(this).balance is increased by msg.value even before code is executed. Thus "address(this).balance-msg.value"
    emit Play(msg.value, address(this).balance); //Log values for debugging purposes.
    //Catch events like that: https://github.com/ethereumbook/ethereumbook/blob/develop/07smart-contracts-solidity.asciidoc#catching-events

    if (guess == block.timestamp % 2){
        msg.sender.transfer(msg.value * 2);
        lastPlayedGames.push(Game(msg.sender, msg.value, true, address(this).balance));
        return ("won!", time);
    } else {
      lastPlayedGames.push(Game(msg.sender, msg.value, false, address(this).balance));
      return ("lost!", time);
    }
  }

  //Get amount of games played so far
  function getGameCount() public view returns(uint) {
    return lastPlayedGames.length;
  }

  //Get stats about a certain played game, e.g. address of player, amount bet, won or lost, and ETH in the jackpot at this point in time
  function getGameEntry(uint index) public view returns(address addr, uint bet, bool winner, uint ethInJackpot) {
    return (lastPlayedGames[index].addr, lastPlayedGames[index].bet, lastPlayedGames[index].winner, lastPlayedGames[index].ethInJackpot);
  }

  // Contract destructor (Creator of contract can also destroy it and receives remaining ether of contract address).
  //Advantage compared to "withdraw": SELFDESTRUCT opcode uses negative gas because the operation frees up space on
  //the blockchain by clearing all of the contract's data
  function destroy() public onlyOwner {
    selfdestruct(owner);
  }

  //Withdraw money from contract
  function withdraw(uint amount) public onlyOwner {
    require(amount < address(this).balance, "You cannot withdraw more than what is available in the contract");
    owner.transfer(amount);
  }

  // Accept any incoming amount
  function () external payable {}
}