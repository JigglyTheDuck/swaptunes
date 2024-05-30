// TODO:
// API supports
// &period1=start_t
// &period2=end_t
//
// in case you need more
export const fetchQuotes = (
  ticker = "GSPC",
  sampleRate = "1d",
  // length = "6mo",
  since,
  to
) =>
  fetch(
    `https://api.jiggly.app/finance/v8/finance/chart/${ticker}?interval=${sampleRate}${
      to ? `&period1=${since}&period2=${to}` : `&range=${since}`
    }`
  )
    .then((response) => response.json())
    .then((result) => {
      if (result.chart.error) throw new Error(result.chart.error);
      return result.chart.result[0].timestamp.map((t, i) => ({
        timestamp: t,
        price: result.chart.result[0].indicators.quote[0].close[i],
      }));
    });

// this will be from cnbc
export const fetchPrice = (ticker) =>
  fetch(
    "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=ETH.CM%3D"
  )
    .then((response) => response.json())
    .then((result) => result.FormattedQuoteResult.FormattedQuote[0].last);

// https://query1.finance.yahoo.com/v7/finance/quote?=&symbols=BTC-USD,CL=F,ETH-USD,GC=F,GS2C.F,SHOP.TO,SI=F,^DJI,^GSPC,^IXIC,^RUT&fields=currency,fromCurrency,toCurrency,exchangeTimezoneName,exchangeTimezoneShortName,gmtOffSetMilliseconds,regularMarketChange,regularMarketChangePercent,regularMarketPrice,regularMarketTime,preMarketTime,postMarketTime,extendedMarketTime&crumb=9mOi8yycqLD&formatted=false&region=US&lang=en-US
//

//https://query1.finance.yahoo.com/v7/finance/quote?=&symbols=TSLA&fields=currency,fromCurrency,toCurrency,exchangeTimezoneName,exchangeTimezoneShortName,gmtOffSetMilliseconds,regularMarketChange,regularMarketChangePercent,regularMarketPrice,regularMarketTime,preMarketTime,postMarketTime,extendedMarketTime&crumb=9mOi8yycqLD&formatted=false&region=US&lang=en-US
//
//
//
//&crumb=9mOi8yycqLD
//
//
//
//https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=TSLA|HMC|NSANY|LI|TM|F&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1
//
//
// https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=TSLA
