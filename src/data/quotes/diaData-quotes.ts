// get NEAR, AURORA, ETH dollar price
export async function getDiaDataQuote(symbol: "NEAR" | "AURORA" | "ETH") {
  try {
    const result = await fetch(`https://api.diadata.org/v1/quotation/${symbol}`);
    const response = await result.json();
    return response.Price;
  } catch (ex) {
    console.error(`ERR getDiaDataQuote ${symbol}`)
    throw ex
  }
}
