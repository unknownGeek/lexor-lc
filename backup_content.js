const MAX_LOT_SIZE_BY_SYMBOL = {
    "EURUSD": 0.2,  // Max size for EURUSD
    "XAUUSD": 0.1,  // Max size for XAUUSD
    "BTCUSD": 0.1,  // Max size for BTCUSD
    "ETHUSD": 0.5,  // Max size for ETHUSD
    "USOIL": 0.1,  // Max size for USOIL
    // Add more symbols as needed
};

const defaultMaxLotSize = 0.01;

let lastLotSize = null;

let confirmBtn;

// Listen for popup request and send the map
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_MAX_LOT_SIZE_BY_SYMBOL') {
        sendResponse({ lotSizeMap: MAX_LOT_SIZE_BY_SYMBOL });
    }
});

const observer = new MutationObserver(() => {
    console.log(`DEBUGGING: Started observing.`);
    process();
    console.log(`DEBUGGING: Finished observing.`);
});

observer.observe(document.body, {
childList: true,
subtree: true,
});


function process() {

    const headerEl = document?.querySelector('[data-test="order-panel-desktop-header"]');

    let symbol = null;
    let symbolDataTest = null;
    
    if (!headerEl) {
        console.log(`order-panel-desktop-header is not present, retrying...`);
        console.log(`DEBUGGING: Finished observing.`);
        return;
    }

    let symbolDiv = headerEl?.querySelector('[data-test^="symbol-"]');
    if (symbolDiv) {
        symbolDataTest = symbolDiv?.getAttribute("data-test");
        if (symbolDataTest) {
            symbol = symbolDataTest.replace("symbol-", "");
        }
    }

    // console.log(`DEBUGGING: symbol:${symbol}`);

    if (!symbolDiv || !symbol) {
        console.log(`Symbol is not present, retrying...`);
        console.log(`DEBUGGING: Finished observing.`);
        return;
    }

    confirmBtn = document?.querySelector('button[data-test="order-panel-confirmation"]');

    const maxLotSize = MAX_LOT_SIZE_BY_SYMBOL[symbol] ? MAX_LOT_SIZE_BY_SYMBOL[symbol] : defaultMaxLotSize;

    console.log(`DEBUGGING: lastLotSize:${lastLotSize}`);
    // let lotSize = getLotSize();
    if (!lastLotSize) {
        return;
    }
    let lotSize = lastLotSize
    console.log(`DEBUGGING: lotSize:${lotSize}`);

    // Get the main portfolio list container
    let portfolioSymbolVolumeLot = getPortfolioVolumeLot(symbolDataTest);

    // Calculate sum and apply rounding
    let sum = roundToTwoDecimals(portfolioSymbolVolumeLot + lotSize);

    console.log(`DEBUGGING: portfolioSymbolVolumeLot:${portfolioSymbolVolumeLot}, lotSize:${lotSize}, maxLotSize:${maxLotSize}, sum:${sum}, isLimitBreached:${portfolioSymbolVolumeLot > 0.0 && sum > maxLotSize}`);

    if (portfolioSymbolVolumeLot > 0.0 && sum > maxLotSize) {
        let msg;
        if (portfolioSymbolVolumeLot >= maxLotSize) {
            msg = `Active positions Lot ${portfolioSymbolVolumeLot} already reached Max Lot Size Limit ${maxLotSize} for ${symbol}, try closing the existing position to open new ones.`;
        } else {
            msg = `Active positions Lot ${portfolioSymbolVolumeLot} & new Lot Size ${lotSize} will breach Max Lot Size Limit ${maxLotSize} for ${symbol}, try smaller lots.`
        }

        disableConfirmButton(msg);
        console.log(`❌ Order blocked : ${msg}`);
        console.log(`DEBUGGING: Finished observing.`);
        return;
    }

    let slInput = getSlInput();

    // console.log(`DEBUGGING: slInput:${slInput}`);

    if (!slInput) {
        let msg = `Define SL for ${symbol} for order placement`;
        disableConfirmButton(msg);
        console.log(`❌ Order blocked for ${symbol} without Stop-Loss. Please set a predefined SL for order placement!`);
        console.log(`DEBUGGING: Finished observing.`);
        return;
    }

    console.log(`IN PROGRESS - Checking ${symbol} with lot size ${lotSize}`);

    let msg = `Max lot size for ${symbol} is ${maxLotSize}`;
    
    if (lotSize > maxLotSize) {
        disableConfirmButton(msg);
        console.log(`❌ Order blocked: ${symbol}, size: ${lotSize}`);
    } else {
        enableConfirmButton();
        console.log(`✅ Order will not be blocked: ${symbol}, size: ${lotSize}, ${msg}`);
    }
    
    console.log(`COMPLETED - Checking ${symbol} with lot size ${lotSize}`);

}

function disableConfirmButton(msg) {
if (!confirmBtn) { 
    return;
}
confirmBtn.disabled = true;
confirmBtn.style.opacity = "0.5";
confirmBtn.title = msg;
}

function enableConfirmButton() {
    if (!confirmBtn) {
        return;
    }
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = "1";
    confirmBtn.title = "";
}

function getPortfolioVolumeLot(symbolDataTest) {
let portfolioListEle = document?.querySelector('[data-test="portfolio_list"]');
let portfolioSymbolVolumeLot = 0.0;

if (portfolioListEle) {

    // Find the symbol element
    let portfolioSymbolDiv = portfolioListEle?.querySelector(`[data-test="${symbolDataTest}"]`);


    if (portfolioSymbolDiv) {
        // Find the closest parent row (supports both possible row prefixes)
        let portfolioSymbolContainer = portfolioSymbolDiv.closest('[data-test^="portfolio_list_row_"], [data-test^="portfolio_list_group_row_"]');

        // Find the volume column within that row
        let portfolioSymbolVolumeEle = portfolioSymbolContainer?.querySelector('[data-test="volume"]');
        let portfolioSymbolVolumeText = portfolioSymbolVolumeEle?.textContent?.trim() || null;
        if (portfolioSymbolVolumeText) {
            portfolioSymbolVolumeLot = parseFloat(portfolioSymbolVolumeText);
        }
    }
}

return portfolioSymbolVolumeLot;
}

function getLotSize() {
let lotSize = 0.0;
// Step 2: Get the volume input wrapper
let volumeWrapperElement = document?.querySelector('[data-test="order-panel-volume-input"]');

// Step 3: Get the actual input field inside the volume section
lotInputElement = volumeWrapperElement?.querySelector('input[data-test="input"]');

lotInput = lotInputElement?.value?.trim() || null;

// console.log(`DEBUGGING: lotInput:${lotInput}`);

if (lotInput) {
    lotSize = parseFloat(lotInput);
}

return lotSize;
}

function getSlInput() {
let stopLossWrapperElement = document?.querySelector('[data-test="order-panel-sl-input"]');

slInputElement = stopLossWrapperElement?.querySelector('input[data-test="input"]');

return slInputElement?.value?.trim() || null;
}

// Round to 2 decimal places
function roundToTwoDecimals(value) {
    return Math.round(value * 100) / 100;
}


function startLotSizeWatcher() {
    setInterval(() => {
        const inputEl = document.querySelector('[data-test="order-panel-volume-input"] input[data-test="input"]');
        if (inputEl) {
            const currentValue = parseFloat(inputEl.value);
            if (!isNaN(currentValue) && currentValue !== lastLotSize) {
                lastLotSize = currentValue;
                console.log("📌 Lot size changed to:", currentValue);
                process(); // manually re-run your validation logic
            }
        }
    }, 300); // Adjust polling rate if needed
}


console.log("✅ Exness Lot Blocker script is running");



startLotSizeWatcher(); // << start the polling loop
