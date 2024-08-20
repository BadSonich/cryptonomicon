const API_KEY =
  "6bbdc8226f808a28b6ba2f998e961597a33138077fae225d3accd6096994fee8";

const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const tickersHandlers = new Map();

const AGGREGATE_INDEX = "5";

socket.onmessage = (event) => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    PRICE: newPrice
  } = JSON.parse(event.data);

  if (type !== AGGREGATE_INDEX) {
    return;
  }

  const handlers = tickersHandlers.get(currency) || [];
  handlers.forEach((fn) => fn(newPrice));
};

export const loadCoinList = async () => {
  const response = await fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api-key=${API_KEY}`
  );
  const data = await response.json();

  return Object.values(data.Data);
};

// export const loadTickers = () => {
//   if (tickersHandlers.size === 0) {
//     return;
//   }
//   fetch(
//     `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${[
//       ...tickersHandlers.keys()
//     ].join(",")}&tsyms=USD&api-key=${API_KEY}`
//   )
//     .then((f) => f.json())
//     .then((rawData) => {
//       const updatedPrices = Object.fromEntries(
//         Object.entries(rawData).map(([key, value]) => [key, value.USD])
//       );
//       Object.entries(updatedPrices).forEach(([currency, newPrice]) => {
//         const handlers = tickersHandlers.get(currency) || [];
//         handlers.forEach((fn) => fn(newPrice));
//       });
//     });
// };
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

// setInterval(loadTickers, 5000);

window.tickersHandlers = tickersHandlers;
