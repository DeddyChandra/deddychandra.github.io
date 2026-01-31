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
        return document.cookie.split("; ").reduce((r, v) => {
            const parts = v.split("=");
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
                    <input id="codeInput" type="text" placeholder="BUMI" style="width:100px;">
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

    if (callApiBtn && codeInput && orderBookCode && tokenInput) {
        callApiBtn.addEventListener("click", async function() {
            const token = tokenInput.value.trim();
            const code = codeInput.value.trim().toUpperCase() || "BUMI";
            if (!token) {
                if (apiResult) apiResult.textContent = "Please enter a token.";
                orderBookCode.textContent = "Incorrect error Stock code";
                return;
            }
            if (apiResult) apiResult.textContent = "Loading...";
            try {
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
                    // Not JSON, show raw text
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
                // Update info bar with API data
                const d = data.data;
                // In API response handler, set window.lastPrevPrice BEFORE updateRowsFromAPI and render
                window.lastPrevPrice = typeof d.previous === 'number' ? d.previous : null;
                // Update rows from API and render
                updateRowsFromAPI(d.bid || [], d.offer || []);
                // Force a second render to ensure color logic applies after lastPrevPrice is set
                render();
                // Helper for formatting
                function fmtNum(val, digits = 2) {
                    if (val == null || val === '') return "-";
                    return val.toString();
                }
                function fmtVolume(val) {
                    if (val == null) return "-";
                    val = Number(val);
                    if (Math.abs(val) >= 1e9) return (val/1e9).toFixed(2) + " B";
                    if (Math.abs(val) >= 1e6) return (val/1e6).toFixed(2) + " M";
                    if (Math.abs(val) >= 1e3) return (val/1e3).toFixed(2) + " K";
                    return val.toString();
                }
                function set(id, val) {
                    const el = document.getElementById(id);
                    if (el) el.textContent = fmtNum(val);
                }
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

                // --- Dynamic color logic ---
                function setColor(id, value, prev) {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.classList.remove("text-success", "text-danger", "text-white");
                    if (value > prev) el.classList.add("text-success");
                    else if (value < prev) el.classList.add("text-danger");
                    else el.classList.add("text-white");
                }
                // Open, High, Low, Avg vs Prev
                setColor("infoOpen", d.open, d.previous);
                setColor("infoHigh", d.high, d.previous);
                setColor("infoLow", d.low, d.previous);
                setColor("infoAvg", d.average, d.previous);

                // In API response handler, set window.lastPrevPrice
                window.lastPrevPrice = typeof d.previous === 'number' ? d.previous : null;
            } catch (err) {
                if (apiResult) apiResult.textContent = "Request failed: " + err;
                orderBookCode.textContent = "Incorrect error Stock code";
            }
        });
    }

    // Helper to update rows from API data
    function updateRowsFromAPI(bidArr, offerArr) {
        const maxLen = Math.max(bidArr.length, offerArr.length, 5);
        rows.length = 0;
        for (let i = 0; i < maxLen; i++) {
            const bid = bidArr[i] || {};
            const offer = offerArr[i] || {};
            function clean(val) {
                return (val === undefined || val === null || isNaN(val) || val === 0) ? '' : val;
            }
            rows.push({
                bidStockSplit: clean(bid.stocksplit),
                bidFreq: clean(bid.que_num),
                bidLot: clean(bid.volume) ? Math.round(bid.volume / 100) : '',
                bid: clean(bid.price),
                bidBandarFreq: clean(bid.bandar_freq),
                offer: clean(offer.price),
                offerStockSplit: clean(offer.stocksplit),
                offerBandarFreq: clean(offer.bandar_freq),
                offerLot: clean(offer.volume) ? Math.round(offer.volume / 100) : '',
                offerFreq: clean(offer.que_num)
            });
        }
    }

    render();
});
