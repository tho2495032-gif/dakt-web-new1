// =================================================================
// 1. THÔNG TIN KÊNH (FIREBASE)
// =================================================================


const firebaseConfig = {
  apiKey: "AIzaSyB2Z-7fiVIkz2eszlnovtuF3c09U0KzRm8",
  authDomain: "dakt-nc-n1.firebaseapp.com",
  databaseURL: "https://dakt-nc-n1-default-rtdb.firebaseio.com",
  projectId: "dakt-nc-n1",
  storageBucket: "dakt-nc-n1.appspot.com", // Tôi đã sửa lỗi chính tả
  messagingSenderId: "165204343511",
  appId: "1:165204343511:web:2c5d94dc53c7816055ce92",
  measurementId: "G-MYB4LQE566"
};

// Khởi tạo Firebase (Dùng cách nhúng script <script src="...">)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Lấy các phần tử HTML (Giữ nguyên) ---
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
const btnBomOn = document.getElementById("btn-bom-on");
const btnBomOff = document.getElementById("btn-bom-off");
const btnBatDong = document.getElementById("btn-bat-dong");
const btnBatMo = document.getElementById("btn-bat-mo");
const btnBatDung = document.getElementById("btn-bat-dung");
const btnAlarmOn = document.getElementById("btn-alarm-on");
const btnAlarmOff = document.getElementById("btn-alarm-off");
const danhSachLog = document.getElementById("activity-log-list");

let isAutomatic = true;

// --- Biến toàn cục cho 4 Biểu đồ ---
let mucNuocChart, nhietDoChart, doAmChart, apSuatChart;

// --- HÀM KHỞI TẠO BIỂU ĐỒ (Dùng Chart.js) ---
function createChart(ctx, label, color) {
    if (!ctx) return null; // Thêm kiểm tra nếu không tìm thấy canvas
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Mảng các nhãn thời gian
            datasets: [{
                label: label,
                data: [], // Mảng các giá trị
                borderColor: color,
                backgroundColor: color + '33', // Màu nền (hơi trong)
                borderWidth: 2,
                fill: true,
                tension: 0.3 // Làm mượt đường
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false }, // Ẩn trục X
                y: { display: true } // Hiện trục Y
            },
            plugins: {
                legend: { display: false } // Ẩn chú thích
            }
        }
    });
}

// --- HÀM CẬP NHẬT BIỂU ĐỒ ---
// --- HÀM CẬP NHẬT BIỂU ĐỒ (Đã sửa lỗi trùng lặp) ---
function updateChart(chart, label, value) {
    if (!chart) return;
    
    // 1. Kiểm tra dữ liệu hợp lệ
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // 2. CHẶN TRÙNG LẶP: Kiểm tra nếu nhãn thời gian mới (label) 
    // giống hệt nhãn thời gian cuối cùng đã vẽ.
    if (chart.data.labels.length > 0) {
        const lastLabel = chart.data.labels[chart.data.labels.length - 1];
        if (label === lastLabel) {
            // Nếu trùng giờ/phút/giây, ta chỉ CẬP NHẬT lại giá trị cuối cùng
            // thay vì vẽ thêm điểm mới chồng lên.
            chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1] = numValue;
            chart.update('none');
            return; // Thoát hàm, không vẽ thêm
        }
    }

    // 3. Nếu không trùng, vẽ điểm mới bình thường
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(numValue);

    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update(); // Xóa 'none' để có hiệu ứng lướt nhẹ cho đẹp
}


// --- 3. HÀM GỬI LỆNH (Thay cho publishCommand) ---
// Ghi dữ liệu vào "node" 'commands' trên Firebase
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

// --- 4. HÀM LẮNG NGHE DỮ LIỆU TỪ FIREBASE ---
const sensorsRef = database.ref('sensors');
sensorsRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) {
        console.warn("Không có dữ liệu 'sensors' trên Firebase.");
        return;
    }

    console.log("Web App nhận được dữ liệu:", data);
    
    let timeLabel;
if (data.datetime) {
    // Nếu có trường datetime (ví dụ: "09/11/2025 00:30:01")
    // Chúng ta tách chuỗi này ra bằng khoảng trắng và lấy phần thứ 2 (là giờ)
    timeLabel = data.datetime.split(' ')[1]; // Kết quả sẽ là "00:30:01"
} else {
    // Dự phòng nếu lỡ ESP quên gửi datetime
    const timestamp = data.timestamp ? data.timestamp * 1000 : Date.now();
    const now = new Date(timestamp);
    // Thêm số 0 ở đầu nếu giờ/phút/giây nhỏ hơn 10 nhìn cho đẹp
    timeLabel = String(now.getHours()).padStart(2, '0') + ':' + 
                String(now.getMinutes()).padStart(2, '0') + ':' + 
                String(now.getSeconds()).padStart(2, '0');
}

    try {
        // Cập nhật các giá trị Text
        if (mucNuocDisplay && data.mucnuoc !== undefined) mucNuocDisplay.textContent = parseFloat(data.mucnuoc).toFixed(1) + " cm";
        if (nhietDoDisplay && data.nhietdo !== undefined) nhietDoDisplay.textContent = parseFloat(data.nhietdo).toFixed(1) + " °C";
        if (doAmDisplay && data.doam !== undefined) doAmDisplay.textContent = parseFloat(data.doam).toFixed(1) + " %";
        if (apSuatDisplay && data.apsuat !== undefined) apSuatDisplay.textContent = parseFloat(data.apsuat).toFixed(1) + " hPa";

        // Cập nhật 4 Biểu đồ
        updateChart(mucNuocChart, timeLabel, data.mucnuoc);
        updateChart(nhietDoChart, timeLabel, data.nhietdo);
        updateChart(doAmChart, timeLabel, data.doam);
        updateChart(apSuatChart, timeLabel, data.apsuat);

        // --- Logic cũ của bạn (Giữ nguyên) ---
        if (pumpStatusAutoDisplay && data.mucnuoc !== undefined) {
            const nguongBat = 1.0, nguongTat = 3.0;
            if (parseFloat(data.mucnuoc) < nguongBat && isAutomatic) {
                pumpStatusAutoDisplay.textContent = "THẤP (Bật)";
                if (pumpStatusAutoDisplay.dataset.lastStatus !== "ON") {
                    addLog(`Tự động BẬT BƠM (Mực nước < ${nguongBat}cm)`, "auto");
                    pumpStatusAutoDisplay.dataset.lastStatus = "ON";
                }
            } else if (parseFloat(data.mucnuoc) > nguongTat && isAutomatic) {
                pumpStatusAutoDisplay.textContent = "OK (Tắt)";
                if (pumpStatusAutoDisplay.dataset.lastStatus !== "OFF") {
                    addLog(`Tự động TẮT BƠM (Mực nước > ${nguongTat}cm)`, "auto");
                    pumpStatusAutoDisplay.dataset.lastStatus = "OFF";
                }
            } else if (!isAutomatic) {
                pumpStatusAutoDisplay.textContent = "TẮT (Thủ công)";
                pumpStatusAutoDisplay.dataset.lastStatus = "MANUAL";
            } else if (isAutomatic) {
                pumpStatusAutoDisplay.textContent = "OK (Tắt)";
                pumpStatusAutoDisplay.dataset.lastStatus = "OFF";
            }
        }

        if (forecastIcon && forecastValue && data.dubao !== undefined) {
            if (data.dubao == "1") {
                forecastIcon.textContent = "🌧️";
                forecastValue.textContent = "Dự báo: CÓ MƯA!";
                if (alarmStatusDisplay) alarmStatusDisplay.textContent = "BẬT (Tự động)";
                if (isAutomatic && forecastValue.dataset.lastStatus !== "RAIN") {
                    addLog("Tự động BẬT BÁO ĐỘNG (Dự báo mưa)", "auto");
                    addLog("Tự động ĐÓNG BẠT (Motor 1)", "auto");
                }
                forecastValue.dataset.lastStatus = "RAIN";
            } else {
                forecastIcon.textContent = "☀️";
                forecastValue.textContent = "Dự báo: Trời ráo";
                if (alarmStatusDisplay) alarmStatusDisplay.textContent = "TẮT";
                if (isAutomatic && forecastValue.dataset.lastStatus !== "SUN") {
                    addLog("Tự động MỞ BẠT (Motor 2)", "auto");
                }
                forecastValue.dataset.lastStatus = "SUN";
            }
        }

        if (currentIcon && currentValue && data.cbmua !== undefined) {
            if (data.cbmua == "1") {
                currentIcon.textContent = "🌧️";
                currentValue.textContent = "Đang mưa";
            } else {
                currentIcon.textContent = "☀️";
                currentValue.textContent = "Trời ráo";
            }
        }
        
    } catch (e) {
        console.error("Lỗi xử lý dữ liệu Firebase:", e);
    }
});


// --- 5. GÁN HÀNH ĐỘNG CHO CÁC NÚT BẤM (Đã cập nhật) ---
if (btnModeAuto) btnModeAuto.addEventListener("click", () => {
    publishCommand("tonghop", "6"); // Gửi "6" tới node 'commands/tonghop'
    setModeUI(true); 
    addLog("Chuyển sang chế độ TỰ ĐỘNG", "manual");
});
if (btnModeManual) btnModeManual.addEventListener("click", () => {
    publishCommand("tonghop", "5");
    setModeUI(false); 
    addLog("Chuyển sang chế độ THỦ CÔNG", "manual");
});
if (btnBomOn) btnBomOn.addEventListener("click", () => {
    if (!isAutomatic) { publishCommand("tonghop", "1"); addLog("Người dùng BẬT BƠM", "manual"); }
});
if (btnBomOff) btnBomOff.addEventListener("click", () => {
    if (!isAutomatic) { publishCommand("tonghop", "2"); addLog("Người dùng TẮT BƠM", "manual"); }
});
if (btnBatDong) btnBatDong.addEventListener("click", () => {
    if (!isAutomatic) { publishCommand("motor", "1"); addLog("Người dùng ĐÓNG BẠT", "manual"); } // Gửi tới 'commands/motor'
});
if (btnBatMo) btnBatMo.addEventListener("click", () => {
    if (!isAutomatic) { publishCommand("motor", "2"); addLog("Người dùng MỞ BẠT", "manual"); }
});
if (btnBatDung) btnBatDung.addEventListener("click", () => {
    if (!isAutomatic) { publishCommand("motor", "0"); addLog("Người dùng DỪNG BẠT", "manual"); }
});
if (btnAlarmOn) btnAlarmOn.addEventListener("click", () => {
    if (!isAutomatic) {
        publishCommand("tonghop", "3");
        if (alarmStatusDisplay) alarmStatusDisplay.textContent = "BẬT (Thủ công)";
        addLog("Người dùng BẬT BÁO ĐỘNG", "manual");
    }
});
if (btnAlarmOff) btnAlarmOff.addEventListener("click", () => {
    if (!isAutomatic) {
        publishCommand("tonghop", "4");
        if (alarmStatusDisplay) alarmStatusDisplay.textContent = "TẮT (Thủ công)";
        addLog("Người dùng TẮT BÁO ĐỘNG", "manual");
    }
});


// --- LOGIC TAB MENU VÀ KHỞI TẠO (Đã cập nhật) ---
document.addEventListener("DOMContentLoaded", function() {

    // 1. KHỞI TẠO 4 BIỂU ĐỒ
    try {
        mucNuocChart = createChart(document.getElementById('mucNuocChart').getContext('2d'), 'Mực nước', '#007bff');
        nhietDoChart = createChart(document.getElementById('nhietDoChart').getContext('2d'), 'Nhiệt độ', '#dc3545');
        doAmChart = createChart(document.getElementById('doAmChart').getContext('2d'), 'Độ ẩm', '#17a2b8');
        apSuatChart = createChart(document.getElementById('apSuatChart').getContext('2d'), 'Áp suất', '#ffc107');
        console.log("Đã khởi tạo 4 biểu đồ Chart.js");
    } catch (e) {
        console.error("Lỗi khởi tạo Chart.js. Bạn đã sửa file index.html để dùng <canvas> chưa?", e);
    }
    
    // (Toàn bộ code cũ của bạn: addLog, chuyển tab, đồng hồ)
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
    setModeUI(true);
});

// Hàm addLog (Giữ nguyên)
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
    if (danhSachLog.children.length > 15) {
        danhSachLog.removeChild(danhSachLog.lastChild);
    }

}

