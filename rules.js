// Symbol and max lot size mapping
const LOT_SIZE_LIMITS = {
    "EURUSD": 1.5,
    "GBPUSD": 1.0,
    "USDJPY": 2.0,
    // Add more pairs as needed
  };
  
  function getLimit(symbol) {
    return LOT_SIZE_LIMITS[symbol.toUpperCase()] || null;
  }
  
  export { getLimit };
  