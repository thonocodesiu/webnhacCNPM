const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const session = require("express-session");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const send = require('send');
const app = express();
const PORT = process.env.PORT || 3000;
const MUSIC_ROOT = path.join("H:", "cai dat", "web nhac", "nhac");
const COVERS_PATH = path.join(MUSIC_ROOT, "covers");
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ Kết nối MongoDB thành công"))
    .catch(err => console.error("❌ Lỗi kết nối MongoDB:", err));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 86400000, httpOnly: true, sameSite: 'lax' }
}));

const Song = mongoose.model("Song", new mongoose.Schema({
    title: String,
    artist: String,
    album: String,
    duration: String,
    filename: String
}));

const User = mongoose.model("User", new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" }
}));

let playlist = [];
let currentIndex = 0;
const authenticateToken = (req, res, next) => {
    // Kiểm tra header Authorization
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ message: "❌ Không có token!" });
    }

    // Kiểm tra định dạng "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ message: "❌ Định dạng token không hợp lệ!" });
    }

    const token = parts[1]; // Lấy token
    if (!token) {
        return res.status(401).json({ message: "❌ Token không tồn tại!" });
    }

    // Xác thực token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "❌ Token hết hạn hoặc không hợp lệ!" });
        }
        req.user = user;
        next(); // Chuyển sang middleware tiếp theo
    });
};

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "✅ Đăng ký thành công" });
    } catch (err) {
        res.status(400).json({ message: "❌ Tên người dùng đã tồn tại." });
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: "❌ Sai tài khoản hoặc mật khẩu" });
    }
    const token = jwt.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, message: "✅ Đăng nhập thành công", saveTokenInstruction: "Save this token to localStorage" });
});

app.post("/logout", (req, res) => {
    res.json({ message: "✅ Đăng xuất thành công" });
});

app.get("/albums", async (req, res) => {
    try {
        const albums = await Song.distinct("album");
        res.json(albums);
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server." });
    }
});

app.get("/songs", async (req, res) => {
    const album = req.query.album;
    const query = album ? { album } : {}; // Nếu không có album, lấy tất cả bài hát
    const songs = await Song.find(query);
    res.json(songs);
});


// Add a new endpoint to fetch all songs belonging to an album
app.get("/all-songs", async (req, res) => {
    try {
        const songs = await Song.find();
        res.json(songs);
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server." });
    }
});

app.get("/play/:artist/:filename", (req, res) => {
    const { artist, filename } = req.params;
    const filePath = path.join(MUSIC_ROOT, artist, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "❌ Không tìm thấy bài hát" });
    }
    res.setHeader("Access-Control-Allow-Origin", "*"); // Cấp quyền truy cập từ ngrok
    res.setHeader("Content-Type", "audio/mpeg"); // Định dạng file nhạc
    res.sendFile(filePath);
});

app.get("/next", (req, res) => {
    if (playlist.length === 0) return res.status(400).json({ error: "Playlist trống" });
    currentIndex = (currentIndex + 1) % playlist.length;
    res.json(playlist[currentIndex]);
});

app.get("/prev", (req, res) => {
    if (playlist.length === 0) return res.status(400).json({ error: "Playlist trống" });
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    res.json(playlist[currentIndex]);
});

app.get("/cover/:album", (req, res) => {
    try {
        let album = req.params.album;
        album = decodeURIComponent(album);
        album = album.replace(/[%<>:"/\\|?*]+/g, "").trim();

        if (!fs.existsSync(COVERS_PATH)) {
            return res.status(500).json({ error: "Thư mục covers không tồn tại." });
        }

        const possibleCovers = [".jpg", ".png"].map(ext => path.join(COVERS_PATH, album + ext));
        let coverFile = "no-cover.jpg";

        for (const filePath of possibleCovers) {
            if (fs.existsSync(filePath)) {
                coverFile = path.basename(filePath);
                break;
            }
        }

        res.json({ coverUrl: `http://localhost:${PORT}/covers/${encodeURIComponent(coverFile)}` });
    } catch (error) {
        res.status(500).json({ error: "Lỗi server khi lấy ảnh cover." });
    }
});

app.get("/shuffle-playlist", async (req, res) => {
    try {
        playlist = await Song.find();
        playlist = playlist.sort(() => Math.random() - 0.5).slice(0, 10); // Limit to 10 songs
        currentIndex = 0;
        res.json(playlist);
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server." });
    }
});
const playlistSchema = new mongoose.Schema({
    username: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    songs: [String] // Chỉ cần lưu danh sách tên bài hát
});


const Playlist = mongoose.model("Playlist", playlistSchema);

app.post("/playlist", authenticateToken, async (req, res) => {
    const { name, description, songs } = req.body;
    const username = req.user.username;

    if (!name || !songs || songs.length === 0) {
        return res.status(400).json({ message: "❌ Tên playlist và danh sách bài hát là bắt buộc." });
    }

    const playlist = new Playlist({ username, name, description, songs });
    await playlist.save();  

    res.status(201).json({ message: "✅ Playlist đã được tạo!" });
});

app.get("/playlist", authenticateToken, async (req, res) => {
    const username = req.user.username;
    const playlists = await Playlist.find({ username }); // Lọc theo username
    res.json(playlists);
});

// History Routes
app.post("/history", authenticateToken, async (req, res) => {
    const { song_id } = req.body;
    const history = new History({ user_id: req.user._id, song_id });
    await history.save();
    res.status(201).json({ message: "✅ Đã thêm vào lịch sử nghe" });
});

app.get("/history", authenticateToken, async (req, res) => {
    const history = await History.find({ user_id: req.user._id }).populate("song_id").sort({ played_at: -1 });
    res.json(history);
});

// Favorites Routes
const favoriteSchema = new mongoose.Schema({
    username: { type: String, required: true },  // Lưu username thay vì ObjectId
    title: { type: String, required: true }  // Lưu title của bài hát thay vì songId
});
// Thêm vào server.js
app.delete("/favorite", authenticateToken, async (req, res) => {
    const { title } = req.body;
    await Favorite.deleteOne({ username: req.user.username, title });
    res.json({ message: "✅ Đã xóa khỏi yêu thích" });
});

const Favorite = mongoose.model("Favorite", favoriteSchema);

app.post("/favorite", authenticateToken, async (req, res) => {
    console.log("🔎 Token nhận được:", req.headers.authorization);
    console.log("📌 Dữ liệu nhận được từ frontend:", req.body);

    const { title } = req.body;
    const username = req.user.username;

    if (!title) {
        return res.status(400).json({ message: "❌ Thiếu tên bài hát!" });
    }

    const favorite = new Favorite({ username, title });
    await favorite.save();

    res.status(201).json({ message: "✅ Đã thêm vào danh sách yêu thích!" });
});

app.get("/favorite", authenticateToken, async (req, res) => {
    const username = req.user.username;  // Lấy username từ token
    const favorites = await Favorite.find({ username });

    res.json(favorites);
});
// ------------ TRONG FILE server.js ------------

// Lấy danh sách favorites theo username
app.get('/api/favorites/:username', async (req, res) => {
    try {
        const username = req.params.username;
        
        const favorites = await Favorite.find({ username })
            .select('title createdAt')
            .sort({ createdAt: -1 });

        if (!favorites.length) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mục yêu thích nào cho người dùng này'
            });
        }

        res.status(200).json({
            success: true,
            data: favorites
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách yêu thích:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý yêu cầu'
        });
    }
});

// Lấy danh sách playlists theo username
app.get('/api/playlists/:username', async (req, res) => {
    try {
        const username = req.params.username;
        
        const playlists = await Playlist.find({ username })
            .select('name songs createdAt')
            .sort({ createdAt: -1 });

        if (!playlists.length) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy playlist nào cho người dùng này'
            });
        }

        res.status(200).json({
            success: true,
            data: playlists
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách playlist:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý yêu cầu'
        });
    }
});
// Thêm vào server.js

// Thêm bài hát vào playlist tồn tại
app.put("/playlist/:id", authenticateToken, async (req, res) => {
    try {
        const { songTitle } = req.body;
        const playlist = await Playlist.findById(req.params.id);
        
        if (!playlist) {
            return res.status(404).json({ message: "Playlist không tồn tại" });
        }

        if (!playlist.songs.includes(songTitle)) {
            playlist.songs.push(songTitle);
            await playlist.save();
        }

        res.json(playlist);
    } catch (error) {
        res.status(500).json({ message: "Lỗi server" });
    }
});
// Thêm vào server.js
app.get("/verify-token", authenticateToken, (req, res) => {
    res.json({ 
        username: req.user.username,
        role: req.user.role 
    });
});

// Update the album songs endpoint
app.get("/albums/:album/songs", async (req, res) => {
    const { album } = req.params;

    try {
        const songs = await Song.find({ album: album }).select("title filename"); // Lấy tiêu đề và tên file bài hát
        if (songs.length === 0) {
            return res.status(404).json({ error: "No songs found for this album" });
        }

        res.json({
            album: album,
            songs: songs.map(song => ({
                title: song.title,
                src: `${API_URL}/play/${encodeURIComponent(album)}/${encodeURIComponent(song.filename)}`
            }))
        });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Example server-side endpoint (Node.js/Express)
app.post('/songs/find', async (req, res) => {
    try {
        const { artist, filename } = req.body;
        
        // Query your database to find which album contains this song
        const song = await db.songs.findOne({
            where: {
                artist: artist,
                filename: filename
            },
            include: [{
                model: db.albums,
                attributes: ['name']
            }]
        });

        if (song && song.album) {
            res.json({
                album: song.album.name,
                artist: song.artist,
                filename: song.filename
            });
        } else {
            res.status(404).json({
                error: 'Song not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Server error'
        });
    }
});app.get("/song-by-filename/:filename", async (req, res) => {
    try {
        let { filename } = req.params;
        filename = decodeURIComponent(filename).trim(); // Giải mã URL và loại bỏ khoảng trắng dư

        console.log("🔎 Đang tìm bài hát với filename:", filename);

        // Tìm kiếm bài hát trong MongoDB bằng regex, hỗ trợ lỗi dấu cách và ký tự đặc biệt
        const song = await Song.findOne({ filename: { $regex: new RegExp(filename.replace(/[-().]/g, "\\$&"), "i") } });

        if (!song) {
            console.error("❌ Không tìm thấy bài hát trong database!");
            return res.status(404).json({ error: "Không tìm thấy bài hát!" });
        }

        // Tạo URL phát nhạc
        const songUrl = `/play/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.filename)}`;
        res.json({ ...song.toObject(), url: songUrl });

    } catch (err) {
        console.error("🔥 Lỗi server:", err);
        res.status(500).json({ error: "Lỗi server khi tìm bài hát!" });
    }
});


app.use("/covers", express.static(COVERS_PATH));

app.listen(PORT, () => console.log(`✅ Server chạy tại http://localhost:${PORT}`));
