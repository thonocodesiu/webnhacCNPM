const express = require("express");
const mongoose = require("mongoose");

const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const User = require("./User"); // Import model User

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require("cors");

// Cấu hình CORS cho phép từ mọi nguồn hoặc chỉ từ localhost:5500
app.use(cors({
    origin: "http://127.0.0.1:5500", // Cho phép frontend truy cập
    methods: "GET,POST", // Chỉ định các phương thức được phép
    allowedHeaders: "Content-Type,Authorization" // Chỉ định các header được phép
}));


app.use(bodyParser.json());

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ Kết nối MongoDB thành công"))
  .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));

// 📌 Middleware kiểm tra JWT
function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Forbidden" });
        req.user = user;
        next();
    });
}

// 📌 Đăng ký tài khoản
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) return res.status(400).json({ message: "Thiếu thông tin" });

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.json({ success: true, message: "Đăng ký thành công" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// 📌 Đăng nhập
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Sai tài khoản hoặc mật khẩu" });
        }

        const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ message: "Lỗi server" });
    }
});

// 📌 Kiểm tra trạng thái xác thực
app.get("/check-auth", authenticateToken, (req, res) => {
    res.json({ authenticated: true, user: req.user });
});

// 📌 Kiểm tra quyền admin
app.get("/check-admin", authenticateToken, (req, res) => {
    res.json({ isAdmin: req.user.role === "admin" });
});

// 📌 Chạy server
app.listen(PORT, () => {
    console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
