const HeadsOrTails = artifacts.require("HeadsOrTails.sol");

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract("HeadsOrTails", (account1, account2) => {
  let headsOrTails;

  before(async () => {
    headsOrTails = await HeadsOrTails.deployed();
    //Top up contract address with 0.1ETH.
    headsOrTails.sendTransaction({ from: "0x5D1DBF7E3eCA5Ae039f394122418Dc207ca584b4", value: web3.utils.toWei('0.1', 'Ether') });
  })

  describe('deployment', async () => {
    it('deploys successfully', async () => {
      const address = await headsOrTails.address;
      console.log("Contract address: " + address);
      console.log("Contract balance: " + await  web3.eth.getBalance(address)/1e18 + "ETH");
      assert.notEqual(address, 0x0);
      assert.notEqual(address, '');
      assert.notEqual(address, null);
      assert.notEqual(address, undefined);
    })

    it('has a name', async () => {
      const name = await headsOrTails.name();
      assert.equal(name, 'Heads or Tails dApp');
    })
  })

  describe('lottery function', async () => {
    it('initiates lottery function', async () => {
      // FAILURE: Other value than 0 or 1 defined
      await headsOrTails.lottery('3', { from: "0x5D1DBF7E3eCA5Ae039f394122418Dc207ca584b4", value: "10000000000000000" }).should.be.rejected;
      // FAILURE: Bet is larger than what is disposable in jackpot
      await headsOrTails.lottery('0', { from: account1, value: web3.utils.toWei('0.5', 'Ether') }).should.be.rejected;//Note: Test runs a lot slower, when using "account1" instead directly entering the address.
    })
  })
})