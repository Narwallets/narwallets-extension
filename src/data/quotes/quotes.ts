import { getCoingeckoQuote } from "./coingecko-quotes.js";
import { getDiaDataQuote } from "./diaData-quotes.js";

// get NEAR, AURORA, ETH dollar price
export async function getQuote(symbol: "NEAR" | "AURORA" | "ETH") {
  try {
    return getCoingeckoQuote(symbol)
  }
  catch {
    try {
      return getDiaDataQuote(symbol)
    }
    catch (ex) {
      return 0
    }
  }
}