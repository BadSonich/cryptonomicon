const API_KEY =
  "6bbdc8226f808a28b6ba2f998e961597a33138077fae225d3accd6096994fee8";

const tickersHandlers = new Map();

export const loadCoinList = async () => {
  const response = await fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api-key=${API_KEY}`
  );
  const data = await response.json();

  return Object.values(data.Data);
};

//TODO: refactor to use UrlSearchParams
export const loadTickers = () => {
  if (tickersHandlers.size === 0) {
    return;
  }
  fetch(
    `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${[
      ...tickersHandlers.keys()
    ].join(",")}&tsyms=USD&api-key=${API_KEY}`
  )
    .then((f) => f.json())
    .then((rawData) => {
      const updatedPrices = Object.fromEntries(
        Object.entries(rawData).map(([key, value]) => [key, value.USD])
      );
      Object.entries(updatedPrices).forEach(([currency, newPrice]) => {
        const handlers = tickersHandlers.get(currency) || [];
        handlers.forEach((fn) => fn(newPrice));
      });
    });
};

export const subscribeToTicker = (ticker, callback) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, callback]);
};

export const unsubscribeFromTicker = (ticker, callback) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(
    ticker,
    subscribers.filter((fn) => fn !== callback)
  );
};

setInterval(loadTickers, 5000);

window.tickersHandlers = tickersHandlers;
