// content.js removed: trading-specific logic replaced by the Problem Description Extractor
// The extraction logic now lives in `webpage_content_extractor.js`.

// Intentionally empty placeholder file to avoid executing old code.

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