const API_KEY =
  "6bbdc8226f808a28b6ba2f998e961597a33138077fae225d3accd6096994fee8";

const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const tickersHandlers = new Map();

const AGGREGATE_INDEX = "5";

function updatePriceInTickerHandlers(currency, price) {
  const handlers = tickersHandlers.get(currency) || [];
  handlers.forEach((fn) => fn(parseFloat(price)));
}

socket.onmessage = (event) => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    PRICE: newPrice
  } = JSON.parse(event.data);

  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }

  localStorage.setItem(currency, newPrice.toString());
  updatePriceInTickerHandlers(currency, newPrice);
};

window.addEventListener("storage", function (event) {
  let storageKey = event.key,
    storageData = localStorage.getItem(storageKey);

  if (storageKey === "cryptonomicon-list") {
    let tickersList = JSON.parse(storageData);
    tickersList.forEach((ticker) => {
      if (!tickersHandlers.get(ticker.name)) {
        subscribeToTickerOnWs(ticker.name);
      }
    });

    return;
  }

  updatePriceInTickerHandlers(storageKey, storageData);
});

export const loadCoinList = async () => {
  const response = await fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api-key=${API_KEY}`
  );
  const data = await response.json();

  return Object.values(data.Data);
};

function sendToWs(message) {
  const stringifyMessage = JSON.stringify(message);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifyMessage);

    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifyMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(ticker) {
  sendToWs({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

function unSubscribeFromTickerOnWs(ticker) {
  sendToWs({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

export const subscribeToTicker = (ticker, callback) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, callback]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
  unSubscribeFromTickerOnWs(ticker);
};

window.tickersHandlers = tickersHandlers;
