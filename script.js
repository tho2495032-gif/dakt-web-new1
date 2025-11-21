// =================================================================
// 1. THÔNG TIN KÊNH (FIREBASE)
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyB2Z-7fiVIkz2eszlnovtuF3c09U0KzRm8",
  authDomain: "dakt-nc-n1.firebaseapp.com",
  databaseURL: "https://dakt-nc-n1-default-rtdb.firebaseio.com",
  projectId: "dakt-nc-n1",
  storageBucket: "dakt-nc-n1.appspot.com",
  messagingSenderId: "165204343511",
  appId: "1:165204343511:web:2c5d94dc53c7816055ce92",
  measurementId: "G-MYB4LQE566"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// =================================================================
// 2. KHAI BÁO DOM ELEMENTS
// =================================================================
const mucNuocDisplay = document.getElementById("muc-nuoc-value");
const nhietDoDisplay = document.getElementById("nhiet-do-value");
const doAmDisplay = document.getElementById("do-am-value");
const apSuatDisplay = document.getElementById("ap-suat-value");

const pumpStatusAutoDisplay = document.getElementById("pump-status-auto");
const alarmStatusDisplay = document.getElementById("alarm-status");
const timeDisplay = document.getElementById("current-time");
const dateDisplay = document.getElementById("current-date");

const currentIcon = document.getElementById("current-weather-icon");
const currentValue = document.getElementById("current-weather-value");
const forecastIcon = document.getElementById("forecast-icon");
const forecastValue = document.getElementById("forecast-value");

const btnModeAuto = document.getElementById("btn-mode-auto");
const btnModeManual = document.getElementById("btn-mode-manual");
const modeStatusDisplay = document.getElementById("mode-status");
const manualControlsDiv = document.getElementById("manual-controls");
const danhSachLog = document.getElementById("activity-log-list");

// Các nút điều khiển
const btnBomOn = document.getElementById("btn-bom-on");
const btnBomOff = document.getElementById("btn-bom-off");
const btnBatDong = document.getElementById("btn-bat-dong");
const btnBatMo = document.getElementById("btn-bat-mo");

let isAutomatic = true;
let mucNuocChart, nhietDoChart, doAmChart, apSuatChart;

// =================================================================
// 3. HÀM HỖ TRỢ (CHART, LOG, UI, COMMAND)
// =================================================================

// --- Khởi tạo biểu đồ ---
function createChart(ctx, label, color) {
    if (!ctx) return null;
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                backgroundColor: color + '33',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { display: false }, y: { display: true } },
            plugins: { legend: { display: false } }
        }
    });
}

// --- Cập nhật biểu đồ ---
function updateChart(chart, label, value) {
    if (!chart) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    if (chart.data.labels.length > 0) {
        const lastLabel = chart.data.labels[chart.data.labels.length - 1];
        if (label === lastLabel) {
            chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1] = numValue;
            chart.update('none');
            return;
        }
    }
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(numValue);
    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update(); 
}

// --- Gửi lệnh lên Firebase ---
function publishCommand(commandFeed, message) {
    const commandRef = database.ref(`commands/${commandFeed}`);
    commandRef.set(message)
        .then(() => {
            console.log(`Đã gửi lệnh: ${commandFeed} = ${message}`);
        })
        .catch((error) => {
            console.error("Gửi lệnh thất bại:", error);
            alert("Gửi lệnh thất bại!");
        });
}

// --- Cập nhật UI chế độ ---
function setModeUI(isAuto) {
    isAutomatic = isAuto;
    if (isAuto) {
        if (modeStatusDisplay) modeStatusDisplay.textContent = "TỰ ĐỘNG";
        if (manualControlsDiv) manualControlsDiv.classList.add("manual-controls-disabled");
    } else {
        if (modeStatusDisplay) modeStatusDisplay.textContent = "THỦ CÔNG";
        if (manualControlsDiv) manualControlsDiv.classList.remove("manual-controls-disabled");
    }
}

// --- Ghi Log ---
function addLog(message, type) {
    if (!danhSachLog) return;
    const placeholderLog = danhSachLog.querySelector(".log-item");
    if (placeholderLog && (placeholderLog.textContent.includes("Đang chờ") || placeholderLog.textContent.includes("[--:--]"))) {
        danhSachLog.innerHTML = "";
    }
    const newItem = document.createElement("li");
    newItem.className = "log-item " + type; 
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    newItem.innerHTML = `<span class="log-time">[${timeString}]</span> <span class="log-desc">${message}</span>`;
    danhSachLog.prepend(newItem);
    if (danhSachLog.children.length > 20) {
        danhSachLog.removeChild(danhSachLog.lastChild);
    }
}

// =================================================================
// 4. HÀM DỰ BÁO MƯA (MACHINE LEARNING - DECISION TREE)
// =================================================================
// Trả về: 1 (Có Mưa), 0 (Không Mưa)
function predictRainML(temp, hum, press) {
    temp = parseFloat(temp);
    hum = parseFloat(hum);
    press = parseFloat(press);

    // Nhánh 1: Độ ẩm thấp
    if (hum <= 72.5) {
        if (press <= 1010.5) {
            if (temp <= 28.8) {
                return 0; // Tất cả nhánh con đều ra 0
            } else { 
                if (hum <= 63.5) return 0;
                else return 1; // (Nhiệt độ > 30.2 hay <= 30.2 đều ra 1)
            }
        } else { // press > 1010.5
            if (hum <= 64.5) {
                return 0; // Tất cả nhánh con đều ra 0
            } else { 
                if (temp <= 29.2) {
                    if (temp <= 16.8) return 1;
                    else return 0; 
                } else { 
                    if (hum <= 68.5) return 0;
                    else return 1; 
                }
            }
        }
    } 
    // Nhánh 2: Độ ẩm cao
    else { 
        if (press <= 1009.5) {
            return 1; // Toàn bộ nhánh con ở đây đều ra MƯA (1) -> Cắt tỉa
        } else { 
            if (hum <= 80.5) {
                if (temp <= 27.8) {
                    if (hum <= 75.5) return 0;
                    else return 1; 
                } else {
                    return 1; // (DoAm > 75.5 hay <= 75.5 ở nhánh này đều 1)
                }
            } else { 
                return 1; // (DoAm > 80.5 -> Tất cả nhánh con đều 1) -> Cắt tỉa
            }
        }
    }
}

// =================================================================
// 5. LẮNG NGHE DỮ LIỆU TỪ FIREBASE (MAIN LOGIC KẾT HỢP)
// =================================================================
const sensorsRef = database.ref('sensors');
sensorsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // 1. CẬP NHẬT THỜI GIAN & BIỂU ĐỒ
    let timeLabel;
    if (data.datetime) timeLabel = data.datetime.split(' ')[1];
    else {
        const now = new Date();
        timeLabel = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
    }

    try {
        // Hiển thị số liệu
        if (mucNuocDisplay && data.mucnuoc !== undefined) mucNuocDisplay.textContent = parseFloat(data.mucnuoc).toFixed(1) + " cm";
        if (nhietDoDisplay && data.nhietdo !== undefined) nhietDoDisplay.textContent = parseFloat(data.nhietdo).toFixed(1) + " °C";
        if (doAmDisplay && data.doam !== undefined) doAmDisplay.textContent = parseFloat(data.doam).toFixed(1) + " %";
        if (apSuatDisplay && data.apsuat !== undefined) apSuatDisplay.textContent = parseFloat(data.apsuat).toFixed(1) + " hPa";
        
        updateChart(mucNuocChart, timeLabel, data.mucnuoc);
        updateChart(nhietDoChart, timeLabel, data.nhietdo);
        updateChart(doAmChart, timeLabel, data.doam);
        updateChart(apSuatChart, timeLabel, data.apsuat);

        // 2. LOGIC BƠM NƯỚC (GIỮ NGUYÊN)
        if (pumpStatusAutoDisplay && data.mucnuoc !== undefined) {
             const nguongBat = 1.0, nguongTat = 3.0;
             const mn = parseFloat(data.mucnuoc);
             if (mn < nguongBat && isAutomatic) {
                 pumpStatusAutoDisplay.textContent = "THẤP (Bật)";
                 if (pumpStatusAutoDisplay.dataset.lastStatus !== "ON") {
                     addLog(`Tự động BẬT BƠM (Mực nước < ${nguongBat}cm)`, "auto");
                     publishCommand("bom", 1); 
                     pumpStatusAutoDisplay.dataset.lastStatus = "ON";
                 }
             } else if (mn > nguongTat && isAutomatic) {
                 pumpStatusAutoDisplay.textContent = "OK (Tắt)";
                 if (pumpStatusAutoDisplay.dataset.lastStatus !== "OFF") {
                     addLog(`Tự động TẮT BƠM (Mực nước > ${nguongTat}cm)`, "auto");
                     publishCommand("bom", 0); 
                     pumpStatusAutoDisplay.dataset.lastStatus = "OFF";
                 }
             } else if (!isAutomatic) {
                 pumpStatusAutoDisplay.textContent = "TẮT (Thủ công)";
                 pumpStatusAutoDisplay.dataset.lastStatus = "MANUAL";
             } else {
                 pumpStatusAutoDisplay.textContent = "OK (Tắt)";
                 pumpStatusAutoDisplay.dataset.lastStatus = "OFF";
             }
         }

        // =============================================================
        // 3. LOGIC KẾT HỢP (CẢM BIẾN + ML) ĐỂ ĐIỀU KHIỂN BẠT
        // =============================================================
        
        // B1: Lấy kết quả ML (1=Mưa, 0=Tạnh)
        let mlRain = 0;
        if (data.nhietdo !== undefined && data.doam !== undefined && data.apsuat !== undefined) {
            mlRain = predictRainML(data.nhietdo, data.doam, data.apsuat);
        }

        // B2: Lấy kết quả Cảm biến thực tế (muaroi)
        // --- SỬA LẠI: 1 LÀ MƯA, 0 LÀ TẠNH ---
        let sensorRain = 0;
        if (data.muaroi == "1") {
            sensorRain = 1; // Có mưa
        } else {
            sensorRain = 0; // Tạnh
        }

        // B3: Logic Kết hợp (Nếu 1 trong 2 báo Mưa -> Đóng Bạt)
        let isRainingFinal = (mlRain === 1 || sensorRain === 1); 

        // --- Hiển thị UI Dự Báo (ML) ---
        if (forecastIcon && forecastValue) {
            if (mlRain === 1) {
                forecastIcon.textContent = "🌧️";
                forecastValue.textContent = "ML: CÓ MƯA";
            } else {
                forecastIcon.textContent = "☀️";
                forecastValue.textContent = "ML: Trời ráo";
            }
        }
        
        // --- Hiển thị UI Cảm biến (Sensor) ---
        if (currentIcon && currentValue) {
            if (sensorRain === 1) { 
                currentIcon.textContent = "🌧️";
                currentValue.textContent = "CB: Đang mưa";
            } else {
                currentIcon.textContent = "☀️";
                currentValue.textContent = "CB: Trời ráo";
            }
        }

        // --- THỰC HIỆN ĐIỀU KHIỂN (AUTO MODE) ---
        if (isAutomatic) {
            const controlStatusDiv = document.getElementById("mode-status");
            
            if (isRainingFinal) {
                // === MƯA HOẶC DỰ BÁO MƯA ===
                if (alarmStatusDisplay) alarmStatusDisplay.textContent = "BẬT (Auto)";
                
                // Chỉ gửi lệnh nếu trạng thái trước đó chưa phải là 'RAIN'
                if (controlStatusDiv.dataset.rainStatus !== "RAIN") {
                    let lyDo = (sensorRain === 1) ? "Cảm biến phát hiện mưa" : "ML Dự báo mưa";
                    addLog(`☔ ${lyDo} -> ĐÓNG BẠT & BẬT CÒI`, "auto");
                    
                    publishCommand("motor", 0);   // 0 = Đóng
                    publishCommand("baohieu", 1); // 1 = Bật còi
                    
                    controlStatusDiv.dataset.rainStatus = "RAIN";
                }
            } else {
                // === TRỜI TẠNH RÁO (CẢ 2 ĐỀU KHÔNG BÁO MƯA) ===
                if (alarmStatusDisplay) alarmStatusDisplay.textContent = "TẮT";
                
                // Chỉ gửi lệnh nếu trạng thái trước đó chưa phải là 'SUN'
                if (controlStatusDiv.dataset.rainStatus !== "SUN") {
                    addLog("☀️ Trời tạnh ráo -> MỞ BẠT & TẮT CÒI", "auto");
                    
                    publishCommand("motor", 1);   // 1 = Mở
                    publishCommand("baohieu", 0); // 0 = Tắt còi
                    
                    controlStatusDiv.dataset.rainStatus = "SUN";
                }
            }
        }

    } catch (e) { console.error("Lỗi xử lý logic:", e); }
});

// =============================================================
// 6. GÁN HÀNH ĐỘNG CHO CÁC NÚT BẤM
// =============================================================

// --- MODE ---
const modeRef = database.ref('commands/Mode'); 
modeRef.on('value', (snapshot) => {
    const val = snapshot.val();
    // 1 = Auto, 0 = Manual
    setModeUI(val === 1);
});

if (btnModeAuto) btnModeAuto.addEventListener("click", () => {
    publishCommand("Mode", 1); 
    addLog("Chuyển sang chế độ TỰ ĐỘNG", "manual");
});
if (btnModeManual) btnModeManual.addEventListener("click", () => {
    publishCommand("Mode", 0); 
    addLog("Chuyển sang chế độ THỦ CÔNG", "manual");
});

// --- BƠM (1=Bật, 0=Tắt) ---
if (btnBomOn) btnBomOn.addEventListener("click", () => {
    if (!isAutomatic) { publishCommand("bom", 1); addLog("Người dùng BẬT BƠM", "manual"); }
});
if (btnBomOff) btnBomOff.addEventListener("click", () => {
    if (!isAutomatic) { publishCommand("bom", 0); addLog("Người dùng TẮT BƠM", "manual"); }
});

// --- MOTOR (1=Mở, 0=Đóng) ---
if (btnBatDong) btnBatDong.addEventListener("click", () => {
    if (!isAutomatic) { 
        publishCommand("motor", 0); 
        addLog("Người dùng ĐÓNG BẠT", "manual"); 
    }
});
if (btnBatMo) btnBatMo.addEventListener("click", () => {
    if (!isAutomatic) { 
        publishCommand("motor", 1); 
        addLog("Người dùng MỞ BẠT", "manual"); 
    }
});

// =============================================================
// 7. KHỞI TẠO VÀ TIME LOOP
// =============================================================
document.addEventListener("DOMContentLoaded", function() {
    try {
        mucNuocChart = createChart(document.getElementById('mucNuocChart').getContext('2d'), 'Mực nước', '#007bff');
        nhietDoChart = createChart(document.getElementById('nhietDoChart').getContext('2d'), 'Nhiệt độ', '#dc3545');
        doAmChart = createChart(document.getElementById('doAmChart').getContext('2d'), 'Độ ẩm', '#17a2b8');
        apSuatChart = createChart(document.getElementById('apSuatChart').getContext('2d'), 'Áp suất', '#ffc107');
        console.log("Đã khởi tạo 4 biểu đồ Chart.js");
    } catch (e) {
        console.error("Lỗi khởi tạo Chart.js.", e);
    }
    
    if(danhSachLog) {
        danhSachLog.innerHTML = "";
        addLog("Khởi động hệ thống & kết nối Firebase...", "auto");
    }

    const tabButtons = document.querySelectorAll(".tab-button");
    const pages = document.querySelectorAll(".page");
    const headerTitle = document.getElementById("header-title");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            const targetPageId = button.getAttribute("data-page");
            const targetPage = document.getElementById(targetPageId);
            const targetTitle = button.querySelector(".tab-label").textContent;
            tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            pages.forEach(page => page.classList.remove("active"));
            if(targetPage) targetPage.classList.add("active");
            if(headerTitle) headerTitle.textContent = targetTitle;
        });
    });

    const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const dayName = daysOfWeek[now.getDay()];
        if (timeDisplay) { timeDisplay.textContent = `${hours}:${minutes}:${seconds}`; }
        if (dateDisplay) { dateDisplay.textContent = `${dayName}, ngày ${day}/${month}/${year}`; }
    }
    updateTime();
    setInterval(updateTime, 1000);
});
