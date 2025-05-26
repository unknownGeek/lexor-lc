let lastToastMsg = null;
let toastCooldown = false;
const MAX_CUSTOM_LEVERAGE = 40;

const defaultMaxLotSize = 0.01;

const MAX_RISK_PERCENT = -5.0;

const HIGH_RISK_PERCENT = -10.0;

const PERCENT_VALUE = 0.01;

const MAX_ALLOWED_OPEN_TRADES = 1;

const COOLDOWN_PERIOD_MINS = 1;

let lotSize = null;
let slPercentValue = null;

let isLotSizeUpdated = false;

let adjustedMargin = null;

let lastModifiedRiskPercent = null;

let storageLastUpdated = 0;

let waitTime = 0.0;

let openTradesCountMap = {};

let openTradesCount = 0;

let isCoolDownOver = true;


function removeExistingToast(source) {
    const existingToast = document.getElementById("custom-toast");
    if (existingToast) {
        existingToast.remove(); // Remove current toast
    }
}

function showToast(message, backgroundColor = "#333", source = 'general') {
    // Check if the order modify popup is visible
    const isOrderModifyPopupEnabled = document.querySelector('[data-test="order_modify_header"]') !== null;

    // Suppress non-SL/Risk toasts if order modify popup is open or HighPriority alert arrives
    if (isOrderModifyPopupEnabled && source !== 'orderModifyPopup' && source !== 'HighPriority') {
        return;
    }

    // Remove any existing toast first
    if (toastCooldown && message == lastToastMsg) { 
        return;
    }

    toastCooldown = true;
    lastToastMsg = message;
    setTimeout(() => { toastCooldown = false; }, 20000);

    removeExistingToast(source);

    const toast = document.createElement("div");
    toast.id = "custom-toast";
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.backgroundColor = backgroundColor;
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "9999";
    toast.style.transition = "opacity 0.8s ease";
    toast.style.opacity = "1";
    toast.style.wordWrap = "break-word";  // Allow breaking long words
    toast.style.maxWidth = "20vw"; // Limit the width of the toast (20% of viewport width)
    toast.style.height = "auto"; // Height will be calculated based on text
    toast.style.display = "inline-block"; // Inline-block for wrapping text

    document.body.appendChild(toast);

    // Center the text vertically and horizontally
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.justifyContent = "center";
    toast.style.textAlign = "center";

    // Automatically hide after 4 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.remove();
        }, 500); // Remove after fade out
    }, 4000);
}



const MAX_LOT_SIZE_BY_SYMBOL = {
    "AUDUSD": 0.2,  // Max size for AUDUSD
    "EURUSD": 0.2,  // Max size for EURUSD
    "NZDUSD": 0.2,  // Max size for NZDUSD
    "GBPUSD": 0.2,  // Max size for GBPUSD
    "USDCAD": 0.2,  // Max size for USDCAD
    "USDCHF": 0.2,  // Max size for USDCHF
    "USDJPY": 0.2,  // Max size for USDJPY
    "AUDJPY": 0.2,  // Max size for AUDJPY
    "US30"  : 0.2,  // Max size for US30
    "USTECH": 0.2,  // Max size for USTECH
    "XAUUSD": 0.1,  // Max size for XAUUSD
    "USOIL" : 0.1,  // Max size for USOIL
    "XAGUSD": 0.1,  // Max size for XAGUSD
    "BTCUSD": 0.1,  // Max size for BTCUSD
    "ETHUSD": 1.0   // Max size for ETHUSD
    // Add more symbols as needed
};

// Listen for popup request and send the map
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_MAX_LOT_SIZE_BY_SYMBOL') {
        sendResponse({ lotSizeMap: MAX_LOT_SIZE_BY_SYMBOL });
    }
});

const observer = new MutationObserver(() => {
    //console.log(`DEBUGGING: Started observing.`);
    process();
    //console.log(`DEBUGGING: Finished observing.`);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});


function process() {

    makeDemoAccountReal();
    disablePortfolioStopLossRemoveButton();
    let confirmBtn = document?.querySelector('button[data-test="order-panel-confirmation"]');
    openTradesCountMap = fetchOpenTradesCountMapInPortfolio();

    openTradesCount = openTradesCountMap.size;

    setLastActiveTradeTime(openTradesCount);
    
    if (isCoolDownOver === false ) {
        if (openTradesCount == 0) {
            const msg = `❌ Order completely blocked until ${waitTime} mins, try after cool down period.`;
            disableConfirmButton(confirmBtn, msg);
            console.log(msg);
            setTimeout(() => {
                showToast(msg, "#f44336");
            }, 0);
            return;
        }
    }

    const isHighRiskPnL = disableNewOrderPlacementForHigherRisk();

    if (isHighRiskPnL) {
        return;
    }

    const headerEl = document?.querySelector('[data-test="order-panel-desktop-header"]');

    let symbolDataTest = null;
    let symbol = null;
    
    if (!headerEl) {
        console.log(`order-panel-desktop-header is not present, retrying...`);
        // console.debug(`DEBUGGING: Finished observing.`);
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
        //console.log(`DEBUGGING: Finished observing.`);
        return;
    }


    const maxLotSize = MAX_LOT_SIZE_BY_SYMBOL[symbol] || defaultMaxLotSize;

    //console.log(`DEBUGGING: lotSize:${lotSize}`);
    if (!lotSize) {
        return;
    }

    calculateAdjustedMargin();

    const isOpenTabCurrentlyActiveInPorfolio = isOpenTabCurrentlyActive();

    // console.log(`DEBUGGING: Is Open Tab Active in Portfolio : ${isOpenTabCurrentlyActiveInPorfolio}`); 

    if (!isOpenTabCurrentlyActiveInPorfolio) {
        const msg = `❌ Order blocked: ${symbol}, OPEN_ORDRS_TAB should be opened in PORTFOLIO while placing new orders.`;
        disableConfirmButton(confirmBtn, msg);
        console.log(msg);
        setTimeout(() => {
            showToast(msg, "#f44336");
        }, 0);
        return;
    }


    // Get the main portfolio list container
    let portfolioSymbolVolumeLot = getPortfolioVolumeLot(symbolDataTest);

    // Calculate sum and apply rounding
    let sum = roundToTwoDecimals(portfolioSymbolVolumeLot + lotSize);

    //console.log(`DEBUGGING: portfolioSymbolVolumeLot:${portfolioSymbolVolumeLot}, lotSize:${lotSize}, maxLotSize:${maxLotSize}, sum:${sum}, isLimitBreached:${portfolioSymbolVolumeLot > 0.0 && sum > maxLotSize}`);

    if (portfolioSymbolVolumeLot > 0.0 && sum > maxLotSize) {
        let msg;
        let toastMsg;
        if (portfolioSymbolVolumeLot >= maxLotSize) {
            msg = `Active positions Lot ${portfolioSymbolVolumeLot} already reached Max Lot Size Limit ${maxLotSize} for ${symbol}, try closing the existing position to open new ones.`;
            toastMsg = `❌ Order blocked, Existing Lot ${portfolioSymbolVolumeLot} already Breached Max Lot Size Limit ${maxLotSize}: ${symbol}, try closing existing position.`;
        } else {
            msg = `Active positions Lot ${portfolioSymbolVolumeLot} & new Lot Size ${lotSize} will breach Max Lot Size Limit ${maxLotSize} for ${symbol}, try smaller lots.`
            toastMsg = `❌ Order blocked, Lot ${lotSize} Breached Max Lot Size Limit ${maxLotSize}: ${symbol}`;
        }

        disableConfirmButton(confirmBtn, msg);
        console.log(`❌ Order blocked : ${msg}`);
        //console.log(`DEBUGGING: Finished observing.`);

        setTimeout(() => {
            showToast(toastMsg, "#f44336");
        }, 0);  // Let browser render first

        return;
    }

    let msg = `Max lot size for ${symbol} is ${maxLotSize}`;
    
    if (lotSize > maxLotSize) {
        disableConfirmButton(confirmBtn, msg);
        if (isLotSizeUpdated) {
            console.log(`❌ Order blocked, Lot ${lotSize} should be <= ${maxLotSize}`);
        }
        setTimeout(() => {
            showToast(`❌ Order blocked, Lot ${lotSize} should be <= ${maxLotSize}`, "#f44336");
        }, 0);  // Let browser render first
        return;
    }

    if (openTradesCount > MAX_ALLOWED_OPEN_TRADES || 
        (!openTradesCountMap.has(symbol) && openTradesCount == MAX_ALLOWED_OPEN_TRADES)) {
        const msg = `❌ Order blocked: ${symbol}, ${openTradesCount} trades are open, but only ${MAX_ALLOWED_OPEN_TRADES} open trades are allowed at a time, close existing orders and place new orders.`;
        disableConfirmButton(confirmBtn, msg);
        console.log(msg);
        setTimeout(() => {
            showToast(msg, "#f44336");
        }, 0);
        return;
    } 

    let slInput = getSlInput();

    // console.log(`DEBUGGING: slInput:${slInput}`);

    if (!slInput) {
        let msg = `Define SL for ${symbol} for order placement`;
        disableConfirmButton(confirmBtn, msg);
        console.log(`❌ Order blocked for ${symbol} without Stop-Loss. Please set a predefined SL for order placement!`);
        //console.log(`DEBUGGING: Finished observing.`);
        setTimeout(() => {
            showToast(`❌ Order blocked, Missing SL: ${symbol}`, "#f44336");
        }, 0);  // Let browser render first
        return;
    }

    const isValidSL = isValidStopLossAsPerRiskMgmnt(slInput);

    if(!isValidSL) {
        let msg = `RISK is more than the max allowed LIMIT ${MAX_RISK_PERCENT}% for ${symbol} before order placement. Manage your risk properly.`;
        disableConfirmButton(confirmBtn, msg);
        console.log(`❌ Order blocked for ${symbol} : ${msg}`);
        //console.log(`DEBUGGING: Finished observing.`);
        setTimeout(() => {
            showToast(`❌ Order blocked, SL ${slPercentValue}% should be < ${MAX_RISK_PERCENT}%: ${symbol}`, "#f44336");
        }, 0);  // Let browser render first
        return;
    }

    console.log(`✅ SL is within the max allowed LIMIT ${MAX_RISK_PERCENT}% for ${symbol}, size: ${lotSize}. Risk Management Check Passed!`);

    enableConfirmButton(confirmBtn, symbol);
    console.log(`✅ Order will not be blocked: ${symbol}, size: ${lotSize}, ${msg}`);
}

function setLastActiveTradeTime(openTradesCount) {

    setInterval(() => {
        openTradesCountMap = fetchOpenTradesCountMapInPortfolio();

        openTradesCount = openTradesCountMap.size;

        const now = Date.now();            
        // console.log(`openTradesCount=${openTradesCount} now - storageLastUpdated=${now - storageLastUpdated}`);

        if (openTradesCount != 0 && now - storageLastUpdated >= 5000) { // every 5 seconds
            chrome.storage.local.set({ lastActiveTradeTime: now }, () => {
                // console.log('DEBUGGING: Updated lastActiveTradeTime:', new Date(now).toLocaleString());
            });
            storageLastUpdated = now;
        }
    }, 1000); // check every second
  }


function startCoolDownWatcher(callback) {
    const intervalId = setInterval(() => {
        chrome.storage.local.get(['lastActiveTradeTime'], (result) => {
            const lastActiveTradeTime = result.lastActiveTradeTime;
            const now = Date.now();

            if (!lastActiveTradeTime || (now - lastActiveTradeTime) >= COOLDOWN_PERIOD_MINS * 60 * 1000) {
                if (!lastActiveTradeTime || isCoolDownOver == false) {
                    // console.log(`DEBUGGING : ✅ Cooldown period of ${COOLDOWN_PERIOD_MINS} mins is over. 🚀 Proceeding with the next trade...`);
                }
                callback(true); // Notify that cooldown is over
            } else {
                const waitTimeMs = COOLDOWN_PERIOD_MINS * 60 * 1000 - (now - lastActiveTradeTime);
                waitTime = roundToTwoDecimals(waitTimeMs / 60000);
                // console.log(`DEBUGGING : 🚀 Cooldown is not over yet, ⏳ Wait for ${waitTime} more mins for cooldown...`);
                callback(false); // Notify that cooldown is pending
            }
        });
    }, 1000); // check every second
}
  

function disableConfirmButton(confirmBtn, msg) {
    if (!confirmBtn) { 
        return;
    }
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = "0.5";
    confirmBtn.title = msg;
}


function enableConfirmButton(confirmBtn, currSymbol, source='general') {
    if (!confirmBtn) {
        return;
    }
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = "1";
    confirmBtn.title = "";
    let msg;
    if (source === 'orderModifyPopup') {
        msg = `✅ Order Modification Enabled: ${currSymbol}`;
    } else {
        msg = `✅ Order Placement Enabled: ${currSymbol}`;
    }
    setTimeout(() => {
        showToast(msg, "#4CAF50", source);
    }, 0);  // Let browser render first
}


function isPorfolioPresentForActiveOpenOrders() {
    let isActiveOrdersPresent = false;
    const portfolioTabsEle = document?.querySelector('[data-test="portfolio_tabs"]');
    if (portfolioTabsEle) {
        const portfolioOpenTabsEle = portfolioTabsEle?.querySelector('[data-test="portfolio_tabs_open"]');
        if (portfolioOpenTabsEle) {
            const openTabBadge = portfolioOpenTabsEle?.querySelector('[data-test="tab_badge"]');

            if (openTabBadge && openTabBadge.textContent.trim() && parseInt(openTabBadge.textContent.trim(), 10) > 0) {
                isActiveOrdersPresent = true;
              }
        }
    }

    return isActiveOrdersPresent;
}


function getPortfolioVolumeLot(symbolDataTest) {
    let portfolioSymbolVolumeLot = 0.0;
    
    if (!isPorfolioPresentForActiveOpenOrders()) {
        return portfolioSymbolVolumeLot;
    }
    let portfolioListEle = document?.querySelector('[data-test="portfolio_list"]');

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


function fetchOpenTradesCountMapInPortfolio() {
    const groupRows = document.querySelectorAll('[data-test^="portfolio_list_group_row_"]');
    const individualRows = getIndividualRowsInPortforlio();
  
    // logOpenTradesInPortfolio(groupRows, individualRows);    
    const openTradesCountMap = prepareOpenTradesCountMapInPortfolio(groupRows, individualRows);

    const totalOpenTrades = groupRows.length + individualRows.length;

    // console.log(`DEBUGGING: openTradesCountMap : `);
    // console.log(openTradesCountMap);
  
    // console.log(`DEBUGGING: Open trades: ${totalOpenTrades}`);
    return openTradesCountMap;
}


function prepareOpenTradesCountMapInPortfolio(groupRows, individualRows) {
    const openTradesCountMap = new Map();
    
    groupRows.forEach((row, index) => {
        const symbol = fetchSymbolFromElement(row);
        const count = fetchCountFromElement(row);
        openTradesCountMap.set(symbol, count);
        // console.log(`DEBUGGING: Group Row ${index + 1} for symbol:${symbol} & count:${count} :`, row.textContent.trim());
    });

    individualRows.forEach((row, index) => {
        const symbol = fetchSymbolFromElement(row);
        openTradesCountMap.set(symbol, 1);
        // console.log(`DEBUGGING: Individual Row ${index + 1} for symbol:${symbol} & count:1 :`, row.textContent.trim());
    });

    return openTradesCountMap;
}


function fetchSymbolFromElement(element) {
    if (!element) {
        return null;
    }

    let symbol = null;
    let symbolDiv = element?.querySelector('[data-test^="symbol-"]');
    if (symbolDiv) {
        symbolDataTest = symbolDiv?.getAttribute("data-test");
        if (symbolDataTest) {
            symbol = symbolDataTest.replace("symbol-", "");
        }
    }
    return symbol;
}

function fetchCountFromElement(element) {
    if (!element) {
        return 0;
    }
    let count = 0;
    const ordersCountDiv = element?.querySelector('[data-test^="orders_count_"]');
    if (ordersCountDiv) {
        const ordersCount = parseInt(ordersCountDiv.textContent.trim(), 10); // Extract number
        if (ordersCount && !isNaN(ordersCount)) {
            count = ordersCount;
        }
    }
    return count;
}


function getIndividualRowsInPortforlio() {
    const allRows = document.querySelectorAll('[data-test^="portfolio_list_row_"]');
  
    const filteredIndividualRows = Array.from(allRows).filter(row => {
      const dataTest = row.getAttribute('data-test');
      const isHeader = dataTest === 'portfolio_list_row_header';

      // Skip if the row has any class starting with "PortfolioListItemRow_inGroup__"
      const hasInGroupClass = Array.from(row.classList).some(cls =>
        cls.startsWith('PortfolioListItemRow_inGroup__')
      );

      return !isHeader && !hasInGroupClass;
    });
  
    // console.log(`DEBUGGING: All rows: ${allRows.length}`);
    // console.log(`DEBUGGING: Filtered Individual rows: ${filteredIndividualRows.length}`);

    return filteredIndividualRows;
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
        isLotSizeUpdated = false;
        if (inputEl) {
            const currentValue = parseFloat(inputEl.value);
            if (!isNaN(currentValue) && currentValue !== lotSize) {
                lotSize = currentValue;
                isLotSizeUpdated = true;
                console.log("📌 Lot size changed to:", currentValue);
                process(); // manually re-run your validation logic
            }
        }
    }, 300); // Adjust polling rate if needed
}


function makeDemoAccountReal() {
    // Replace "Demo" with "REAL" in the trading mode span
    const modeSpan = document.querySelector('[data-test="account-info-trading-mode"]');

    if (modeSpan && modeSpan.textContent.trim() === 'Demo') {
        modeSpan.textContent = 'Real';

        // Change the color by replacing the class (removing 'MuiBadge-colorSuccess' and adding 'MuiBadge-colorPrimary')
        modeSpan.classList.remove('MuiBadge-colorSuccess'); // Removes the Demo color class
        // Apply custom styles for yellow background and yellow text color
        modeSpan.style.backgroundColor = 'rgba(255, 222, 2, 0.16)';  // Yellow background
        modeSpan.style.color = 'rgb(255, 229, 53)';  // Yellow text color
        
        modeSpan.classList.add('MuiBadge-colorPrimary'); // Adds the Real color class
    
        // Replace the unique class for Demo with Real
        modeSpan.classList.remove('muiltr-1oulexn'); // Removes the Demo unique class
        modeSpan.classList.add('muiltr-1wagepa'); // Adds the Real unique class

        // Add padding exactly like the provided CSS
        modeSpan.style.padding = '2px 6px';  // Padding: 2px on top/bottom, 6px on left/right

        // // Update the account identifier text if needed (optional)
        // const identifierSpan = document.querySelector('[data-test="account-info-identifier"]');
        // if (identifierSpan) {
        //     identifierSpan.textContent = 'Account-Name';
        // }

    }
}

function isValidStopLossAsPerRiskMgmnt(slInput) {
    if (!slInput || !slPercentValue) {
        return false;
    }

    console.log(`✅ Extracted SL percent of equity: ${slPercentValue}`);

    let isValid = slPercentValue >= MAX_RISK_PERCENT;

    //console.log(`DEBUGGING: slPercentValue:${slPercentValue} and isValid:${isValid}`);

    return isValid;
}


function startSLRiskPercentWatcher() {
    setInterval(() => {
        const percentEl = document.querySelector('[data-test="order-panel-sl-input"] [data-test="input-message"] [data-test="percentOfEquity-type"]');
        if (percentEl) {
            const rawText = percentEl.textContent || '';
            const numericText = rawText.replace(/[^\d.-]/g, '');
            const riskPercent = parseFloat(numericText);
            if (!isNaN(riskPercent) && slPercentValue !== riskPercent) {
                console.log("📌 SL Risk Percent changed to:", riskPercent);
                slPercentValue = riskPercent;
                process();
            }
        }
    }, 300); // Poll every 300ms
}



function startSLRiskPercentModifyWatcher() {
    setInterval(() => {
        const wrapper = document.querySelector('[data-test="order-modify-popup"]');
        if (!wrapper) return;

        const slInputWrapper = wrapper.querySelector('[data-test="modify-desktop-sl"]');
        if (!slInputWrapper) return;

        const inputSl = slInputWrapper.querySelector('[data-test="input"]');
        if (inputSl && inputSl.value.trim() === "") {
            const msg = `SL is not set. Set madatory SL to proceed.`;
            disableModifyOrderButtonInModifyPopup(msg);

            setTimeout(() => {
                showToast(msg, "#f44336", 'orderModifyPopup');
            }, 0);  // Let browser render first
        }
        
        const clearButtonSl = slInputWrapper.querySelector('[data-test="clear-button"]');
        if (clearButtonSl) {
            clearButtonSl.disabled = true;
            clearButtonSl.style.pointerEvents = 'none';
            clearButtonSl.style.opacity = '0.5'; // Optional: visual cue
            // console.log(`DEBUGGING: CLEAR_SL_BUTTON  is removed from order-modify-popup.`);
        }


        const percentEl = slInputWrapper.querySelector('[data-test="input-message"] [data-test="percentOfEquity-type"]');
        if (!percentEl) return;

        const rawText = percentEl.textContent || '';
        const numericText = rawText.replace(/[^\d.-]/g, '');
        const modifiedRiskPercent = parseFloat(numericText);

        if (!isNaN(modifiedRiskPercent) && lastModifiedRiskPercent != modifiedRiskPercent) {
            console.log("📌 SL Risk % (Modify Popup):", modifiedRiskPercent);
            lastModifiedRiskPercent = modifiedRiskPercent;
            handleModifySLRiskChange(modifiedRiskPercent);
        }
    }, 300); // Check every 300ms
}

function disableModifyOrderButtonInModifyPopup(msg) {
    const applyButtonWrapper = document.querySelector('[data-test="order-modify-desktop-apply-button"]');
    if (!applyButtonWrapper) return;

    const applyButton = applyButtonWrapper.querySelector('button[type="submit"]');
    if (!applyButton) return;

    disableConfirmButton(applyButton, msg)
    console.log(msg);

}

function handleModifySLRiskChange(modifiedRiskPercent) {
    const applyButtonWrapper = document.querySelector('[data-test="order-modify-desktop-apply-button"]');
    if (!applyButtonWrapper) return;

    const applyButton = applyButtonWrapper.querySelector('button[type="submit"]');
    if (!applyButton) return;


    const modifySymbolHeaderEle = document.querySelector('[data-test="order-modify-popup"] [data-test="order_modify_header"]');

    const modifySymbolDiv = modifySymbolHeaderEle?.querySelector('[data-test^="symbol-"]');
    if (modifySymbolDiv) {
        const modifySymbolDataTest = modifySymbolDiv?.getAttribute("data-test");
        if (modifySymbolDataTest) {
            modifySymbol = modifySymbolDataTest.replace("symbol-", "");
        }
    }

    console.log(`✅ Extracted modified SL percent of equity: ${modifiedRiskPercent}`);

    let isValid = modifiedRiskPercent >= MAX_RISK_PERCENT;

    //console.log(`DEBUGGING: slPercentValue:${modifiedRiskPercent} and isValid:${isValid}`);

    if (!isValid) {
        const msg = `Risk exceeds ${MAX_RISK_PERCENT}%. Adjust SL to proceed.`;
        disableConfirmButton(applyButton, msg)
        console.log(`⚠️ SL risk ${modifiedRiskPercent}% exceeds limit. Modify disabled.`);

        setTimeout(() => {
            showToast(`❌ Order blocked, Modified SL ${modifiedRiskPercent}% should be < ${MAX_RISK_PERCENT}%: ${modifySymbol}`, "#f44336", 'orderModifyPopup');
        }, 0);  // Let browser render first

    } else {
        enableConfirmButton(applyButton, modifySymbol, 'orderModifyPopup')
        console.log(`✅ SL risk ${modifiedRiskPercent}% within limit. Modify enabled.`);
    }
}

function disablePortfolioStopLossRemoveButton() {
    // console.log(`DEBUGGING: Checking for disablePortfolioStopLossRemoveButton`);
    const portfolioListEle = document.querySelectorAll('[data-test="portfolio_list"]');
    if (!portfolioListEle) {
        return;
    }
    // console.log(`DEBUGGING: portfolio_list is present, checking for disablePortfolioStopLossRemoveButton`);

    portfolioListEle.forEach(portfolioList => {
        // Check if this portfolio list contains a "sl" column
        const portfolioSlEle = portfolioList.querySelectorAll('[data-test="sl"]');
        if (portfolioSlEle) {
            portfolioSlEle.forEach(portfolioSl => {
                const slToolTips = portfolioSl.querySelectorAll('[data-test="portfolio-interactive-value-tooltip"]');
                if (slToolTips) {
                    slToolTips.forEach(tooltip => {
                        const button = tooltip.querySelector('button');
                        if (button) {
                            button.disabled = true;
                            button.style.pointerEvents = 'none';
                            button.style.opacity = '0.5'; // Optional: visual cue
                            // console.log(`DEBUGGING: PortfolioStopLossRemoveButton is removed from portfolio_list.`);
                        }
                    });
                }
            });
        }
      });      
}

function isOpenTabCurrentlyActive() {
    const allTabs = document.querySelectorAll('[data-test^="portfolio_tabs_"]');
  
    if (!allTabs || allTabs.length === 0) return false;
  
    const activeTab = Array.from(allTabs).find(tab =>
      tab?.className?.includes('Tab_active')
    );
  
    if (!activeTab) return false;
  
    const dataTest = activeTab.getAttribute('data-test');
    return dataTest === 'portfolio_tabs_open';
}


function getBalanceValue() {
    const footerContainer = document.querySelector('[data-test="footer-container"]');
    if (!footerContainer) return null;
  
    const balanceWrapper = footerContainer.querySelector('[data-test="balance"]');
    if (!balanceWrapper) return null;
  
    const valueElement = balanceWrapper.querySelector('[data-test="value"] span');
    return valueElement ? valueElement.textContent.trim() : null;
}


function getPLValue() {
    const footer = document.querySelector('[data-test="footer-container"]');
    if (!footer) return null;
  
    const plValueElement = footer.querySelector('[data-test="pl-value"]');
    if (!plValueElement) return null;
  
    const valueSpan = plValueElement.querySelector('span span span');
    return valueSpan ? valueSpan.textContent.trim() : null;
}


function disableNewOrderPlacementForHigherRisk() {
    const balance = getBalanceValue();
    const pnl = getPLValue();
    let isHighRiskPnL = false;

    if (balance && pnl) {
        const balanceVal = strToFloat(balance);
        const pnlVal = strToFloat(pnl);

        // console.log(`DEBUGGING: Balance:${balanceVal} and pnl:${pnlVal}`);

        if (!isNaN(balanceVal) && !isNaN(pnlVal)) {
            const highRiskPnL = roundToTwoDecimals(balanceVal * HIGH_RISK_PERCENT * PERCENT_VALUE);
            const isHigherRisk = pnlVal < highRiskPnL;

            // console.log(`DEBUGGING: highRiskPnL:${highRiskPnL} and isHigherRisk:${isHigherRisk}`);

            if (isHigherRisk) {
                const msg = `❌ HIGH RISK ALERT! Order blocked, PnL is below ${HIGH_RISK_PERCENT}% of Balance(${balanceVal}). Consider closing open positions.}`;    
                const confirmBtn = document?.querySelector('button[data-test="order-panel-confirmation"]');
                disableConfirmButton(confirmBtn, msg);
                console.log(msg);
                setTimeout(() => {
                    showToast(msg, "#f44336", 'HighPriority');
                }, 0);  // Let browser render first
                isHighRiskPnL = true;
            }
        }
    }
    return isHighRiskPnL;
}

function strToFloat(str) {
    if (str) {
        const numericString = str.replace(/[^\d.-]+/g, '');
        const floatValue = parseFloat(numericString);
        return floatValue;
    }
    return NaN;
}


function calculateAdjustedMargin() {
    const container = document.querySelector('[data-test="order-panel-details"]');

    if (!container) {
      console.log("DEBUGGING: ⚠️ Container with data-test='order-panel-details' not found.");
      return null;
    }
  
    // Extract Leverage from data-test="leverage-type"
    let leverage = null;
    try {
      const leverageSpan = container.querySelector('[data-test="leverage-type"]');
      const leverageValueDiv = leverageSpan?.querySelector('[class^="OrderPanelDesktopDetails_value"]');
      const leverageText = leverageValueDiv?.textContent?.trim().toLowerCase();

      if (leverageText === '1:unlimited') {
        leverage = 10000;
        console.log("ℹ️ Leverage is unlimited, using 10000.");
      } else {
        const match = leverageText?.match(/1:(\d+)/);
        if (match) {
          leverage = parseFloat(match[1]);
        } else {
          console.warn("⚠️ Leverage format not recognized:", leverageText);
        }
      }
    } catch (err) {
      console.warn("⚠️ Error extracting leverage:", err);
    }

    // Extract Margin from data-test="margin-type"
    let margin = null;
    try {
      const marginSpan = container.querySelector('[data-test="margin-type"]');
      const marginValueDiv = marginSpan?.querySelector('[class^="OrderPanelDesktopDetails_value"]');
      const marginText = marginValueDiv?.textContent?.replace(/[^\d.,]/g, '').replace(/,/g, '');

      const parsedMargin = strToFloat(marginText);
      
      if (!isNaN(parsedMargin)) {
        margin = parsedMargin;
      } else {
        console.warn("⚠️ Could not parse margin value:", marginText);
      }
    } catch (err) {
      console.warn("⚠️ Error extracting margin:", err);
    }

    console.log(`Extracted Leverage=${leverage} & margin=${margin}`);
  
    // Final calculation
    if (margin === null || leverage === null) {
      console.warn("⚠️ Margin or leverage missing. Cannot calculate.");
      return null;
    }
  
    const adjusted = (margin * leverage) / MAX_CUSTOM_LEVERAGE;

    if (adjusted && adjustedMargin != adjusted) {
        adjustedMargin = adjusted;
        console.log(`adjusted margin value is updated to ${adjustedMargin}`);
    
        injectAdjustedMarginToDOM(adjustedMargin)
    } else {
        console.log(`adjusted margin value is old same as ${adjusted}`);
    }


    return adjustedMargin;
  }
  

  function injectAdjustedMarginToDOM(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      console.log("⚠️ Invalid margin value to inject.");
      return;
    }
  
    const equityWrapper = document.querySelector('[data-test="equity"]');
    const footerPanel = equityWrapper?.parentElement;
  
    if (!footerPanel) {
      console.log("⚠️ Footer panel not found.");
      return;
    }
  
    const existing = footerPanel.querySelector('[data-test="adjusted-margin"]');
  
    const formatted = value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " INR";
  
    if (existing) {
      // If already exists, just update value
      const span = existing.querySelector('[data-test="value"] span');
      if (span) {
        span.textContent = formatted;
        console.log("🔁 Updated  Adjusted Margin.");
      } else {
        console.log("⚠️ Could not find span to update value.");
      }
      return;
    }
  
    // Clone existing DOM node to preserve style
    const newWrapper = equityWrapper.cloneNode(true);
  
    newWrapper.setAttribute("data-test", "adjusted-margin");
  
    const label = newWrapper.querySelector('[data-test="label"]');
    const val = newWrapper.querySelector('[data-test="value"] span');
  
    if (label) label.textContent = "Adjusted Margin:";
    if (val) val.textContent = formatted;
  
    footerPanel.appendChild(newWrapper);
  
    console.log("✅ Injected  Adjusted Margin.");
  }
  
  

function startWatchers() {
    startLotSizeWatcher(); // << start the polling loop
    startSLRiskPercentWatcher();
    startSLRiskPercentModifyWatcher();
    startCoolDownWatcher((isOver) => {
        if (isCoolDownOver == isOver && isOver == true) {

        } else {
            isCoolDownOver = isOver;
        }
    });
    
}

startWatchers();

console.log("✅ Exness Lot Blocker script is running");