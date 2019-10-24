// Version of Solidity compiler this program was written for
pragma solidity ^0.5.0;

// Heads or tails game contract
contract HeadsOrTails {
    address payable owner;
    string public name;

    event Play(uint contractBalance, uint incomingEth);//Log values for debugging purposes

  // Contract constructor run only on contract creation. Set owner
  constructor() public {
    owner = msg.sender;
    name = "Heads or Tails dApp";
  }

  //add this modifier to functions, which should only be accessible by the owner
  modifier onlyOwner {
        require(msg.sender == owner, "This function can only be launched by the owner");
        _;
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

    //Return string
    function lottery(uint8 guess) public payable returns(string memory, uint time) {
        time = block.timestamp;
        require(guess == 0 || guess == 1, "Variable 'guess' should be either 0 or 1");
        require(msg.value <= address(this).balance - msg.value, "You cannot bet more than what is available in the jackpot");
        //address(this).balance is increased by msg.value even before code is executed. Thus "address(this).balance-msg.value"
        emit Play(msg.value, address(this).balance); //Log values for debugging purposes.
        //Catch events like that: https://github.com/ethereumbook/ethereumbook/blob/develop/07smart-contracts-solidity.asciidoc#catching-events

        if (guess == block.timestamp % 2){
            msg.sender.transfer(msg.value * 2);
            return ("won!", time);
        } else {
          return ("lost!", time);
        }
    }

    // Accept any incoming amount 1200000000000000000
    function () external payable {}
}