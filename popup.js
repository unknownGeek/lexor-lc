// On popup load, request the MAX_LOT_SIZE_BY_SYMBOL from content.js
window.onload = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_MAX_LOT_SIZE_BY_SYMBOL' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.lotSizeMap) {
          console.error('Error fetching MAX_LOT_SIZE_BY_SYMBOL');
          return;
        }
  
        const lotSizeMap = response.lotSizeMap;
        const tableBody = document.getElementById('lotSizeTable').getElementsByTagName('tbody')[0];
  
        // Iterate over the map and add rows to the table
        for (let symbol in lotSizeMap) {
          const row = tableBody.insertRow();
          const cell1 = row.insertCell(0);
          const cell2 = row.insertCell(1);
          
          cell1.textContent = symbol;
          cell2.textContent = lotSizeMap[symbol];
        }
      });
    });
  };
  