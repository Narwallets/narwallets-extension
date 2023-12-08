// get NEAR, AURORA, ETH dollar price
export async function getCoingeckoQuote(symbolUpper: "NEAR" | "AURORA" | "ETH") {
  const symbol =
    symbolUpper == "ETH" ? "ethereum" :
      symbolUpper == "AURORA" ? "aurora-near" :
        symbolUpper.toLowerCase()
  try {
    const result = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd&precision=5`);
    const response = await result.json();
    // console.log(response)
    return response[symbol].usd;
  } catch (ex) {
    console.error(`ERR getCoingeckoQuote ${symbol}`)
    throw ex
  }
}

