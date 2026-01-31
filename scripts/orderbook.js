// Order Book Table Logic

document.addEventListener("DOMContentLoaded", function() {
    // Sample data (Top levels of order book)
    // Left side = bid, right side = offer
    const rows = [];

    const fmt = new Intl.NumberFormat("en-US");

    let showAllRows = false;

    function render() {
        const tbody = document.getElementById("orderbook-body");
        tbody.innerHTML = "";
        const displayRows = showAllRows ? rows : rows.slice(0, 10);
        for (const r of displayRows) {
            function show(val) {
                return (val === '' || val === 0 || val === '0') ? '' : fmt.format(val);
            }
            const tr = document.createElement("tr");
            // Color logic for bid/offer price
            let bidClass = '', offerClass = '';
            let prevPrice = null;
            if (typeof window.lastPrevPrice === 'number') {
                prevPrice = window.lastPrevPrice;
            }
            if (prevPrice !== null) {
                if (r.bid === '') bidClass = '';
                else if (Number(r.bid) > prevPrice) bidClass = 'text-success';
                else if (Number(r.bid) < prevPrice) bidClass = 'text-danger';
                else bidClass = 'text-white';
                if (r.offer === '') offerClass = '';
                else if (Number(r.offer) > prevPrice) offerClass = 'text-success';
                else if (Number(r.offer) < prevPrice) offerClass = 'text-danger';
                else offerClass = 'text-white';
            }
            tr.innerHTML = `
              <td class="center">${r.bidStockSplit}</td>
              <td class="center">${show(r.bidBandarFreq)}</td>
              <td class="center">${show(r.bidFreq)}</td>
              <td class="center">${show(r.bidLot)}</td>
              <td class="center split-left ${bidClass}">${show(r.bid)}</td>
              <td class="center split-mid ${offerClass}">${show(r.offer)}</td>
              <td class="center">${show(r.offerLot)}</td>
              <td class="center">${show(r.offerFreq)}</td>
              <td class="center">${show(r.offerBandarFreq)}</td>
              <td class="center">${r.offerStockSplit}</td>
            `;
            tbody.appendChild(tr);
        }
        // Add show/collapse button
        let btn = document.getElementById('toggleRowsBtn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'toggleRowsBtn';
            btn.className = 'btn btn-outline-light btn-sm w-100 mt-2';
            btn.style.fontSize = '13px';
            btn.style.fontWeight = '500';
            btn.style.letterSpacing = '0.5px';
            btn.style.borderRadius = '8px';
            btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            btn.style.margin = '0 auto';
            tbody.parentElement.parentElement.appendChild(btn);
        }
        btn.textContent = showAllRows ? 'Collapse' : 'Show All';
        btn.onclick = function() {
            showAllRows = !showAllRows;
            render();
        };
        btn.style.display = rows.length > 10 ? 'block' : 'none';
    }

    function formatWithDot(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    window.setMinBidBandar = function(val) {
        document.getElementById("minBidBandarInput").value = formatWithDot(val);
        recalcBandarFreqAndRender();
    };

    const minBidBandarInput = document.getElementById("minBidBandarInput");
    minBidBandarInput.addEventListener("input", function(e) {
        let value = e.target.value.replace(/\D/g, "");
        value = formatWithDot(value);
        e.target.value = value;
    });

    // --- Cookie helpers ---
    function setCookie(name, value, days = 365) {
        const expires = new Date(Date.now() + days*864e5).toUTCString();
        document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/";
    }
    function getCookie(name) {
        return document.cookie.split('; ').reduce((r, v) => {
            const parts = v.split('=');
            return parts[0] === name ? decodeURIComponent(parts[1]) : r
        }, "");
    }

    // Move token input, code input, and button to top right
    document.addEventListener("DOMContentLoaded", function() {
        // Place token input, code input, and button at top right
        const topRight = document.createElement("div");
        topRight.style.position = "absolute";
        topRight.style.top = "10px";
        topRight.style.right = "10px";
        topRight.style.zIndex = "1000";
        topRight.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                <div>
                    <input id="tokenInput" type="text" placeholder="Token" style="width:220px;">
                    <button id="callApiBtn" class="btn btn-primary btn-sm">Call API</button>
                </div>
                <div style="margin-top:2px;">
                    <label for="codeInput" style="margin-right:6px;">Code</label>
                    <input id="codeInput" type="text" placeholder="PTRO" style="width:100px;">
                </div>
            </div>
        `;
        document.body.appendChild(topRight);
    });

    // Load token from cookie
    const callApiBtn = document.getElementById("callApiBtn");
    const codeInput = document.getElementById("codeInput");
    const orderBookCode = document.getElementById("orderBookCode");
    const apiResult = document.getElementById("company-price-feed-orderbook");
    const tokenInput = document.getElementById("tokenInput");
    if (tokenInput) {
        tokenInput.value = getCookie("api_token");
        tokenInput.addEventListener("input", function(e) {
            setCookie("api_token", e.target.value);
        });
    }

    // Collapsible JSON viewer
    function renderCollapsibleJSON(container, data) {
        container.innerHTML = '';
        function createNode(key, value, level) {
            const isObj = typeof value === 'object' && value !== null;
            const wrapper = document.createElement('div');
            wrapper.style.marginLeft = (level * 16) + 'px';
            if (isObj) {
                const toggle = document.createElement('span');
                toggle.textContent = '[+]';
                toggle.style.cursor = 'pointer';
                toggle.style.color = '#6cf';
                toggle.style.marginRight = '4px';
                let expanded = false;
                const keySpan = document.createElement('span');
                keySpan.textContent = key ? key + ': ' : '';
                keySpan.style.color = '#fff';
                wrapper.appendChild(toggle);
                wrapper.appendChild(keySpan);
                const type = Array.isArray(value) ? 'Array' : 'Object';
                const typeSpan = document.createElement('span');
                typeSpan.textContent = type;
                typeSpan.style.color = '#aaa';
                wrapper.appendChild(typeSpan);
                const children = document.createElement('div');
                children.style.display = 'none';
                for (const k in value) {
                    children.appendChild(createNode(k, value[k], level + 1));
                }
                wrapper.appendChild(children);
                toggle.onclick = function() {
                    expanded = !expanded;
                    toggle.textContent = expanded ? '[-]' : '[+]';
                    children.style.display = expanded ? '' : 'none';
                };
            } else {
                const keySpan = document.createElement('span');
                keySpan.textContent = key ? key + ': ' : '';
                keySpan.style.color = '#fff';
                wrapper.appendChild(keySpan);
                const valSpan = document.createElement('span');
                valSpan.textContent = JSON.stringify(value);
                valSpan.style.color = '#fc6';
                wrapper.appendChild(valSpan);
            }
            return wrapper;
        }
        container.appendChild(createNode('', data, 0));
    }

    // Update Order Book code badge and error handling after API call

    // Add a section in the drawer for order-queue result
    // Usage: show the result in a collapsible JSON viewer
    // This will be updated after the main render() call for clarity
    async function showOrderQueueResultInDrawer({ stockCode, actionType, price, token }) {
        const orderQueueResult = document.getElementById("orderqueue-result");
        if (!orderQueueResult) return;
        orderQueueResult.textContent = "Loading...";
        const data = await getOrderQueue({ stockCode, actionType, price, token });
        console.log(data);
        if (data) {
            renderCollapsibleJSON(orderQueueResult, data);
        } else {
            orderQueueResult.textContent = "No order-queue data or request failed.";
        }
    }

    // Refactored: Only call getOrderQueue ONCE per search, reuse result for drawer and table
    if (callApiBtn && codeInput && orderBookCode && tokenInput) {
        callApiBtn.addEventListener("click", async function() {
            let token = tokenInput.value.trim();
            let code = codeInput.value.trim().toUpperCase();
            if (!code) {
                if (apiResult) apiResult.textContent = "Please enter a stock code.";
                orderBookCode.textContent = "Incorrect error Stock code";
                return;
            }
            if (!token) {
                if (apiResult) apiResult.textContent = "Please enter a token.";
                orderBookCode.textContent = "Incorrect error Stock code";
                return;
            }
            if (apiResult) apiResult.textContent = "Loading...";
            try {
                // 1. Call orderbook API
                const response = await fetch(`https://exodus.stockbit.com/company-price-feed/v2/orderbook/companies/${code}` , {
                    method: "GET",
                    headers: {
                        "accept": "application/json",
                        "accept-language": "en",
                        "authorization": `Bearer ${token}`,
                        "origin": "https://stockbit.com",
                        "referer": "https://stockbit.com/",
                        "user-agent": navigator.userAgent
                    }
                });
                const text = await response.text();
                let data = null;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    if (apiResult) apiResult.textContent = text;
                    orderBookCode.textContent = "Incorrect error Stock code";
                    return;
                }
                if (!response.ok || !data || !data.data) {
                    if (apiResult) renderCollapsibleJSON(apiResult, data || { error: text });
                    orderBookCode.textContent = "Incorrect error Stock code";
                    return;
                }
                if (apiResult) renderCollapsibleJSON(apiResult, data);
                orderBookCode.textContent = code;
                const d = data.data;
                window.lastPrevPrice = typeof d.previous === 'number' ? d.previous : null;
                // 2. Call order-queue API (always, after orderbook)
                let bestBid = (d && Array.isArray(d.bid) && d.bid[0] && d.bid[0].price) ? d.bid[0].price : 0;
                const oqData = await getOrderQueue({ stockCode: code, actionType: ACTION_TYPE.BUY, price: bestBid, token });
                window.lastOrderQueueData = oqData;
                // Use this result for both drawer and table
                const orderQueueResult = document.getElementById("orderqueue-result");
                if (orderQueueResult) {
                    if (oqData) renderCollapsibleJSON(orderQueueResult, oqData);
                    else orderQueueResult.textContent = "No order-queue data or request failed.";
                }
                const minBidBandarVal = parseInt(minBidBandarInput.value.replace(/\D/g, ""), 10);
                const minBidBandar = isNaN(minBidBandarVal) ? null : minBidBandarVal;
                let orderQueueOrders = [];
                if (oqData && oqData.data && Array.isArray(oqData.data.orders)) {
                    orderQueueOrders = oqData.data.orders;
                }
                updateRowsFromAPI(d.bid || [], d.offer || [], orderQueueOrders, minBidBandar);
                render();
                set("infoOpen", d.open);
                set("infoPrev", d.previous);
                document.getElementById("infoLot").textContent = fmtVolume(d.volume/100);
                set("infoHigh", d.high);
                set("infoARA", d.ara.value);
                document.getElementById("infoVal").textContent = fmtVolume(d.value/100);
                set("infoLow", d.low);
                set("infoARB", d.arb.value);
                set("infoAvg", d.average);
                document.getElementById("infoFBuy").textContent = fmtVolume(d.fbuy/100);
                document.getElementById("infoFSell").textContent = fmtVolume(d.fsell/100);
                document.getElementById("infoFreq").textContent = fmtVolume(d.frequency);
                setColor("infoOpen", d.open, d.previous);
                setColor("infoHigh", d.high, d.previous);
                setColor("infoLow", d.low, d.previous);
                setColor("infoAvg", d.average, d.previous);
                window.lastPrevPrice = typeof d.previous === 'number' ? d.previous : null;
            } catch (err) {
                if (apiResult) apiResult.textContent = "Request failed: " + err;
                orderBookCode.textContent = "Incorrect error Stock code";
            }
        });
    }

    // --- Update table and bandar freq on minBidBandarInput input/change ---
    function recalcBandarFreqAndRender() {
        const minBidBandarVal = parseInt(minBidBandarInput.value.replace(/\D/g, ""), 10);
        const minBidBandar = isNaN(minBidBandarVal) ? null : minBidBandarVal;
        // Use cached order-queue data
        let orderQueueOrders = [];
        if (window.lastOrderQueueData && window.lastOrderQueueData.data && Array.isArray(window.lastOrderQueueData.data.orders)) {
            orderQueueOrders = window.lastOrderQueueData.data.orders;
        }
        // Use cached orderbook data
        let bidArr, offerArr;
        if (window.lastOrderBookData && window.lastOrderBookData.data) {
            bidArr = window.lastOrderBookData.data.bid;
            offerArr = window.lastOrderBookData.data.offer;
        } else {
            // If not available, keep previous rows (do not clear)
            bidArr = rows.map(r => ({
                stocksplit: r.bidStockSplit,
                que_num: r.bidFreq,
                volume: r.bidLot ? r.bidLot * 100 : undefined,
                price: r.bid
            }));
            offerArr = rows.map(r => ({
                stocksplit: r.offerStockSplit,
                que_num: r.offerFreq,
                volume: r.offerLot ? r.offerLot * 100 : undefined,
                price: r.offer
            }));
        }
        updateRowsFromAPI(bidArr, offerArr, orderQueueOrders, minBidBandar);
        render();
    }
    window.recalcBandarFreqAndRender = recalcBandarFreqAndRender;
    minBidBandarInput.addEventListener("input", recalcBandarFreqAndRender);
    minBidBandarInput.addEventListener("change", recalcBandarFreqAndRender);

    // Helper to update rows from API data, now with bandar freq calculation
    function updateRowsFromAPI(bidArr, offerArr, orderQueueOrders = [], minBidBandar = null) {
        const maxLen = Math.max(bidArr.length, offerArr.length, 5);
        rows.length = 0;
        // Calculate bandar freq for bid side if minBidBandar is a valid number and orderQueueOrders is available
        let bidBandarFreq = null;
        if (typeof minBidBandar === 'number' && !isNaN(minBidBandar) && Array.isArray(orderQueueOrders) && minBidBandar > 0) {
            bidBandarFreq = orderQueueOrders.filter(o => Number(o.lot) >= minBidBandar).length;
        }
        for (let i = 0; i < maxLen; i++) {
            const bid = bidArr[i] || {};
            const offer = offerArr[i] || {};
            function clean(val) {
                return (val === undefined || val === null || isNaN(val)) ? '' : val;
            }
            rows.push({
                bidStockSplit: clean(bid.stocksplit),
                bidFreq: clean(bid.que_num),
                bidLot: clean(bid.volume) ? Math.round(bid.volume / 100) : '',
                bid: clean(bid.price),
                bidBandarFreq: (i === 0 && bidBandarFreq !== null) ? bidBandarFreq : '',
                offer: clean(offer.price),
                offerStockSplit: clean(offer.stocksplit),
                offerBandarFreq: clean(offer.bandar_freq),
                offerLot: clean(offer.volume) ? Math.round(offer.volume / 100) : '',
                offerFreq: clean(offer.que_num)
            });
        }
    }

    // Remove the old async change event handler for minBidBandarInput (now handled by recalcBandarFreqAndRender)

    // Listen for changes in watchlist input and update cookie/buttons
    const watchlistInput = document.getElementById('watchlistInput');
    const watchlistBtnContainer = document.getElementById('watchlistBtnContainer');
    const saveWatchlistBtn = document.getElementById('saveWatchlistBtn');

    // Save watchlist to cookie and render buttons when Save is clicked
    if (saveWatchlistBtn) {
        saveWatchlistBtn.onclick = function() {
            const arr = watchlistInput.value.split(',').map(s => s.trim()).filter(Boolean);
            setCookie('watchlist', JSON.stringify(arr));
            renderWatchlistButtons();
        };
    }

    // On page load, restore watchlist value from cookie and render buttons
    const watchlistCookie = getCookie('watchlist');
    if (watchlistCookie && watchlistInput) {
        try {
            const arr = JSON.parse(watchlistCookie);
            watchlistInput.value = Array.isArray(arr) ? arr.join(', ') : watchlistCookie;
        } catch {
            watchlistInput.value = watchlistCookie;
        }
    }
    renderWatchlistButtons();

    function renderWatchlistButtons() {
        watchlistBtnContainer.innerHTML = '';
        let stocks = [];
        try {
            const val = getCookie('watchlist');
            stocks = JSON.parse(val);
            if (!Array.isArray(stocks)) stocks = [val];
        } catch {
            const val = getCookie('watchlist');
            stocks = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
        }
        stocks.forEach(stock => {
            if (!stock) return;
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-info btn-sm';
            btn.textContent = stock;
            btn.onclick = function() {
                document.getElementById('codeInput').value = stock;
                document.getElementById('callApiBtn').click();
            };
            watchlistBtnContainer.appendChild(btn);
        });
    }

    // Enum for action types
    const ACTION_TYPE = {
        BUY: "ACTION_TYPE_BUY",
        SELL: "ACTION_TYPE_SELL"
    };

    // Fetch order-queue API
    async function getOrderQueue({ stockCode, actionType, price, token, limit = 1000 }) {
        const url = `https://exodus.stockbit.com/order-trade/order-queue?stock_code=${encodeURIComponent(stockCode)}&action_type=${actionType}&board_type=BOARD_TYPE_REGULAR&order_status=ORDER_STATUS_OPEN&limit=${limit}&price=${encodeURIComponent(price)}&sort_by=SORT_BY_LOT&sort_direction=SORT_DIRECTION_DESC`;
        const headers = {
            "accept": "application/json",
            "accept-language": "en",
            "authorization": `Bearer ${token}`,
            "origin": "https://stockbit.com",
            "referer": "https://stockbit.com/",
            "user-agent": navigator.userAgent
        };
        try {
            const resp = await fetch(url, { headers });
            if (!resp.ok) return null;
            return await resp.json();
        } catch (e) {
            return null;
        }
    }

    render();
});
