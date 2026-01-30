// Order Book Table Logic

document.addEventListener("DOMContentLoaded", function() {
    // Sample data (Top levels of order book)
    // Left side = bid, right side = offer
    const rows = [
        { bidStockSplit: "1:2", bidFreq: 12, bidLot: 340, bid: 990, bidBandarFreq: 3, offer: 1000, offerStockSplit: "1:5", offerBandarFreq: 2, offerLot: 210, offerFreq: 9 },
        { bidStockSplit: "1:2", bidFreq: 10, bidLot: 280, bid: 985, bidBandarFreq: 2, offer: 1005, offerStockSplit: "1:5", offerBandarFreq: 1, offerLot: 180, offerFreq: 7 },
        { bidStockSplit: "1:2", bidFreq: 8,  bidLot: 190, bid: 980, bidBandarFreq: 1, offer: 1010, offerStockSplit: "1:5", offerBandarFreq: 2, offerLot: 150, offerFreq: 6 },
        { bidStockSplit: "1:2", bidFreq: 6,  bidLot: 160, bid: 975, bidBandarFreq: 1, offer: 1015, offerStockSplit: "1:5", offerBandarFreq: 1, offerLot: 120, offerFreq: 5 },
        { bidStockSplit: "1:2", bidFreq: 4,  bidLot: 120, bid: 970, bidBandarFreq: 0, offer: 1020, offerStockSplit: "1:5", offerBandarFreq: 0, offerLot: 100, offerFreq: 4 }
    ];

    const fmt = new Intl.NumberFormat("en-US");

    function render() {
        const tbody = document.getElementById("orderbook-body");
        tbody.innerHTML = "";

        for (const r of rows) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td class="center">${r.bidStockSplit}</td>
              <td class="center">${fmt.format(r.bidBandarFreq)}</td>
              <td class="center">${fmt.format(r.bidFreq)}</td>
              <td class="center">${fmt.format(r.bidLot)}</td>
              <td class="center split-left">${fmt.format(r.bid)}</td>
              <td class="center split-mid">${fmt.format(r.offer)}</td>
              <td class="center">${fmt.format(r.offerLot)}</td>
              <td class="center">${fmt.format(r.offerFreq)}</td>
              <td class="center">${fmt.format(r.offerBandarFreq)}</td>
              <td class="center">${r.offerStockSplit}</td>
            `;
            tbody.appendChild(tr);
        }
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

    // API call logic for the drawer
    const callApiBtn = document.getElementById("callApiBtn");
    const tokenInput = document.getElementById("tokenInput");
    const apiResult = document.getElementById("apiResult");

    if (callApiBtn && tokenInput && apiResult) {
        callApiBtn.addEventListener("click", async function() {
            const token = tokenInput.value.trim();
            if (!token) {
                apiResult.textContent = "Please enter a token.";
                return;
            }
            apiResult.textContent = "Loading...";
            try {
                const response = await fetch("https://exodus.stockbit.com/company-price-feed/v2/orderbook/companies/DEWA", {
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
                if (!response.ok) {
                    const text = await response.text();
                    apiResult.textContent = `Error: ${response.status} ${response.statusText}\n${text}`;
                    return;
                }
                const data = await response.json();
                apiResult.textContent = JSON.stringify(data, null, 2);

                // Update info bar with API data
                if (data && data.data) {
                    const d = data.data;
                    // Helper for formatting
                    function fmtNum(val, digits = 2) {
                        if (val == null) return "-";
                        if (Math.abs(val) >= 1e9) return (val/1e9).toFixed(digits) + " B";
                        if (Math.abs(val) >= 1e6) return (val/1e6).toFixed(digits) + " M";
                        if (Math.abs(val) >= 1e3) return (val/1e3).toFixed(digits) + " K";
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
                    function set(id, val, digits) {
                        const el = document.getElementById(id);
                        if (el) el.textContent = fmtNum(val, digits);
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
                }
            } catch (err) {
                apiResult.textContent = "Request failed: " + err;
            }
        });
    }

    render();
});
